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
}
