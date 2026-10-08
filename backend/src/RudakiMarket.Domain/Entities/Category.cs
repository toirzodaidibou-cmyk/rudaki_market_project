namespace RudakiMarket.Domain.Entities;

/// <summary>Категорияи каталог (масалан, "Қаҳва"). Ном дар 4 забон.</summary>
public sealed class Category
{
    public int Id { get; private set; }

    /// <summary>Суроға дар URL: /catalog/{slug}. Танҳо a-z, 0-9 ва "-".</summary>
    public string Slug { get; set; } = "";

    public string NameTg { get; set; } = "";
    public string NameRu { get; set; } = "";
    public string NameEn { get; set; } = "";
    public string NameUz { get; set; } = "";

    /// <summary>Роҳи нисбии икона, масалан "/uploads/categories/abc.webp".</summary>
    public string? IconPath { get; set; }

    /// <summary>Тартиб дар рӯйхат (хурдтар — болотар).</summary>
    public int SortOrder { get; set; }

    /// <summary>Агар false бошад, дар сайт нишон дода намешавад.</summary>
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
