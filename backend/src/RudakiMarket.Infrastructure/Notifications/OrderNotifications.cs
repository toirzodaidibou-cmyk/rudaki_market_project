using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Orders;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Infrastructure.Notifications;

/// <summary>Як роҳи огоҳии фурӯшанда (Telegram, WhatsApp ...).</summary>
public interface IOrderChannel
{
    /// <summary>Калиди роҳ дар навбат (<see cref="OutboxChannels"/>).</summary>
    string Key { get; }

    string Name { get; }

    /// <returns>true — фиристода шуд</returns>
    Task<bool> SendAsync(string text, CancellationToken ct);
}

/// <summary>
/// Фармоиши навро ба навбати база мегузорад — барои ҲАР роҳи танзимшуда як паём (Telegram, WhatsApp),
/// то ҳар роҳ мустақил бозкӯшиш кунад. Сабт — бо SaveChanges-и ҳамон транзаксияи фармоиш; фиристодан — OutboxWorker.
/// </summary>
public sealed class OutboxOrderNotifier(IAppDbContext db, IEnumerable<IOrderChannel> channels, TimeProvider clock) : IOrderNotifier
{
    public bool IsEnabled => true;

    public bool Enqueue(string text)
    {
        var now = clock.GetUtcNow();
        foreach (var channel in channels)
            db.OutboxMessages.Add(new OutboxMessage { Channel = channel.Key, Text = text, CreatedAt = now, NextAttemptAt = now });
        return true;
    }
}

/// <param name="ChatId">Чати фурӯшанда ё гурӯҳи кормандон (гурӯҳ — рақами манфӣ)</param>
public sealed record TelegramOwnerOptions(long ChatId);

/// <summary>Фармоиш ба Telegram-и фурӯшанда (тавассути боти ҳамин сайт).</summary>
public sealed class TelegramOwnerChannel(IServiceScopeFactory scopes, TelegramOwnerOptions options) : IOrderChannel
{
    public string Key => OutboxChannels.OwnerTelegram;
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
    public string Key => OutboxChannels.OwnerWhatsApp;
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
