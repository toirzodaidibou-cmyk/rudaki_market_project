using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Categories;
using RudakiMarket.Application.Common;
using RudakiMarket.Application.Products;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Bundles;

/// <summary>Корти маҷмӯа дар сайт: нарх — ҷамъи нархҳои ҷории молҳои дар фурӯш буда.</summary>
/// <param name="Total">Нарх бо тахфиф</param>
/// <param name="FullTotal">Нарх бе тахфиф (ҷамъи молҳо)</param>
/// <param name="DiscountPercent">0 — тахфиф нест (ё яке аз молҳо дар фурӯш нест)</param>
public sealed record PublicBundleDto(
    int Id, LocalizedNames Name, LocalizedNames Description, string Emoji,
    decimal Total, decimal FullTotal, int DiscountPercent, int ItemCount, IReadOnlyList<string> Images);

public sealed record PublicBundleItemDto(PublicProductDto Product, int Quantity);

public sealed record PublicBundleDetailDto(
    int Id, LocalizedNames Name, LocalizedNames Description, string Emoji,
    decimal Total, decimal FullTotal, int DiscountPercent, IReadOnlyList<PublicBundleItemDto> Items);

public sealed record BundleItemRequest(int ProductId, int Quantity);

public sealed record SaveBundleRequest(
    LocalizedNames Name, LocalizedNames? Description, string? Emoji, int DiscountPercent, int SortOrder, bool IsActive,
    IReadOnlyList<BundleItemRequest>? Items);

public sealed record AdminBundleItemDto(int ProductId, LocalizedNames Name, string? SizeLabel, decimal Price, bool IsActive, string? Thumb, int Quantity);

public sealed record AdminBundleDto(
    int Id, LocalizedNames Name, LocalizedNames Description, string Emoji, int DiscountPercent, int SortOrder, bool IsActive,
    decimal Total, IReadOnlyList<AdminBundleItemDto> Items);

/// <summary>Маҷмӯаҳо: "Дастархони чой", "Ош барои 10 нафар" — якчанд мол бо як тугма ба сабад.</summary>
public sealed class BundleService(IAppDbContext db, ISiteCache siteCache, TimeProvider clock)
{
    public const int MaxItems = 40;
    private const int MaxNameLength = 120;
    private const int MaxDescriptionLength = 300;

    // --- Сайт ---

    /// <summary>Маҷмӯаҳои фаъол, ки ақаллан як моли дар фурӯш доранд (тартиб: SortOrder).</summary>
    public async Task<IReadOnlyList<PublicBundleDto>> ListPublicAsync(CancellationToken ct)
    {
        var rows = await db.Bundles.AsNoTracking()
            .Where(b => b.IsActive)
            .OrderBy(b => b.SortOrder).ThenBy(b => b.Id)
            .Select(b => new
            {
                b.Id, b.NameTg, b.NameRu, b.NameEn, b.NameUz, b.DescriptionTg, b.DescriptionRu, b.DescriptionEn, b.DescriptionUz, b.Emoji,
                // Тахфиф танҳо вақте ки ҳамаи молҳо дар фурӯшанд (вагарна маҷмӯаро пурра ҷамъ кардан мумкин нест)
                Percent = b.Items.All(i => i.Product!.IsActive && i.Product.Category!.IsActive) ? b.DiscountPercent : 0,
                Items = b.Items
                    .Where(i => i.Product!.IsActive && i.Product.Category!.IsActive)
                    .OrderBy(i => i.SortOrder)
                    .Select(i => new
                    {
                        i.Quantity, i.Product!.Price,
                        Thumb = i.Product.Images.OrderBy(img => img.SortOrder).Select(img => img.ThumbPath).FirstOrDefault(),
                    }).ToList(),
            })
            .ToListAsync(ct);

        return rows.Where(b => b.Items.Count > 0).Select(b => new PublicBundleDto(
            b.Id, new LocalizedNames(b.NameTg, b.NameRu, b.NameEn, b.NameUz),
            new LocalizedNames(b.DescriptionTg ?? "", b.DescriptionRu ?? "", b.DescriptionEn ?? "", b.DescriptionUz ?? ""),
            b.Emoji, BundleDiscounts.DiscountedTotal(b.Items.Sum(i => i.Price * i.Quantity), b.Percent), b.Items.Sum(i => i.Price * i.Quantity),
            b.Percent, b.Items.Sum(i => i.Quantity),
            b.Items.Where(i => i.Thumb != null).Select(i => i.Thumb!).Take(4).ToList())).ToList();
    }

