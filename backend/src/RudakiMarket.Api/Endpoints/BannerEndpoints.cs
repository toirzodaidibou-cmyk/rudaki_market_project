using Microsoft.AspNetCore.Mvc;
using RudakiMarket.Application.Banners;

namespace RudakiMarket.Api.Endpoints;

internal static class BannerEndpoints
{
    public static IEndpointRouteBuilder MapBannerEndpoints(this IEndpointRouteBuilder app)
    {
        // Сайт: слайдҳои фаъол (бо сурат)
        app.MapGet("/api/banners", async (BannerService s, HttpContext http, CancellationToken ct) =>
        {
            http.Response.Headers.CacheControl = "public, max-age=30";
            return Results.Ok(await s.ListPublicAsync(ct));
        });

        // Админ
        var group = app.MapGroup("/api/admin/banners").RequireAuthorization().RequireCors(Cors.Admin);
        group.MapGet("/", async (BannerService s, CancellationToken ct) => Results.Ok(await s.ListAsync(ct)));
        group.MapPost("/", async (SaveBannerRequest req, BannerService s, CancellationToken ct) =>
            (await s.CreateAsync(req, ct)).ToHttp(dto => Results.Created($"/api/admin/banners/{dto.Id}", dto)));
        group.MapPut("/{id:int}", async (int id, SaveBannerRequest req, BannerService s, CancellationToken ct) =>
            (await s.UpdateAsync(id, req, ct)).ToHttp(Results.Ok));
        group.MapDelete("/{id:int}", async (int id, BannerService s, CancellationToken ct) =>
            await s.DeleteAsync(id, ct) ? Results.NoContent() : Results.NotFound());
        group.MapPost("/{id:int}/image", async (int id, IFormFile image, BannerService s, CancellationToken ct) =>
            {
                using var buffer = new MemoryStream();
                await image.CopyToAsync(buffer, ct);
                return (await s.SetImageAsync(id, buffer.ToArray(), ct)).ToHttp(Results.Ok);
            })
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(BannerService.MaxImageBytes + 1024 * 1024));
        return app;
    }
}
