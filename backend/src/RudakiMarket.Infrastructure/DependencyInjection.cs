using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Orders;
using RudakiMarket.Application.Prices;
using RudakiMarket.Infrastructure.Images;
using RudakiMarket.Infrastructure.Notifications;
using RudakiMarket.Infrastructure.Persistence;
using RudakiMarket.Infrastructure.Prices;
using RudakiMarket.Infrastructure.Security;
using RudakiMarket.Infrastructure.Site;
using RudakiMarket.Infrastructure.Sms;
using RudakiMarket.Infrastructure.Telegram;
using RudakiMarket.Infrastructure.Storage;

namespace RudakiMarket.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config, string webRootPath)
    {
        var connectionString = config.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                "ConnectionStrings:Default муқаррар нашудааст (дар development: dotnet user-secrets).");

        services.AddDbContext<AppDbContext>(o => o
            .UseNpgsql(connectionString)
            .UseSnakeCaseNamingConvention());
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddSingleton<IPasswordService, PasswordService>();
        services.AddSingleton<IFileStorage>(new LocalFileStorage(webRootPath));
        services.AddSingleton<IImageProcessor, SkiaImageProcessor>();
        services.AddSingleton<IPriceSheet, ClosedXmlPriceSheet>();
        services.AddSingleton<ITextSearch, PostgresTextSearch>();
        // SMS: Sms:Provider = "OsonSms" — SMS-и воқеӣ; вагарна DevSmsSender (танҳо log, барои development).
        if (IsOsonSms(config))
        {
            string Required(string key) => config[key] is { Length: > 0 } v
                ? v
                : throw new InvalidOperationException($"{key} муқаррар нашудааст (Sms:Provider = OsonSms).");
            services.AddSingleton(new OsonSmsOptions(
                config["Sms:OsonSms:BaseUrl"] ?? "https://api.osonsms.com",
                Required("Sms:OsonSms:Login"),
                Required("Sms:OsonSms:Token"),
                Required("Sms:OsonSms:Sender"),
                config.GetValue<bool>("Sms:OsonSms:IncludeCountryCode")));
            // Тибқи ҳуҷҷати OsonSMS: timeout-и пайвастшавӣ 20 сония
            services.AddHttpClient<ISmsSender, OsonSmsSender>(c => c.Timeout = TimeSpan.FromSeconds(20));
        }
        else
        {
            services.AddSingleton<ISmsSender, DevSmsSender>();
        }

        // Тоза кардани кэши сайт баъд аз тағйирот дар админ (Site:RevalidateUrl, Site:RevalidateSecret)
        services.AddSingleton(new SiteCacheOptions(config["Site:RevalidateUrl"], config["Site:RevalidateSecret"]));
        services.AddHttpClient<ISiteCache, HttpSiteCache>(c => c.Timeout = TimeSpan.FromSeconds(3));

        // Боти Telegram (Telegram:BotToken + Telegram:BotUsername). Агар набошад — Telegram хомӯш.
        if (IsTelegram(config))
        {
            var telegram = new TelegramOptions(config["Telegram:BotToken"]!, config["Telegram:BotUsername"]!.TrimStart('@'),
                config["Telegram:ApiBaseUrl"] ?? "https://api.telegram.org");
            services.AddSingleton(telegram);
            // Timeout аз long polling (25с) калонтар
            services.AddHttpClient<TelegramBotClient>(c => c.Timeout = TimeSpan.FromSeconds(40));
            services.AddTransient<ITelegramBot>(sp => sp.GetRequiredService<TelegramBotClient>());
            services.AddHostedService<TelegramPollingService>();
        }
        else
        {
            services.AddSingleton<ITelegramBot, DisabledTelegramBot>();
        }

        // Огоҳии фурӯшанда дар бораи фармоиши нав — ба ҳамаи роҳҳои танзимшуда:
        //  • Telegram: Orders:TelegramChatId (чат ё гурӯҳи кормандон) + боти Telegram;
        //  • WhatsApp: Orders:CallMeBotApiKey + Orders:WhatsAppNumber (CallMeBot).
        // Агар ҳеҷ кадом набошад — фармоиш танҳо дар база (ва мизоҷ метавонад ба WhatsApp нависад).
        var anyChannel = false;
        if (IsTelegram(config) && long.TryParse(config["Orders:TelegramChatId"], out var ownerChatId))
        {
            services.AddSingleton(new TelegramOwnerOptions(ownerChatId));
            services.AddSingleton<IOrderChannel, TelegramOwnerChannel>();
            anyChannel = true;
        }
        if (config["Orders:CallMeBotApiKey"] is { Length: > 0 } callMeBotKey && config["Orders:WhatsAppNumber"] is { Length: > 0 } owner)
        {
            services.AddSingleton(new CallMeBotOptions(owner, callMeBotKey, config["Orders:CallMeBotBaseUrl"] ?? "https://api.callmebot.com"));
            services.AddHttpClient(CallMeBotChannel.HttpClientName, c => c.Timeout = TimeSpan.FromSeconds(20));
            services.AddSingleton<IOrderChannel, CallMeBotChannel>();
            anyChannel = true;
        }
        if (anyChannel)
        {
            services.AddSingleton<QueuedOrderNotifier>();
            services.AddSingleton<IOrderNotifier>(sp => sp.GetRequiredService<QueuedOrderNotifier>());
            services.AddHostedService<OrderNotificationWorker>();
        }
        else
        {
            services.AddSingleton<IOrderNotifier, NoOrderNotifier>();
        }

        return services;
    }

    /// <summary>Оё боти Telegram танзим шудааст.</summary>
    public static bool IsTelegram(IConfiguration config) =>
        !string.IsNullOrWhiteSpace(config["Telegram:BotToken"]) && !string.IsNullOrWhiteSpace(config["Telegram:BotUsername"]);

    /// <summary>Оё SMS-и воқеӣ (OsonSMS) фаъол аст.</summary>
    public static bool IsOsonSms(IConfiguration config) =>
        string.Equals(config["Sms:Provider"], "OsonSms", StringComparison.OrdinalIgnoreCase);
}
