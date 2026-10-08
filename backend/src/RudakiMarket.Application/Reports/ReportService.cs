using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Orders;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Reports;

public sealed record SalesSummary(decimal Revenue, int Orders, decimal AverageOrder);

public sealed record DailySales(string Date, decimal Revenue, int Orders);

public sealed record TopProduct(int? ProductId, string Name, int Quantity, decimal Revenue, string? Image);

public sealed record PaymentShare(string Method, int Orders, decimal Revenue);

public sealed record CustomerStats(int Buyers, int NewBuyers, int RepeatBuyers);

public sealed record SalesReport(
    SalesSummary Today, SalesSummary Week, SalesSummary Month,
    IReadOnlyList<DailySales> Daily, IReadOnlyList<TopProduct> TopProducts,
    IReadOnlyList<PaymentShare> Payments, CustomerStats Customers, int CancelledInMonth);

/// <summary>
/// Ҳисобот барои соҳиби мағоза: фурӯши имрӯз / 7 рӯз / 30 рӯз (соати Душанбе), график, молҳои пурфурӯш,
/// тарзҳои пардохт ва мизоҷон. Фармоишҳои "Бекор шуд" ба фурӯш дохил намешаванд.
/// </summary>
public sealed class ReportService(IAppDbContext db, DeliveryScheduleOptions schedule, TimeProvider clock)
{
    public const int Days = 30;

    public async Task<SalesReport> GetAsync(CancellationToken ct)
    {
        var offset = TimeSpan.FromHours(schedule.UtcOffsetHours);
        var now = clock.GetUtcNow().ToOffset(offset);
        var today = new DateTimeOffset(now.Date, offset);
        var monthStart = today.AddDays(-(Days - 1));
        var weekStart = today.AddDays(-6);
        var fromUtc = monthStart.ToUniversalTime();

        // Фармоишҳои 30 рӯз (сабук) — барои ҷамъбаст ва график
        var orders = await db.Orders.AsNoTracking()
            .Where(o => o.CreatedAt >= fromUtc)
            .Select(o => new { o.CreatedAt, o.Total, o.Status, o.PaymentMethod })
            .ToListAsync(ct);
        var sold = orders.Where(o => o.Status != OrderStatus.Cancelled).ToList();
        var local = sold.Select(o => new { Day = o.CreatedAt.ToOffset(offset).Date, o.Total, o.PaymentMethod }).ToList();

        SalesSummary Sum(DateTimeOffset from)
        {
            var list = local.Where(o => o.Day >= from.Date).ToList();
            var revenue = list.Sum(o => o.Total);
            return new SalesSummary(revenue, list.Count, list.Count == 0 ? 0 : Math.Round(revenue / list.Count, 2));
        }

        var daily = Enumerable.Range(0, Days)
            .Select(i => monthStart.AddDays(i).Date)
            .Select(d => new DailySales(d.ToString("yyyy-MM-dd"), local.Where(o => o.Day == d).Sum(o => o.Total), local.Count(o => o.Day == d)))
            .ToList();

        var payments = local.GroupBy(o => o.PaymentMethod)
            .Select(g => new PaymentShare(DeliverySchedule.Name(g.Key), g.Count(), g.Sum(o => o.Total)))
            .OrderByDescending(p => p.Orders)
            .ToList();

        // 10 моли пурфурӯш (аз рӯи миқдор) дар 30 рӯз
        var top = await db.OrderItems.AsNoTracking()
            .Where(i => db.Orders.Any(o => o.Id == i.OrderId && o.CreatedAt >= fromUtc && o.Status != OrderStatus.Cancelled))
            .GroupBy(i => new { i.ProductId, i.Name })
            .Select(g => new { g.Key.ProductId, g.Key.Name, Quantity = g.Sum(i => i.Quantity), Revenue = g.Sum(i => i.LineTotal) })
            .OrderByDescending(x => x.Quantity).ThenByDescending(x => x.Revenue)
            .Take(10)
            .ToListAsync(ct);
        var ids = top.Where(t => t.ProductId != null).Select(t => t.ProductId!.Value).ToList();
        var images = await db.ProductImages.AsNoTracking()
            .Where(img => ids.Contains(img.ProductId))
            .GroupBy(img => img.ProductId)
            .Select(g => new { ProductId = g.Key, Thumb = g.OrderBy(img => img.SortOrder).Select(img => img.ThumbPath).First() })
            .ToDictionaryAsync(x => x.ProductId, x => x.Thumb, ct);

        // Мизоҷон: харидорони 30 рӯз; навҳо — фармоиши аввалашон дар ҳамин давра; такрорӣ — 2+ фармоиш дар тамоми вақт
        var buyers = await db.Orders.AsNoTracking()
            .Where(o => o.Status != OrderStatus.Cancelled)
            .GroupBy(o => o.CustomerId)
            .Select(g => new { First = g.Min(o => o.CreatedAt), Last = g.Max(o => o.CreatedAt), Count = g.Count() })
            .Where(x => x.Last >= fromUtc)
            .ToListAsync(ct);

        return new SalesReport(
            Sum(today), Sum(weekStart), Sum(monthStart),
            daily,
            top.Select(t => new TopProduct(t.ProductId, t.Name, t.Quantity, t.Revenue,
                t.ProductId is { } pid && images.TryGetValue(pid, out var img) ? img : null)).ToList(),
            payments,
            new CustomerStats(buyers.Count, buyers.Count(b => b.First >= fromUtc), buyers.Count(b => b.Count >= 2)),
            orders.Count(o => o.Status == OrderStatus.Cancelled));
    }
}
