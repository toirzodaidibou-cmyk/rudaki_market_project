using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Common;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Categories;

public sealed partial class CategoryService(IAppDbContext db, IFileStorage files, ISiteCache siteCache, TimeProvider clock)
{
    public const int MaxIconBytes = 1024 * 1024; // 1 MB
    private const int MaxNameLength = 100;
    private const int MaxSlugLength = 64;

    public async Task<IReadOnlyList<CategoryDto>> ListAsync(CancellationToken ct) =>
        await db.Categories.AsNoTracking()
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Id)
            .Select(c => new CategoryDto(c.Id, c.Slug, new LocalizedNames(c.NameTg, c.NameRu, c.NameEn, c.NameUz),
                c.IconPath, c.SortOrder, c.IsActive, c.CreatedAt, c.UpdatedAt))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<PublicCategoryDto>> ListPublicAsync(CancellationToken ct) =>
        await db.Categories.AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Id)
            .Select(c => new PublicCategoryDto(c.Slug, new LocalizedNames(c.NameTg, c.NameRu, c.NameEn, c.NameUz), c.IconPath,
                db.Products.Count(p => p.CategoryId == c.Id && p.IsActive)))
            .ToListAsync(ct);

    public async Task<Result<CategoryDto>> GetAsync(int id, CancellationToken ct)
    {
        var c = await db.Categories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? Result<CategoryDto>.NotFound() : Result<CategoryDto>.Ok(ToDto(c));
    }

    public async Task<Result<CategoryDto>> CreateAsync(SaveCategoryRequest request, CancellationToken ct)
    {
        var (req, errors) = Normalize(request);
        if (errors.Count > 0) return Result<CategoryDto>.Invalid(errors);
        if (await db.Categories.AnyAsync(c => c.Slug == req.Slug, ct))
            return Result<CategoryDto>.Invalid("slug", "Ин slug аллакай истифода шудааст.");

        var now = clock.GetUtcNow();
        var category = new Category { CreatedAt = now };
        Apply(category, req, now);
        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Categories, SiteCacheTags.Products], ct);
        return Result<CategoryDto>.Ok(ToDto(category));
    }

    public async Task<Result<CategoryDto>> UpdateAsync(int id, SaveCategoryRequest request, CancellationToken ct)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return Result<CategoryDto>.NotFound();

        var (req, errors) = Normalize(request);
        if (errors.Count > 0) return Result<CategoryDto>.Invalid(errors);
        if (await db.Categories.AnyAsync(c => c.Slug == req.Slug && c.Id != id, ct))
            return Result<CategoryDto>.Invalid("slug", "Ин slug аллакай истифода шудааст.");

        Apply(category, req, clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Categories, SiteCacheTags.Products], ct);
        return Result<CategoryDto>.Ok(ToDto(category));
    }

    public async Task<Result<bool>> DeleteAsync(int id, CancellationToken ct)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return Result<bool>.NotFound();

        var productCount = await db.Products.CountAsync(p => p.CategoryId == id, ct);
        if (productCount > 0)
            return Result<bool>.Conflict(
                $"Дар ин категория {productCount} мол ҳаст. Аввал молҳоро ба категорияи дигар гузаронед ё нест кунед (ё категорияро ғайрифаъол кунед).");

        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Categories, SiteCacheTags.Products], ct);
        if (category.IconPath is not null) await files.DeleteAsync(category.IconPath, ct);
        return Result<bool>.Ok(true);
    }

    /// <summary>Иконаро иваз мекунад. Танҳо PNG, JPEG ё WebP (аз рӯи байтҳои аввали файл санҷида мешавад).</summary>
    public async Task<Result<CategoryDto>> SetIconAsync(int id, Stream content, long length, CancellationToken ct)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return Result<CategoryDto>.NotFound();
        if (length <= 0 || length > MaxIconBytes)
            return Result<CategoryDto>.Invalid("icon", "Андозаи икона бояд то 1 MB бошад.");

        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        var extension = DetectImageExtension(buffer.GetBuffer().AsSpan(0, (int)buffer.Length));
        if (extension is null)
            return Result<CategoryDto>.Invalid("icon", "Танҳо PNG, JPEG ё WebP қабул мешавад.");

        buffer.Position = 0;
        var oldPath = category.IconPath;
        category.IconPath = await files.SaveAsync(buffer, "categories", extension, ct);
        category.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Categories, SiteCacheTags.Products], ct);
        if (oldPath is not null) await files.DeleteAsync(oldPath, ct);
        return Result<CategoryDto>.Ok(ToDto(category));
    }

    private static string? DetectImageExtension(ReadOnlySpan<byte> b)
    {
        if (b.Length >= 8 && b[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })) return "png";
        if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "jpg";
        if (b.Length >= 12 && b[..4].SequenceEqual("RIFF"u8) && b[8..12].SequenceEqual("WEBP"u8)) return "webp";
        return null;
    }

    private static (SaveCategoryRequest Request, Dictionary<string, string[]> Errors) Normalize(SaveCategoryRequest r)
    {
        var errors = new Dictionary<string, string[]>();
        var slug = (r.Slug ?? "").Trim().ToLowerInvariant();
        var name = new LocalizedNames(
            (r.Name?.Tg ?? "").Trim(), (r.Name?.Ru ?? "").Trim(), (r.Name?.En ?? "").Trim(), (r.Name?.Uz ?? "").Trim());

        if (slug.Length == 0) errors["slug"] = ["Slug ҳатмист."];
        else if (slug.Length > MaxSlugLength || !SlugRegex().IsMatch(slug))
            errors["slug"] = ["Танҳо ҳарфҳои хурди лотинӣ, рақамҳо ва \"-\" (масалан: ice-cream)."];

        foreach (var (key, value) in new[] { ("name.tg", name.Tg), ("name.ru", name.Ru), ("name.en", name.En), ("name.uz", name.Uz) })
        {
            if (value.Length == 0) errors[key] = ["Ном ҳатмист."];
            else if (value.Length > MaxNameLength) errors[key] = [$"Ном бояд то {MaxNameLength} аломат бошад."];
        }

        if (r.SortOrder is < 0 or > 100_000) errors["sortOrder"] = ["Тартиб бояд аз 0 то 100000 бошад."];

        return (r with { Slug = slug, Name = name }, errors);
    }

    private static void Apply(Category c, SaveCategoryRequest r, DateTimeOffset now)
    {
        c.Slug = r.Slug;
        c.NameTg = r.Name.Tg;
        c.NameRu = r.Name.Ru;
        c.NameEn = r.Name.En;
        c.NameUz = r.Name.Uz;
        c.SortOrder = r.SortOrder;
        c.IsActive = r.IsActive;
        c.UpdatedAt = now;
    }

    private static CategoryDto ToDto(Category c) =>
        new(c.Id, c.Slug, new LocalizedNames(c.NameTg, c.NameRu, c.NameEn, c.NameUz),
            c.IconPath, c.SortOrder, c.IsActive, c.CreatedAt, c.UpdatedAt);

    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex SlugRegex();
}
