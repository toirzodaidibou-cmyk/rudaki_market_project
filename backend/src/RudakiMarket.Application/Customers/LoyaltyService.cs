using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Customers;

/// <param name="Percent">Чанд фоиз аз нархи молҳо (баъд аз тахфиф, бе расонидан) бонус мешавад. 1 — 1000 с. → 10 с.</param>
public sealed record LoyaltyOptions(decimal Percent)
{
    public decimal BonusFor(decimal goods) =>
        goods <= 0 ? 0 : Math.Round(goods * Percent / 100m, 2, MidpointRounding.AwayFromZero);

    /// <summary>Бонуси фармоиш: аз қисме, ки бо пул пардохт шуд (бе тахфиф ва бе бонуси сарфшуда).</summary>
    public decimal EarnedFor(Order o) => BonusFor(o.Subtotal - o.Discount - o.BonusUsed);
}

/// <param name="CardNumber">Рақами корт (аз рақами мизоҷ) — "RM 0000 0002"</param>
/// <param name="Balance">Бонуси дастрас: ҷамъшуда аз фармоишҳои «Расонида шуд» − сарфшуда (фармоишҳои бекорнашуда)</param>
/// <param name="Pending">Бонуси оянда — аз фармоишҳое, ки ҳанӯз расонида нашудаанд (бекоршуда ҳисоб намешавад)</param>
/// <param name="Purchases">Шумораи харидҳои расонидашуда</param>
public sealed record LoyaltyCardDto(string CardNumber, string Phone, decimal Balance, decimal Pending, decimal Percent, int Purchases);

/// <summary>
/// Корти бонусии Рӯдакӣ: аз ҳар харид Percent % бонус; бонусро дар фармоиши нав сарф кардан мумкин аст.
/// Ҳама аз худи фармоишҳо ҳисоб мешавад (ҷадвали алоҳида нест): бонус пас аз «Расонида шуд» меояд,
/// сарф ҳангоми фармоиш банд мешавад ва агар фармоиш бекор шавад — бармегардад.
/// </summary>
public sealed class LoyaltyService(IAppDbContext db, LoyaltyOptions options)
{
    private sealed record Row(OrderStatus Status, decimal Subtotal, decimal Discount, decimal BonusUsed);

    private Task<List<Row>> RowsAsync(int customerId, CancellationToken ct) =>
        db.Orders.AsNoTracking()
            .Where(o => o.CustomerId == customerId && o.Status != OrderStatus.Cancelled)
            .Select(o => new Row(o.Status, o.Subtotal, o.Discount, o.BonusUsed))
            .ToListAsync(ct);

    private decimal Earned(Row r) => options.BonusFor(r.Subtotal - r.Discount - r.BonusUsed);

    private decimal Available(List<Row> rows) =>
        Math.Max(0, rows.Where(r => r.Status == OrderStatus.Delivered).Sum(Earned) - rows.Sum(r => r.BonusUsed));

    /// <summary>Бонуси дастрас барои сарф (дар транзаксияи фармоиш, баъд аз қулфи мизоҷ даъват шавад).</summary>
    public async Task<decimal> AvailableAsync(int customerId, CancellationToken ct) => Available(await RowsAsync(customerId, ct));

    public async Task<LoyaltyCardDto?> GetAsync(int customerId, CancellationToken ct)
    {
        var phone = await db.Customers.AsNoTracking().Where(c => c.Id == customerId).Select(c => c.Phone).FirstOrDefaultAsync(ct);
        if (phone is null) return null;

        var rows = await RowsAsync(customerId, ct);
        var pending = rows.Where(r => r.Status != OrderStatus.Delivered).Sum(Earned);
        return new LoyaltyCardDto(CardNumber(customerId), phone, Available(rows), pending, options.Percent,
            rows.Count(r => r.Status == OrderStatus.Delivered));
    }

    /// <summary>"RM 0000 0002" — 8 рақам аз Id-и мизоҷ.</summary>
    public static string CardNumber(int customerId)
    {
        var digits = customerId.ToString("D8");
        return $"RM {digits[..4]} {digits[4..]}";
    }
}
