using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Common;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Orders;

/// <param name="FreeDeliveryFrom">Аз ин маблағ (сомонӣ) ва зиёд — расонидан ройгон</param>
/// <param name="DeliveryFee">Нархи расонидан, агар фармоиш камтар бошад</param>
/// <param name="OwnerWhatsApp">Рақами WhatsApp-и фурӯшанда (E.164), ба он фармоиш меояд</param>
public sealed record DeliveryOptions(decimal FreeDeliveryFrom, decimal DeliveryFee, string OwnerWhatsApp)
{
    public decimal FeeFor(decimal subtotal) => subtotal >= FreeDeliveryFrom ? 0 : DeliveryFee;
}

/// <param name="WhatsAppUrl">wa.me/{рақами фурӯшанда}?text={фармоиш} — мизоҷ паёми тайёрро мефиристад</param>
/// <param name="OwnerNotified">true — паём ба фурӯшанда худкор (сервер) фиристода шуд</param>
public sealed record OrderPlaced(int Number, decimal Subtotal, decimal DeliveryFee, decimal Total, string WhatsAppUrl, bool OwnerNotified);

/// <summary>
/// Огоҳ кардани фурӯшанда дар бораи фармоиши нав (масалан, WhatsApp тавассути CallMeBot).
/// Паём ба навбат гузошта мешавад ва дар замина фиристода мешавад — мизоҷ интизор намешавад.
/// </summary>
public interface IOrderNotifier
{
    /// <summary>Оё огоҳии худкор танзим шудааст.</summary>
    bool IsEnabled { get; }

    /// <returns>true — ба навбат гузошта шуд; false — танзим нашудааст</returns>
    bool Enqueue(string text);
}

public sealed record OrderItemDto(string Name, string? SizeLabel, decimal Price, int Quantity, decimal LineTotal, string? Image);

/// <summary>Фармоиш барои профили мизоҷ (таърихи харид).</summary>
public sealed record CustomerOrderDto(
    int Number, DateTimeOffset CreatedAt, string Status, string Address, string? Comment,
    DateTimeOffset? DeliveryFrom, DateTimeOffset? DeliveryTo, string PaymentMethod,
    decimal Subtotal, decimal DeliveryFee, decimal Total, IReadOnlyList<OrderItemDto> Items);

public sealed class OrderService(IAppDbContext db, DeliveryOptions delivery, DeliverySchedule schedule, IOrderNotifier notifier, TimeProvider clock)
{
    public const int OrdersPageSize = 20;

    /// <summary>Таърихи хариди мизоҷ — навтаринҳо аввал, саҳифа ба саҳифа.</summary>
    public async Task<PagedResult<CustomerOrderDto>> ListForCustomerAsync(int customerId, int page, CancellationToken ct)
    {
        page = Math.Max(1, page);
        var query = db.Orders.AsNoTracking().Where(o => o.CustomerId == customerId);
        var total = await query.CountAsync(ct);
        var orders = await query
            .OrderByDescending(o => o.Id)
            .Skip((page - 1) * OrdersPageSize).Take(OrdersPageSize)
            .Select(o => new CustomerOrderDto(
                o.Id, o.CreatedAt, o.Status.ToString().ToLower(), o.Address, o.Comment,
                o.DeliveryFrom, o.DeliveryTo, o.PaymentMethod == PaymentMethod.Alif ? "alif" : o.PaymentMethod == PaymentMethod.Dc ? "dc" : o.PaymentMethod == PaymentMethod.KortiMilli ? "korti_milli" : "cash",
                o.Subtotal, o.DeliveryFee, o.Total,
                o.Items.OrderBy(i => i.Id).Select(i => new OrderItemDto(
                    i.Name, i.SizeLabel, i.Price, i.Quantity, i.LineTotal,
                    // Сурати хурди мол (агар мол то ҳол бошад)
                    db.ProductImages.Where(img => img.ProductId == i.ProductId).OrderBy(img => img.SortOrder)
                        .Select(img => img.ThumbPath).FirstOrDefault())).ToList()))
            .ToListAsync(ct);
        return new PagedResult<CustomerOrderDto>(orders, total, page, OrdersPageSize);
    }

    private const int MaxAddressLength = 500;
    private const int MaxCommentLength = 500;
    private static readonly CultureInfo Money = CultureInfo.GetCultureInfo("ru-RU");

