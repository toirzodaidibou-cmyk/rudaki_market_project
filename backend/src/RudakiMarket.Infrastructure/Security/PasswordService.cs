using Microsoft.AspNetCore.Identity;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Infrastructure.Security;

/// <summary>PBKDF2 (HMAC-SHA512, 100 000 iteration) аз ASP.NET Core Identity.</summary>
public sealed class PasswordService : IPasswordService
{
    private static readonly AdminUser Subject = new();
    private readonly PasswordHasher<AdminUser> _hasher = new();

    public string Hash(string password) => _hasher.HashPassword(Subject, password);

    public bool Verify(string hash, string password) =>
        _hasher.VerifyHashedPassword(Subject, hash, password) != PasswordVerificationResult.Failed;
}
