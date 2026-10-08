using Microsoft.Extensions.DependencyInjection;
using RudakiMarket.Application.Auth;
using RudakiMarket.Application.Banners;
using RudakiMarket.Application.Bundles;
using RudakiMarket.Application.Categories;
using RudakiMarket.Application.Customers;
using RudakiMarket.Application.Orders;
using RudakiMarket.Application.Prices;
using RudakiMarket.Application.Products;
using RudakiMarket.Application.Reports;

namespace RudakiMarket.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<CategoryService>();
        services.AddScoped<ProductService>();
        services.AddScoped<AuthService>();
        services.AddScoped<CustomerAuthService>();
        services.AddScoped<FavoriteService>();
        services.AddScoped<TelegramLoginService>();
        services.AddScoped<CartService>();
        services.AddScoped<OrderService>();
        services.AddScoped<AdminOrderService>();
        services.AddScoped<BundleService>();
        services.AddScoped<PriceSheetService>();
        services.AddScoped<ReportService>();
        services.AddScoped<BannerService>();
        return services;
    }
}
