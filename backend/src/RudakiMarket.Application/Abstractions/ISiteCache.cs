namespace RudakiMarket.Application.Abstractions;

/// <summary>
/// Тоза кардани кэши сайт (Next.js), то тағйироти админ дар сайт фавран пайдо шавад.
/// Хато набояд амали админро вайрон кунад — танҳо дар log навишта мешавад.
/// </summary>
public interface ISiteCache
{
    Task InvalidateAsync(IReadOnlyCollection<string> tags, CancellationToken ct = default);
}

/// <summary>Тегҳои кэш — бо тегҳои fetch дар frontend/src/lib/api.ts мувофиқанд.</summary>
public static class SiteCacheTags
{
    public const string Products = "products";
    public const string Categories = "categories";
    public const string Bundles = "bundles";
}
