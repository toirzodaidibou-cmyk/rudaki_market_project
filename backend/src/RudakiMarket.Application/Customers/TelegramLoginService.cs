using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Common;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Customers;

public sealed record BotReply(string Text, TelegramKeyboard Keyboard);

/// <summary>
/// Мантиқи боти Telegram барои даромад:
///  /start {token} → "рақамро фиристед" (тугмаи request_contact)
///  contact        → санҷиш (contact-и худи корбар + ҳамон рақами сайт) → рамз + пайвасти рақам ба чат.
/// Матнҳо дар 2 забон (тоҷикӣ + русӣ).
/// </summary>
public sealed class TelegramLoginService(IAppDbContext db, CustomerAuthService auth, TimeProvider clock)
{
    private const string Welcome =
        "Ассалому алайкум! Ин боти RUDAKI MARKET аст. Барои ворид шудан дар сайт «Telegram»-ро интихоб кунед.\n\n" +
        "Здравствуйте! Это бот RUDAKI MARKET. Чтобы войти, выберите «Telegram» на сайте.";

    public async Task<BotReply> OnStartAsync(long chatId, string? token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token)) return new BotReply(Welcome, TelegramKeyboard.Remove);

        var now = clock.GetUtcNow();
        var request = await db.TelegramLoginRequests
            .FirstOrDefaultAsync(r => r.Token == token && r.CompletedAt == null && r.ExpiresAt > now, ct);
        if (request is null)
            return new BotReply(
                "Пайванд кӯҳна шудааст. Дар сайт аз нав «Telegram»-ро пахш кунед.\n\n" +
                "Ссылка устарела. Нажмите «Telegram» на сайте ещё раз.",
                TelegramKeyboard.Remove);

        request.ChatId = chatId;
        await db.SaveChangesAsync(ct);
        return new BotReply(
            $"Барои гирифтани рамз тугмаи поёнро пахш карда, рақами худро фиристед ({Mask(request.Phone)}).\n\n" +
            $"Чтобы получить код, нажмите кнопку ниже и отправьте свой номер ({Mask(request.Phone)}).",
            TelegramKeyboard.RequestContact);
    }

    public async Task<BotReply> OnContactAsync(long chatId, long fromUserId, long? contactUserId, string contactPhone, CancellationToken ct)
    {
        // Танҳо рақами худи корбари Telegram (на contact-и шахси дигар) — ин исбот мекунад, ки рақам аз они ӯст
        if (contactUserId != fromUserId)
            return new BotReply(
                "Лутфан рақами худро бо тугмаи поён фиристед.\n\nПожалуйста, отправьте свой номер кнопкой ниже.",
                TelegramKeyboard.RequestContact);

        var now = clock.GetUtcNow();
        var request = await db.TelegramLoginRequests
            .Where(r => r.ChatId == chatId && r.CompletedAt == null && r.ExpiresAt > now)
            .OrderByDescending(r => r.Id)
            .FirstOrDefaultAsync(ct);
        if (request is null)
            return new BotReply(Welcome, TelegramKeyboard.Remove);

        if (!PhoneNumber.TryNormalize(contactPhone, out var phone) || phone != request.Phone)
            return new BotReply(
                $"Рақами Telegram-и шумо бо рақами дар сайт навишташуда ({Mask(request.Phone)}) мувофиқ нест.\n\n" +
                $"Ваш номер в Telegram не совпадает с номером на сайте ({Mask(request.Phone)}).",
                TelegramKeyboard.Remove);

        var issued = await auth.IssueCodeAsync(phone, ct);
        if (issued.Status != ResultStatus.Ok)
            return new BotReply(
                "Кӯшишҳо аз ҳад зиёд. Каме баъд аз нав кӯшиш кунед.\n\nСлишком много попыток. Попробуйте позже.",
                TelegramKeyboard.Remove);

        // Рақам ба ин чат пайваст мешавад — дафъаи дигар рамз мустақиман меояд
        var link = await db.TelegramLinks.FirstOrDefaultAsync(l => l.Phone == phone, ct);
        if (link is null) db.TelegramLinks.Add(new TelegramLink { Phone = phone, ChatId = chatId, LinkedAt = now });
        else
        {
            link.ChatId = chatId;
            link.LinkedAt = now;
        }
        request.CompletedAt = now;
        await db.SaveChangesAsync(ct);

        return new BotReply(CustomerAuthService.CodeMessage(issued.Value.Code), TelegramKeyboard.Remove);
    }

    /// <summary>"+992921234567" → "+992 ** *** 45 67"</summary>
    private static string Mask(string phone) => $"+992 ** *** {phone[^4..^2]} {phone[^2..]}";
}
