using System.Net;
using System.Net.Http.Headers;
using RudakiMarket.Application.Abstractions;

namespace RudakiMarket.Infrastructure.Storage;

/// <summary>Танзимоти Supabase Storage (Storage:Supabase:Url, ServiceKey, Bucket).</summary>
public sealed record SupabaseStorageOptions(string Url, string ServiceKey, string Bucket)
{
    /// <summary>Суроғаи оммавии файл дар bucket (bucket бояд "Public" бошад).</summary>
    public string PublicUrl(string key) => $"{Url.TrimEnd('/')}/storage/v1/object/public/{Bucket}/{key}";
}

/// <summary>
/// Файлҳоро дар Supabase Storage нигоҳ медорад (сервери абрӣ диски доимӣ надорад).
/// Роҳи оммавӣ ҳамон "/uploads/{folder}/{file}" мемонад — дар bucket калиди он "{folder}/{file}" аст,
/// бинобар ин роҳҳои дар база буда тағйир намеёбанд.
/// </summary>
public sealed class SupabaseFileStorage(HttpClient http, SupabaseStorageOptions options) : IFileStorage
{
    public const string HttpClientName = "supabase-storage";
    private const string Prefix = "/uploads/";

    public async Task<string> SaveAsync(Stream content, string folder, string extension, CancellationToken ct = default)
    {
        var key = $"{folder}/{Guid.NewGuid():N}.{extension}";
        using var body = new StreamContent(content);
        body.Headers.ContentType = new MediaTypeHeaderValue(ContentType(extension));
        using var req = Request(HttpMethod.Post, key, body);
        // Номҳо GUID ҳастанд — дароз кэш мешаванд
        req.Headers.Add("cache-control", "max-age=31536000");
        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException(
                $"Supabase Storage: бор кардани файл ноком шуд ({(int)res.StatusCode}): {await res.Content.ReadAsStringAsync(ct)}");
        return Prefix + key;
    }

    public async Task DeleteAsync(string publicPath, CancellationToken ct = default)
    {
        if (ToKey(publicPath) is not { } key) return;
        using var req = Request(HttpMethod.Delete, key);
        using var res = await http.SendAsync(req, ct);
        // Агар файл аллакай нест бошад — хато нест
        if (!res.IsSuccessStatusCode && res.StatusCode != HttpStatusCode.NotFound && res.StatusCode != HttpStatusCode.BadRequest)
            throw new InvalidOperationException($"Supabase Storage: нест кардани файл ноком шуд ({(int)res.StatusCode}).");
    }

    public async Task<byte[]?> ReadAsync(string publicPath, CancellationToken ct = default)
    {
        if (ToKey(publicPath) is not { } key) return null;
        using var req = Request(HttpMethod.Get, key);
        using var res = await http.SendAsync(req, ct);
        if (res.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest) return null;
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadAsByteArrayAsync(ct);
    }

    /// <summary>"/uploads/products/x.webp" → "products/x.webp"; роҳҳои берун аз /uploads ё бо ".." — null.</summary>
    public static string? ToKey(string publicPath)
    {
        if (!publicPath.StartsWith(Prefix, StringComparison.Ordinal)) return null;
        var key = publicPath[Prefix.Length..];
        return key.Length == 0 || key.Contains("..") || key.Contains('\\') ? null : key;
    }

    private HttpRequestMessage Request(HttpMethod method, string key, HttpContent? content = null)
    {
        var req = new HttpRequestMessage(method, $"{options.Url.TrimEnd('/')}/storage/v1/object/{options.Bucket}/{key}")
        {
            Content = content,
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ServiceKey);
        req.Headers.Add("apikey", options.ServiceKey);
        return req;
    }

    private static string ContentType(string extension) => extension.ToLowerInvariant() switch
    {
        "webp" => "image/webp",
        "png" => "image/png",
        "jpg" or "jpeg" => "image/jpeg",
        "svg" => "image/svg+xml",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    };
}
