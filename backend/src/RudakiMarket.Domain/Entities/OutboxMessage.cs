namespace RudakiMarket.Domain.Entities;

/// <summary>
/// Паёми навбат (огоҳии фурӯшанда ё мизоҷ дар бораи фармоиш). Дар база нигоҳ дошта мешавад — бо ҳамон
/// транзаксияи фармоиш сабт мешавад ва бо бозоғозии сервер гум намешавад. Фиристодан — дар OutboxWorker.
/// </summary>
public sealed class OutboxMessage
{
    public long Id { get; set; }

    /// <summary>Роҳ: <see cref="OutboxChannels"/></summary>
    public string Channel { get; set; } = "";

    /// <summary>Рақами мизоҷ (E.164) — танҳо барои паёми мизоҷ; барои фурӯшанда null.</summary>
    public string? Recipient { get; set; }

    public string Text { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Кӯшиши навбатӣ на пеш аз ин вақт (бозкӯшиш бо танаффус).</summary>
    public DateTimeOffset NextAttemptAt { get; set; }

    public int Attempts { get; set; }
    public DateTimeOffset? SentAt { get; set; }

    /// <summary>Дигар кӯшиш карда намешавад (кӯшишҳо тамом, кӯҳна ё роҳ танзим нашудааст).</summary>
    public DateTimeOffset? FailedAt { get; set; }

    public string? LastError { get; set; }
}

public static class OutboxChannels
{
    public const string OwnerTelegram = "owner-telegram";
    public const string OwnerWhatsApp = "owner-whatsapp";
    public const string CustomerTelegram = "customer-telegram";
}
