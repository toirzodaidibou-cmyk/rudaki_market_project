using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;

namespace RudakiMarket.Application.Prices;

/// <summary>Сатри ҷадвали нархҳо (Excel).</summary>
public sealed record PriceRow(int Id, string Category, string Name, string? SizeLabel, decimal Price, decimal? OldPrice, bool IsActive);

/// <summary>Сатри хондашуда аз Excel: танҳо сутунҳои тағйирёбанда + рақами сатр (барои паёми хато).</summary>
public sealed record PriceInputRow(int Line, int? Id, string? Price, string? OldPrice, string? IsActive);

/// <summary>Формати файл (Excel). Дар Infrastructure — ClosedXML.</summary>
public interface IPriceSheet
{
    byte[] Write(IReadOnlyList<PriceRow> rows);

    /// <returns>null — файл Excel нест ё сутунҳо нодурустанд</returns>
    IReadOnlyList<PriceInputRow>? Read(Stream file);
}

/// <summary>Як тағйирот: қиматҳои нав (null дар OldPrice — аксия нест).</summary>
public sealed record PriceChange(int Id, decimal Price, decimal? OldPrice, bool IsActive);

public sealed record PriceChangePreview(
    int Id, string Name, decimal Price, decimal NewPrice, decimal? OldPrice, decimal? NewOldPrice, bool IsActive, bool NewIsActive);

public sealed record PriceRowError(int Line, string Message);

public sealed record PricePreview(int Rows, IReadOnlyList<PriceChangePreview> Changes, IReadOnlyList<PriceRowError> Errors);

public sealed record ApplyPricesRequest(IReadOnlyList<PriceChange>? Changes);

/// <summary>
/// Нархҳо бо Excel: гирифтан (ҳама ё як категория) → дар Excel иваз кардан → пешнамоиш (чӣ иваз мешавад,
/// хатоҳо) → татбиқ. Танҳо Нарх, Нархи кӯҳна ва Фаъол иваз мешаванд; мол аз рӯи ID ёфта мешавад.
/// </summary>
public sealed class PriceSheetService(IAppDbContext db, IPriceSheet sheet, ISiteCache siteCache, TimeProvider clock)
{
    public const decimal MaxPrice = 10_000_000m;
    public const int MaxChanges = 50_000;

    public async Task<byte[]> ExportAsync(int? categoryId, CancellationToken ct)
    {
        var query = db.Products.AsNoTracking();
        if (categoryId is not null) query = query.Where(p => p.CategoryId == categoryId);
        var rows = await query
            .OrderBy(p => p.Category!.SortOrder).ThenBy(p => p.CategoryId).ThenBy(p => p.NameTg)
            .Select(p => new PriceRow(p.Id, p.Category!.NameTg, p.NameTg, p.SizeLabel, p.Price, p.OldPrice, p.IsActive))
            .ToListAsync(ct);
        return sheet.Write(rows);
    }

