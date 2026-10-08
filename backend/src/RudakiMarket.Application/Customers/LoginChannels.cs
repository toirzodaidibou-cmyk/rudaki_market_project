namespace RudakiMarket.Application.Customers;

/// <summary>Роҳҳои фиристодани рамз, ки ҳоло фаъоланд (сайт тугмаҳоро аз рӯи ин нишон медиҳад).</summary>
/// <param name="Sms">SMS (OsonSMS; дар development — реҷаи санҷишӣ)</param>
/// <param name="Telegram">Боти Telegram</param>
/// <param name="TelegramBotUsername">Номи бот бе "@" (барои пайванди t.me)</param>
public sealed record LoginChannels(bool Sms, bool Telegram, string? TelegramBotUsername);
