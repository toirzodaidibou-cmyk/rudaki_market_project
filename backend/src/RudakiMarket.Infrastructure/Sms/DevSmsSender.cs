using Microsoft.Extensions.Logging;
using RudakiMarket.Application.Abstractions;

namespace RudakiMarket.Infrastructure.Sms;

/// <summary>
/// Барои development: SMS фиристода намешавад, танҳо дар log навишта мешавад.
/// Дар production бо хизматрасони воқеии SMS иваз карда мешавад.
/// </summary>
public sealed class DevSmsSender(ILogger<DevSmsSender> logger) : ISmsSender
{
    public Task SendAsync(string phone, string text, CancellationToken ct = default)
    {
        logger.LogWarning("[DEV SMS] → {Phone}: {Text}", phone, text);
        return Task.CompletedTask;
    }
}
