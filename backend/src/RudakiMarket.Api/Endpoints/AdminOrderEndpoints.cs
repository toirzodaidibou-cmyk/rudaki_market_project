using RudakiMarket.Application.Orders;

namespace RudakiMarket.Api.Endpoints;

/// <summary>Фармоишҳо дар панели админ (бо логин).</summary>
internal static class AdminOrderEndpoints
{
    public static IEndpointRouteBuilder MapAdminOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/orders").RequireAuthorization().RequireCors(Cors.Admin);

        // ?status=new|confirmed|delivering|delivered|cancelled&q=&page=
        group.MapGet("/", async (string? status, string? q, int? page, AdminOrderService s, CancellationToken ct) =>
            Results.Ok(await s.ListAsync(status, q, page ?? 1, ct)));

        group.MapGet("/counts", async (AdminOrderService s, CancellationToken ct) => Results.Ok(await s.CountsAsync(ct)));

        group.MapGet("/{id:int}", async (int id, AdminOrderService s, CancellationToken ct) =>
            (await s.GetAsync(id, ct)).ToHttp(Results.Ok));

        group.MapPut("/{id:int}/status", async (int id, SetOrderStatusRequest req, AdminOrderService s, CancellationToken ct) =>
            (await s.SetStatusAsync(id, req.Status, ct)).ToHttp(Results.Ok));

        return app;
    }
}