    /// <summary>
    /// Фармоиш аз сабад: нархҳо аз база, расонидан аз рӯи қоида, сабад тоза мешавад.
    /// Ҳамааш дар як транзаксия ва бо қулфи мизоҷ — ду дархости ҳамзамон аз як сабад ду фармоиш намесозанд.
    /// </summary>
    /// <param name="deliveryStart">оғози вақти интихобшуда; null — "ҳарчи зудтар"</param>
    /// <param name="paymentInput">cash | alif | dc | korti_milli (холӣ — нақд)</param>
    /// <param name="requestId">калиди дархост аз браузер: такрори ҳамон дархост ҳамон фармоишро бармегардонад</param>
    public async Task<Result<OrderPlaced>> PlaceAsync(int customerId, string? addressInput, string? commentInput,
        DateTimeOffset? deliveryStart, string? paymentInput, CancellationToken ct, Guid? requestId = null)
    {
        // Ҳамон дархост дубора омад (ҷавоби аввал ба браузер нарасид) — фармоиши аллакай сохташуда.
        // Пеш аз санҷиши вақт: дар такрор вақти интихобшуда шояд аллакай гузашта бошад.
        if (await FindByRequestAsync(customerId, requestId, ct) is { } done)
            return Result<OrderPlaced>.Ok(Placed(done, notifier.IsEnabled));

        // Вақт: бояд ҳоло дастрас бошад (масалан, вақти гузашта ё "ҳарчи зудтар" дар шаб — не)
        if (!schedule.TryValidate(deliveryStart, out var deliveryFrom, out var deliveryTo))
            return Result<OrderPlaced>.Invalid("delivery", deliveryStart is null ? "asap_unavailable" : "slot_unavailable");
        var payment = string.IsNullOrWhiteSpace(paymentInput) ? PaymentMethod.Cash : schedule.ParsePayment(paymentInput);
        if (payment is null) return Result<OrderPlaced>.Invalid("payment", "invalid_payment");

        var address = (addressInput ?? "").Trim();
        var comment = string.IsNullOrWhiteSpace(commentInput) ? null : commentInput.Trim();
        if (address.Length < 5) return Result<OrderPlaced>.Invalid("address", "address_required");
        if (address.Length > MaxAddressLength) return Result<OrderPlaced>.Invalid("address", "too_long");
        if (comment?.Length > MaxCommentLength) return Result<OrderPlaced>.Invalid("comment", "too_long");

        await using var tx = await db.BeginTransactionAsync(ct);
        await db.LockCustomerAsync(customerId, ct);

        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct);
        if (customer is null) return Result<OrderPlaced>.NotFound();

        // Дархости ҳамзамон бо ҳамон калид қулфро интизор буд — фармоиш аллакай сохта шудааст
        if (await FindByRequestAsync(customerId, requestId, ct) is { } existing)
            return Result<OrderPlaced>.Ok(Placed(existing, notifier.IsEnabled));

        // Танҳо молҳои дастрас; нарх — нархи ҷорӣ аз база
        var lines = await db.CartItems
            .Where(c => c.CustomerId == customerId && c.Product!.IsActive && c.Product.Category!.IsActive)
            .OrderBy(c => c.AddedAt)
            .Select(c => new { c.ProductId, c.Product!.NameTg, c.Product.SizeLabel, c.Product.Price, c.Quantity })
            .ToListAsync(ct);
        if (lines.Count == 0) return Result<OrderPlaced>.Invalid("cart", "cart_empty");

        var order = new Order
        {
            CustomerId = customerId,
            Phone = customer.Phone,
            Address = address,
            Comment = comment,
            DeliveryFrom = deliveryFrom,
            DeliveryTo = deliveryTo,
            PaymentMethod = payment.Value,
            CreatedAt = clock.GetUtcNow(),
            RequestId = requestId,
        };
        foreach (var l in lines)
        {
            order.Items.Add(new OrderItem
            {
                ProductId = l.ProductId,
                Name = l.NameTg,
                SizeLabel = l.SizeLabel,
                Price = l.Price,
                Quantity = l.Quantity,
                LineTotal = l.Price * l.Quantity,
            });
        }
        order.Subtotal = order.Items.Sum(i => i.LineTotal);
        order.DeliveryFee = delivery.FeeFor(order.Subtotal);
        order.Total = order.Subtotal + order.DeliveryFee;

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        await db.CartItems.Where(c => c.CustomerId == customerId).ExecuteDeleteAsync(ct);
        await tx.CommitAsync(ct);

        // Танҳо баъд аз сабти ниҳоӣ; дар замина — фармоиш аз ин вобаста нест
        var notified = notifier.Enqueue(FormatMessage(order));
        return Result<OrderPlaced>.Ok(Placed(order, notified));
    }

    private async Task<Order?> FindByRequestAsync(int customerId, Guid? requestId, CancellationToken ct) =>
        requestId is null
            ? null
            : await db.Orders.AsNoTracking().Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.CustomerId == customerId && o.RequestId == requestId, ct);

    private OrderPlaced Placed(Order order, bool ownerNotified)
    {
        var owner = new string(delivery.OwnerWhatsApp.Where(char.IsAsciiDigit).ToArray());
        var waUrl = $"https://wa.me/{owner}?text={Uri.EscapeDataString(FormatMessage(order))}";
        return new OrderPlaced(order.Id, order.Subtotal, order.DeliveryFee, order.Total, waUrl, ownerNotified);
    }

    private static string M(decimal v) => v.ToString("N2", Money) + " с.";

    /// <summary>Паём барои WhatsApp-и фурӯшанда.</summary>
    public string FormatMessage(Order order)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"🛒 Фармоиши нав №{order.Id}");
        sb.AppendLine($"📞 Мизоҷ: {order.Phone}");
        sb.AppendLine($"📍 Суроға: {order.Address}");
        sb.AppendLine($"🕐 Вақт: {schedule.Describe(order.DeliveryFrom, order.DeliveryTo)}");
        sb.AppendLine($"💳 Пардохт: {DeliverySchedule.PaymentLabel(order.PaymentMethod)}");
        if (order.Comment is not null) sb.AppendLine($"💬 Эзоҳ: {order.Comment}");
        sb.AppendLine();
        var n = 1;
        foreach (var i in order.Items)
        {
            var size = i.SizeLabel is null ? "" : $" ({i.SizeLabel})";
            sb.AppendLine($"{n++}. {i.Name}{size} — {i.Quantity} × {M(i.Price)} = {M(i.LineTotal)}");
        }
        sb.AppendLine();
        sb.AppendLine($"Молҳо: {M(order.Subtotal)}");
        sb.AppendLine(order.DeliveryFee == 0 ? "🚚 Расонидан: ройгон" : $"🚚 Расонидан: {M(order.DeliveryFee)}");
        sb.Append($"💰 Ҳамагӣ: {M(order.Total)}");
        return sb.ToString();
    }
}
