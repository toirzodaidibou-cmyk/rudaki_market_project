using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Auth;

public sealed class AuthService(IAppDbContext db, IPasswordService passwords, TimeProvider clock)
{
    // Hash-и сохта: агар логин набошад ҳам, парол санҷида мешавад — то аз рӯи вақти ҷавоб
    // фаҳмидан нашавад, ки кадом логин вуҷуд дорад.
    private static string? _dummyHash;

    /// <summary>Логин ва паролро месанҷад. Агар дуруст бошанд — корбар, вагарна null.</summary>
    public async Task<AdminUser?> ValidateAsync(string username, string password, CancellationToken ct)
    {
        var name = (username ?? "").Trim();
        if (name.Length == 0 || string.IsNullOrEmpty(password)) return null;

        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Username == name, ct);
        if (user is null)
        {
            passwords.Verify(_dummyHash ??= passwords.Hash(Guid.NewGuid().ToString()), password);
            return null;
        }
        if (!passwords.Verify(user.PasswordHash, password)) return null;

        user.LastLoginAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return user;
    }

    /// <summary>Агар ягон админ набошад, админи аввалро месозад (аз танзимот, на аз код).</summary>
    public async Task<bool> EnsureInitialAdminAsync(string? username, string? password, CancellationToken ct)
    {
        if (await db.AdminUsers.AnyAsync(ct)) return false;
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrEmpty(password) || password.Length < 12) return false;

        db.AdminUsers.Add(new AdminUser
        {
            Username = username.Trim(),
            PasswordHash = passwords.Hash(password),
            CreatedAt = clock.GetUtcNow(),
        });
        await db.SaveChangesAsync(ct);
        return true;
    }
}
