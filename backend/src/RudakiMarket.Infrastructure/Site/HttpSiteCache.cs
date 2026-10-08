using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using RudakiMarket.Application.Abstractions;

namespace RudakiMarket.Infrastructure.Site;

public sealed record SiteCacheOptions(string? RevalidateUrl, string? Secret);

/// <summary>POST {RevalidateUrl} бо сарлавҳаи "x-revalidate-secret" → Next.js кэшро аз рӯи тегҳо тоза мекунад.</summary>
public sealed class HttpSiteCache(HttpClient http, SiteCacheOptions options, ILogger<HttpSiteCache> logger) : ISiteCache
{
    public async Task InvalidateAsync(IReadOnlyCollection<string> tags, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(options.RevalidateUrl) || string.IsNullOrWhiteSpace(options.Secret) || tags.Count == 0)
            return;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, options.RevalidateUrl)
            {
                Content = JsonContent.Create(new { tags }),
            };
            request.Headers.Add("x-revalidate-secret", options.Secret);
            using var response = await http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
                logger.LogWarning("Кэши сайт тоза нашуд: {Status}", (int)response.StatusCode);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // Сайт дастрас нест — тағйирот пас аз мӯҳлати кэш (30с) худ пайдо мешавад
            logger.LogWarning("Кэши сайт тоза нашуд: {Message}", ex.Message);
        }
    }
}
