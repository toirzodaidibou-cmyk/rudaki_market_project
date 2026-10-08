namespace RudakiMarket.Domain.Entities;

/// <summary>Корбари панели админ. Парол танҳо ҳамчун hash нигоҳ дошта мешавад.</summary>
public sealed class AdminUser
{
    public int Id { get; private set; }
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
}
