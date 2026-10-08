using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<LoginCode> LoginCodes => Set<LoginCode>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<TelegramLoginRequest> TelegramLoginRequests => Set<TelegramLoginRequest>();
    public DbSet<TelegramLink> TelegramLinks => Set<TelegramLink>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Bundle> Bundles => Set<Bundle>();
    public DbSet<BundleItem> BundleItems => Set<BundleItem>();
    public DbSet<Banner> Banners => Set<Banner>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Customer>(e =>
        {
            e.ToTable("customers");
            e.HasKey(x => x.Id);
            e.Property(x => x.Phone).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.Phone).IsUnique();
        });

        b.Entity<LoginCode>(e =>
        {
            e.ToTable("login_codes");
            e.HasKey(x => x.Id);
            e.Property(x => x.Phone).HasMaxLength(20).IsRequired();
            e.Property(x => x.CodeHash).HasMaxLength(64).IsRequired();
            e.HasIndex(x => new { x.Phone, x.CreatedAt });
        });

        b.Entity<TelegramLoginRequest>(e =>
        {
            e.ToTable("telegram_login_requests");
            e.HasKey(x => x.Id);
            e.Property(x => x.Token).HasMaxLength(64).IsRequired();
            e.HasIndex(x => x.Token).IsUnique();
            e.Property(x => x.Phone).HasMaxLength(20).IsRequired();
            e.HasIndex(x => new { x.Phone, x.CreatedAt });
            e.HasIndex(x => x.ChatId);
        });

        b.Entity<TelegramLink>(e =>
        {
            e.ToTable("telegram_links");
            e.HasKey(x => x.Phone);
            e.Property(x => x.Phone).HasMaxLength(20);
        });

        b.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasKey(x => x.Id);
            // Фармоишҳо ҳатто бо нест шудани мизоҷ нигоҳ дошта мешаванд (ҳисобот)
            e.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.Phone).HasMaxLength(20).IsRequired();
            e.Property(x => x.Address).HasMaxLength(500).IsRequired();
            e.Property(x => x.Comment).HasMaxLength(500);
            e.Property(x => x.Subtotal).HasPrecision(12, 2);
            e.Property(x => x.DeliveryFee).HasPrecision(12, 2);
            e.Property(x => x.Total).HasPrecision(12, 2);
            e.HasIndex(x => new { x.CustomerId, x.CreatedAt });
            e.HasIndex(x => new { x.Status, x.CreatedAt });
            e.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OrderItem>(e =>
        {
            e.ToTable("order_items");
            e.HasKey(x => x.Id);
            e.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.SetNull);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.SizeLabel).HasMaxLength(20);
            e.Property(x => x.Price).HasPrecision(12, 2);
            e.Property(x => x.LineTotal).HasPrecision(12, 2);
        });

        b.Entity<Banner>(e =>
        {
            e.ToTable("banners");
            e.HasKey(x => x.Id);
            foreach (var lang in new[] { "Tg", "Ru", "En", "Uz" })
            {
                e.Property("Badge" + lang).HasMaxLength(40).IsRequired();
                e.Property("Title" + lang).HasMaxLength(80).IsRequired();
                e.Property("Text" + lang).HasMaxLength(200).IsRequired();
                e.Property("Cta" + lang).HasMaxLength(30).IsRequired();
            }
            e.Property(x => x.Href).HasMaxLength(300).IsRequired();
            e.Property(x => x.Theme).HasMaxLength(20).IsRequired();
            e.Property(x => x.ImagePath).HasMaxLength(300);
            e.HasIndex(x => new { x.IsActive, x.SortOrder });
        });

        b.Entity<Bundle>(e =>
        {
            e.ToTable("bundles");
            e.HasKey(x => x.Id);
            foreach (var n in new[] { nameof(Bundle.NameTg), nameof(Bundle.NameRu), nameof(Bundle.NameEn), nameof(Bundle.NameUz) })
                e.Property(n).HasMaxLength(120).IsRequired();
            foreach (var d in new[] { nameof(Bundle.DescriptionTg), nameof(Bundle.DescriptionRu), nameof(Bundle.DescriptionEn), nameof(Bundle.DescriptionUz) })
                e.Property(d).HasMaxLength(300);
            e.Property(x => x.Emoji).HasMaxLength(16).IsRequired();
            e.HasIndex(x => new { x.IsActive, x.SortOrder });
            e.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.BundleId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<BundleItem>(e =>
        {
            e.ToTable("bundle_items");
            e.HasKey(x => x.Id);
            // Мол нест шавад — аз маҷмӯа ҳам меравад
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.BundleId, x.ProductId }).IsUnique();
        });

        b.Entity<CartItem>(e =>
        {
            e.ToTable("cart_items");
            e.HasKey(x => new { x.CustomerId, x.ProductId });
            e.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            e.ToTable(t => t.HasCheckConstraint("ck_cart_items_quantity", "quantity BETWEEN 1 AND 99"));
        });

        b.Entity<Favorite>(e =>
        {
            e.ToTable("favorites");
            e.HasKey(x => new { x.CustomerId, x.ProductId });
            e.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.CustomerId, x.CreatedAt });
        });

        // Ҷустуҷӯи тез аз рӯи қисми ном (ILIKE '%...%') дар миллионҳо мол
        b.HasPostgresExtension("pg_trgm");

        b.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            foreach (var name in new[] { nameof(Product.NameTg), nameof(Product.NameRu), nameof(Product.NameEn), nameof(Product.NameUz) })
            {
                e.Property(name).HasMaxLength(200).IsRequired();
                e.HasIndex(name).HasMethod("gin").HasOperators("gin_trgm_ops");
            }
            foreach (var d in new[] { nameof(Product.DescriptionTg), nameof(Product.DescriptionRu), nameof(Product.DescriptionEn), nameof(Product.DescriptionUz) })
                e.Property(d).HasMaxLength(2000);
            e.Property(x => x.Price).HasPrecision(12, 2);
            e.Property(x => x.OldPrice).HasPrecision(12, 2);
            e.Property(x => x.SizeLabel).HasMaxLength(20);
            // Матни ҷустуҷӯ: ҳар 4 ном, ҳарфҳои хурд, ҳарфҳои махсуси тоҷикӣ → оддӣ (ҷ→ч, ӯ→у, ӣ→и, ҳ→х, қ→к, ғ→г, ё→е, й→и),
            // апострофҳо хориҷ (Lay's → lays) — то "чои", "кахва", "lays" ҳам ёфт шаванд. База худаш нигоҳ медорад (STORED), индекси trigram — барои миллионҳо мол.
            e.Property<string>(PostgresTextSearch.SearchTextProperty)
                .HasColumnName("search_text")
                .HasComputedColumnSql(
                    "translate(lower(name_tg || ' ' || name_ru || ' ' || name_en || ' ' || name_uz), 'ҷӯӣҳқғёй''’`ʼ', 'чуихкгеи')",
                    stored: true);
            e.HasIndex(PostgresTextSearch.SearchTextProperty).HasMethod("gin").HasOperators("gin_trgm_ops");
            // Рӯйхати сайт: WHERE category_id = ? AND is_active ORDER BY id DESC
            e.HasIndex(x => new { x.CategoryId, x.IsActive, x.Id }).IsDescending(false, false, true);
            e.HasMany(x => x.Images).WithOne().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ProductImage>(e =>
        {
            e.ToTable("product_images");
            e.HasKey(x => x.Id);
            e.Property(x => x.Path).HasMaxLength(256).IsRequired();
            e.Property(x => x.ThumbPath).HasMaxLength(256).IsRequired();
            e.HasIndex(x => new { x.ProductId, x.SortOrder });
        });

        b.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.HasKey(x => x.Id);
            e.Property(x => x.Slug).HasMaxLength(64).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.NameTg).HasMaxLength(100).IsRequired();
            e.Property(x => x.NameRu).HasMaxLength(100).IsRequired();
            e.Property(x => x.NameEn).HasMaxLength(100).IsRequired();
            e.Property(x => x.NameUz).HasMaxLength(100).IsRequired();
            e.Property(x => x.IconPath).HasMaxLength(256);
            // Барои рӯйхати сайт: WHERE is_active ORDER BY sort_order
            e.HasIndex(x => new { x.IsActive, x.SortOrder });
        });

        b.Entity<AdminUser>(e =>
        {
            e.ToTable("admin_users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Username).HasMaxLength(64).IsRequired();
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.PasswordHash).HasMaxLength(256).IsRequired();
        });
    }
}
