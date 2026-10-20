using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Common;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Orders;

/// <summary>Сатри рӯйхати фармоишҳо дар админ.</summary>
public sealed record AdminOrderListItem(
    int Number, DateTimeOffset CreatedAt, string Status, string Phone, string Address, decimal Total, int ItemCount,
    DateTimeOffset? DeliveryFrom, DateTimeOffset? DeliveryTo, string PaymentMethod);

public sealed record AdminOrderItemDto(int? ProductId, string Name, string? SizeLabel, decimal Price, int Quantity, decimal LineTotal, string? Image);

/// <summary>Фармоиш барои админ — пурра.</summary>
public sealed record AdminOrderDto(
    int Number, DateTimeOffset CreatedAt, string Status, DateTimeOffset? StatusUpdatedAt,
    string Phone, string Address, string? Comment,
    DateTimeOffset? DeliveryFrom, DateTimeOffset? DeliveryTo, string PaymentMethod,
    decimal Subtotal, decimal Discount, string? DiscountNote, decimal DeliveryFee, decimal BonusUsed, decimal Total,
    IReadOnlyList<AdminOrderItemDto> Items,
    IReadOnlyList<string> NextStatuses);

public sealed record SetOrderStatusRequest(string Status);

/// <summary>Идоракунии фармоишҳо дар панели админ: рӯйхат, тафсилот, иваз кардани ҳолат.</summary>
public sealed class AdminOrderService(IAppDbContext db, ICustomerNotifier customers, DeliveryOptions delivery, TimeProvider clock)
{
    public const int PageSize = 30;

    /// <summary>Гузаришҳои иҷозатдодашуда. Расонида шуд ва Бекор шуд — ниҳоӣ.</summary>
    private static readonly Dictionary<OrderStatus, OrderStatus[]> Transitions = new()
    {
        [OrderStatus.New] = [OrderStatus.Confirmed, OrderStatus.Cancelled],
        [OrderStatus.Confirmed] = [OrderStatus.Delivering, OrderStatus.Cancelled],
        [OrderStatus.Delivering] = [OrderStatus.Delivered, OrderStatus.Cancelled],
        [OrderStatus.Delivered] = [],
        [OrderStatus.Cancelled] = [],
    };

    public static string Name(OrderStatus s) => s.ToString().ToLowerInvariant();

    private static OrderStatus? Parse(string? s) =>
        Enum.TryParse<OrderStatus>(s, ignoreCase: true, out var v) && Enum.IsDefined(v) ? v : null;

    /// <summary>
    /// Фармоишҳо (навтаринҳо аввал). status — филтр; term — рақами фармоиш ё қисми телефон/суроға.
    /// </summary>
    public async Task<PagedResult<AdminOrderListItem>> ListAsync(string? status, string? term, int page, CancellationToken ct)
    {
        page = Math.Max(1, page);
        var query = db.Orders.AsNoTracking();
        if (Parse(status) is { } st) query = query.Where(o => o.Status == st);

        var q = term?.Trim();
        if (!string.IsNullOrEmpty(q))
        {
            var digits = new string(q.Where(char.IsDigit).ToArray());
            if (int.TryParse(q.TrimStart('№', '#'), out var number))
                query = query.Where(o => o.Id == number || o.Phone.Contains(digits));
            else if (digits.Length >= 3)
                query = query.Where(o => o.Phone.Contains(digits));
            else
                query = query.Where(o => o.Address.ToLower().Contains(q.ToLower()));
        }

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(o => o.Id)
            .Skip((page - 1) * PageSize).Take(PageSize)
            .Select(o => new { o.Id, o.CreatedAt, o.Status, o.Phone, o.Address, o.Total, Count = o.Items.Sum(i => i.Quantity), o.DeliveryFrom, o.DeliveryTo, o.PaymentMethod })
            .ToListAsync(ct);
        var items = rows.Select(o => new AdminOrderListItem(o.Id, o.CreatedAt, Name(o.Status), o.Phone, o.Address, o.Total, o.Count,
            o.DeliveryFrom, o.DeliveryTo, DeliverySchedule.Name(o.PaymentMethod))).ToList();
        return new PagedResult<AdminOrderListItem>(items, total, page, PageSize);
    }

    /// <summary>Шумораи фармоишҳо аз рӯи ҳолат (барои ҷадвалҳо ва нишонаи "нав" дар меню).</summary>
    public async Task<IReadOnlyDictionary<string, int>> CountsAsync(CancellationToken ct)
    {
        var rows = await db.Orders.AsNoTracking().GroupBy(o => o.Status).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct);
        return Enum.GetValues<OrderStatus>().ToDictionary(Name, s => rows.FirstOrDefault(r => r.Key == s)?.N ?? 0);
    }

    public async Task<Result<AdminOrderDto>> GetAsync(int id, CancellationToken ct)
    {
        var o = await db.Orders.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id, x.CreatedAt, x.Status, x.StatusUpdatedAt, x.Phone, x.Address, x.Comment, x.Subtotal, x.Discount, x.DiscountNote, x.DeliveryFee, x.BonusUsed, x.Total,
                x.DeliveryFrom, x.DeliveryTo, x.PaymentMethod,
                Items = x.Items.OrderBy(i => i.Id).Select(i => new AdminOrderItemDto(
                    i.ProductId, i.Name, i.SizeLabel, i.Price, i.Quantity, i.LineTotal,
                    db.ProductImages.Where(img => img.ProductId == i.ProductId).OrderBy(img => img.SortOrder)
                        .Select(img => img.ThumbPath).FirstOrDefault())).ToList(),
            })
            .FirstOrDefaultAsync(ct);
        if (o is null) return Result<AdminOrderDto>.NotFound();
        return Result<AdminOrderDto>.Ok(new AdminOrderDto(
            o.Id, o.CreatedAt, Name(o.Status), o.StatusUpdatedAt, o.Phone, o.Address, o.Comment,
            o.DeliveryFrom, o.DeliveryTo, DeliverySchedule.Name(o.PaymentMethod),
            o.Subtotal, o.Discount, o.DiscountNote, o.DeliveryFee, o.BonusUsed, o.Total, o.Items, Transitions[o.Status].Select(Name).ToList()));
    }

    /// <summary>Ҳолати навро мегузорад, агар гузариш иҷозат бошад (масалан, "Расонида шуд"-ро "Нав" кардан мумкин нест).</summary>
    public async Task<Result<AdminOrderDto>> SetStatusAsync(int id, string? status, CancellationToken ct)
    {
        if (Parse(status) is not { } next) return Result<AdminOrderDto>.Invalid("status", "Ҳолати нодуруст.");
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return Result<AdminOrderDto>.NotFound();
        if (order.Status != next)
        {
            if (!Transitions[order.Status].Contains(next))
                return Result<AdminOrderDto>.Conflict($"Аз «{Name(order.Status)}» ба «{Name(next)}» гузаштан мумкин нест.");
            order.Status = next;
            order.StatusUpdatedAt = clock.GetUtcNow();
            // Мизоҷ дар Telegram хабар мегирад (агар рақамаш ба бот пайваст бошад); паём бо ҳолат якҷоя сабт мешавад
            if (CustomerMessages.StatusChanged(order.Id, next, delivery.OwnerWhatsApp) is { } text)
                customers.Enqueue(order.Phone, text);
            await db.SaveChangesAsync(ct);
        }
        return await GetAsync(id, ct);
    }
}
