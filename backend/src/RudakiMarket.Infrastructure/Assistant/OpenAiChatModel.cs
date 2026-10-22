using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using RudakiMarket.Application.Abstractions;

namespace RudakiMarket.Infrastructure.Assistant;

/// <param name="BaseUrl">суроғаи API бо "/" дар охир (Gemini: https://generativelanguage.googleapis.com/v1beta/openai/)</param>
/// <param name="ApiKey">калиди API (холӣ — ёрдамчӣ хомӯш)</param>
/// <param name="MaxTokens">ҳадди ҷавоб (дар Gemini «фикр кардан» ҳам аз ҳамин ҳисоб мешавад)</param>
/// <param name="ReasoningEffort">«фикр кардан»-и модел: none | low | medium | high; null — фиристода намешавад</param>
public sealed record ChatModelOptions(string BaseUrl, string? ApiKey, string Model, int MaxTokens = 4096, string? ReasoningEffort = null);

/// <summary>
/// Модел тавассути протоколи «OpenAI Chat Completions» — Google Gemini, Anthropic Claude, OpenAI, Groq ва ғ.
/// ҳамин протоколро доранд; хидмат бо танзимот (Assistant:BaseUrl, Assistant:Model, Assistant:ApiKey) иваз мешавад.
/// Хатои муваққатӣ (500/502/503/504, шабака) — як бозкӯшиш.
/// </summary>
public sealed class OpenAiChatModel(HttpClient http, ChatModelOptions options) : IChatModel
{
    public const string HttpClientName = "assistant";

    public bool IsEnabled => !string.IsNullOrWhiteSpace(options.ApiKey);

    public string? LastError { get; private set; }

    public async Task<ChatCompletion> CompleteAsync(IReadOnlyList<ChatMessage> messages, IReadOnlyList<ChatTool> tools, CancellationToken ct)
    {
        try
        {
            return await CompleteWithRetryAsync(messages, tools, ct);
        }
        catch (ChatModelException e)
        {
            var text = (e.InnerException is { } inner ? $"{e.Message} | {inner.GetType().Name}: {inner.Message}" : e.Message)
                .Replace(options.ApiKey ?? "\0", "***");
            LastError = $"{DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss}Z {options.Model}: {text[..Math.Min(text.Length, 400)]}";
            throw;
        }
    }

