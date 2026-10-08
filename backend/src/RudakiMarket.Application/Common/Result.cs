namespace RudakiMarket.Application.Common;

public enum ResultStatus
{
    Ok,
    NotFound,
    Invalid,
    /// <summary>Амал бо ҳолати ҷорӣ мувофиқ нест (масалан, категорияе, ки мол дорад, нест карда намешавад).</summary>
    Conflict,
}

/// <summary>Натиҷаи амал: муваффақ, ёфт нашуд, хатоҳои валидатсия (майдон → паёмҳо) ё конфликт.</summary>
public sealed class Result<T>
{
    public ResultStatus Status { get; private init; }
    public T? Value { get; private init; }
    public IDictionary<string, string[]> Errors { get; private init; } = new Dictionary<string, string[]>();
    public string? Message { get; private init; }

    public static Result<T> Ok(T value) => new() { Status = ResultStatus.Ok, Value = value };
    public static Result<T> NotFound() => new() { Status = ResultStatus.NotFound };
    public static Result<T> Invalid(IDictionary<string, string[]> errors) => new() { Status = ResultStatus.Invalid, Errors = errors };
    public static Result<T> Invalid(string field, string message) => Invalid(new Dictionary<string, string[]> { [field] = [message] });
    public static Result<T> Conflict(string message) => new() { Status = ResultStatus.Conflict, Message = message };
}

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
