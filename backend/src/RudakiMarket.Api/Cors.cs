namespace RudakiMarket.Api;

internal static class Cors
{
    /// <summary>Танҳо панели админ (суроғаҳо аз Cors:AdminOrigins), бо cookie.</summary>
    public const string Admin = "admin";

    /// <summary>Сайт (суроғаҳо аз Cors:SiteOrigins), бо cookie-и мизоҷ.</summary>
    public const string Site = "site";
}

internal static class AuthSchemes
{
    /// <summary>Логини админ (схемаи пешфарз — номи пешина нигоҳ дошта шуд, то сессияҳо вайрон нашаванд).</summary>
    public const string Admin = Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme;

    /// <summary>Логини мизоҷи сайт (рақами телефон). Инчунин номи policy.</summary>
    public const string Customer = "customer";
}
