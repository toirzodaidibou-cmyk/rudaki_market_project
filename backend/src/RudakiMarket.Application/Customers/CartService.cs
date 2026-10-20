using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Bundles;
using RudakiMarket.Application.Categories;
using RudakiMarket.Application.Common;
using RudakiMarket.Application.Orders;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Customers;

/// <param name="Available">false — мол пинҳон шудааст (дар маблағ ҳисоб намешавад)</param>
public sealed record CartItemDto(
    int ProductId, LocalizedNames Name, decimal Price, decimal? OldPrice, string? SizeLabel, string? Image, int Quantity, bool Available);

/// <param name="TotalPrice">Нархи молҳо бе тахфиф</param>
/// <param name="Discount">Тахфифи маҷмӯаҳо (ҷамъи Discounts)</param>
/// <param name="DeliveryFee">Нархи расонидан барои ҳамин сабад (0 — ройгон), аз маблағи баъд аз тахфиф</param>
/// <param name="FreeDeliveryFrom">Аз ин маблағ расонидан ройгон аст</param>
/// <param name="DeliveryPrice">Нархи расонидан, вақте ки ройгон нест (барои ҳисоби фаврӣ дар сайт)</param>
public sealed record CartDto(
    IReadOnlyList<CartItemDto> Items, int TotalQuantity, decimal TotalPrice, decimal Discount,
    IReadOnlyList<AppliedBundleDiscount> Discounts, decimal DeliveryFee, decimal FreeDeliveryFrom, decimal DeliveryPrice);

/// <summary>Сатри сабади меҳмон (аз браузер).</summary>
public sealed record CartLineInput(int ProductId, int Quantity);

/// <summary>Натиҷаи "Боз харидан": сабади нав + номи молҳое, ки дигар дар фурӯш нестанд.</summary>
public sealed record ReorderResult(CartDto Cart, IReadOnlyList<string> Unavailable);

