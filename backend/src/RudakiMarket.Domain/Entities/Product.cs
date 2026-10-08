namespace RudakiMarket.Domain.Entities;

/// <summary>Мол. Ном ва тавсиф дар 4 забон; нарх бо сомонӣ.</summary>
public sealed class Product
{
    public int Id { get; private set; }

    public int CategoryId { get; set; }
    public Category? Category { get; set; }

    public string NameTg { get; set; } = "";
    public string NameRu { get; set; } = "";
    public string NameEn { get; set; } = "";
    public string NameUz { get; set; } = "";

    public string? DescriptionTg { get; set; }
    public string? DescriptionRu { get; set; }
    public string? DescriptionEn { get; set; }
    public string? DescriptionUz { get; set; }

    /// <summary>Нархи ҷорӣ (сомонӣ).</summary>
    public decimal Price { get; set; }

    /// <summary>Нархи пешина (барои нишон додани тахфиф). Бояд аз Price калонтар бошад.</summary>
    public decimal? OldPrice { get; set; }

    /// <summary>Андоза/ҳаҷм дар корт, масалан "1 л", "500 г".</summary>
    public string? SizeLabel { get; set; }

    /// <summary>Нишонаи "Нав" дар корт.</summary>
    public bool IsNew { get; set; }

    /// <summary>Агар false бошад, дар сайт нишон дода намешавад.</summary>
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Суратҳо (аввалин — асосӣ).</summary>
    public List<ProductImage> Images { get; } = [];
}
