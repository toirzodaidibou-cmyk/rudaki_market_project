using Microsoft.AspNetCore.Mvc;
using RudakiMarket.Application.Categories;

namespace RudakiMarket.Api.Endpoints;

internal static class CategoryEndpoints
{
    /// <summary>Оммавӣ (барои сайт): танҳо категорияҳои фаъол.</summary>
    public static IEndpointRouteBuilder MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/categories", async (CategoryService categories, HttpContext http, CancellationToken ct) =>
        {
            http.Response.Headers.CacheControl = "public, max-age=30";
            return Results.Ok(await categories.ListPublicAsync(ct));
        });
        return app;
    }

    /// <summary>Барои панели админ (бо логин).</summary>
    public static IEndpointRouteBuilder MapAdminCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/categories").RequireAuthorization().RequireCors(Cors.Admin);

        group.MapGet("/", async (CategoryService s, CancellationToken ct) => Results.Ok(await s.ListAsync(ct)));

        group.MapGet("/{id:int}", async (int id, CategoryService s, CancellationToken ct) =>
            (await s.GetAsync(id, ct)).ToHttp(Results.Ok));

        group.MapPost("/", async (SaveCategoryRequest req, CategoryService s, CancellationToken ct) =>
            (await s.CreateAsync(req, ct)).ToHttp(dto => Results.Created($"/api/admin/categories/{dto.Id}", dto)));

        group.MapPut("/{id:int}", async (int id, SaveCategoryRequest req, CategoryService s, CancellationToken ct) =>
            (await s.UpdateAsync(id, req, ct)).ToHttp(Results.Ok));

        group.MapDelete("/{id:int}", async (int id, CategoryService s, CancellationToken ct) =>
            (await s.DeleteAsync(id, ct)).ToHttp(_ => Results.NoContent()));

        // Икона: multipart/form-data, майдони "icon". CSRF: cookie SameSite=Strict + CORS танҳо барои админ.
        group.MapPost("/{id:int}/icon", async (int id, IFormFile icon, CategoryService s, CancellationToken ct) =>
            {
                await using var stream = icon.OpenReadStream();
                return (await s.SetIconAsync(id, stream, icon.Length, ct)).ToHttp(Results.Ok);
            })
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(CategoryService.MaxIconBytes + 64 * 1024));

        return app;
    }
}