/// <summary>Сабади мизоҷ. Нарх ҳамеша аз база (нархи ҷорӣ), на аз браузер.</summary>
public sealed class CartService(IAppDbContext db, DeliveryOptions delivery, BundleDiscounts discounts, TimeProvider clock)
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
        return await SummarizeAsync(items, ct);
    }

    private async Task<CartDto> SummarizeAsync(IReadOnlyList<CartItemDto> items, CancellationToken ct)
    {
        var available = items.Where(i => i.Available).ToList();
        var subtotal = available.Sum(i => i.Price * i.Quantity);
        var applied = await discounts.CalculateAsync(available.Select(i => new DiscountLine(i.ProductId, i.Price, i.Quantity)).ToList(), ct);
        var discount = applied.Sum(d => d.Amount);
        return new CartDto(items, available.Sum(i => i.Quantity), subtotal, discount, applied,
            delivery.FeeFor(subtotal - discount), delivery.FreeDeliveryFrom, delivery.DeliveryFee);
    }

    /// <summary>Сатрҳои браузер → то 200 моли гуногун, миқдор 1–99 (сатрҳои нодуруст партофта мешаванд).</summary>
    private static List<CartLineInput> Clean(IReadOnlyList<CartLineInput> lines) =>
        lines.Where(l => l is { ProductId: > 0, Quantity: > 0 })
            .DistinctBy(l => l.ProductId)
            .Take(MaxItems)
            .Select(l => l with { Quantity = Math.Min(MaxQuantity, l.Quantity) })
            .ToList();

    /// <summary>
    /// Сабади меҳмон: молҳо дар браузер нигоҳ дошта мешаванд, нарх, ном, сурат ва дастрасӣ — аз база.
    /// Молҳои нестшуда дар ҷавоб намеоянд (сайт онҳоро аз сабад мебарорад). Тартиб — мисли браузер.
    /// </summary>
    public async Task<CartDto> PreviewAsync(IReadOnlyList<CartLineInput> input, CancellationToken ct)
    {
        var lines = Clean(input);
        var ids = lines.Select(l => l.ProductId).ToList();
        var products = await db.Products.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .Select(p => new
            {
                p.Id,
                Name = new LocalizedNames(p.NameTg, p.NameRu, p.NameEn, p.NameUz),
                p.Price, p.OldPrice, p.SizeLabel,
                Image = p.Images.OrderBy(i => i.SortOrder).Select(i => i.ThumbPath).FirstOrDefault(),
                Available = p.IsActive && p.Category!.IsActive,
            })
            .ToDictionaryAsync(p => p.Id, ct);

        var items = new List<CartItemDto>();
        foreach (var l in lines)
            if (products.TryGetValue(l.ProductId, out var p))
                items.Add(new CartItemDto(p.Id, p.Name, p.Price, p.OldPrice, p.SizeLabel, p.Image, l.Quantity, p.Available));
        return await SummarizeAsync(items, ct);
    }

    /// <summary>
    /// Баъд аз даромад сабади меҳмон ба сабади аккаунт ҳамроҳ мешавад. Агар мол дар ҳарду бошад —
    /// миқдори калонтар (на ҷамъ: як мол ду бор гузошта нашавад). Танҳо молҳои дар фурӯш буда.
    /// </summary>
    public async Task<CartDto> MergeAsync(int customerId, IReadOnlyList<CartLineInput> input, CancellationToken ct)
    {
        var lines = Clean(input);
        if (lines.Count > 0)
        {
            var ids = lines.Select(l => l.ProductId).ToList();
            var activeIds = (await db.Products.AsNoTracking()
                .Where(p => ids.Contains(p.Id) && p.IsActive && p.Category!.IsActive)
                .Select(p => p.Id).ToListAsync(ct)).ToHashSet();
            var cart = await db.CartItems.Where(c => c.CustomerId == customerId).ToListAsync(ct);
            var now = clock.GetUtcNow();

            // Аз охир: дар браузер навтарин аввал аст — пас аз ҳамроҳшавӣ ҳам навтарин дар боло мемонад
            foreach (var line in Enumerable.Reverse(lines).Where(l => activeIds.Contains(l.ProductId)))
            {
                var item = cart.FirstOrDefault(c => c.ProductId == line.ProductId);
                if (item is null)
                {
                    if (cart.Count >= MaxItems) continue;
                    item = new CartItem { CustomerId = customerId, ProductId = line.ProductId, AddedAt = now };
                    now = now.AddTicks(1);
                    db.CartItems.Add(item);
                    cart.Add(item);
                }
                item.Quantity = Math.Max(item.Quantity, line.Quantity);
                item.UpdatedAt = now;
            }
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // Дархости ҳамзамон ҳамон молро илова кард — ҳолати ҷориро бармегардонем
            }
        }
        return await GetAsync(customerId, ct);
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
            .Select(i => new CartLine(i.ProductId, i.Name, i.Quantity))
            .ToListAsync(ct);
        if (lines.Count == 0) return Result<ReorderResult>.NotFound();
        return Result<ReorderResult>.Ok(await AddLinesAsync(customerId, lines, ct));
    }

    /// <summary>
    /// "Ҳамаашро ба сабад": молҳои маҷмӯа (агар ҳоло дар фурӯш бошанд) — мисли "Боз харидан".
    /// Маҷмӯаи пинҳон ё нест → NotFound.
    /// </summary>
    public async Task<Result<ReorderResult>> AddBundleAsync(int customerId, int bundleId, CancellationToken ct)
    {
        if (!await db.Bundles.AnyAsync(b => b.Id == bundleId && b.IsActive, ct)) return Result<ReorderResult>.NotFound();
        var lines = await db.BundleItems.AsNoTracking()
            .Where(i => i.BundleId == bundleId)
            .OrderBy(i => i.SortOrder)
            .Select(i => new CartLine(i.ProductId, i.Product!.NameTg, i.Quantity))
            .ToListAsync(ct);
        if (lines.Count == 0) return Result<ReorderResult>.NotFound();
        return Result<ReorderResult>.Ok(await AddLinesAsync(customerId, lines, ct));
    }

    private sealed record CartLine(int? ProductId, string Name, int Quantity);

    /// <summary>Сатрҳоро ба сабад ҷамъ мекунад (то 99 дона, то 200 мол); молҳои дар фурӯш набуда — дар Unavailable.</summary>
    private async Task<ReorderResult> AddLinesAsync(int customerId, IReadOnlyList<CartLine> lines, CancellationToken ct)
    {
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
        return new ReorderResult(await GetAsync(customerId, ct), unavailable);
    }

    public async Task<CartDto> ClearAsync(int customerId, CancellationToken ct)
    {
        await db.CartItems.Where(c => c.CustomerId == customerId).ExecuteDeleteAsync(ct);
        return new CartDto([], 0, 0, 0, [], delivery.FeeFor(0), delivery.FreeDeliveryFrom, delivery.DeliveryFee);
    }
}
