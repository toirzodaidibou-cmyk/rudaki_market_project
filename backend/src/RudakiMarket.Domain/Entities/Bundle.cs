namespace RudakiMarket.Domain.Entities;

/// <summary>
/// Маҷмӯа (масалан, "Дастархони чой", "Ош барои 10 нафар"): якчанд мол бо миқдор —
/// мизоҷ бо як тугма ҳамаашро ба сабад мегузорад. Нарх — ҷамъи нархҳои ҷории молҳо.
/// </summary>
public sealed class Bundle
{
    public int Id { get; private set; }

    public string NameTg { get; set; } = "";
    public string NameRu { get; set; } = "";
    public string NameEn { get; set; } = "";
    public string NameUz { get; set; } = "";

    public string? DescriptionTg { get; set; }
    public string? DescriptionRu { get; set; }
    public string? DescriptionEn { get; set; }
    public string? DescriptionUz { get; set; }

    /// <summary>Аломати корт (emoji), масалан "🍵".</summary>
    public string Emoji { get; set; } = "🧺";

    /// <summary>
    /// Тахфиф (0–50 %): вақте ки дар сабад ҳамаи молҳои маҷмӯа бо миқдори лозимӣ ҳастанд,
    /// аз нархи онҳо ҳамин фоиз кам мешавад. 0 — бе тахфиф.
    /// </summary>
    public int DiscountPercent { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public List<BundleItem> Items { get; } = [];
}

public sealed class BundleItem
{
    public int Id { get; private set; }
    public int BundleId { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; } = 1;
    public int SortOrder { get; set; }
}
