using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Customers;

/// <param name="Percent">Чанд фоиз аз нархи молҳо (баъд аз тахфиф, бе расонидан) бонус мешавад. 1 — 1000 с. → 10 с.</param>
public sealed record LoyaltyOptions(decimal Percent)
{
    public decimal BonusFor(decimal goods) =>
        goods <= 0 ? 0 : Math.Round(goods * Percent / 100m, 2, MidpointRounding.AwayFromZero);
}

/// <param name="CardNumber">Рақами корт (аз рақами мизоҷ) — "RM 0000 0002"</param>
/// <param name="Balance">Бонуси ҷамъшуда — аз фармоишҳои «Расонида шуд»</param>
/// <param name="Pending">Бонуси оянда — аз фармоишҳое, ки ҳанӯз расонида нашудаанд (бекоршуда ҳисоб намешавад)</param>
/// <param name="Purchases">Шумораи харидҳои расонидашуда</param>
public sealed record LoyaltyCardDto(string CardNumber, string Phone, decimal Balance, decimal Pending, decimal Percent, int Purchases);

/// <summary>
/// Корти бонусии Рӯдакӣ: аз ҳар харид Percent % бонус. Бонус аз худи фармоишҳо ҳисоб мешавад (ҷадвали алоҳида нест) —
/// бекор шудани фармоиш ё иваз шудани ҳолат худкор ба ҳисоб гирифта мешавад.
/// </summary>
public sealed class LoyaltyService(IAppDbContext db, LoyaltyOptions options)
{
    public async Task<LoyaltyCardDto?> GetAsync(int customerId, CancellationToken ct)
    {
        var phone = await db.Customers.AsNoTracking().Where(c => c.Id == customerId).Select(c => c.Phone).FirstOrDefaultAsync(ct);
        if (phone is null) return null;

        var orders = await db.Orders.AsNoTracking()
            .Where(o => o.CustomerId == customerId && o.Status != OrderStatus.Cancelled)
            .Select(o => new { o.Status, Goods = o.Subtotal - o.Discount })
            .ToListAsync(ct);

        // Бонус барои ҳар фармоиш алоҳида яклухт мешавад — ҳамон рақам, ки дар экрани фармоиш нишон дода шуд
        var delivered = orders.Where(o => o.Status == OrderStatus.Delivered).ToList();
        var balance = delivered.Sum(o => options.BonusFor(o.Goods));
        var pending = orders.Where(o => o.Status != OrderStatus.Delivered).Sum(o => options.BonusFor(o.Goods));
        return new LoyaltyCardDto(CardNumber(customerId), phone, balance, pending, options.Percent, delivered.Count);
    }

    /// <summary>"RM 0000 0002" — 8 рақам аз Id-и мизоҷ.</summary>
    public static string CardNumber(int customerId)
    {
        var digits = customerId.ToString("D8");
        return $"RM {digits[..4]} {digits[4..]}";
    }
}
