using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace RudakiMarket.Application.Assistant;

/// <summary>
/// Санҷиши маблағҳо дар ҷавоби AI: ҳар «… с.» / «… сомонӣ» бояд аз маълумоти база (натиҷаи амалҳо, қоидаҳои мағоза)
/// ё аз паёми худи мизоҷ бошад. Нарх × миқдор (1–99) ҳам қабул мешавад. Маблағи бофта — рад.
/// </summary>
public sealed partial class AmountGuard
{
    private readonly HashSet<decimal> known = [];
    private readonly HashSet<decimal> prices = [];

    public void Allow(decimal value) => known.Add(Math.Round(value, 2));

    /// <summary>Нархи мол: худаш ва нарх × 1–99 қабул мешаванд.</summary>
    public void AllowPrice(decimal price)
    {
        Allow(price);
        prices.Add(Math.Round(price, 2));
    }

    /// <summary>Ҳамаи ададҳои JSON-и натиҷаи амал (нарх, ҷамъ, расонидан …).</summary>
    public void AllowJson(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            Walk(doc.RootElement, null);
        }
        catch (JsonException)
        {
            // натиҷаи амал ҳамеша JSON аст; агар не — чизе илова намешавад
        }
    }

    private void Walk(JsonElement e, string? name)
    {
        switch (e.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var p in e.EnumerateObject()) Walk(p.Value, p.Name);
                break;
            case JsonValueKind.Array:
                foreach (var x in e.EnumerateArray()) Walk(x, name);
                break;
            case JsonValueKind.Number when e.TryGetDecimal(out var d):
                if (name is "price" or "old_price") AllowPrice(d);
                else Allow(d);
                break;
        }
    }

    /// <summary>Ададҳо аз матни мизоҷ («1000 сомонӣ дорам»).</summary>
    public void AllowText(string text)
    {
        foreach (Match m in Money().Matches(text))
            if (Parse(m) is { } v) Allow(v);
    }

    /// <summary>Маблағҳое, ки дар маълумот нестанд (холӣ — ҳамааш дуруст).</summary>
    public IReadOnlyList<string> Unknown(string text) =>
        Money().Matches(text).Where(m => Parse(m) is { } v && !IsKnown(v)).Select(m => m.Value.Trim()).Distinct().ToList();

    /// <summary>Сатрҳо/ҷумлаҳое, ки маблағи номаълум доранд, хориҷ мешаванд.</summary>
    public string RemoveUnknown(string text)
    {
        var parts = Sentence().Split(text).Where(p => Unknown(p).Count == 0);
        return string.Concat(parts).Trim();
    }

    private bool IsKnown(decimal v)
    {
        v = Math.Round(v, 2);
        if (known.Contains(v)) return true;
        foreach (var p in prices)
        {
            if (p <= 0) continue;
            var k = v / p;
            if (k == Math.Round(k) && k is >= 1 and <= 99) return true;
        }
        return false;
    }

    private static decimal? Parse(Match m)
    {
        var digits = m.Groups["n"].Value.Replace(" ", "").Replace(" ", "").Replace(" ", "");
        var frac = m.Groups["f"].Success ? "." + m.Groups["f"].Value : "";
        return decimal.TryParse(digits + frac, NumberStyles.Number, CultureInfo.InvariantCulture, out var v) ? v : null;
    }

    // 12 с. · 1 234,50 с · 12.5 сомонӣ · 10 сом · 31 somoni · 5 TJS
    [GeneratedRegex(@"(?<![\d.,])(?<n>\d{1,3}(?:[   ]\d{3})+|\d+)(?:[.,](?<f>\d{1,2}))?\s?(?:сомонӣ|сомони|сомон|сом\b|somoni|smn|TJS|с\.|с(?=$|[\s,;:)!?—–-]))",
        RegexOptions.IgnoreCase)]
    private static partial Regex Money();

    // Ҷудо кардан баъд аз охири ҷумла ё сатр (ҷудокунанда бо қисм мемонад); «12 с.» охири ҷумла нест
    [GeneratedRegex(@"(?<=(?<!\d\s?с)[.!?…]\s+|\n)")]
    private static partial Regex Sentence();
}
