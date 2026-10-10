namespace RudakiMarket.Domain.Entities;

/// <summary>Ҳолати фармоиш: Нав → Тасдиқ шуд → Дар роҳ → Расонида шуд (ё Бекор шуд). Дар база — рақам.</summary>
public enum OrderStatus
{
    New = 0,
    Confirmed = 1,
    Delivering = 2,
    Delivered = 3,
    Cancelled = 4,
}

/// <summary>Тарзи пардохт (ҳангоми гирифтани мол). Дар база — рақам.</summary>
public enum PaymentMethod
{
    Cash = 0,
    Alif = 1,
    Dc = 2,
    KortiMilli = 3,
}

/// <summary>Фармоиши мизоҷ. Нархҳо ва номҳо ҳангоми фармоиш "сабт" мешаванд (snapshot) — баъдтар иваз намешаванд.</summary>
public sealed class Order
{
    public int Id { get; private set; }
    public int CustomerId { get; set; }

    /// <summary>Рақами мизоҷ (E.164) — дар вақти фармоиш.</summary>
    public string Phone { get; set; } = "";
    public string Address { get; set; } = "";
    public string? Comment { get; set; }

    /// <summary>Нархи молҳо (бе расонидан).</summary>
    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal Total { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.New;
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Вақти расонидан, ки мизоҷ интихоб кард. null — "ҳарчи зудтар".</summary>
    public DateTimeOffset? DeliveryFrom { get; set; }
    public DateTimeOffset? DeliveryTo { get; set; }

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;

    /// <summary>Вақти охирин иваз шудани ҳолат (null — ҳанӯз "Нав").</summary>
    public DateTimeOffset? StatusUpdatedAt { get; set; }

    /// <summary>
    /// Калиди дархост аз браузер (як бор барои ҳар кӯшиши фармоиш). Агар ҳамон дархост такрор фиристода шавад
    /// (интернети суст, клики дукарата) — фармоиши нав сохта намешавад, ҳамин фармоиш бармегардад.
    /// </summary>
    public Guid? RequestId { get; set; }

    public List<OrderItem> Items { get; } = [];
}

public sealed class OrderItem
{
    public int Id { get; private set; }
    public int OrderId { get; set; }

    /// <summary>Пайванд ба мол (агар мол нест шавад — null, вале сатри фармоиш мемонад).</summary>
    public int? ProductId { get; set; }

    public string Name { get; set; } = "";
    public string? SizeLabel { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
}
