using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Categories;
using RudakiMarket.Application.Common;
using RudakiMarket.Application.Orders;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Customers;

/// <param name="Available">false — мол пинҳон шудааст (дар маблағ ҳисоб намешавад)</param>
public sealed record CartItemDto(
    int ProductId, LocalizedNames Name, decimal Price, decimal? OldPrice, string? SizeLabel, string? Image, int Quantity, bool Available);

/// <param name="DeliveryFee">Нархи расонидан барои ҳамин сабад (0 — ройгон)</param>
/// <param name="FreeDeliveryFrom">Аз ин маблағ расонидан ройгон аст</param>
/// <param name="DeliveryPrice">Нархи расонидан, вақте ки ройгон нест (барои ҳисоби фаврӣ дар сайт)</param>
public sealed record CartDto(IReadOnlyList<CartItemDto> Items, int TotalQuantity, decimal TotalPrice, decimal DeliveryFee, decimal FreeDeliveryFrom, decimal DeliveryPrice);

/// <summary>Натиҷаи "Боз харидан": сабади нав + номи молҳое, ки дигар дар фурӯш нестанд.</summary>
public sealed record ReorderResult(CartDto Cart, IReadOnlyList<string> Unavailable);

/// <summary>Сабади мизоҷ. Нарх ҳамеша аз база (нархи ҷорӣ), на аз браузер.</summary>
public sealed class CartService(IAppDbContext db, DeliveryOptions delivery, TimeProvider clock)
{
    public const int MaxQuantity = 99;
    public const int MaxItems = 200;

    public async Task<CartDto> GetAsync(int customerId, CancellationToken ct)
    {
        var items = await db.CartItems.AsNoTracking()
            .Where(c => c.CustomerId == customerId)
            .OrderByDescending(c => c.AddedAt)
            .Select(c => new CartItemDto(
                c.ProductId,
                new LocalizedNames(c.Product!.NameTg, c.Product.NameRu, c.Product.NameEn, c.Product.NameUz),
                c.Product.Price, c.Product.OldPrice, c.Product.SizeLabel,
                c.Product.Images.OrderBy(i => i.SortOrder).Select(i => i.ThumbPath).FirstOrDefault(),
                c.Quantity,
                c.Product.IsActive && c.Product.Category!.IsActive))
            .ToListAsync(ct);

        var available = items.Where(i => i.Available).ToList();
        var subtotal = available.Sum(i => i.Price * i.Quantity);
        return new CartDto(items, available.Sum(i => i.Quantity), subtotal, delivery.FeeFor(subtotal), delivery.FreeDeliveryFrom, delivery.DeliveryFee);
    }

    /// <summary>Миқдори молро муқаррар мекунад (0 — нест мекунад). Агар мол дар сабад набошад — илова мешавад.</summary>
    public async Task<Result<CartDto>> SetQuantityAsync(int customerId, int productId, int quantity, CancellationToken ct)
    {
        if (quantity < 0 || quantity > MaxQuantity)
            return Result<CartDto>.Invalid("quantity", "invalid_quantity");

        var item = await db.CartItems.FirstOrDefaultAsync(c => c.CustomerId == customerId && c.ProductId == productId, ct);
        var now = clock.GetUtcNow();

        if (quantity == 0)
        {
            if (item is not null)
            {
                db.CartItems.Remove(item);
                await db.SaveChangesAsync(ct);
            }
            return Result<CartDto>.Ok(await GetAsync(customerId, ct));
        }

        if (item is null)
        {
            var available = await db.Products.AnyAsync(p => p.Id == productId && p.IsActive && p.Category!.IsActive, ct);
            if (!available) return Result<CartDto>.NotFound();
            if (await db.CartItems.CountAsync(c => c.CustomerId == customerId, ct) >= MaxItems)
                return Result<CartDto>.Invalid("cart", "too_many");
            db.CartItems.Add(new CartItem { CustomerId = customerId, ProductId = productId, Quantity = quantity, AddedAt = now, UpdatedAt = now });
        }
        else
        {
            item.Quantity = quantity;
            item.UpdatedAt = now;
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Ду дархости ҳамзамон барои ҳамон мол — сатр аллакай ҳаст; ҳолати ҷориро бармегардонем
        }
        return Result<CartDto>.Ok(await GetAsync(customerId, ct));
    }

    /// <summary>
    /// "Боз харидан": молҳои фармоиши гузашта (агар ҳоло дар фурӯш бошанд) ба сабад илова мешаванд —
    /// миқдор ба миқдори ҳозираи сабад ҷамъ мешавад (то 99). Молҳои дигар номашон бармегардад.
    /// </summary>
    public async Task<Result<ReorderResult>> ReorderAsync(int customerId, int orderNumber, CancellationToken ct)
    {
        var lines = await db.OrderItems.AsNoTracking()
            .Where(i => i.OrderId == orderNumber && db.Orders.Any(o => o.Id == orderNumber && o.CustomerId == customerId))
            .Select(i => new { i.ProductId, i.Name, i.Quantity })
            .ToListAsync(ct);
        if (lines.Count == 0) return Result<ReorderResult>.NotFound();

        var ids = lines.Where(l => l.ProductId != null).Select(l => l.ProductId!.Value).Distinct().ToList();
        var activeIds = await db.Products.AsNoTracking()
            .Where(p => ids.Contains(p.Id) && p.IsActive && p.Category!.IsActive)
            .Select(p => p.Id).ToListAsync(ct);
        var cart = await db.CartItems.Where(c => c.CustomerId == customerId).ToListAsync(ct);
        var now = clock.GetUtcNow();
        var unavailable = new List<string>();

        foreach (var line in lines)
        {
            if (line.ProductId is not { } pid || !activeIds.Contains(pid)) { unavailable.Add(line.Name); continue; }
            var item = cart.FirstOrDefault(c => c.ProductId == pid);
            if (item is null)
            {
                if (cart.Count >= MaxItems) { unavailable.Add(line.Name); continue; }
                item = new CartItem { CustomerId = customerId, ProductId = pid, Quantity = 0, AddedAt = now };
                db.CartItems.Add(item);
                cart.Add(item);
            }
            item.Quantity = Math.Min(MaxQuantity, item.Quantity + line.Quantity);
            item.UpdatedAt = now;
        }
        await db.SaveChangesAsync(ct);
        return Result<ReorderResult>.Ok(new ReorderResult(await GetAsync(customerId, ct), unavailable));
    }

    public async Task<CartDto> ClearAsync(int customerId, CancellationToken ct)
    {
        await db.CartItems.Where(c => c.CustomerId == customerId).ExecuteDeleteAsync(ct);
        return new CartDto([], 0, 0, delivery.FeeFor(0), delivery.FreeDeliveryFrom, delivery.DeliveryFee);
    }
}
