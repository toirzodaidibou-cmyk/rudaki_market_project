using RudakiMarket.Application.Customers;

namespace RudakiMarket.Api.Endpoints;

/// <summary>Бонусҳои мизоҷон дар панели админ (бо логин).</summary>
internal static class AdminLoyaltyEndpoints
{
    public static IEndpointRouteBuilder MapAdminLoyaltyEndpoints(this IEndpointRouteBuilder app)
    {
        // ?q=рақам&sort=balance|pending|purchases|recent&page=
        app.MapGet("/api/admin/loyalty", async (string? q, string? sort, int? page, AdminLoyaltyService s, CancellationToken ct) =>
                Results.Ok(await s.ListAsync(q, sort, page ?? 1, ct)))
            .RequireAuthorization()
            .RequireCors(Cors.Admin);
        return app;
    }
}
