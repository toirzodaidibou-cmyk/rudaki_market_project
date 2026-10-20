using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using RudakiMarket.Api;
using RudakiMarket.Api.Endpoints;
using RudakiMarket.Api.Seed;
using RudakiMarket.Application;
using RudakiMarket.Application.Categories;
using RudakiMarket.Application.Customers;
using RudakiMarket.Application.Orders;
using RudakiMarket.Application.Products;
using RudakiMarket.Infrastructure;
using RudakiMarket.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions { Args = args, WebRootPath = "wwwroot" });
Directory.CreateDirectory(builder.Environment.WebRootPath);

// Қиматҳои танзимот бе фосила ва сатри нав дар аввал/охир: майдонҳои Render ҳангоми гузоштан
// (paste) сатри навро илова мекунанд — суроға ё калид бо "\n" сарлавҳаи HTTP-ро вайрон мекард (500).
var untrimmed = builder.Configuration.AsEnumerable()
    .Where(kv => kv.Value is { } v && v.Length != v.Trim().Length)
    .Select(kv => new KeyValuePair<string, string?>(kv.Key, kv.Value!.Trim()))
    .ToList();
if (untrimmed.Count > 0) builder.Configuration.AddInMemoryCollection(untrimmed);

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, builder.Environment.WebRootPath);

builder.Services.AddProblemDetails();

// Калидҳои рамзгузории cookie дар база: сервери абрӣ диски доимӣ надорад — бе ин пас аз ҳар бозоғозӣ
// ҳамаи мизоҷон ва админ аз ҳисоб мебаромаданд.
builder.Services.AddDataProtection()
    .SetApplicationName("RudakiMarket")
    .PersistKeysToDbContext<AppDbContext>();

// Паси прокси (Render, Vercel): IP-и воқеии мизоҷ ва https аз X-Forwarded-*.
// Proxy:ForwardLimit — шумораи проксиҳо дар пеши сервер (Vercel → Render = 2). Бе ин маҳдудият
// барои ҳама як IP мешуд (ҳамаи мизоҷон якҷоя 5 рамз дар 10 дақиқа).
var forwardLimit = builder.Configuration.GetValue<int?>("Proxy:ForwardLimit");
if (forwardLimit is > 0)
{
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.ForwardLimit = forwardLimit;
        // Суроғаҳои проксиҳои абрӣ пешакӣ маълум нестанд
        o.KnownIPNetworks.Clear();
        o.KnownProxies.Clear();
    });
}

// Ду логини алоҳида (cookie-и HttpOnly — JavaScript онҳоро хонда наметавонад):
//  • админ  — "rm_admin",   SameSite=Strict, 8 соат (схемаи пешфарз);
//  • мизоҷ  — "rm_session", SameSite=Lax,    30 рӯз. Cookie-и мизоҷ ба endpoint-ҳои админ роҳ намедиҳад.
static void ApiCookie(CookieAuthenticationOptions o, string name, SameSiteMode sameSite, TimeSpan lifetime, bool isDev)
{
    o.Cookie.Name = name;
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = sameSite;
    o.Cookie.SecurePolicy = isDev ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    o.ExpireTimeSpan = lifetime;
    o.SlidingExpiration = true;
    // API: ба ҷои redirect ба саҳифаи логин — 401/403
    o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
}

var isDev = builder.Environment.IsDevelopment();
builder.Services.AddAuthentication(AuthSchemes.Admin)
    .AddCookie(AuthSchemes.Admin, o => ApiCookie(o, "rm_admin", SameSiteMode.Strict, TimeSpan.FromHours(8), isDev))
    .AddCookie(AuthSchemes.Customer, o => ApiCookie(o, "rm_session", SameSiteMode.Lax, TimeSpan.FromDays(30), isDev));
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AuthSchemes.Customer, p => p.AddAuthenticationSchemes(AuthSchemes.Customer).RequireAuthenticatedUser());

