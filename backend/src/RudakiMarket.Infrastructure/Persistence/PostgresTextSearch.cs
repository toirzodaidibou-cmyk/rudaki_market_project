using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Infrastructure.Persistence;

/// <summary>
/// ILIKE '%...%' аз рӯи сутуни search_text (ҳар 4 ном, бе ҳарфҳои махсуси тоҷикӣ) — бо индекси GIN trigram (pg_trgm).
/// Ҳар калимаи дархост бояд дар ном бошад: "чой сиёҳ" → "Чойи сиёҳ Ahmad" ёфт мешавад.
/// </summary>
public sealed class PostgresTextSearch(AppDbContext db) : ITextSearch
{
    internal const string SearchTextProperty = "SearchText";
    private const int MaxWords = 6;

    public IQueryable<Product> ProductsByName(IQueryable<Product> query, string term)
    {
        foreach (var word in Words(term))
        {
            var pattern = $"%{EscapeLike(word)}%";
            query = query.Where(p => EF.Functions.ILike(EF.Property<string>(p, SearchTextProperty), pattern));
        }
        return query;
    }

    public IOrderedQueryable<Product> OrderByRelevance(IQueryable<Product> query, string term)
    {
        // 1) номи тоҷикӣ бо калимаи аввал сар мешавад ("чой" → "Чойи сиёҳ ...");
        // 2) дар ягон ном калимае бо он сар мешавад ("чай" → "... Чай чёрный ...", на "...чайка...");
        // 3) боқимонда — навтаринҳо аввал.
        var word = EscapeLike(Words(term).FirstOrDefault() ?? "");
        var starts = $"{word}%";
        var wordStart = $"% {word}%";
        return query
            .OrderByDescending(p => EF.Functions.ILike(EF.Property<string>(p, SearchTextProperty), starts))
            .ThenByDescending(p => EF.Functions.ILike(EF.Property<string>(p, SearchTextProperty), wordStart))
            .ThenByDescending(p => p.Id);
    }

    /// <summary>Калимаҳои кӯтоҳтар барои ҷустуҷӯи «наздик» маъно надоранд ("rc" ба ҳама чиз «монанд» аст).</summary>
    private const int FuzzyMinLength = 3;

    /// <summary>
    /// Ҳадди монандӣ барои word &lt;% search_text. Пешфарзи pg_trgm (0.6) барои кириллӣ қатъӣ аст:
    /// "шоклад" ↔ "шоколади" = 0.43–0.56, "маянез" ↔ "майонез" = 0.43 (санҷида дар 1 265 моли воқеӣ, 2026-10-14).
    /// </summary>
    private const string FuzzyThreshold = "0.4";

    public async Task<T> WithFuzzyThresholdAsync<T>(Func<Task<T>> work, CancellationToken ct)
    {
        // SET LOCAL — танҳо то охири ҳамин транзаксия; пайвасти умумии pool тағйир намеёбад
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync($"SET LOCAL pg_trgm.word_similarity_threshold = {FuzzyThreshold}", ct);
        var result = await work();
        await tx.CommitAsync(ct);
        return result;
    }

    // word <% search_text — бо ҳамон индекси GIN trigram; ҳад — WithFuzzyThresholdAsync
    public IQueryable<Product>? ProductsByNameFuzzy(IQueryable<Product> query, string term)
    {
        var words = Words(term).Where(w => w.Length >= FuzzyMinLength).ToList();
        if (words.Count == 0) return null;
        foreach (var word in words)
            query = query.Where(p => EF.Functions.TrigramsAreWordSimilar(word, EF.Property<string>(p, SearchTextProperty)));
        return query;
    }

    public IOrderedQueryable<Product> OrderBySimilarity(IQueryable<Product> query, string term)
    {
        var word = Words(term).FirstOrDefault(w => w.Length >= FuzzyMinLength) ?? "";
        return query
            .OrderByDescending(p => EF.Functions.TrigramsWordSimilarity(word, EF.Property<string>(p, SearchTextProperty)))
            .ThenByDescending(p => p.Id);
    }

    /// <summary>Ҳамон қоидаи сутуни search_text: хурд + ҷ→ч, ӯ→у, ӣ→и, ҳ→х, қ→к, ғ→г, ё→е, й→и, бе апостроф.</summary>
    private static IEnumerable<string> Words(string term) =>
        term.Trim().ToLowerInvariant()
            .Replace('ҷ', 'ч').Replace('ӯ', 'у').Replace('ӣ', 'и').Replace('ҳ', 'х')
            .Replace('қ', 'к').Replace('ғ', 'г').Replace('ё', 'е').Replace('й', 'и')
            .Replace("'", "").Replace("’", "").Replace("`", "").Replace("ʼ", "")
            .Split([' ', ',', '.', '«', '»', '"', '(', ')'], StringSplitOptions.RemoveEmptyEntries)
            .Distinct()
            .Take(MaxWords);

    /// <summary>Аломатҳои махсуси LIKE (% _ \) ҳамчун матни оддӣ ҷустуҷӯ мешаванд.</summary>
    private static string EscapeLike(string s) => s.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
