using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using RudakiMarket.Application.Common;
using RudakiMarket.Application.Customers;
using RudakiMarket.Application.Orders;

namespace RudakiMarket.Api.Endpoints;

/// <param name="Channel">"sms" ё "telegram"</param>
internal sealed record CodeRequest(string Phone, string? Channel);
internal sealed record VerifyRequest(string Phone, string Code);
internal sealed record CartQuantityRequest(int Quantity);
/// <param name="DeliveryStart">оғози вақти расонидан (аз /api/delivery/options); null — "ҳарчи зудтар"</param>
/// <param name="PaymentMethod">cash | alif | dc | korti_milli</param>
/// <param name="RequestId">калиди тасодуфӣ аз браузер (як бор барои ҳар фармоиш) — ҳимоя аз фармоиши дукарата</param>
/// <param name="UseBonus">бонуси корти Рӯдакиро сарф кардан</param>
internal sealed record PlaceOrderRequest(string Address, string? Comment, DateTimeOffset? DeliveryStart, string? PaymentMethod, Guid? RequestId, bool? UseBonus);
/// <summary>Сабади меҳмон (дар браузер): мол ва миқдор.</summary>
internal sealed record GuestCartRequest(IReadOnlyList<CartLineInput>? Items);

/// <summary>Мизоҷони сайт: даромад бо рақам (рамзи SMS) ва писандидаҳо (❤️).</summary>
internal static class CustomerEndpoints
{
    public const string CodeRequestRateLimit = "otp-request";
    public const string CodeVerifyRateLimit = "otp-verify";
    public const string OrderRateLimit = "order";

    public static IEndpointRouteBuilder MapCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/auth").RequireCors(Cors.Site);

        // Кадом роҳҳо фаъоланд (сайт тугмаҳои SMS / Telegram-ро аз рӯи ин нишон медиҳад)
        auth.MapGet("/channels", (LoginChannels channels) => Results.Ok(new { sms = channels.Sms, telegram = channels.Telegram }));

        auth.MapPost("/code", async (CodeRequest req, CustomerAuthService s, CancellationToken ct) =>
                (await s.RequestCodeAsync(req.Phone, req.Channel, ct)).ToHttp(Results.Ok))
            .RequireRateLimiting(CodeRequestRateLimit);

