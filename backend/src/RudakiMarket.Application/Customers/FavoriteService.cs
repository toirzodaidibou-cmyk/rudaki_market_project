using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Categories;
using RudakiMarket.Application.Common;
using RudakiMarket.Application.Products;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Customers;

/// <summary>Писандидаҳои мизоҷ (❤️). Танҳо молҳои фаъол дар категорияҳои фаъол нишон дода мешаванд.</summary>
public sealed class FavoriteService(IAppDbContext db, TimeProvider clock)
{
    public const int MaxFavorites = 500;

    private IQueryable<Favorite> Visible(int customerId) =>
        db.Favorites.AsNoTracking()
            .Where(f => f.CustomerId == customerId && f.Product!.IsActive && f.Product.Category!.IsActive);

    public async Task<IReadOnlyList<int>> IdsAsync(int customerId, CancellationToken ct) =>
        await Visible(customerId).Select(f => f.ProductId).ToListAsync(ct);

    public async Task<IReadOnlyList<PublicProductDto>> ListAsync(int customerId, CancellationToken ct) =>
        await Visible(customerId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new PublicProductDto(
                f.Product!.Id,
                new LocalizedNames(f.Product.NameTg, f.Product.NameRu, f.Product.NameEn, f.Product.NameUz),
                f.Product.Price, f.Product.OldPrice, f.Product.SizeLabel, f.Product.IsNew,
                f.Product.Images.OrderBy(i => i.SortOrder).Select(i => i.ThumbPath).Take(3).ToList()))
            .ToListAsync(ct);

    /// <summary>Илова кардан (агар аллакай бошад — ҳеҷ чиз намешавад).</summary>
    public async Task<Result<bool>> AddAsync(int customerId, int productId, CancellationToken ct)
    {
        var exists = await db.Products.AnyAsync(p => p.Id == productId && p.IsActive && p.Category!.IsActive, ct);
        if (!exists) return Result<bool>.NotFound();
        if (await db.Favorites.AnyAsync(f => f.CustomerId == customerId && f.ProductId == productId, ct))
            return Result<bool>.Ok(true);
        if (await db.Favorites.CountAsync(f => f.CustomerId == customerId, ct) >= MaxFavorites)
            return Result<bool>.Invalid("favorites", "too_many");

        db.Favorites.Add(new Favorite { CustomerId = customerId, ProductId = productId, CreatedAt = clock.GetUtcNow() });
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Ду дархости ҳамзамон (масалан, ду клик) — сатр аллакай ҳаст, ин хато нест
        }
        return Result<bool>.Ok(true);
    }

    public async Task RemoveAsync(int customerId, int productId, CancellationToken ct) =>
        await db.Favorites.Where(f => f.CustomerId == customerId && f.ProductId == productId).ExecuteDeleteAsync(ct);
}
