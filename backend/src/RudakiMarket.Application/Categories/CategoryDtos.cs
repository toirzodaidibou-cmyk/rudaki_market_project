namespace RudakiMarket.Application.Categories;

public sealed record LocalizedNames(string Tg, string Ru, string En, string Uz);

/// <summary>Барои панели админ (ҳамаи майдонҳо).</summary>
public sealed record CategoryDto(
    int Id,
    string Slug,
    LocalizedNames Name,
    string? Icon,
    int SortOrder,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

/// <summary>Барои сайт (танҳо категорияҳои фаъол).</summary>
/// <param name="ProductCount">Шумораи молҳои фаъол — каталог категорияҳои холиро пинҳон мекунад.</param>
public sealed record PublicCategoryDto(string Slug, LocalizedNames Name, string? Icon, int ProductCount);

public sealed record SaveCategoryRequest(string Slug, LocalizedNames Name, int SortOrder, bool IsActive);
