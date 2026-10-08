namespace RudakiMarket.Domain.Entities;

/// <summary>Мизоҷи сайт. Даромад бо рақами телефон (рамзи SMS), бе парол.</summary>
public sealed class Customer
{
    public int Id { get; private set; }

    /// <summary>Рақам дар формати E.164, масалан "+992921234567".</summary>
    public string Phone { get; set; } = "";

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
}
