using RudakiMarket.Application.Common;

namespace RudakiMarket.Api.Endpoints;

internal static class ResultExtensions
{
    /// <summary>Result → HTTP: Ok → ok(...), NotFound → 404, Invalid → 400 (ValidationProblem), Conflict → 409.</summary>
    public static IResult ToHttp<T>(this Result<T> result, Func<T, IResult> ok) => result.Status switch
    {
        ResultStatus.Ok => ok(result.Value!),
        ResultStatus.NotFound => Results.NotFound(),
        ResultStatus.Conflict => Results.Problem(statusCode: StatusCodes.Status409Conflict, title: result.Message),
        _ => Results.ValidationProblem(result.Errors),
    };
}
