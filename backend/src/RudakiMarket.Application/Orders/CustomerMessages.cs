using System.Globalization;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Orders;

/// <summary>
/// Огоҳии мизоҷ дар бораи фармоиши худ (масалан, тавассути боти Telegram, агар рақамаш пайваст бошад).
/// Паём ба навбати база (outbox) илова мешавад ва бо SaveChanges-и навбатӣ сабт мешавад;
/// фиристодан дар замина — фармоиш ва админ интизор намешаванд.
/// </summary>
public interface ICustomerNotifier
{
    /// <param name="phone">Рақами мизоҷ (E.164) — аз рӯи он чати Telegram ёфта мешавад</param>
    void Enqueue(string phone, string text);
}

/// <summary>Матнҳои огоҳии мизоҷ — бо тоҷикӣ ва русӣ (мисли паёмҳои даромади бот).</summary>
public static class CustomerMessages
{
    private static readonly CultureInfo Money = CultureInfo.GetCultureInfo("ru-RU");
    private static string M(decimal v) => v.ToString("N2", Money) + " с.";

    public static string Placed(Order order, string deliveryTg) =>
        $"🛒 Фармоиши №{order.Id} қабул шуд!\n" +
        $"Ҳамагӣ: {M(order.Total)} · {deliveryTg}\n" +
        (order.Discount > 0 ? $"Сарфаи шумо: {M(order.Discount)}\n" : "") +
        "Мо ба зудӣ онро тасдиқ мекунем.\n\n" +
        $"🛒 Заказ №{order.Id} принят!\n" +
        $"Итого: {M(order.Total)}." + (order.Discount > 0 ? $" Ваша экономия: {M(order.Discount)}." : "") + " Скоро подтвердим.";

    /// <param name="storePhone">Рақами мағоза (барои бекор шудан — «занг занед»)</param>
    public static string? StatusChanged(int number, OrderStatus status, string storePhone) => status switch
    {
        OrderStatus.Confirmed =>
            $"✅ Фармоиши №{number} тасдиқ шуд — онро ҷамъ карда истодаем.\n\n" +
            $"✅ Заказ №{number} подтверждён — собираем.",
        OrderStatus.Delivering =>
            $"🚚 Фармоиши №{number} дар роҳ аст! Курйер ба зудӣ меояд.\n\n" +
            $"🚚 Заказ №{number} в пути! Курьер скоро будет.",
        OrderStatus.Delivered =>
            $"🎉 Фармоиши №{number} расонида шуд. Ташаккур, ки аз RUDAKI MARKET харидед!\n\n" +
            $"🎉 Заказ №{number} доставлен. Спасибо за покупку!",
        OrderStatus.Cancelled =>
            $"✕ Фармоиши №{number} бекор шуд. Савол бошад — занг занед: {storePhone}\n\n" +
            $"✕ Заказ №{number} отменён. Вопросы — звоните: {storePhone}",
        _ => null,
    };
}
