using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using RudakiMarket.Application.Assistant;

namespace RudakiMarket.Api.Endpoints;

/// <summary>Ёрдамчии AI дар сайт — барои меҳмон ҳам; агар мизоҷ ворид шуда бошад, рақам ва суроғаи пешинааш маълум аст.</summary>
internal static class AssistantEndpoints
{
    public const string RateLimit = "assistant";

    public static IEndpointRouteBuilder MapAssistantEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/assistant").RequireCors(Cors.Site);

        // Сайт тугмаи ёрдамчиро танҳо вақте нишон медиҳад, ки калиди AI танзим шуда бошад
        // lastError — охирин хатои хидмати AI (бе калид), барои ташхис
        group.MapGet("/status", (AssistantService s) => Results.Ok(new { enabled = s.IsEnabled, lastError = s.LastError }));

        group.MapPost("/chat", async (AssistantRequest req, AssistantService s, HttpContext http, CancellationToken ct) =>
            {
                var auth = await http.AuthenticateAsync(AuthSchemes.Customer);
                int? customerId = auth.Succeeded && int.TryParse(auth.Principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
                return (await s.ChatAsync(customerId, req, ct)).ToHttp(Results.Ok);
            })
            .RequireRateLimiting(RateLimit);

        return app;
    }
}
