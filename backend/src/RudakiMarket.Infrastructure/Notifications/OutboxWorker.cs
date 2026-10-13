using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RudakiMarket.Domain.Entities;
using RudakiMarket.Infrastructure.Persistence;

namespace RudakiMarket.Infrastructure.Notifications;

/// <summary>
/// Паёмҳои навбатро аз база (outbox_messages) мегирад ва мефиристад: фурӯшанда — ба ҳар роҳи танзимшуда,
/// мизоҷ — ба Telegram-и пайвастшуда.
/// • Бозоғозии сервер паёмро гум намекунад — паём дар база то фиристодан мемонад.
/// • Бозкӯшиш бо танаффуси афзоянда (10с → 1д → 5д → 15д → 1с); паём аз 12 соат кӯҳнатар — дигар фиристода намешавад.
/// • FOR UPDATE SKIP LOCKED: ҳангоми deploy ду нусхаи сервер як паёмро ду бор намефиристанд.
/// </summary>
public sealed class OutboxWorker(
    IServiceScopeFactory scopes, IEnumerable<IOrderChannel> ownerChannels, TimeProvider clock, ILogger<OutboxWorker> logger)
    : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan[] Backoff =
        [TimeSpan.FromSeconds(10), TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(15), TimeSpan.FromHours(1)];
    private static readonly int MaxAttempts = Backoff.Length + 1;

    /// <summary>Паём то ин муддат «гирифташуда» аст; агар сервер ҳангоми фиристодан афтад — баъд аз он боз кӯшиш мешавад.</summary>
    private static readonly TimeSpan Lease = TimeSpan.FromMinutes(5);

    /// <summary>«Дар роҳ аст» пас аз 12 соат маъно надорад (масалан, сервер муддати дароз хомӯш буд).</summary>
    private static readonly TimeSpan MaxAge = TimeSpan.FromHours(12);

    private static readonly TimeSpan KeepFinished = TimeSpan.FromDays(30);
    private const int BatchSize = 20;

    private readonly Dictionary<string, IOrderChannel> _owner = ownerChannels.ToDictionary(c => c.Key);
    private DateTimeOffset _nextCleanup;

    private enum Outcome { Sent, Skipped, Retry, Permanent }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Огоҳии фармоишҳо: {Channels}",
            _owner.Count == 0 ? "хомӯш" : string.Join(", ", _owner.Values.Select(c => c.Name)));
        using var timer = new PeriodicTimer(PollInterval);
        do
        {
            try
            {
                while (await ProcessBatchAsync(stoppingToken) == BatchSize) { }
                if (clock.GetUtcNow() >= _nextCleanup) await CleanupAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                // Масалан, база муваққатан дастнорас — дар давраи навбатӣ боз кӯшиш
                logger.LogWarning("Навбати огоҳиҳо: {Message}", ex.Message);
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    /// <returns>шумораи паёмҳои гирифташуда</returns>
    private async Task<int> ProcessBatchAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = clock.GetUtcNow();
        var leaseUntil = now + Lease;
        var minCreated = now - MaxAge;

        // Гирифтан: кӯшиш +1 ва «иҷора» — то нусхаи дигари сервер ҳамон паёмро нагирад
        var batch = await db.OutboxMessages.FromSql($"""
            UPDATE outbox_messages SET attempts = attempts + 1, next_attempt_at = {leaseUntil}
            WHERE id IN (
                SELECT id FROM outbox_messages
                WHERE sent_at IS NULL AND failed_at IS NULL AND next_attempt_at <= {now} AND created_at >= {minCreated}
                ORDER BY id LIMIT {BatchSize}
                FOR UPDATE SKIP LOCKED)
            RETURNING *
            """).AsNoTracking().ToListAsync(ct);
        if (batch.Count == 0) return 0;

        // Роҳҳо мустақиланд: WhatsApp-и суст Telegram-ро интизор намекунонад
        var results = await Task.WhenAll(batch.OrderBy(m => m.Id).Select(async m => (Message: m, Result: await SendAsync(m, ct))));

        var done = clock.GetUtcNow();
        foreach (var (m, (outcome, error)) in results)
        {
            var finalFailure = outcome == Outcome.Permanent || (outcome == Outcome.Retry && m.Attempts >= MaxAttempts);
            if (outcome == Outcome.Sent)
            {
                await db.OutboxMessages.Where(x => x.Id == m.Id)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.SentAt, done).SetProperty(x => x.LastError, (string?)null), ct);
                if (m.Channel == OutboxChannels.CustomerTelegram)
                    logger.LogInformation("Огоҳии мизоҷ фиристода шуд: ***{Last4}", Last4(m.Recipient));
                else
                    logger.LogInformation("Фармоиш ба {Channel} фиристода шуд", ChannelName(m.Channel));
            }
            else if (outcome == Outcome.Skipped || finalFailure)
            {
                await db.OutboxMessages.Where(x => x.Id == m.Id)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.FailedAt, done).SetProperty(x => x.LastError, Trim(error)), ct);
                if (finalFailure)
                    // Фармоиш дар база ҳаст — танҳо огоҳӣ нарасид
                    logger.LogError("{Channel}: паёми #{Id} баъд аз {Attempts} кӯшиш фиристода нашуд: {Error}",
                        ChannelName(m.Channel), m.Id, m.Attempts, error);
            }
            else
            {
                var delay = Backoff[Math.Min(m.Attempts, Backoff.Length) - 1];
                await db.OutboxMessages.Where(x => x.Id == m.Id)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.NextAttemptAt, done + delay).SetProperty(x => x.LastError, Trim(error)), ct);
                logger.LogWarning("{Channel}: {Error} — кӯшиши {Attempt}, боз пас аз {Delay}",
                    ChannelName(m.Channel), error, m.Attempts, delay);
            }
        }
        return batch.Count;
    }

    private async Task<(Outcome, string?)> SendAsync(OutboxMessage m, CancellationToken ct)
    {
        try
        {
            if (m.Channel == OutboxChannels.CustomerTelegram)
            {
                using var scope = scopes.CreateScope();
                var sender = scope.ServiceProvider.GetService<CustomerTelegramSender>();
                if (sender is null || m.Recipient is null) return (Outcome.Permanent, "channel_not_configured");
                return await sender.SendAsync(m.Recipient, m.Text, ct)
                    ? (Outcome.Sent, null)
                    : (Outcome.Skipped, "no_telegram_link");
            }
            if (!_owner.TryGetValue(m.Channel, out var channel)) return (Outcome.Permanent, "channel_not_configured");
            return await channel.SendAsync(m.Text, ct) ? (Outcome.Sent, null) : (Outcome.Retry, "rejected");
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            return (Outcome.Retry, ex.Message);
        }
    }

    /// <summary>Як бор дар соат: паёмҳои кӯҳнаи интизор → «expired»; паёмҳои анҷомёфтаи аз 30 рӯз кӯҳнатар — нест.</summary>
    private async Task CleanupAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = clock.GetUtcNow();
        var minCreated = now - MaxAge;
        var keepFrom = now - KeepFinished;
        var expired = await db.OutboxMessages
            .Where(m => m.SentAt == null && m.FailedAt == null && m.CreatedAt < minCreated)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.FailedAt, now).SetProperty(m => m.LastError, "expired"), ct);
        if (expired > 0) logger.LogWarning("Навбати огоҳиҳо: {Count} паёми кӯҳна фиристода нашуд (аз 12 соат зиёд)", expired);
        await db.OutboxMessages.Where(m => (m.SentAt != null || m.FailedAt != null) && m.CreatedAt < keepFrom).ExecuteDeleteAsync(ct);
        _nextCleanup = now + TimeSpan.FromHours(1);
    }

    private string ChannelName(string key) =>
        _owner.TryGetValue(key, out var c) ? c.Name : key == OutboxChannels.CustomerTelegram ? "Telegram-и мизоҷ" : key;

    private static string Last4(string? phone) => phone is { Length: >= 4 } ? phone[^4..] : "????";
    private static string? Trim(string? s) => s is { Length: > 500 } ? s[..500] : s;
}
