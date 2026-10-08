using RudakiMarket.Application.Bundles;

namespace RudakiMarket.Api.Endpoints;

internal static class BundleEndpoints
{
    /// <summary>Оммавӣ (сайт): маҷмӯаҳои фаъол ва як маҷмӯа бо молҳояш.</summary>
    public static IEndpointRouteBuilder MapBundleEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/bundles", async (BundleService s, HttpContext http, CancellationToken ct) =>
        {
            http.Response.Headers.CacheControl = "public, max-age=30";
            return Results.Ok(await s.ListPublicAsync(ct));
        });

        app.MapGet("/api/bundles/{id:int}", async (int id, BundleService s, HttpContext http, CancellationToken ct) =>
        {
            http.Response.Headers.CacheControl = "public, max-age=30";
            return (await s.GetPublicAsync(id, ct)).ToHttp(Results.Ok);
        });
        return app;
    }

    /// <summary>Админ: CRUD-и маҷмӯаҳо.</summary>
    public static IEndpointRouteBuilder MapAdminBundleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/bundles").RequireAuthorization().RequireCors(Cors.Admin);

        group.MapGet("/", async (BundleService s, CancellationToken ct) => Results.Ok(await s.ListAsync(ct)));

        group.MapGet("/{id:int}", async (int id, BundleService s, CancellationToken ct) =>
            (await s.GetAsync(id, ct)).ToHttp(Results.Ok));

        group.MapPost("/", async (SaveBundleRequest req, BundleService s, CancellationToken ct) =>
            (await s.CreateAsync(req, ct)).ToHttp(dto => Results.Created($"/api/admin/bundles/{dto.Id}", dto)));

        group.MapPut("/{id:int}", async (int id, SaveBundleRequest req, BundleService s, CancellationToken ct) =>
            (await s.UpdateAsync(id, req, ct)).ToHttp(Results.Ok));

        group.MapDelete("/{id:int}", async (int id, BundleService s, CancellationToken ct) =>
            await s.DeleteAsync(id, ct) ? Results.NoContent() : Results.NotFound());

        return app;
    }
}