    private async Task<ChatCompletion> CompleteWithRetryAsync(IReadOnlyList<ChatMessage> messages, IReadOnlyList<ChatTool> tools, CancellationToken ct)
    {
        var body = Body(messages, tools).ToJsonString();
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await SendAsync(body, ct);
            }
            catch (ChatModelException e) when (attempt == 1 && e.Data["transient"] is true)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(800), ct);
            }
            // Ҳадди дақиқаи нусхаи ройгон: агар хидмат «баъд аз N сония» гӯяд (то 20 с) — як бор интизор ва такрор
            catch (ChatModelException e) when (attempt == 1 && e.Busy && e.Data["retryAfter"] is int seconds && seconds <= MaxBusyWaitSeconds)
            {
                await Task.Delay(TimeSpan.FromSeconds(Math.Max(1, seconds)), ct);
            }
        }
    }

    private JsonObject Body(IReadOnlyList<ChatMessage> messages, IReadOnlyList<ChatTool> tools)
    {
        var body = new JsonObject
        {
            ["model"] = options.Model,
            ["temperature"] = 0.2,
            ["max_tokens"] = options.MaxTokens,
            ["messages"] = new JsonArray(messages.Select(ToJson).ToArray()),
        };
        if (!string.IsNullOrWhiteSpace(options.ReasoningEffort)) body["reasoning_effort"] = options.ReasoningEffort;
        if (tools.Count > 0)
        {
            body["tools"] = new JsonArray(tools.Select(t => (JsonNode)new JsonObject
            {
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = t.Name,
                    ["description"] = t.Description,
                    ["parameters"] = JsonNode.Parse(t.Parameters.GetRawText()),
                },
            }).ToArray());
        }
        return body;
    }

    private const int MaxBusyWaitSeconds = 20;

    /// <summary>Чанд сония интизор шудан: сарлавҳаи Retry-After ё «retryDelay»: "23s" дар матни хатои Gemini.</summary>
    private static int? RetryAfterSeconds(HttpResponseMessage response, string error)
    {
        if (response.Headers.RetryAfter?.Delta is { } delta) return (int)Math.Ceiling(delta.TotalSeconds);
        var m = System.Text.RegularExpressions.Regex.Match(error, "\"retryDelay\"\\s*:\\s*\"(\\d+)(?:\\.\\d+)?s\"");
        return m.Success && int.TryParse(m.Groups[1].Value, out var s) ? s : null;
    }

    private static ChatModelException Transient(string message, Exception? inner = null)
    {
        var e = new ChatModelException(message, inner);
        e.Data["transient"] = true;
        return e;
    }

    private async Task<ChatCompletion> SendAsync(string body, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(options.BaseUrl), "chat/completions"))
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(request, ct);
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            throw Transient("AI дастрас нест (шабака ё timeout)", e);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                // Матни хато калидро дар бар намегирад; танҳо оғозаш барои log
                var error = await response.Content.ReadAsStringAsync(ct);
                var message = $"AI: HTTP {(int)response.StatusCode} {error[..Math.Min(error.Length, 300)]}";
                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    var busy = new ChatModelException(message, busy: true);
                    if (RetryAfterSeconds(response, error) is { } wait) busy.Data["retryAfter"] = wait;
                    throw busy;
                }
                if ((int)response.StatusCode is 500 or 502 or 503 or 504) throw Transient(message);
                throw new ChatModelException(message);
            }
            try
            {
                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
                var message = doc.RootElement.GetProperty("choices")[0].GetProperty("message");
                var content = message.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String ? c.GetString() : null;
                var calls = new List<ChatToolCall>();
                if (message.TryGetProperty("tool_calls", out var tc) && tc.ValueKind == JsonValueKind.Array)
                {
                    foreach (var call in tc.EnumerateArray())
                    {
                        var fn = call.GetProperty("function");
                        // Gemini баъзан id намедиҳад ё якхела медиҳад — id-и беназир барои ҷавоби амал
                        var id = call.TryGetProperty("id", out var idEl) && idEl.GetString() is { Length: > 0 } s && calls.All(x => x.Id != s)
                            ? s
                            : $"call_{calls.Count}_{Guid.NewGuid():N}";
                        var args = fn.TryGetProperty("arguments", out var a)
                            ? a.ValueKind == JsonValueKind.String ? a.GetString() ?? "{}" : a.GetRawText()
                            : "{}";
                        var extra = call.TryGetProperty("extra_content", out var ex) && ex.ValueKind == JsonValueKind.Object ? ex.GetRawText() : null;
                        calls.Add(new ChatToolCall(id, fn.GetProperty("name").GetString() ?? "", args, extra));
                    }
                }
                return new ChatCompletion(content, calls);
            }
            catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException or IndexOutOfRangeException)
            {
                throw new ChatModelException("AI: ҷавоби нодуруст", e);
            }
        }
    }

    private static JsonNode ToJson(ChatMessage m)
    {
        var node = new JsonObject { ["role"] = m.Role, ["content"] = m.Content ?? "" };
        if (m.ToolCalls is { Count: > 0 })
        {
            node["tool_calls"] = new JsonArray(m.ToolCalls.Select(c =>
            {
                var call = new JsonObject
                {
                    ["id"] = c.Id,
                    ["type"] = "function",
                    ["function"] = new JsonObject { ["name"] = c.Name, ["arguments"] = c.Arguments },
                };
                if (c.Extra is not null) call["extra_content"] = JsonNode.Parse(c.Extra);
                return (JsonNode)call;
            }).ToArray());
        }
        if (m.ToolCallId is not null) node["tool_call_id"] = m.ToolCallId;
        if (m.ToolName is not null) node["name"] = m.ToolName;
        return node;
    }
}