// Рамзҳои SMS: калиди HMAC аз user-secrets/танзимоти сервер. Рамз дар ҷавоб — ТАНҲО дар development.
var otpSecret = builder.Configuration["Auth:OtpSecret"];
if (string.IsNullOrWhiteSpace(otpSecret) || otpSecret.Length < 32)
    throw new InvalidOperationException("Auth:OtpSecret муқаррар нашудааст (ҳадди ақал 32 аломат).");
var realSms = RudakiMarket.Infrastructure.DependencyInjection.IsOsonSms(builder.Configuration);
// Роҳҳои рамз: Telegram (агар бот танзим шуда бошад) ва SMS (OsonSMS; дар development бе Telegram — реҷаи санҷишӣ).
var telegramOn = RudakiMarket.Infrastructure.DependencyInjection.IsTelegram(builder.Configuration);
builder.Services.AddSingleton(new LoginChannels(
    Sms: realSms || (isDev && !telegramOn),
    Telegram: telegramOn,
    TelegramBotUsername: builder.Configuration["Telegram:BotUsername"]?.TrimStart('@')));
// Дар production бояд ақаллан як роҳи воқеӣ бошад
if (!isDev && !realSms && !telegramOn)
    throw new InvalidOperationException("Дар production Sms:Provider = OsonSms ё боти Telegram лозим аст.");
// Рамз дар ҷавоб танҳо дар development ВА танҳо вақте ки SMS-и воқеӣ хомӯш аст.
builder.Services.AddSingleton(new OtpOptions(otpSecret, isDev && !realSms && builder.Configuration.GetValue<bool>("Auth:ExposeDevCode")));

// Фармоиш: рақами WhatsApp-и фурӯшанда ва қоидаи расонидан (аз танзимот)
var ownerWhatsApp = builder.Configuration["Orders:WhatsAppNumber"];
if (string.IsNullOrWhiteSpace(ownerWhatsApp))
    throw new InvalidOperationException("Orders:WhatsAppNumber муқаррар нашудааст.");
builder.Services.AddSingleton(new DeliveryOptions(
    builder.Configuration.GetValue("Orders:FreeDeliveryFrom", 200m),
    builder.Configuration.GetValue("Orders:DeliveryFee", 10m),
    ownerWhatsApp));

// Вақти расонидан (соатҳои кор, вақтҳо) ва тарзҳои пардохт — appsettings "Delivery"
var schedule = builder.Configuration.GetSection("Delivery").Get<DeliveryScheduleOptions>() ?? new DeliveryScheduleOptions();
if (schedule.OpenHour is < 0 or > 23 || schedule.CloseHour <= schedule.OpenHour || schedule.CloseHour > 24 || schedule.SlotHours < 1)
    throw new InvalidOperationException("Delivery: соатҳои кор нодурустанд.");
builder.Services.AddSingleton(schedule);
builder.Services.AddSingleton<DeliverySchedule>();