    public async Task<Result<PublicBundleDetailDto>> GetPublicAsync(int id, CancellationToken ct)
    {
        var b = await db.Bundles.AsNoTracking()
            .Where(x => x.Id == id && x.IsActive)
            .Select(x => new
            {
                x.Id, x.NameTg, x.NameRu, x.NameEn, x.NameUz, x.DescriptionTg, x.DescriptionRu, x.DescriptionEn, x.DescriptionUz, x.Emoji,
                Percent = x.Items.All(i => i.Product!.IsActive && i.Product.Category!.IsActive) ? x.DiscountPercent : 0,
                Items = x.Items
                    .Where(i => i.Product!.IsActive && i.Product.Category!.IsActive)
                    .OrderBy(i => i.SortOrder)
                    .Select(i => new PublicBundleItemDto(
                        new PublicProductDto(
                            i.Product!.Id, new LocalizedNames(i.Product.NameTg, i.Product.NameRu, i.Product.NameEn, i.Product.NameUz),
                            i.Product.Price, i.Product.OldPrice, i.Product.SizeLabel, i.Product.IsNew,
                            i.Product.Images.OrderBy(img => img.SortOrder).Select(img => img.ThumbPath).Take(3).ToList()),
                        i.Quantity)).ToList(),
            })
            .FirstOrDefaultAsync(ct);
        if (b is null || b.Items.Count == 0) return Result<PublicBundleDetailDto>.NotFound();
        return Result<PublicBundleDetailDto>.Ok(new PublicBundleDetailDto(
            b.Id, new LocalizedNames(b.NameTg, b.NameRu, b.NameEn, b.NameUz),
            new LocalizedNames(b.DescriptionTg ?? "", b.DescriptionRu ?? "", b.DescriptionEn ?? "", b.DescriptionUz ?? ""),
            b.Emoji, BundleDiscounts.DiscountedTotal(b.Items.Sum(i => i.Product.Price * i.Quantity), b.Percent),
            b.Items.Sum(i => i.Product.Price * i.Quantity), b.Percent, b.Items));
    }

    // --- Админ ---

    public async Task<IReadOnlyList<AdminBundleDto>> ListAsync(CancellationToken ct)
    {
        var bundles = await Query().OrderBy(b => b.SortOrder).ThenBy(b => b.Id).ToListAsync(ct);
        return bundles.Select(ToDto).ToList();
    }

    public async Task<Result<AdminBundleDto>> GetAsync(int id, CancellationToken ct)
    {
        var b = await Query().FirstOrDefaultAsync(x => x.Id == id, ct);
        return b is null ? Result<AdminBundleDto>.NotFound() : Result<AdminBundleDto>.Ok(ToDto(b));
    }

