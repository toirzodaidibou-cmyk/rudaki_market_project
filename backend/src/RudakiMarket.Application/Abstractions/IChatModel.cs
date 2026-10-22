using System.Text.Json;

namespace RudakiMarket.Application.Abstractions;

/// <param name="Parameters">JSON Schema-и аргументҳо</param>
public sealed record ChatTool(string Name, string Description, JsonElement Parameters);

/// <param name="Arguments">JSON-и аргументҳо (матн, тавре модел навишт)</param>
/// <param name="Extra">
/// маълумоти иловагии хидмат, ки бояд айнан баргардонида шавад (Gemini 3: «extra_content» бо thought_signature —
/// бе он даври навбатӣ хато медиҳад); null — нест
/// </param>
public sealed record ChatToolCall(string Id, string Name, string Arguments, string? Extra = null);

/// <param name="Role">system | user | assistant | tool</param>
/// <param name="ToolCalls">танҳо барои assistant: амалҳое, ки модел хост</param>
/// <param name="ToolCallId">танҳо барои tool: ҷавоби кадом амал</param>
/// <param name="ToolName">танҳо барои tool: номи амал (Gemini ҷавобро бо ном пайваст мекунад)</param>
public sealed record ChatMessage(string Role, string? Content, IReadOnlyList<ChatToolCall>? ToolCalls = null, string? ToolCallId = null, string? ToolName = null);

/// <param name="ToolCalls">холӣ — модел ҷавоби ниҳоӣ дод</param>
public sealed record ChatCompletion(string? Content, IReadOnlyList<ChatToolCall> ToolCalls);

/// <summary>Модели забонӣ (AI) бо имконияти даъвати амалҳо (tools).</summary>
public interface IChatModel
{
    /// <summary>false — калиди AI танзим нашудааст (ёрдамчӣ дар сайт нишон дода намешавад).</summary>
    bool IsEnabled { get; }

    /// <exception cref="ChatModelException">модел ҷавоб надод ё ҷавоби нодуруст</exception>
    Task<ChatCompletion> CompleteAsync(IReadOnlyList<ChatMessage> messages, IReadOnlyList<ChatTool> tools, CancellationToken ct);
}

/// <param name="Busy">хидмати AI банд аст ё ҳадди дархостҳо тамом шуд (HTTP 429) — каме баъд боз кӯшиш кардан мумкин</param>
public sealed class ChatModelException(string message, Exception? inner = null, bool busy = false) : Exception(message, inner)
{
    public bool Busy { get; } = busy;
}
