using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using RudakiMarket.Application.Abstractions;

namespace RudakiMarket.Infrastructure.Sms;

/// <param name="Login">Логин дар osonsms.com</param>
/// <param name="Token">Bearer token аз кабинети OsonSMS (махфӣ — user-secrets / танзимоти сервер)</param>
/// <param name="Sender">Номи фиристанда (дар OsonSMS тасдиқшуда), масалан "RUDAKI"</param>
/// <param name="IncludeCountryCode">true — "992XXXXXXXXX", false — "XXXXXXXXX" (мисли китобхонаи расмӣ)</param>
public sealed record OsonSmsOptions(string BaseUrl, string Login, string Token, string Sender, bool IncludeCountryCode);

/// <summary>
/// SMS-и воқеӣ тавассути OsonSMS (https://osonsms.com) — хизматрасони SMS дар Тоҷикистон.
/// API: GET {BaseUrl}/sendsms_v1.php?from&amp;phone_number&amp;msg&amp;txn_id&amp;login, Authorization: Bearer {token}.
/// </summary>
public sealed class OsonSmsSender(HttpClient http, OsonSmsOptions options, ILogger<OsonSmsSender> logger) : ISmsSender
{
    public async Task SendAsync(string phone, string text, CancellationToken ct = default)
    {
        var digits = new string(phone.Where(char.IsAsciiDigit).ToArray()); // "992921234567"
        var number = options.IncludeCountryCode ? digits : digits[^9..];
        var txnId = Guid.NewGuid().ToString("N");

        var query = string.Join("&", new Dictionary<string, string>
        {
            ["from"] = options.Sender,
            ["phone_number"] = number,
            ["msg"] = text,
            ["txn_id"] = txnId,
            ["login"] = options.Login,
        }.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{options.BaseUrl.TrimEnd('/')}/sendsms_v1.php?{query}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.Token);

        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(request, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogError("OsonSMS дастрас нест: {Message}", ex.Message);
            throw new SmsSendException("OsonSMS дастрас нест", ex);
        }

        using (response)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            if (response.IsSuccessStatusCode && TryGetMsgId(body, out var msgId))
            {
                // Рақам пурра log намешавад (махфият): танҳо 4 рақами охир
                logger.LogInformation("SMS фиристода шуд: ***{Last4}, msg_id={MsgId}, txn_id={TxnId}", number[^4..], msgId, txnId);
                return;
            }
            logger.LogError("OsonSMS хато: {Status} {Error} (txn_id={TxnId})", (int)response.StatusCode, ErrorMessage(body), txnId);
            throw new SmsSendException($"OsonSMS хато: {(int)response.StatusCode}");
        }
    }

    private static bool TryGetMsgId(string body, out string msgId)
    {
        msgId = "";
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("msg_id", out var id)) return false;
            msgId = id.ToString();
            return msgId.Length > 0;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string ErrorMessage(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("error", out var e) && e.TryGetProperty("msg", out var m)) return m.ToString();
        }
        catch (JsonException)
        {
            // ҷавоб JSON нест
        }
        return body.Length > 200 ? body[..200] : body;
    }
}
