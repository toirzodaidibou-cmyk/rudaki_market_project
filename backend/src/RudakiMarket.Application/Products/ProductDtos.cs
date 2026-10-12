using RudakiMarket.Application.Categories;

namespace RudakiMarket.Application.Products;

public sealed record ProductImageDto(int Id, string Url, string Thumb);

/// <summary>Пурра — барои формаи админ.</summary>
public sealed record ProductDto(
    int Id,
    int CategoryId,
    LocalizedNames Name,
    LocalizedNames Description,
    decimal Price,
    decimal? OldPrice,
    string? SizeLabel,
    bool IsNew,
    bool IsActive,
    IReadOnlyList<ProductImageDto> Images,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool TemporaryPhoto);

/// <summary>Сатри рӯйхати админ (сабук).</summary>
public sealed record ProductListItemDto(
    int Id,
    int CategoryId,
    LocalizedNames Name,
    decimal Price,
    decimal? OldPrice,
    string? SizeLabel,
    bool IsNew,
    bool IsActive,
    string? Thumb,
    int ImageCount,
    bool TemporaryPhoto);

/// <summary>Барои корти мол дар сайт (то 3 сурати хурд барои слайдер).</summary>
public sealed record PublicProductDto(
    int Id,
    LocalizedNames Name,
    decimal Price,
    decimal? OldPrice,
    string? SizeLabel,
    bool IsNew,
    IReadOnlyList<string> Images);

public sealed record PublicCategoryRef(string Slug, LocalizedNames Name);

/// <summary>Сатри sitemap.xml: мол ва санаи охирини тағйир.</summary>
public sealed record SitemapProductDto(int Id, DateTimeOffset UpdatedAt);

/// <summary>Саҳифаи мол дар сайт: ҳамаи суратҳо (калон + хурд), тавсиф, категория ва молҳои монанд.</summary>
public sealed record PublicProductDetailDto(
    int Id,
    LocalizedNames Name,
    LocalizedNames Description,
    decimal Price,
    decimal? OldPrice,
    string? SizeLabel,
    bool IsNew,
    IReadOnlyList<ProductImageDto> Images,
    PublicCategoryRef Category,
    IReadOnlyList<PublicProductDto> Similar);

/// <summary>Тартиби рӯйхат дар сайт (?sort=...). Холӣ — пешфарз (каталог: навтаринҳо, ҷустуҷӯ: мувофиқтарин).</summary>
public static class ProductSort
{
    public const string New = "new";
    public const string Cheap = "cheap";
    public const string Expensive = "expensive";
    public const string Discount = "discount";
}

public sealed record SaveProductRequest(
    int CategoryId,
    LocalizedNames Name,
    LocalizedNames? Description,
    decimal Price,
    decimal? OldPrice,
    string? SizeLabel,
    bool IsNew,
    bool IsActive,
    bool? TemporaryPhoto = null);

public sealed record UploadFile(byte[] Content, string FileName);