    public async Task<PricePreview?> PreviewAsync(Stream file, CancellationToken ct)
    {
        var input = sheet.Read(file);
        if (input is null) return null;

        var errors = new List<PriceRowError>();
        var parsed = new List<(int Line, PriceChange Change)>();
        foreach (var r in input)
        {
            if (r.Id is null) { errors.Add(new(r.Line, "ID нест.")); continue; }
            if (!TryMoney(r.Price, out var price) || price is null or <= 0 or > MaxPrice)
            {
                errors.Add(new(r.Line, $"Нархи нодуруст: «{r.Price}»."));
                continue;
            }
            if (!TryMoney(r.OldPrice, out var old) || old is < 0 or > MaxPrice)
            {
                errors.Add(new(r.Line, $"Нархи кӯҳнаи нодуруст: «{r.OldPrice}»."));
                continue;
            }
            if (old == 0) old = null;
            if (old is not null && old <= price)
            {
                errors.Add(new(r.Line, $"Нархи кӯҳна ({old}) бояд аз нарх ({price}) калон бошад — ё онро холӣ гузоред."));
                continue;
            }
            if (!TryBool(r.IsActive, out var active))
            {
                errors.Add(new(r.Line, $"«Фаъол» бояд «ҳа» ё «не» бошад: «{r.IsActive}»."));
                continue;
            }
            parsed.Add((r.Line, new PriceChange(r.Id.Value, price.Value, old, active)));
        }

        var dupes = parsed.GroupBy(p => p.Change.Id).Where(g => g.Count() > 1).ToList();
        foreach (var g in dupes)
            errors.Add(new(g.Skip(1).First().Line, $"ID {g.Key} ду бор омадааст — танҳо якумаш гирифта мешавад."));
        var unique = parsed.GroupBy(p => p.Change.Id).Select(g => g.First()).ToList();

        var ids = unique.Select(p => p.Change.Id).ToList();
        var current = await db.Products.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .Select(p => new { p.Id, p.NameTg, p.Price, p.OldPrice, p.IsActive })
            .ToDictionaryAsync(p => p.Id, ct);

        var changes = new List<PriceChangePreview>();
        foreach (var (line, c) in unique)
        {
            if (!current.TryGetValue(c.Id, out var p)) { errors.Add(new(line, $"Моли ID {c.Id} ёфт нашуд.")); continue; }
            if (p.Price == c.Price && p.OldPrice == c.OldPrice && p.IsActive == c.IsActive) continue;
            changes.Add(new(c.Id, p.NameTg, p.Price, c.Price, p.OldPrice, c.OldPrice, p.IsActive, c.IsActive));
        }
        return new PricePreview(input.Count, changes, errors.OrderBy(e => e.Line).ToList());
    }

    /// <returns>шумораи молҳои ивазшуда; null — дархост нодуруст</returns>
    public async Task<int?> ApplyAsync(IReadOnlyList<PriceChange>? changes, CancellationToken ct)
    {
        if (changes is null || changes.Count == 0 || changes.Count > MaxChanges) return null;
        if (changes.Any(c => c.Price is <= 0 or > MaxPrice || (c.OldPrice is { } o && (o <= c.Price || o > MaxPrice))))
            return null;

        var byId = changes.GroupBy(c => c.Id).ToDictionary(g => g.Key, g => g.First());
        var now = clock.GetUtcNow();
        var updated = 0;
        foreach (var chunk in byId.Keys.Chunk(1000))
        {
            var products = await db.Products.Where(p => chunk.Contains(p.Id)).ToListAsync(ct);
            foreach (var p in products)
            {
                var c = byId[p.Id];
                if (p.Price == c.Price && p.OldPrice == c.OldPrice && p.IsActive == c.IsActive) continue;
                p.Price = c.Price;
                p.OldPrice = c.OldPrice;
                p.IsActive = c.IsActive;
                p.UpdatedAt = now;
                updated++;
            }
            await db.SaveChangesAsync(ct);
        }
        if (updated > 0) await siteCache.InvalidateAsync([SiteCacheTags.Products, SiteCacheTags.Categories], ct);
        return updated;
    }

    /// <summary>"12,5" / "12.50" / "12 с." → 12.5; холӣ → null (дуруст).</summary>
    private static bool TryMoney(string? s, out decimal? value)
    {
        value = null;
        var t = s?.Replace("с.", "").Replace("c.", "").Replace(" ", "").Replace(" ", "").Replace(',', '.').Trim();
        if (string.IsNullOrEmpty(t)) return true;
        if (!decimal.TryParse(t, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var d))
            return false;
        value = Math.Round(d, 2);
        return true;
    }

    /// <summary>ҳа/не, да/нет, 1/0, true/false, yes/no; холӣ → ҳа.</summary>
    private static bool TryBool(string? s, out bool value)
    {
        var t = s?.Trim().ToLowerInvariant() ?? "";
        value = t is "" or "ҳа" or "ha" or "да" or "1" or "true" or "yes" or "+" or "x" or "✓";
        return value || t is "не" or "нет" or "ne" or "0" or "false" or "no" or "-";
    }
}
