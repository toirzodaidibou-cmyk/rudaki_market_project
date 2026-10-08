using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Infrastructure.Persistence;

/// <summary>
/// ILIKE '%...%' аз рӯи сутуни search_text (ҳар 4 ном, бе ҳарфҳои махсуси тоҷикӣ) — бо индекси GIN trigram (pg_trgm).
/// Ҳар калимаи дархост бояд дар ном бошад: "чой сиёҳ" → "Чойи сиёҳ Ahmad" ёфт мешавад.
/// </summary>
public sealed class PostgresTextSearch : ITextSearch
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