    public async Task<Result<AdminBundleDto>> CreateAsync(SaveBundleRequest request, CancellationToken ct)
    {
        var errors = await ValidateAsync(request, ct);
        if (errors.Count > 0) return Result<AdminBundleDto>.Invalid(errors);
        var now = clock.GetUtcNow();
        var bundle = new Bundle { CreatedAt = now };
        Apply(bundle, request, now);
        db.Bundles.Add(bundle);
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Bundles], ct);
        return await GetAsync(bundle.Id, ct);
    }

    public async Task<Result<AdminBundleDto>> UpdateAsync(int id, SaveBundleRequest request, CancellationToken ct)
    {
        var bundle = await db.Bundles.Include(b => b.Items).FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bundle is null) return Result<AdminBundleDto>.NotFound();
        var errors = await ValidateAsync(request, ct);
        if (errors.Count > 0) return Result<AdminBundleDto>.Invalid(errors);
        db.BundleItems.RemoveRange(bundle.Items);
        bundle.Items.Clear();
        Apply(bundle, request, clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Bundles], ct);
        return await GetAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var bundle = await db.Bundles.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bundle is null) return false;
        db.Bundles.Remove(bundle);
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Bundles], ct);
        return true;
    }

    private IQueryable<Bundle> Query() => db.Bundles.AsNoTracking()
        .Include(b => b.Items.OrderBy(i => i.SortOrder)).ThenInclude(i => i.Product!).ThenInclude(p => p.Images);

    private static AdminBundleDto ToDto(Bundle b)
    {
        var items = b.Items.Select(i => new AdminBundleItemDto(
            i.ProductId, new LocalizedNames(i.Product!.NameTg, i.Product.NameRu, i.Product.NameEn, i.Product.NameUz),
            i.Product.SizeLabel, i.Product.Price, i.Product.IsActive,
            i.Product.Images.OrderBy(img => img.SortOrder).Select(img => img.ThumbPath).FirstOrDefault(),
            i.Quantity)).ToList();
        return new AdminBundleDto(
            b.Id, new LocalizedNames(b.NameTg, b.NameRu, b.NameEn, b.NameUz),
            new LocalizedNames(b.DescriptionTg ?? "", b.DescriptionRu ?? "", b.DescriptionEn ?? "", b.DescriptionUz ?? ""),
            b.Emoji, b.DiscountPercent, b.SortOrder, b.IsActive, items.Where(i => i.IsActive).Sum(i => i.Price * i.Quantity), items);
    }

    private static void Apply(Bundle b, SaveBundleRequest r, DateTimeOffset now)
    {
        var tg = r.Name.Tg.Trim();
        string Or(string? v) => string.IsNullOrWhiteSpace(v) ? tg : v.Trim();
        b.NameTg = tg;
        b.NameRu = Or(r.Name.Ru);
        b.NameEn = Or(r.Name.En);
        b.NameUz = Or(r.Name.Uz);
        string? D(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
        b.DescriptionTg = D(r.Description?.Tg);
        b.DescriptionRu = D(r.Description?.Ru);
        b.DescriptionEn = D(r.Description?.En);
        b.DescriptionUz = D(r.Description?.Uz);
        b.Emoji = string.IsNullOrWhiteSpace(r.Emoji) ? "🧺" : r.Emoji.Trim();
        b.DiscountPercent = r.DiscountPercent;
        b.SortOrder = r.SortOrder;
        b.IsActive = r.IsActive;
        b.UpdatedAt = now;
        var order = 0;
        foreach (var item in (r.Items ?? []).GroupBy(i => i.ProductId).Select(g => g.First()))
            b.Items.Add(new BundleItem { ProductId = item.ProductId, Quantity = item.Quantity, SortOrder = order++ });
    }

    private async Task<Dictionary<string, string[]>> ValidateAsync(SaveBundleRequest r, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        if (r.Name is null || string.IsNullOrWhiteSpace(r.Name.Tg)) errors["name.tg"] = ["Номи тоҷикӣ ҳатмист."];
        foreach (var (key, v) in new[] { ("name.tg", r.Name?.Tg), ("name.ru", r.Name?.Ru), ("name.en", r.Name?.En), ("name.uz", r.Name?.Uz) })
            if (v is { Length: > MaxNameLength }) errors[key] = [$"То {MaxNameLength} аломат."];
        foreach (var (key, v) in new[] { ("description.tg", r.Description?.Tg), ("description.ru", r.Description?.Ru), ("description.en", r.Description?.En), ("description.uz", r.Description?.Uz) })
            if (v is { Length: > MaxDescriptionLength }) errors[key] = [$"То {MaxDescriptionLength} аломат."];
        if (r.Emoji is { Length: > 16 }) errors["emoji"] = ["Як emoji."];
        if (r.DiscountPercent is < 0 or > BundleDiscounts.MaxPercent) errors["discountPercent"] = [$"Тахфиф аз 0 то {BundleDiscounts.MaxPercent} %."];

        var items = r.Items ?? [];
        if (items.Count == 0) errors["items"] = ["Ақаллан як мол илова кунед."];
        else if (items.Count > MaxItems) errors["items"] = [$"То {MaxItems} мол."];
        else if (items.Any(i => i.Quantity is < 1 or > 99)) errors["items"] = ["Миқдор бояд аз 1 то 99 бошад."];
        else
        {
            var ids = items.Select(i => i.ProductId).Distinct().ToList();
            var found = await db.Products.CountAsync(p => ids.Contains(p.Id), ct);
            if (found != ids.Count) errors["items"] = ["Баъзе молҳо ёфт нашуданд."];
        }
        return errors;
    }
}
