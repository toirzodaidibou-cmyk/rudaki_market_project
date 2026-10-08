using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Orders;

namespace RudakiMarket.Infrastructure.Notifications;

/// <summary>Як роҳи огоҳии фурӯшанда (Telegram, WhatsApp ...).</summary>
public interface IOrderChannel
{
    string Name { get; }

    /// <returns>true — фиристода шуд</returns>
    Task<bool> SendAsync(string text, CancellationToken ct);
}

/// <summary>Навбати паёмҳо дар бораи фармоишҳои нав (дар хотира). Фиристодан — дар OrderNotificationWorker.</summary>
public sealed class QueuedOrderNotifier : IOrderNotifier
{
    private readonly Channel<string> _queue = Channel.CreateBounded<string>(
        new BoundedChannelOptions(1000) { FullMode = BoundedChannelFullMode.DropOldest });

    public bool IsEnabled => true;
    public bool Enqueue(string text) => _queue.Writer.TryWrite(text);
    internal ChannelReader<string> Reader => _queue.Reader;
}

/// <summary>
/// Ҳар фармоиши навро ба ҲАМАИ роҳҳои танзимшуда мефиристад (масалан, Telegram ва WhatsApp).
/// Ҳар роҳ мустақил аст: то 3 кӯшиш бо танаффус; хатои як роҳ ба дигаре таъсир намерасонад.
/// </summary>
public sealed class OrderNotificationWorker(
    QueuedOrderNotifier notifier, IEnumerable<IOrderChannel> channels, ILogger<OrderNotificationWorker> logger)
    : BackgroundService
{
    private static readonly TimeSpan[] RetryDelays = [TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(30)];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Огоҳии фармоишҳо: {Channels}", string.Join(", ", channels.Select(c => c.Name)));
        await foreach (var text in notifier.Reader.ReadAllAsync(stoppingToken))
        {
            await Task.WhenAll(channels.Select(channel => SendWithRetryAsync(channel, text, stoppingToken)));
        }
    }

    private async Task SendWithRetryAsync(IOrderChannel channel, string text, CancellationToken ct)
    {
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                if (await channel.SendAsync(text, ct))
                {
                    logger.LogInformation("Фармоиш ба {Channel} фиристода шуд", channel.Name);
                    return;
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning("{Channel}: {Message}", channel.Name, ex.Message);
            }
            if (attempt >= RetryDelays.Length)
            {
                // Фармоиш дар база ҳаст — танҳо огоҳӣ нарасид
                logger.LogError("{Channel}: паём баъд аз {Attempts} кӯшиш фиристода нашуд", channel.Name, attempt + 1);
                return;
            }
            await Task.Delay(RetryDelays[attempt], ct);
        }
    }
}

/// <param name="ChatId">Чати фурӯшанда ё гурӯҳи кормандон (гурӯҳ — рақами манфӣ)</param>
public sealed record TelegramOwnerOptions(long ChatId);

/// <summary>Фармоиш ба Telegram-и фурӯшанда (тавассути боти ҳамин сайт).</summary>
public sealed class TelegramOwnerChannel(IServiceScopeFactory scopes, TelegramOwnerOptions options) : IOrderChannel
{
    public string Name => "Telegram";

    public async Task<bool> SendAsync(string text, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var bot = scope.ServiceProvider.GetRequiredService<ITelegramBot>();
        await bot.SendMessageAsync(options.ChatId, text, TelegramKeyboard.None, ct); // хато → TelegramSendException
        return true;
    }
}

/// <param name="Phone">Рақами WhatsApp-и фурӯшанда (+992...)</param>
/// <param name="ApiKey">Калид аз CallMeBot (махфӣ — user-secrets / танзимоти сервер)</param>
/// <param name="BaseUrl">https://api.callmebot.com (барои санҷиш иваз мешавад)</param>
public sealed record CallMeBotOptions(string Phone, string ApiKey, string BaseUrl);

/// <summary>Фармоиш ба WhatsApp-и фурӯшанда тавассути CallMeBot (ройгон, вале на ҳамеша боэътимод).</summary>
public sealed class CallMeBotChannel(IHttpClientFactory httpFactory, CallMeBotOptions options, ILogger<CallMeBotChannel> logger)
    : IOrderChannel
{
    internal const string HttpClientName = "callmebot";
    public string Name => "WhatsApp (CallMeBot)";

    public async Task<bool> SendAsync(string text, CancellationToken ct)
    {
        // Калид дар URL аст — log-и HttpClient дар сатҳи Warning (appsettings), бинобар ин дар log намеафтад
        var url = $"{options.BaseUrl.TrimEnd('/')}/whatsapp.php?phone={Uri.EscapeDataString(options.Phone)}" +
                  $"&text={Uri.EscapeDataString(text)}&apikey={Uri.EscapeDataString(options.ApiKey)}";
        using var response = await httpFactory.CreateClient(HttpClientName).GetAsync(url, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        // CallMeBot хатоҳоро баъзан бо 200 ва матни "ERROR"/"APIKey is invalid" бармегардонад
        if (response.IsSuccessStatusCode && !body.Contains("error", StringComparison.OrdinalIgnoreCase)
            && !body.Contains("invalid", StringComparison.OrdinalIgnoreCase))
            return true;
        logger.LogWarning("CallMeBot: {Status} {Body}", (int)response.StatusCode, body.Length > 200 ? body[..200] : body);
        return false;
    }
}

/// <summary>Огоҳии худкор танзим нашудааст — фармоиш дар база мемонад (мизоҷ метавонад ба WhatsApp нависад).</summary>
public sealed class NoOrderNotifier : IOrderNotifier
{
    public bool IsEnabled => false;
    public bool Enqueue(string text) => false;
}
