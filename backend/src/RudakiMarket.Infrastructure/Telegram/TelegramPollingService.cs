using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Customers;

namespace RudakiMarket.Infrastructure.Telegram;

/// <summary>
/// Паёмҳои ботро бо long polling мегирад (URL-и оммавӣ лозим нест — дар компютери development ҳам кор мекунад).
/// Ҳар паём дар scope-и алоҳида коркард мешавад; хато дар як паём ботро намеистонад.
/// </summary>
public sealed class TelegramPollingService(
    TelegramBotClient bot, IServiceScopeFactory scopes, ILogger<TelegramPollingService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Боти Telegram фаъол шуд (long polling)");
        long offset = 0;
        while (!stoppingToken.IsCancellationRequested)
        {
            IReadOnlyList<TelegramUpdate> updates;
            try
            {
                updates = await bot.GetUpdatesAsync(offset, 25, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning("Telegram getUpdates: {Message}. 5 сония баъд аз нав.", ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                continue;
            }

            foreach (var update in updates)
            {
                offset = update.UpdateId + 1;
                if (update.ChatId == 0) continue;
                try
                {
                    await HandleAsync(update, stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogError(ex, "Хато дар коркарди паёми Telegram {UpdateId}", update.UpdateId);
                }
            }
        }
    }

    private async Task HandleAsync(TelegramUpdate update, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var login = scope.ServiceProvider.GetRequiredService<TelegramLoginService>();

        BotReply reply;
        if (update.ContactPhone is not null)
            reply = await login.OnContactAsync(update.ChatId, update.FromUserId, update.ContactUserId, update.ContactPhone, ct);
        else if (update.Text?.StartsWith("/start", StringComparison.Ordinal) == true)
            reply = await login.OnStartAsync(update.ChatId, update.Text.Split(' ', 2) is [_, var token] ? token.Trim() : null, ct);
        else
            reply = await login.OnStartAsync(update.ChatId, null, ct); // ҳар паёми дигар — дастур

        await bot.SendMessageAsync(update.ChatId, reply.Text, reply.Keyboard, ct);
    }
}
