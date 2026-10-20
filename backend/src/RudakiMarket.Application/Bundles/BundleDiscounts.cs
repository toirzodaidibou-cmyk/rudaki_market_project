using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Categories;

namespace RudakiMarket.Application.Bundles;

/// <summary>Тахфифи як маҷмӯа дар сабад: чанд маротиба (Times) пурра ҷамъ шуд ва чанд сомонӣ.</summary>
public sealed record AppliedBundleDiscount(int BundleId, LocalizedNames Name, int Percent, int Times, decimal Amount);

/// <summary>Сатри сабад барои ҳисоби тахфиф (танҳо молҳои дар фурӯш буда).</summary>
public sealed record DiscountLine(int ProductId, decimal Price, int Quantity);

/// <summary>
/// Тахфифи маҷмӯаҳо: агар дар сабад ҳамаи молҳои маҷмӯаи тахфифдор бо миқдори лозимӣ бошанд —
/// аз нархи ҳамон молҳо фоизи маҷмӯа кам мешавад (чанд маротиба пурра бошад — ҳамон қадар).
/// Фарқ надорад: «Ҳамаашро ба сабад» ё як-як гузошта шудааст. Нархҳо — нархи ҷории сабад.
/// Як дона мол танҳо дар як маҷмӯа ҳисоб мешавад; маҷмӯаҳои бо сарфаи калонтар аввал.
/// </summary>
public sealed class BundleDiscounts(IAppDbContext db)
{
    public const int MaxPercent = 50;

    private sealed record Candidate(int Id, LocalizedNames Name, int Percent, IReadOnlyList<(int ProductId, int Quantity)> Items);

    public async Task<IReadOnlyList<AppliedBundleDiscount>> CalculateAsync(IReadOnlyList<DiscountLine> lines, CancellationToken ct)
    {
        if (lines.Count == 0) return [];
        var ids = lines.Select(l => l.ProductId).ToList();

        // Танҳо маҷмӯаҳое, ки ҳамаи молҳояшон дар фурӯш ва ақаллан яке дар сабад аст
        var rows = await db.Bundles.AsNoTracking()
            .Where(b => b.IsActive && b.DiscountPercent > 0
                && b.Items.Any(i => ids.Contains(i.ProductId))
                && b.Items.All(i => i.Product!.IsActive && i.Product.Category!.IsActive))
            .Select(b => new
            {
                b.Id, b.NameTg, b.NameRu, b.NameEn, b.NameUz, b.DiscountPercent,
                Items = b.Items.Select(i => new { i.ProductId, i.Quantity }).ToList(),
            })
            .ToListAsync(ct);

        var candidates = rows
            .Where(b => b.Items.Count > 0)
            .Select(b => new Candidate(b.Id, new LocalizedNames(b.NameTg, b.NameRu, b.NameEn, b.NameUz),
                Math.Clamp(b.DiscountPercent, 0, MaxPercent), b.Items.Select(i => (i.ProductId, i.Quantity)).ToList()))
            .ToList();
        return Apply(lines, candidates);
    }

    private static IReadOnlyList<AppliedBundleDiscount> Apply(IReadOnlyList<DiscountLine> lines, List<Candidate> candidates)
    {
        var left = lines.GroupBy(l => l.ProductId).ToDictionary(g => g.Key, g => g.Sum(l => l.Quantity));
        var price = lines.GroupBy(l => l.ProductId).ToDictionary(g => g.Key, g => g.First().Price);

        decimal SetSaving(Candidate c) =>
            Math.Round(c.Items.Sum(i => price.GetValueOrDefault(i.ProductId) * i.Quantity) * c.Percent / 100m, 2, MidpointRounding.AwayFromZero);

        var result = new List<AppliedBundleDiscount>();
        foreach (var c in candidates.OrderByDescending(SetSaving).ThenBy(c => c.Id))
        {
            if (c.Items.Any(i => !price.ContainsKey(i.ProductId))) continue;
            var times = c.Items.Min(i => left.GetValueOrDefault(i.ProductId) / i.Quantity);
            if (times <= 0) continue;
            foreach (var i in c.Items) left[i.ProductId] -= i.Quantity * times;
            var amount = SetSaving(c) * times;
            if (amount > 0) result.Add(new AppliedBundleDiscount(c.Id, c.Name, c.Percent, times, amount));
        }
        return result;
    }

    /// <summary>Нархи маҷмӯа бо тахфиф (барои корт ва саҳифаи маҷмӯа) — ҳамон яклухткунӣ, ки дар сабад.</summary>
    public static decimal DiscountedTotal(decimal fullTotal, int percent) =>
        fullTotal - Math.Round(fullTotal * Math.Clamp(percent, 0, MaxPercent) / 100m, 2, MidpointRounding.AwayFromZero);
}
