using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Categories;
using RudakiMarket.Application.Common;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Banners;

/// <summary>Слайд барои сайт (ва админ). Матнҳо бо 4 забон.</summary>
public sealed record BannerDto(
    int Id, LocalizedNames Badge, LocalizedNames Title, LocalizedNames Text, LocalizedNames Cta,
    string Href, string Theme, string? Image, int SortOrder, bool IsActive);

public sealed record SaveBannerRequest(
    LocalizedNames? Badge, LocalizedNames Title, LocalizedNames? Text, LocalizedNames? Cta,
    string? Href, string? Theme, int SortOrder, bool IsActive);

/// <summary>Слайдҳои саҳифаи асосӣ — аз админ: илова, тағйир, сурат, тартиб, пинҳон/нест.</summary>
public sealed partial class BannerService(IAppDbContext db, IFileStorage files, IImageProcessor images, ISiteCache siteCache, TimeProvider clock)
{
    /// <summary>Рангҳои тайёр (бо frontend/src/components/home/heroThemes.ts мувофиқ).</summary>
    public static readonly string[] Themes = ["red", "yellow", "pink", "blue", "lavender", "green", "orange", "dark"];
    public const int MaxImageBytes = 5 * 1024 * 1024;

    public async Task<IReadOnlyList<BannerDto>> ListPublicAsync(CancellationToken ct) =>
        (await db.Banners.AsNoTracking().Where(b => b.IsActive && b.ImagePath != null)
            .OrderBy(b => b.SortOrder).ThenBy(b => b.Id).ToListAsync(ct)).Select(ToDto).ToList();

    public async Task<IReadOnlyList<BannerDto>> ListAsync(CancellationToken ct) =>
        (await db.Banners.AsNoTracking().OrderBy(b => b.SortOrder).ThenBy(b => b.Id).ToListAsync(ct)).Select(ToDto).ToList();

    public async Task<Result<BannerDto>> CreateAsync(SaveBannerRequest r, CancellationToken ct)
    {
        var errors = Validate(r);
        if (errors.Count > 0) return Result<BannerDto>.Invalid(errors);
        var now = clock.GetUtcNow();
        var b = new Banner { CreatedAt = now };
        Apply(b, r, now);
        db.Banners.Add(b);
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Banners], ct);
        return Result<BannerDto>.Ok(ToDto(b));
    }

    public async Task<Result<BannerDto>> UpdateAsync(int id, SaveBannerRequest r, CancellationToken ct)
    {
        var b = await db.Banners.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (b is null) return Result<BannerDto>.NotFound();
        var errors = Validate(r);
        if (errors.Count > 0) return Result<BannerDto>.Invalid(errors);
        Apply(b, r, clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Banners], ct);
        return Result<BannerDto>.Ok(ToDto(b));
    }

    public async Task<Result<BannerDto>> SetImageAsync(int id, byte[] content, CancellationToken ct)
    {
        var b = await db.Banners.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (b is null) return Result<BannerDto>.NotFound();
        if (content.Length is 0 or > MaxImageBytes) return Result<BannerDto>.Invalid("image", "Сурат бояд то 5 MB бошад.");
        var webp = images.Banner(content);
        if (webp is null) return Result<BannerDto>.Invalid("image", "Файл сурат нест (PNG, JPEG ё WebP лозим).");
        var old = b.ImagePath;
        b.ImagePath = await files.SaveAsync(new MemoryStream(webp), "banners", "webp", ct);
        b.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Banners], ct);
        if (old is not null) await files.DeleteAsync(old, ct);
        return Result<BannerDto>.Ok(ToDto(b));
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var b = await db.Banners.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (b is null) return false;
        db.Banners.Remove(b);
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Banners], ct);
        if (b.ImagePath is not null) await files.DeleteAsync(b.ImagePath, ct);
        return true;
    }

    private static BannerDto ToDto(Banner b) => new(
        b.Id,
        new LocalizedNames(b.BadgeTg, b.BadgeRu, b.BadgeEn, b.BadgeUz),
        new LocalizedNames(b.TitleTg, b.TitleRu, b.TitleEn, b.TitleUz),
        new LocalizedNames(b.TextTg, b.TextRu, b.TextEn, b.TextUz),
        new LocalizedNames(b.CtaTg, b.CtaRu, b.CtaEn, b.CtaUz),
        b.Href, b.Theme, b.ImagePath, b.SortOrder, b.IsActive);

    private static void Apply(Banner b, SaveBannerRequest r, DateTimeOffset now)
    {
        static string T(string? v) => v?.Trim() ?? "";
        // Агар забон холӣ бошад — тоҷикӣ
        string Or(string? v, string tg) => string.IsNullOrWhiteSpace(v) ? tg : v.Trim();
        var title = T(r.Title.Tg);
        b.TitleTg = title; b.TitleRu = Or(r.Title.Ru, title); b.TitleEn = Or(r.Title.En, title); b.TitleUz = Or(r.Title.Uz, title);
        var badge = T(r.Badge?.Tg);
        b.BadgeTg = badge; b.BadgeRu = Or(r.Badge?.Ru, badge); b.BadgeEn = Or(r.Badge?.En, badge); b.BadgeUz = Or(r.Badge?.Uz, badge);
        var text = T(r.Text?.Tg);
        b.TextTg = text; b.TextRu = Or(r.Text?.Ru, text); b.TextEn = Or(r.Text?.En, text); b.TextUz = Or(r.Text?.Uz, text);
        b.CtaTg = T(r.Cta?.Tg); b.CtaRu = T(r.Cta?.Ru); b.CtaEn = T(r.Cta?.En); b.CtaUz = T(r.Cta?.Uz);
        b.Href = string.IsNullOrWhiteSpace(r.Href) ? "/catalog" : r.Href.Trim();
        b.Theme = Themes.Contains(r.Theme) ? r.Theme! : "yellow";
        b.SortOrder = r.SortOrder;
        b.IsActive = r.IsActive;
        b.UpdatedAt = now;
    }

    private static Dictionary<string, string[]> Validate(SaveBannerRequest r)
    {
        var errors = new Dictionary<string, string[]>();
        if (r.Title is null || string.IsNullOrWhiteSpace(r.Title.Tg)) errors["title.tg"] = ["Сарлавҳаи тоҷикӣ ҳатмист."];
        void Max(string key, LocalizedNames? n, int max)
        {
            foreach (var (lang, v) in new[] { ("tg", n?.Tg), ("ru", n?.Ru), ("en", n?.En), ("uz", n?.Uz) })
                if (v is { Length: > 0 } && v.Trim().Length > max) errors[$"{key}.{lang}"] = [$"То {max} аломат."];
        }
        Max("title", r.Title, 80);
        Max("badge", r.Badge, 40);
        Max("text", r.Text, 200);
        Max("cta", r.Cta, 30);
        // Танҳо роҳи нисбии худи сайт ("/catalog/..."), на сайти бегона ё "javascript:"
        var href = r.Href?.Trim();
        if (!string.IsNullOrEmpty(href) && (href.Length > 300 || !SafeHref().IsMatch(href)))
            errors["href"] = ["Пайванд бояд роҳи сайт бошад, масалан /catalog/drinks ё /product/123."];
        if (r.Theme is not null && !Themes.Contains(r.Theme)) errors["theme"] = ["Ранги нодуруст."];
        return errors;
    }

    [GeneratedRegex(@"^/[a-z0-9\-/?=&_.%]*$", RegexOptions.IgnoreCase)]
    private static partial Regex SafeHref();
}
