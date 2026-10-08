using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Orders;

/// <summary>
/// Танзимоти вақти расонидан (appsettings "Delivery:*"): соатҳои кор (вақти Душанбе), дарозии ҳар вақт,
/// чанд дақиқа пеш аз оғоз фармоиш қабул мешавад, чанд рӯз пеш ва тарзҳои пардохт.
/// </summary>
public sealed record DeliveryScheduleOptions(
    int OpenHour = 8,
    int CloseHour = 22,
    int SlotHours = 2,
    int LeadMinutes = 60,
    int Days = 2,
    int UtcOffsetHours = 5,
    IReadOnlyList<PaymentMethod>? PaymentMethods = null)
{
    public IReadOnlyList<PaymentMethod> EnabledPayments =>
        PaymentMethods is { Count: > 0 } ? PaymentMethods : Enum.GetValues<PaymentMethod>();
}

public sealed record DeliverySlotDto(DateTimeOffset Start, DateTimeOffset End, string From, string To);

/// <param name="Offset">0 — имрӯз, 1 — пагоҳ ...</param>
public sealed record DeliveryDayDto(string Date, int Offset, IReadOnlyList<DeliverySlotDto> Slots);

/// <param name="Asap">"Ҳарчи зудтар" ҳозир дастрас аст (мағоза кушода)</param>
public sealed record DeliveryOptionsDto(bool Asap, IReadOnlyList<DeliveryDayDto> Days, IReadOnlyList<string> PaymentMethods);

/// <summary>Вақтҳои расонидан барои сабад ва санҷиши вақти интихобшуда ҳангоми фармоиш.</summary>
public sealed class DeliverySchedule(DeliveryScheduleOptions options, TimeProvider clock)
{
    private TimeSpan Offset => TimeSpan.FromHours(options.UtcOffsetHours);

    public static string Name(PaymentMethod m) => m switch
    {
        PaymentMethod.Cash => "cash",
        PaymentMethod.Alif => "alif",
        PaymentMethod.Dc => "dc",
        PaymentMethod.KortiMilli => "korti_milli",
        _ => m.ToString().ToLowerInvariant(),
    };

    public PaymentMethod? ParsePayment(string? s) =>
        options.EnabledPayments.Cast<PaymentMethod?>().FirstOrDefault(m => string.Equals(Name(m!.Value), s?.Trim(), StringComparison.OrdinalIgnoreCase));

    public DeliveryOptionsDto Get()
    {
        var now = clock.GetUtcNow().ToOffset(Offset);
        var days = new List<DeliveryDayDto>();
        for (var d = 0; d < options.Days; d++)
        {
            var date = now.Date.AddDays(d);
            var slots = new List<DeliverySlotDto>();
            for (var h = options.OpenHour; h + options.SlotHours <= options.CloseHour; h += options.SlotHours)
            {
                var start = new DateTimeOffset(date.AddHours(h), Offset);
                if (start < now.AddMinutes(options.LeadMinutes)) continue;
                var end = start.AddHours(options.SlotHours);
                slots.Add(new DeliverySlotDto(start, end, start.ToString("HH:mm"), end.ToString("HH:mm")));
            }
            if (slots.Count > 0) days.Add(new DeliveryDayDto(date.ToString("yyyy-MM-dd"), d, slots));
        }
        // "Ҳарчи зудтар": мағоза кушода ва то пӯшидан ақаллан LeadMinutes монда
        var asap = now.Hour >= options.OpenHour && now.AddMinutes(options.LeadMinutes) <= new DateTimeOffset(now.Date.AddHours(options.CloseHour), Offset);
        return new DeliveryOptionsDto(asap, days, options.EnabledPayments.Select(Name).ToList());
    }

    /// <summary>Вақти интихобшуда (null — "ҳарчи зудтар") ҳоло дастрас аст? Агар ҳа — (оғоз, охир).</summary>
    public bool TryValidate(DateTimeOffset? start, out DateTimeOffset? from, out DateTimeOffset? to)
    {
        from = to = null;
        var current = Get();
        if (start is null) return current.Asap;
        var slot = current.Days.SelectMany(d => d.Slots).FirstOrDefault(s => s.Start == start.Value);
        if (slot is null) return false;
        // База (Npgsql, timestamptz) танҳо UTC қабул мекунад
        from = slot.Start.ToUniversalTime();
        to = slot.End.ToUniversalTime();
        return true;
    }

    /// <summary>"Имрӯз 18:00–20:00" / "08.10 18:00–20:00" / "Ҳарчи зудтар" — барои паёми WhatsApp.</summary>
    public string Describe(DateTimeOffset? from, DateTimeOffset? to)
    {
        if (from is null || to is null) return "⚡ Ҳарчи зудтар";
        var f = from.Value.ToOffset(Offset);
        var t = to.Value.ToOffset(Offset);
        var today = clock.GetUtcNow().ToOffset(Offset).Date;
        var day = f.Date == today ? "Имрӯз" : f.Date == today.AddDays(1) ? "Пагоҳ" : f.ToString("dd.MM");
        return $"{day} {f:HH:mm}–{t:HH:mm}";
    }

    public static string PaymentLabel(PaymentMethod m) => m switch
    {
        PaymentMethod.Cash => "Нақд",
        PaymentMethod.Alif => "Алиф",
        PaymentMethod.Dc => "Душанбе Сити (DC)",
        PaymentMethod.KortiMilli => "Корти Миллӣ",
        _ => m.ToString(),
    };
}
