using Microsoft.AspNetCore.Mvc;
using RudakiMarket.Application.Prices;

namespace RudakiMarket.Api.Endpoints;

/// <summary>Нархҳо бо Excel (админ): гирифтан → пешнамоиш → татбиқ.</summary>
internal static class AdminPriceEndpoints
{
    private const long MaxFileBytes = 20 * 1024 * 1024; // 20 MB

    public static IEndpointRouteBuilder MapAdminPriceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/prices").RequireAuthorization().RequireCors(Cors.Admin);

        group.MapGet("/export", async (int? categoryId, PriceSheetService s, TimeProvider clock, CancellationToken ct) =>
        {
            var bytes = await s.ExportAsync(categoryId, ct);
            var date = clock.GetUtcNow().AddHours(5).ToString("yyyy-MM-dd"); // вақти Душанбе
            return Results.File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"rudaki-market-narkh-{date}.xlsx");
        });

        group.MapPost("/preview", async (IFormFile file, PriceSheetService s, CancellationToken ct) =>
            {
                if (file.Length is 0 or > MaxFileBytes)
                    return Results.ValidationProblem(new Dictionary<string, string[]> { ["file"] = ["Файл бояд то 20 MB бошад."] });
                await using var stream = file.OpenReadStream();
                var preview = await s.PreviewAsync(stream, ct);
                return preview is null
                    ? Results.ValidationProblem(new Dictionary<string, string[]>
                    {
                        ["file"] = ["Файли Excel (.xlsx) бо сутунҳои «ID» ва «Нарх» лозим аст — ҳамон файлеро, ки аз ин ҷо гирифтед, истифода баред."],
                    })
                    : Results.Ok(preview);
            })
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(MaxFileBytes + 1024 * 1024));

        group.MapPost("/apply", async (ApplyPricesRequest req, PriceSheetService s, CancellationToken ct) =>
        {
            var updated = await s.ApplyAsync(req.Changes, ct);
            return updated is null
                ? Results.ValidationProblem(new Dictionary<string, string[]> { ["changes"] = ["Тағйиротҳо нодурустанд."] })
                : Results.Ok(new { updated });
        });

        return app;
    }
}