        auth.MapPost("/verify", async (VerifyRequest req, CustomerAuthService s, HttpContext http, CancellationToken ct) =>
            {
                var result = await s.VerifyAsync(req.Phone, req.Code, ct);
                if (result.Status != ResultStatus.Ok) return result.ToHttp(_ => Results.Ok());

                var customer = result.Value!;
                var identity = new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, customer.Id.ToString()), new Claim(ClaimTypes.MobilePhone, customer.Phone)],
                    AuthSchemes.Customer);
                await http.SignInAsync(AuthSchemes.Customer, new ClaimsPrincipal(identity));
                return Results.Ok(new { phone = customer.Phone });
            })
            .RequireRateLimiting(CodeVerifyRateLimit);

        auth.MapGet("/me", (ClaimsPrincipal user) => Results.Ok(new { phone = user.FindFirstValue(ClaimTypes.MobilePhone) }))
            .RequireAuthorization(AuthSchemes.Customer);

        auth.MapPost("/logout", async (HttpContext http) =>
        {
            await http.SignOutAsync(AuthSchemes.Customer);
            return Results.NoContent();
        });

        var favorites = app.MapGroup("/api/favorites").RequireCors(Cors.Site).RequireAuthorization(AuthSchemes.Customer);

        favorites.MapGet("/", async (ClaimsPrincipal user, FavoriteService s, CancellationToken ct) =>
            Results.Ok(await s.ListAsync(CustomerId(user), ct)));

        favorites.MapGet("/ids", async (ClaimsPrincipal user, FavoriteService s, CancellationToken ct) =>
            Results.Ok(await s.IdsAsync(CustomerId(user), ct)));

        favorites.MapPut("/{productId:int}", async (int productId, ClaimsPrincipal user, FavoriteService s, CancellationToken ct) =>
            (await s.AddAsync(CustomerId(user), productId, ct)).ToHttp(_ => Results.NoContent()));

        favorites.MapDelete("/{productId:int}", async (int productId, ClaimsPrincipal user, FavoriteService s, CancellationToken ct) =>
        {
            await s.RemoveAsync(CustomerId(user), productId, ct);
            return Results.NoContent();
        });


        // Сабад: ҳамеша ҳолати пурраи сабад бармегардад (рӯйхат + маблағ)
        var cart = app.MapGroup("/api/cart").RequireCors(Cors.Site).RequireAuthorization(AuthSchemes.Customer);

        cart.MapGet("/", async (ClaimsPrincipal user, CartService s, CancellationToken ct) =>
            Results.Ok(await s.GetAsync(CustomerId(user), ct)));

        cart.MapPut("/{productId:int}", async (int productId, CartQuantityRequest req, ClaimsPrincipal user, CartService s, CancellationToken ct) =>
            (await s.SetQuantityAsync(CustomerId(user), productId, req.Quantity, ct)).ToHttp(Results.Ok));

        cart.MapDelete("/{productId:int}", async (int productId, ClaimsPrincipal user, CartService s, CancellationToken ct) =>
            (await s.SetQuantityAsync(CustomerId(user), productId, 0, ct)).ToHttp(Results.Ok));

        cart.MapDelete("/", async (ClaimsPrincipal user, CartService s, CancellationToken ct) =>
            Results.Ok(await s.ClearAsync(CustomerId(user), ct)));

        // Сабади меҳмон баъд аз даромад ба сабади аккаунт ҳамроҳ мешавад
        cart.MapPost("/merge", async (GuestCartRequest req, ClaimsPrincipal user, CartService s, CancellationToken ct) =>
            Results.Ok(await s.MergeAsync(CustomerId(user), req.Items ?? [], ct)));

        // "Боз харидан": молҳои фармоиши гузашта ба сабад
        cart.MapPost("/reorder/{orderNumber:int}", async (int orderNumber, ClaimsPrincipal user, CartService s, CancellationToken ct) =>
            (await s.ReorderAsync(CustomerId(user), orderNumber, ct)).ToHttp(Results.Ok));

        // "Ҳамаашро ба сабад": молҳои маҷмӯа
        cart.MapPost("/bundle/{bundleId:int}", async (int bundleId, ClaimsPrincipal user, CartService s, CancellationToken ct) =>
            (await s.AddBundleAsync(CustomerId(user), bundleId, ct)).ToHttp(Results.Ok));


        // Сабади меҳмон (бе логин): молҳо дар браузер, нарх ва дастрасӣ — аз база
        app.MapPost("/api/cart/preview", async (GuestCartRequest req, CartService s, CancellationToken ct) =>
                Results.Ok(await s.PreviewAsync(req.Items ?? [], ct)))
            .RequireCors(Cors.Site);

        // Вақтҳои расонидан ва тарзҳои пардохт (барои сабад; бе логин)
        app.MapGet("/api/delivery/options", (DeliverySchedule s, HttpContext http) =>
        {
            http.Response.Headers.CacheControl = "no-store"; // вақт ҳар дақиқа иваз мешавад
            return Results.Ok(s.Get());
        }).RequireCors(Cors.Site);

        // Таърихи харид (профил)
        app.MapGet("/api/orders", async (int? page, ClaimsPrincipal user, OrderService s, CancellationToken ct) =>
                Results.Ok(await s.ListForCustomerAsync(CustomerId(user), page ?? 1, ct)))
            .RequireCors(Cors.Site)
            .RequireAuthorization(AuthSchemes.Customer);

        // Корти бонусӣ (профил)
        app.MapGet("/api/loyalty", async (ClaimsPrincipal user, LoyaltyService s, HttpContext http, CancellationToken ct) =>
            {
                http.Response.Headers.CacheControl = "no-store";
                return await s.GetAsync(CustomerId(user), ct) is { } card ? Results.Ok(card) : Results.NotFound();
            })
            .RequireCors(Cors.Site)
            .RequireAuthorization(AuthSchemes.Customer);

        // Фармоиш аз сабад → база + паём барои WhatsApp-и фурӯшанда
        app.MapPost("/api/orders", async (PlaceOrderRequest req, ClaimsPrincipal user, OrderService s, CancellationToken ct) =>
                (await s.PlaceAsync(CustomerId(user), req.Address, req.Comment, req.DeliveryStart, req.PaymentMethod, ct, req.RequestId, req.UseBonus == true)).ToHttp(Results.Ok))
            .RequireCors(Cors.Site)
            .RequireAuthorization(AuthSchemes.Customer)
            .RequireRateLimiting(OrderRateLimit);

        return app;
    }

    private static int CustomerId(ClaimsPrincipal user) => int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
