namespace RudakiMarket.Domain.Entities;

/// <summary>Слайди саҳифаи асосӣ: матнҳо бо 4 забон, сурати мол (шаффоф), пайванд ва ранги замина.</summary>
public sealed class Banner
{
    public int Id { get; private set; }

    public string BadgeTg { get; set; } = "";
    public string BadgeRu { get; set; } = "";
    public string BadgeEn { get; set; } = "";
    public string BadgeUz { get; set; } = "";

    public string TitleTg { get; set; } = "";
    public string TitleRu { get; set; } = "";
    public string TitleEn { get; set; } = "";
    public string TitleUz { get; set; } = "";

    public string TextTg { get; set; } = "";
    public string TextRu { get; set; } = "";
    public string TextEn { get; set; } = "";
    public string TextUz { get; set; } = "";

    /// <summary>Матни тугма; холӣ — "Харидан" аз луғати сайт.</summary>
    public string CtaTg { get; set; } = "";
    public string CtaRu { get; set; } = "";
    public string CtaEn { get; set; } = "";
    public string CtaUz { get; set; } = "";

    /// <summary>Роҳи нисбии сайт, масалан "/catalog/drinks" ё "/product/123".</summary>
    public string Href { get; set; } = "/catalog";

    /// <summary>Номи ранги тайёр (red, yellow, pink, blue, lavender, green, orange, dark).</summary>
    public string Theme { get; set; } = "yellow";

    public string? ImagePath { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
