using Microsoft.EntityFrameworkCore;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<Category> Categories { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductImage> ProductImages { get; }
    DbSet<AdminUser> AdminUsers { get; }
    DbSet<Customer> Customers { get; }
    DbSet<LoginCode> LoginCodes { get; }
    DbSet<Favorite> Favorites { get; }
    DbSet<TelegramLoginRequest> TelegramLoginRequests { get; }
    DbSet<TelegramLink> TelegramLinks { get; }
    DbSet<CartItem> CartItems { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    DbSet<Bundle> Bundles { get; }
    DbSet<BundleItem> BundleItems { get; }
    DbSet<Banner> Banners { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
