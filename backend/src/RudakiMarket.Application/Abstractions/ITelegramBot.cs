namespace RudakiMarket.Application.Abstractions;

public enum TelegramKeyboard
{
    None,
    /// <summary>Тугмаи "📱 Фиристодани рақам" (request_contact).</summary>
    RequestContact,
    /// <summary>Тугмаҳоро пинҳон кардан.</summary>
    Remove,
}

/// <summary>Фиристодани паём аз боти Telegram.</summary>
public interface ITelegramBot
{
    Task SendMessageAsync(long chatId, string text, TelegramKeyboard keyboard = TelegramKeyboard.None, CancellationToken ct = default);
}

/// <summary>Паём ба Telegram нарасид.</summary>
/// <param name="statusCode">Ҷавоби HTTP-и Telegram; null — Telegram дастрас набуд (шабака, timeout)</param>
public sealed class TelegramSendException(string message, Exception? inner = null, int? statusCode = null) : Exception(message, inner)
{
    public int? StatusCode { get; } = statusCode;

    /// <summary>
    /// Бозкӯшиш фоида надорад: 403 — корбар ботро бастааст ё ҳеҷ гоҳ сар накардааст, 400 — чат нест / дархости нодуруст.
    /// (429 — «бисёр дархост» — муваққатӣ аст, бозкӯшиш мешавад.)
    /// </summary>
    public bool IsPermanent => StatusCode is 400 or 403;
}
