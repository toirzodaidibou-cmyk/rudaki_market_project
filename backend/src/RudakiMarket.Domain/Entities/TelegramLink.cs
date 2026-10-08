namespace RudakiMarket.Domain.Entities;

/// <summary>
/// Рақами тасдиқшуда ↔ чати Telegram. Баъд аз як бор тасдиқ (contact-и худи корбар),
/// рамзҳои навбатӣ мустақиман ба ҳамин чат фиристода мешаванд.
/// </summary>
public sealed class TelegramLink
{
    public string Phone { get; set; } = "";
    public long ChatId { get; set; }
    public DateTimeOffset LinkedAt { get; set; }
}
