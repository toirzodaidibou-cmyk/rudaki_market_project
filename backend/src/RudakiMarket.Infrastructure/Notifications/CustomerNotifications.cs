using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Orders;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Infrastructure.Notifications;

/// <summary>Паёми мизоҷро ба навбати база мегузорад (сабт — бо SaveChanges-и ҳамон амал; фиристодан — OutboxWorker).</summary>
public sealed class OutboxCustomerNotifier(IAppDbContext db, TimeProvider clock) : ICustomerNotifier
{
    public void Enqueue(string phone, string text)
    {
        var now = clock.GetUtcNow();
        db.OutboxMessages.Add(new OutboxMessage
        {
            Channel = OutboxChannels.CustomerTelegram, Recipient = phone, Text = text, CreatedAt = now, NextAttemptAt = now,
        });
    }
}

/// <summary>
/// Паёмро ба Telegram-и мизоҷ мефиристад, агар рақамаш ба бот пайваст бошад (telegram_links — баъд аз даромад тавассути бот).
/// </summary>
public sealed class CustomerTelegramSender(IAppDbContext db, ITelegramBot bot)
{
    /// <returns>false — рақам ба бот пайваст нест: паём намеравад (хато нест)</returns>
    public async Task<bool> SendAsync(string phone, string text, CancellationToken ct)
    {
        var chatId = await db.TelegramLinks.AsNoTracking()
            .Where(l => l.Phone == phone).Select(l => (long?)l.ChatId).FirstOrDefaultAsync(ct);
        if (chatId is null) return false;
        await bot.SendMessageAsync(chatId.Value, text, TelegramKeyboard.None, ct); // хато → TelegramSendException
        return true;
    }
}

/// <summary>Боти Telegram танзим нашудааст — огоҳии мизоҷон хомӯш.</summary>
public sealed class NoCustomerNotifier : ICustomerNotifier
{
    public void Enqueue(string phone, string text) { }
}
