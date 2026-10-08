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
public sealed class TelegramSendException(string message, Exception? inner = null) : Exception(message, inner);
