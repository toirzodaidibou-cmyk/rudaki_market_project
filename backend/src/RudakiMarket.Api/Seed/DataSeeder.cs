using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Auth;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Api.Seed;

/// <summary>
/// Маълумоти аввалия: админи аввал (аз танзимот) ва 17 категорияи ибтидоӣ бо иконаҳо.
/// Танҳо вақте иҷро мешавад, ки ҷадвал холӣ аст — маълумоти мавҷударо иваз намекунад.
/// </summary>
internal static class DataSeeder
{
    private static readonly (string Slug, string Tg, string Ru, string En, string Uz)[] DefaultCategories =
    [
        ("perfumery", "Парфюмерия", "Парфюмерия", "Perfumery", "Parfyumeriya"),
        ("chocolate", "Шоколадҳо", "Шоколад", "Chocolate", "Shokoladlar"),
        ("cakes", "Тортҳо", "Торты", "Cakes", "Tortlar"),
        ("dairy", "Маҳсулоти ширӣ", "Молочные продукты", "Dairy", "Sut mahsulotlari"),
        ("frozen", "Маҳсулоти яхкардашуда", "Замороженные продукты", "Frozen foods", "Muzlatilgan mahsulotlar"),
        ("sausages", "Колбасаҳо", "Колбасы", "Sausages", "Kolbasalar"),
        ("drinks", "Об ва нӯшокиҳо", "Вода и напитки", "Water & drinks", "Suv va ichimliklar"),
        ("grains", "Донагиҳо (нахӯд, гарох...)", "Крупы и бобовые", "Grains & legumes", "Yorma va dukkaklilar"),
        ("coffee", "Қаҳва", "Кофе", "Coffee", "Qahva"),
        ("tea", "Чой ва какао", "Чай и какао", "Tea & cocoa", "Choy va kakao"),
        ("oils", "Равғанҳо", "Масла", "Oils", "Yogʻlar"),
        ("ice-cream", "Яхмос", "Мороженое", "Ice cream", "Muzqaymoq"),
        ("fruits", "Меваҳо", "Фрукты", "Fruits", "Mevalar"),
        ("flour", "Орд", "Мука", "Flour", "Un"),
        ("vegetables", "Сабзавот", "Овощи", "Vegetables", "Sabzavotlar"),
        ("cat-food", "Хӯрок барои гурбаҳо", "Корм для кошек", "Cat food", "Mushuklar uchun ozuqa"),
        ("canned", "Консерваҳо", "Консервы", "Canned food", "Konservalar"),
    ];

    public static async Task SeedAsync(IServiceProvider sp, IConfiguration config, string contentRoot, ILogger logger, CancellationToken ct = default)
    {
        var auth = sp.GetRequiredService<AuthService>();
        if (await auth.EnsureInitialAdminAsync(config["Admin:InitialUsername"], config["Admin:InitialPassword"], ct))
            logger.LogInformation("Админи аввал сохта шуд: {Username}", config["Admin:InitialUsername"]);

        var db = sp.GetRequiredService<IAppDbContext>();
        if (await db.Categories.AnyAsync(ct)) return;

        var storage = sp.GetRequiredService<IFileStorage>();
        var now = DateTimeOffset.UtcNow;
        var order = 0;
        foreach (var (slug, tg, ru, en, uz) in DefaultCategories)
        {
            string? icon = null;
            var iconFile = Path.Combine(contentRoot, "SeedData", "categories", $"{slug}.webp");
            if (File.Exists(iconFile))
            {
                await using var stream = File.OpenRead(iconFile);
                icon = await storage.SaveAsync(stream, "categories", "webp", ct);
            }

            db.Categories.Add(new Category
            {
                Slug = slug, NameTg = tg, NameRu = ru, NameEn = en, NameUz = uz,
                IconPath = icon,
                SortOrder = order += 10, // қадами 10 — то байни онҳо категорияи нав гузоштан мумкин бошад
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        await db.SaveChangesAsync(ct);
        logger.LogInformation("{Count} категорияи ибтидоӣ илова шуд", DefaultCategories.Length);
    }
}
