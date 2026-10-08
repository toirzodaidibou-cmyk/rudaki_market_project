namespace RudakiMarket.Application.Abstractions;

/// <summary>Фиристодани SMS. Ҳоло — DevSmsSender (танҳо log); дар production — хизматрасони SMS.</summary>
public interface ISmsSender
{
    Task SendAsync(string phone, string text, CancellationToken ct = default);
}
