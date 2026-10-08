using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using RudakiMarket.Application.Auth;

namespace RudakiMarket.Api.Endpoints;

internal sealed record LoginRequest(string Username, string Password);

internal static class AuthEndpoints
{
    public const string LoginRateLimit = "login";

    public static IEndpointRouteBuilder MapAdminAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/auth").RequireCors(Cors.Admin);

        group.MapPost("/login", async (LoginRequest req, AuthService auth, HttpContext http, CancellationToken ct) =>
            {
                var user = await auth.ValidateAsync(req.Username, req.Password, ct);
                if (user is null)
                    return Results.Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Логин ё парол нодуруст аст.");

                var identity = new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Name, user.Username)],
                    AuthSchemes.Admin);
                await http.SignInAsync(AuthSchemes.Admin, new ClaimsPrincipal(identity));
                return Results.Ok(new { username = user.Username });
            })
            .RequireRateLimiting(LoginRateLimit);

        group.MapPost("/logout", async (HttpContext http) =>
        {
            await http.SignOutAsync(AuthSchemes.Admin);
            return Results.NoContent();
        });

        group.MapGet("/me", (ClaimsPrincipal user) => Results.Ok(new { username = user.Identity?.Name }))
            .RequireAuthorization();

        return app;
    }
}
