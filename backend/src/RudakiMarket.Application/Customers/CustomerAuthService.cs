using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Common;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Customers;

/// <param name="Secret">Калиди HMAC барои рамзҳо (аз user-secrets / танзимоти сервер).</param>
/// <param name="ExposeCodeInResponse">Танҳо барои development: рамз дар ҷавоб бармегардад (SMS нест).</param>
public sealed record OtpOptions(string Secret, bool ExposeCodeInResponse);

/// <param name="Channel">"sms" ё "telegram"</param>
/// <param name="TelegramUrl">Пайванди t.me/бот?start=... — агар рақам ҳанӯз ба Telegram пайваст нашуда бошад</param>
public sealed record CodeRequested(string Phone, string Channel, int ResendAfterSeconds, string? DevCode, string? TelegramUrl);

/// <summary>
/// Даромади мизоҷ бо рақами телефон: рамзи 4-рақама тавассути SMS ё Telegram.
/// Хатоҳо ҳамчун код бармегарданд (сайт онҳоро ба 4 забон тарҷума мекунад).
/// </summary>
public sealed class CustomerAuthService(
    IAppDbContext db, ISmsSender sms, ITelegramBot telegram, LoginChannels channels, OtpOptions options, TimeProvider clock)
{
    public const int CodeLength = 4;
    public const int MaxAttempts = 5;
    public const int ResendAfterSeconds = 60;
    public const int MaxCodesPerHour = 5;
    private static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan TelegramLinkLifetime = TimeSpan.FromMinutes(10);

    public static string CodeMessage(string code) => $"RUDAKI MARKET: {code} — рамзи даромад. Онро ба касе нагӯед.";

    public async Task<Result<CodeRequested>> RequestCodeAsync(string? phoneInput, string? channelInput, CancellationToken ct)
    {
        if (!PhoneNumber.TryNormalize(phoneInput, out var phone))
            return Result<CodeRequested>.Invalid("phone", "invalid_phone");

        return (channelInput ?? "sms").Trim().ToLowerInvariant() switch
        {
            "telegram" when channels.Telegram => await ViaTelegramAsync(phone, ct),
            "sms" when channels.Sms => await ViaSmsAsync(phone, ct),
            _ => Result<CodeRequested>.Invalid("channel", "unavailable"),
        };
    }

    private async Task<Result<CodeRequested>> ViaSmsAsync(string phone, CancellationToken ct)
    {
        var issued = await IssueCodeAsync(phone, ct);
        if (issued.Status != ResultStatus.Ok) return Result<CodeRequested>.Invalid(issued.Errors);
        var (login, code) = issued.Value;

        try
        {
            await sms.SendAsync(phone, CodeMessage(code), ct);
        }
        catch (SmsSendException)
        {
            // SMS нарасид — рамз нест мешавад, то мизоҷ фавран аз нав кӯшиш карда тавонад (бе 60с интизорӣ)
            await DiscardAsync(login);
            return Result<CodeRequested>.Invalid("phone", "sms_failed");
        }
        return Result<CodeRequested>.Ok(new CodeRequested(phone, "sms", ResendAfterSeconds, options.ExposeCodeInResponse ? code : null, null));
    }

    private async Task<Result<CodeRequested>> ViaTelegramAsync(string phone, CancellationToken ct)
    {
        // Рақам аллакай ба Telegram пайваст аст — рамз мустақиман ба чат меравад
        var link = await db.TelegramLinks.FirstOrDefaultAsync(l => l.Phone == phone, ct);
        if (link is not null)
        {
            var issued = await IssueCodeAsync(phone, ct);
            if (issued.Status != ResultStatus.Ok) return Result<CodeRequested>.Invalid(issued.Errors);
            var (login, code) = issued.Value;
            try
            {
                await telegram.SendMessageAsync(link.ChatId, CodeMessage(code), TelegramKeyboard.Remove, ct);
            }
            catch (TelegramSendException)
            {
                await DiscardAsync(login);
                return Result<CodeRequested>.Invalid("phone", "telegram_failed");
            }
            return Result<CodeRequested>.Ok(new CodeRequested(phone, "telegram", ResendAfterSeconds, null, null));
        }

        // Бори аввал: пайванди бот. Рамз баъд аз он ки мизоҷ дар бот рақамашро тасдиқ кунад, фиристода мешавад.
        var now = clock.GetUtcNow();
        var recent = await db.TelegramLoginRequests.CountAsync(r => r.Phone == phone && r.CreatedAt > now.AddHours(-1), ct);
        if (recent >= MaxCodesPerHour) return Result<CodeRequested>.Invalid("phone", "too_many");

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        db.TelegramLoginRequests.Add(new TelegramLoginRequest
        {
            Token = token,
            Phone = phone,
            CreatedAt = now,
            ExpiresAt = now + TelegramLinkLifetime,
        });
        await db.SaveChangesAsync(ct);
        return Result<CodeRequested>.Ok(new CodeRequested(
            phone, "telegram", 0, null, $"https://t.me/{channels.TelegramBotUsername}?start={token}"));
    }

    /// <summary>
    /// Рамзи навро месозад (бо маҳдудиятҳо) ва рамзҳои пешинаи ин рақамро бекор мекунад.
    /// Худи рамз танҳо дар хотира бармегардад — дар база танҳо HMAC.
    /// </summary>
    public async Task<Result<(LoginCode Login, string Code)>> IssueCodeAsync(string phone, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var recent = await db.LoginCodes
            .Where(c => c.Phone == phone && c.CreatedAt > now.AddHours(-1))
            .Select(c => c.CreatedAt)
            .ToListAsync(ct);
        if (recent.Any(t => t > now.AddSeconds(-ResendAfterSeconds)))
            return Result<(LoginCode, string)>.Invalid("phone", "too_soon");
        if (recent.Count >= MaxCodesPerHour)
            return Result<(LoginCode, string)>.Invalid("phone", "too_many");

        await db.LoginCodes
            .Where(c => c.Phone == phone && c.UsedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.UsedAt, now), ct);

        var code = RandomNumberGenerator.GetInt32(0, (int)Math.Pow(10, CodeLength)).ToString($"D{CodeLength}");
        var login = new LoginCode
        {
            Phone = phone,
            CodeHash = Hash(phone, code),
            CreatedAt = now,
            ExpiresAt = now + CodeLifetime,
        };
        db.LoginCodes.Add(login);
        await db.SaveChangesAsync(ct);
        return Result<(LoginCode, string)>.Ok((login, code));
    }

    private async Task DiscardAsync(LoginCode login)
    {
        db.LoginCodes.Remove(login);
        await db.SaveChangesAsync(CancellationToken.None);
    }

    public async Task<Result<Customer>> VerifyAsync(string? phoneInput, string? codeInput, CancellationToken ct)
    {
        if (!PhoneNumber.TryNormalize(phoneInput, out var phone))
            return Result<Customer>.Invalid("phone", "invalid_phone");
        var code = (codeInput ?? "").Trim();
        if (code.Length != CodeLength || !code.All(char.IsAsciiDigit))
            return Result<Customer>.Invalid("code", "wrong_code");

        var now = clock.GetUtcNow();
        var login = await db.LoginCodes
            .Where(c => c.Phone == phone && c.UsedAt == null && c.ExpiresAt > now)
            .OrderByDescending(c => c.Id)
            .FirstOrDefaultAsync(ct);
        if (login is null || login.Attempts >= MaxAttempts)
            return Result<Customer>.Invalid("code", "expired");

        var expected = Encoding.UTF8.GetBytes(login.CodeHash);
        var actual = Encoding.UTF8.GetBytes(Hash(phone, code));
        if (!CryptographicOperations.FixedTimeEquals(expected, actual))
        {
            login.Attempts++;
            await db.SaveChangesAsync(ct);
            return Result<Customer>.Invalid("code", login.Attempts >= MaxAttempts ? "expired" : "wrong_code");
        }

        login.UsedAt = now;
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Phone == phone, ct);
        if (customer is null)
        {
            customer = new Customer { Phone = phone, CreatedAt = now };
            db.Customers.Add(customer);
        }
        customer.LastLoginAt = now;
        await db.SaveChangesAsync(ct);
        return Result<Customer>.Ok(customer);
    }

    private string Hash(string phone, string code)
    {
        var mac = HMACSHA256.HashData(Encoding.UTF8.GetBytes(options.Secret), Encoding.UTF8.GetBytes($"{phone}:{code}"));
        return Convert.ToHexString(mac);
    }
}