var adminOrigins = builder.Configuration.GetSection("Cors:AdminOrigins").Get<string[]>() ?? [];
var siteOrigins = builder.Configuration.GetSection("Cors:SiteOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(o =>
{
    o.AddPolicy(Cors.Admin, p => p.WithOrigins(adminOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
    o.AddPolicy(Cors.Site, p => p.WithOrigins(siteOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

// Муҳофизат аз тахмин ва спам (барои ҳар IP):
//  • логини админ — 5 кӯшиш дар 1 дақиқа;
//  • дархости рамзи SMS — 5 дар 10 дақиқа (SMS пулӣ аст);
//  • санҷиши рамз — 10 дар 1 дақиқа.
static RateLimitPartition<string> PerIp(HttpContext ctx, int limit, TimeSpan window) =>
    RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = limit, Window = window });
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy(AuthEndpoints.LoginRateLimit, ctx => PerIp(ctx, 5, TimeSpan.FromMinutes(1)));
    o.AddPolicy(CustomerEndpoints.CodeRequestRateLimit, ctx => PerIp(ctx, 5, TimeSpan.FromMinutes(10)));
    o.AddPolicy(CustomerEndpoints.CodeVerifyRateLimit, ctx => PerIp(ctx, 10, TimeSpan.FromMinutes(1)));
    o.AddPolicy(CustomerEndpoints.OrderRateLimit, ctx => PerIp(ctx, 10, TimeSpan.FromMinutes(10)));
});

var app = builder.Build();

if (forwardLimit is > 0) app.UseForwardedHeaders();

if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    await DataSeeder.SeedAsync(scope.ServiceProvider, app.Configuration, app.Environment.ContentRootPath,
        app.Logger);
}

// Фармони хидматӣ: dotnet run --project src/RudakiMarket.Api -- --regenerate-thumbs
// Суратҳои хурди кортро аз нав месозад (пас аз иваз шудани андозаи онҳо) ва барнома тамом мешавад.
if (args.Contains("--regenerate-thumbs"))
{
    using var scope = app.Services.CreateScope();
    var (done, skipped) = await scope.ServiceProvider.GetRequiredService<ProductService>()
        .RegenerateThumbnailsAsync(CancellationToken.None);
    app.Logger.LogInformation("Суратҳои хурд аз нав сохта шуданд: {Done}, гузаронида шуд: {Skipped}", done, skipped);
    return;
}

// Фармони хидматӣ: dotnet run --project src/RudakiMarket.Api -- --regenerate-icons
// Иконаҳои категорияҳоро то 160px WebP хурд мекунад ва барнома тамом мешавад.
if (args.Contains("--regenerate-icons"))
{
    using var scope = app.Services.CreateScope();
    var (done, skipped) = await scope.ServiceProvider.GetRequiredService<CategoryService>()
        .RegenerateIconsAsync(CancellationToken.None);
    app.Logger.LogInformation("Иконаҳо хурд шуданд: {Done}, бетағйир: {Skipped}", done, skipped);
    return;
}

// Дархости вайрон (масалан, JSON-и нодуруст) → 400, на 500.
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    StatusCodeSelector = ex => ex is BadHttpRequestException bad ? bad.StatusCode : StatusCodes.Status500InternalServerError,
});
app.UseStatusCodePages();

// Файлҳои боршуда (/uploads/...). Номҳо GUID ҳастанд, бинобар ин дароз кэш мешаванд.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        ctx.Context.Response.Headers.XContentTypeOptions = "nosniff";
    },
});

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new { name = "RUDAKI MARKET API" }));
// Санҷиши зинда будан барои Render (бе база — то хатои муваққатии база серверро аз нав сар накунад)
app.MapGet("/health", () => Results.Ok(new { ok = true }));
// UptimeRobot ҳар 5 дақиқа: сервер ва база (Supabase-и ройгон пас аз 7 рӯзи бекорӣ таваққуф мекунад) бедор мемонанд.
// База дастнорас — 503, то UptimeRobot огоҳ кунад.
app.MapGet("/health/db", async (AppDbContext db, CancellationToken ct) =>
{
    try
    {
        var products = await db.Products.CountAsync(p => p.IsActive, ct);
        return Results.Ok(new { ok = true, db = true, products });
    }
    catch (Exception) when (!ct.IsCancellationRequested)
    {
        return Results.Json(new { ok = false, db = false }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

// Файлҳо дар Supabase: "/uploads/..." → суроғаи оммавии Supabase (барои пайвандҳои кӯҳна ва админ).
if (RudakiMarket.Infrastructure.DependencyInjection.SupabaseStorage(app.Configuration) is { } supabase)
{
    app.MapGet("/uploads/{**path}", (string path) =>
        RudakiMarket.Infrastructure.Storage.SupabaseFileStorage.ToKey("/uploads/" + path) is { } key
            ? Results.Redirect(supabase.PublicUrl(key), permanent: true)
            : Results.NotFound());
}
app.MapCategoryEndpoints();
app.MapAdminAuthEndpoints();
app.MapAdminCategoryEndpoints();
app.MapProductEndpoints();
app.MapAdminProductEndpoints();
app.MapCustomerEndpoints();
app.MapAdminOrderEndpoints();
app.MapBundleEndpoints();
app.MapAdminBundleEndpoints();
app.MapAdminPriceEndpoints();
app.MapAdminReportEndpoints();
app.MapBannerEndpoints();

app.Run();
