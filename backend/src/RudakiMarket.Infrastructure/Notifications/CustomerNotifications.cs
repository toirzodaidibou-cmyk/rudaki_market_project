using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Orders;

namespace RudakiMarket.Infrastructure.Notifications;

/// <summary>Навбати паёмҳо ба мизоҷон (дар хотира). Фиристодан — дар CustomerNotificationWorker.</summary>
public sealed class QueuedCustomerNotifier : ICustomerNotifier
{
    private readonly Channel<(string Phone, string Text)> _queue = Channel.CreateBounded<(string, string)>(
        new BoundedChannelOptions(1000) { FullMode = BoundedChannelFullMode.DropOldest });

    public void Enqueue(string phone, string text) => _queue.Writer.TryWrite((phone, text));
    internal ChannelReader<(string Phone, string Text)> Reader => _queue.Reader;
}

/// <summary>
/// Паёмро ба Telegram-и мизоҷ мефиристад, агар рақамаш ба бот пайваст бошад (telegram_links — баъд аз даромад тавассути бот).
/// Рақами пайвастнашуда — паём намеравад (хато нест). То 2 кӯшиш; хато ба фармоиш таъсир намерасонад.
/// </summary>
public sealed class CustomerNotificationWorker(
    QueuedCustomerNotifier notifier, IServiceScopeFactory scopes, ILogger<CustomerNotificationWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var (phone, text) in notifier.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
                var chatId = await db.TelegramLinks.AsNoTracking()
                    .Where(l => l.Phone == phone).Select(l => (long?)l.ChatId).FirstOrDefaultAsync(stoppingToken);
                if (chatId is null) continue;

                var bot = scope.ServiceProvider.GetRequiredService<ITelegramBot>();
                for (var attempt = 1; ; attempt++)
                {
                    try
                    {
                        await bot.SendMessageAsync(chatId.Value, text, TelegramKeyboard.None, stoppingToken);
                        logger.LogInformation("Огоҳии мизоҷ фиристода шуд: ***{Last4}", phone[^4..]);
                        break;
                    }
                    catch (TelegramSendException ex) when (attempt < 2)
                    {
                        logger.LogWarning("Огоҳии мизоҷ: {Message} — боз кӯшиш", ex.Message);
                        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                    }
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning("Огоҳии мизоҷ фиристода нашуд: {Message}", ex.Message);
            }
        }
    }
}

/// <summary>Боти Telegram танзим нашудааст — огоҳии мизоҷон хомӯш.</summary>
public sealed class NoCustomerNotifier : ICustomerNotifier
{
    public void Enqueue(string phone, string text) { }
}
