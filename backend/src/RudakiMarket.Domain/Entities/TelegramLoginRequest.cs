namespace RudakiMarket.Domain.Entities;

/// <summary>
/// Дархости даромад тавассути Telegram: сайт пайванди t.me/бот?start={Token} медиҳад,
/// мизоҷ дар бот рақамашро (contact) мефиристад, бот рамзро мефиристад.
/// </summary>
public sealed class TelegramLoginRequest
{
    public long Id { get; private set; }

    /// <summary>Калиди тасодуфӣ дар пайванди deep link (base64url, 43 аломат).</summary>
    public string Token { get; set; } = "";

    /// <summary>Рақаме, ки мизоҷ дар сайт навишт (E.164).</summary>
    public string Phone { get; set; } = "";

    /// <summary>Чат бо бот — баъд аз /start муқаррар мешавад.</summary>
    public long? ChatId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}
