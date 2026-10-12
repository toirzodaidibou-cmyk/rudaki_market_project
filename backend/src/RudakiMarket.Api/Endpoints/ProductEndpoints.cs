using Microsoft.AspNetCore.Mvc;
using RudakiMarket.Application.Products;

namespace RudakiMarket.Api.Endpoints;

internal sealed record ReorderImagesRequest(int[] ImageIds);

internal static class ProductEndpoints
{
    /// <summary>
    /// Оммавӣ (барои сайт): молҳои фаъол, саҳифа ба саҳифа, навтаринҳо аввал.
    /// Бе "category" — аз ҳамаи категорияҳо (саҳифаи асосӣ).
    /// </summary>
    public static IEndpointRouteBuilder MapProductEndpoints(this IEndpointRouteBuilder app)
    {
        // ?category=&q=&sort=new|cheap|expensive|discount&min=&max=&page=&pageSize=
        app.MapGet("/api/products", async (string? category, string? q, string? sort, decimal? min, decimal? max,
            int? page, int? pageSize, ProductService s, HttpContext http, CancellationToken ct) =>
        {
            http.Response.Headers.CacheControl = "public, max-age=30";
            return (await s.ListPublicAsync(category, page ?? 1, pageSize ?? 24, ct, q, sort, min, max)).ToHttp(Results.Ok);
        });

        // Саҳифаи мол: маълумоти пурра + молҳои монанд
        app.MapGet("/api/products/{id:int}", async (int id, ProductService s, HttpContext http, CancellationToken ct) =>
        {
            http.Response.Headers.CacheControl = "public, max-age=30";
            return (await s.GetPublicAsync(id, ct)).ToHttp(Results.Ok);
        });

        // Саҳифаи асосӣ: 20 мол (аксиядорҳо аввал, баъд навтаринҳо)
        app.MapGet("/api/products/home", async (ProductService s, HttpContext http, CancellationToken ct) =>
        {
            http.Response.Headers.CacheControl = "public, max-age=30";
            return Results.Ok(await s.ListHomeAsync(ct));
        });
        return app;
    }

    /// <summary>Барои панели админ (бо логин).</summary>
    public static IEndpointRouteBuilder MapAdminProductEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/products").RequireAuthorization().RequireCors(Cors.Admin);

        // ?photo=temporary (сурати муваққатӣ, пурфурӯшҳо аввал) | none (бе сурат)
        group.MapGet("/", async (string? search, int? categoryId, string? photo, int? page, int? pageSize, ProductService s, CancellationToken ct) =>
            Results.Ok(await s.ListAsync(search, categoryId, page ?? 1, pageSize ?? 24, ct, photo)));

        group.MapGet("/{id:int}", async (int id, ProductService s, CancellationToken ct) =>
            (await s.GetAsync(id, ct)).ToHttp(Results.Ok));

        group.MapPost("/", async (SaveProductRequest req, ProductService s, CancellationToken ct) =>
            (await s.CreateAsync(req, ct)).ToHttp(dto => Results.Created($"/api/admin/products/{dto.Id}", dto)));

        group.MapPut("/{id:int}", async (int id, SaveProductRequest req, ProductService s, CancellationToken ct) =>
            (await s.UpdateAsync(id, req, ct)).ToHttp(Results.Ok));

        group.MapDelete("/{id:int}", async (int id, ProductService s, CancellationToken ct) =>
            await s.DeleteAsync(id, ct) ? Results.NoContent() : Results.NotFound());

        // Суратҳо: multipart/form-data, майдони "images" (як ё якчанд файл)
        group.MapPost("/{id:int}/images", async (int id, IFormFileCollection images, ProductService s, CancellationToken ct) =>
            {
                var uploads = new List<UploadFile>();
                foreach (var file in images)
                {
                    if (file.Length > ProductService.MaxImageBytes)
                        return Results.ValidationProblem(new Dictionary<string, string[]>
                        {
                            ["images"] = [$"«{file.FileName}»: андоза бояд то 5 MB бошад."],
                        });
                    using var buffer = new MemoryStream();
                    await file.CopyToAsync(buffer, ct);
                    uploads.Add(new UploadFile(buffer.ToArray(), file.FileName));
                }
                return (await s.AddImagesAsync(id, uploads, ct)).ToHttp(Results.Ok);
            })
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(ProductService.MaxImages * ProductService.MaxImageBytes + 1024 * 1024));

        group.MapDelete("/{id:int}/images/{imageId:int}", async (int id, int imageId, ProductService s, CancellationToken ct) =>
            (await s.DeleteImageAsync(id, imageId, ct)).ToHttp(Results.Ok));

        group.MapPut("/{id:int}/images/order", async (int id, ReorderImagesRequest req, ProductService s, CancellationToken ct) =>
            (await s.ReorderImagesAsync(id, req.ImageIds ?? [], ct)).ToHttp(Results.Ok));

        return app;
    }
}
