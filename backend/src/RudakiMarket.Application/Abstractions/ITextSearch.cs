using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Abstractions;

/// <summary>Ҷустуҷӯи матнӣ, ки ба базаи мушаххас вобаста аст (PostgreSQL: ILIKE + индекси trigram).</summary>
public interface ITextSearch
{
    /// <summary>
    /// Молҳое, ки номашон (дар ҳар 4 забон) ҳамаи калимаҳои матнро дар бар мегирад; ҳарфҳои калон/хурд ва
    /// ҳарфҳои махсуси тоҷикӣ (ҷ/ч, ӯ/у, ӣ/и, ҳ/х, қ/к, ғ/г) фарқ надоранд.
    /// </summary>
    IQueryable<Product> ProductsByName(IQueryable<Product> query, string term);

    /// <summary>Тартиб: аввал молҳое, ки номашон бо калимаи аввали матн сар мешавад, баъд навтаринҳо.</summary>
    IOrderedQueryable<Product> OrderByRelevance(IQueryable<Product> query, string term);

    /// <summary>
    /// Ҷустуҷӯи «наздик» барои хатои имлоӣ ("шоклад" → "шоколад"): ҳар калима (аз 3 ҳарф) бояд ба ягон калимаи ном
    /// монанд бошад. Танҳо вақте истифода мешавад, ки ҷустуҷӯи аниқ ҳеҷ чиз наёфт.
    /// </summary>
    /// <returns>null — дар матн калимаи мувофиқ (аз 3 ҳарф) нест</returns>
    IQueryable<Product>? ProductsByNameFuzzy(IQueryable<Product> query, string term);

    /// <summary>Тартиб барои ҷустуҷӯи «наздик»: монандтарин аввал.</summary>
    IOrderedQueryable<Product> OrderBySimilarity(IQueryable<Product> query, string term);

    /// <summary>Дархостҳои ҷустуҷӯи «наздик»-ро бо ҳадди монандии худ иҷро мекунад (танҳо дар дохили ин амал).</summary>
    Task<T> WithFuzzyThresholdAsync<T>(Func<Task<T>> work, CancellationToken ct);
}
