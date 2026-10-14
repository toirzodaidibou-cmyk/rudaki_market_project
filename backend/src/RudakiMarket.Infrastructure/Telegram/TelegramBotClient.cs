using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using RudakiMarket.Application.Abstractions;

namespace RudakiMarket.Infrastructure.Telegram;

/// <param name="BotToken">Токени бот аз @BotFather (махфӣ — user-secrets / танзимоти сервер)</param>
/// <param name="BotUsername">Номи бот бе "@", масалан "RudakiMarketBot"</param>
public sealed record TelegramOptions(string BotToken, string BotUsername, string ApiBaseUrl);

public sealed record TelegramUpdate(
    long UpdateId, long ChatId, long FromUserId, string? Text, string? ContactPhone, long? ContactUserId);

/// <summary>Telegram Bot API (https://core.telegram.org/bots/api): sendMessage + getUpdates (long polling).</summary>
public sealed class TelegramBotClient(HttpClient http, TelegramOptions options) : ITelegramBot
{
    private string Url(string method) => $"{options.ApiBaseUrl.TrimEnd('/')}/bot{options.BotToken}/{method}";

    public async Task SendMessageAsync(long chatId, string text, TelegramKeyboard keyboard = TelegramKeyboard.None, CancellationToken ct = default)
    {
        var body = new JsonObject { ["chat_id"] = chatId, ["text"] = text };
        body["reply_markup"] = keyboard switch
        {
            TelegramKeyboard.RequestContact => new JsonObject
            {
                ["keyboard"] = new JsonArray(new JsonArray(new JsonObject
                {
                    ["text"] = "📱 Фиристодани рақам / Отправить номер",
                    ["request_contact"] = true,
                })),
                ["resize_keyboard"] = true,
                ["one_time_keyboard"] = true,
            },
            TelegramKeyboard.Remove => new JsonObject { ["remove_keyboard"] = true },
            _ => null,
        };

        try
        {
            using var response = await http.PostAsJsonAsync(Url("sendMessage"), body, ct);
            if (!response.IsSuccessStatusCode)
                throw new TelegramSendException(
                    $"Telegram sendMessage: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync(ct)}",
                    statusCode: (int)response.StatusCode);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new TelegramSendException("Telegram дастрас нест", ex);
        }
    }

    /// <summary>Long polling: то {timeoutSeconds} сония интизори паёмҳои нав.</summary>
    public async Task<IReadOnlyList<TelegramUpdate>> GetUpdatesAsync(long offset, int timeoutSeconds, CancellationToken ct)
    {
        var url = $"{Url("getUpdates")}?offset={offset}&timeout={timeoutSeconds}&allowed_updates=%5B%22message%22%5D";
        using var response = await http.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));

        var updates = new List<TelegramUpdate>();
        foreach (var u in doc.RootElement.GetProperty("result").EnumerateArray())
        {
            var updateId = u.GetProperty("update_id").GetInt64();
            if (!u.TryGetProperty("message", out var m) || !m.TryGetProperty("from", out var from))
            {
                updates.Add(new TelegramUpdate(updateId, 0, 0, null, null, null));
                continue;
            }
            string? contactPhone = null;
            long? contactUserId = null;
            if (m.TryGetProperty("contact", out var c))
            {
                contactPhone = c.GetProperty("phone_number").GetString();
                if (c.TryGetProperty("user_id", out var cu)) contactUserId = cu.GetInt64();
            }
            updates.Add(new TelegramUpdate(
                updateId,
                m.GetProperty("chat").GetProperty("id").GetInt64(),
                from.GetProperty("id").GetInt64(),
                m.TryGetProperty("text", out var t) ? t.GetString() : null,
                contactPhone,
                contactUserId));
        }
        return updates;
    }
}

/// <summary>Вақте ки бот танзим нашудааст — Telegram хомӯш аст.</summary>
public sealed class DisabledTelegramBot : ITelegramBot
{
    public Task SendMessageAsync(long chatId, string text, TelegramKeyboard keyboard = TelegramKeyboard.None, CancellationToken ct = default) =>
        throw new TelegramSendException("Telegram танзим нашудааст");
}
