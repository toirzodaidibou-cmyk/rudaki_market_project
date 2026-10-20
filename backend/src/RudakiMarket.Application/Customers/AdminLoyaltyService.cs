using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Common;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Customers;

/// <param name="Balance">Бонуси дастрас (мисли корти мизоҷ): ҷамъшуда − сарфшуда</param>
/// <param name="Pending">Бонуси оянда — аз фармоишҳои ҳанӯз расонида нашуда</param>
public sealed record AdminLoyaltyRow(
    int CustomerId, string CardNumber, string Phone, DateTimeOffset RegisteredAt,
    decimal Balance, decimal Pending, decimal Earned, decimal Spent, int Purchases, DateTimeOffset? LastOrderAt);

/// <param name="Outstanding">Ҳамаи бонусҳои дастрас дар кортҳо (қарзи мағоза ба мизоҷон)</param>
public sealed record AdminLoyaltySummary(
    decimal Percent, int Customers, int WithBonus, decimal Outstanding, decimal Pending, decimal Earned, decimal Spent);

public sealed record AdminLoyaltyPage(AdminLoyaltySummary Summary, PagedResult<AdminLoyaltyRow> Rows);

/// <summary>
/// Админ → «Бонусҳо»: бонуси ҳар мизоҷ ва ҷамъбаст. Ҳисоб дар база (бо ҳамон яклухткунӣ, ки дар корти мизоҷ:
/// round(молҳо − тахфиф − бонуси сарфшуда) × % / 100, 2 рақам), бекоршуда ҳисоб намешавад.
/// </summary>
public sealed class AdminLoyaltyService(IAppDbContext db, LoyaltyOptions options)
{
    public const int PageSize = 30;

    /// <param name="sort">balance (пешфарз) | pending | purchases | recent</param>
    public async Task<AdminLoyaltyPage> ListAsync(string? q, string? sort, int page, CancellationToken ct)
    {
        page = Math.Max(1, page);
        var pct = options.Percent;
        // Як сатр барои ҳар мизоҷе, ки фармоиш дорад (GROUP BY customer_id дар база)
        var agg = db.Orders.AsNoTracking()
            .Where(o => o.Status != OrderStatus.Cancelled)
            .GroupBy(o => o.CustomerId)
            .Select(g => new
            {
                CustomerId = g.Key,
                Earned = g.Sum(o => o.Status == OrderStatus.Delivered ? Math.Round((o.Subtotal - o.Discount - o.BonusUsed) * pct / 100m, 2) : 0m),
                Pending = g.Sum(o => o.Status != OrderStatus.Delivered ? Math.Round((o.Subtotal - o.Discount - o.BonusUsed) * pct / 100m, 2) : 0m),
                Spent = g.Sum(o => o.BonusUsed),
                Purchases = g.Count(o => o.Status == OrderStatus.Delivered),
                LastOrderAt = g.Max(o => o.CreatedAt),
            });

        // Ду дархости оддӣ (GROUP BY ва рӯйхати мизоҷон), пайваст ва тартиб — дар хотира.
        // EF Core left join-и гурӯҳбандиро дар ORDER BY ба SQL табдил намедиҳад; барои шумораи мизоҷони мағоза ин сабук аст.
        var stats = (await agg.ToListAsync(ct)).ToDictionary(a => a.CustomerId);
        var customers = db.Customers.AsNoTracking();
        var digits = new string((q ?? "").Where(char.IsAsciiDigit).ToArray());
        if (digits.Length > 0) customers = customers.Where(c => c.Phone.Contains(digits));
        var people = await customers.Select(c => new { c.Id, c.Phone, c.CreatedAt }).ToListAsync(ct);

        var all = people.Select(c =>
        {
            var a = stats.GetValueOrDefault(c.Id);
            var earned = a?.Earned ?? 0;
            var spent = a?.Spent ?? 0;
            return new AdminLoyaltyRow(
                c.Id, LoyaltyService.CardNumber(c.Id), c.Phone, c.CreatedAt,
                Math.Max(0, earned - spent), a?.Pending ?? 0, earned, spent, a?.Purchases ?? 0, a?.LastOrderAt);
        }).ToList();

        var summary = new AdminLoyaltySummary(
            pct,
            await db.Customers.CountAsync(ct),
            stats.Values.Count(x => x.Earned - x.Spent > 0),
            stats.Values.Sum(x => Math.Max(0, x.Earned - x.Spent)),
            stats.Values.Sum(x => x.Pending),
            stats.Values.Sum(x => x.Earned),
            stats.Values.Sum(x => x.Spent));

        IEnumerable<AdminLoyaltyRow> sorted = sort switch
        {
            "pending" => all.OrderByDescending(x => x.Pending).ThenByDescending(x => x.CustomerId),
            "purchases" => all.OrderByDescending(x => x.Purchases).ThenByDescending(x => x.CustomerId),
            "recent" => all.OrderByDescending(x => x.RegisteredAt).ThenByDescending(x => x.CustomerId),
            _ => all.OrderByDescending(x => x.Balance).ThenByDescending(x => x.Pending).ThenByDescending(x => x.CustomerId),
        };
        var items = sorted.Skip((page - 1) * PageSize).Take(PageSize).ToList();
        return new AdminLoyaltyPage(summary, new PagedResult<AdminLoyaltyRow>(items, all.Count, page, PageSize));
    }
}
