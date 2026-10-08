using RudakiMarket.Application.Reports;

namespace RudakiMarket.Api.Endpoints;

/// <summary>Ҳисобот (админ): фурӯш, график, молҳои пурфурӯш, мизоҷон.</summary>
internal static class AdminReportEndpoints
{
    public static IEndpointRouteBuilder MapAdminReportEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/admin/reports", async (ReportService s, CancellationToken ct) => Results.Ok(await s.GetAsync(ct)))
            .RequireAuthorization()
            .RequireCors(Cors.Admin);
        return app;
    }
}
