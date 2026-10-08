using RudakiMarket.Application.Abstractions;

namespace RudakiMarket.Infrastructure.Storage;

/// <summary>Файлҳоро дар {webRoot}/uploads/{folder}/ нигоҳ медорад; оммавӣ дар /uploads/... дастрасанд.</summary>
public sealed class LocalFileStorage(string webRootPath) : IFileStorage
{
    private const string UploadsSegment = "uploads";

    public async Task<string> SaveAsync(Stream content, string folder, string extension, CancellationToken ct = default)
    {
        var dir = Path.Combine(webRootPath, UploadsSegment, folder);
        Directory.CreateDirectory(dir);
        var fileName = $"{Guid.NewGuid():N}.{extension}";
        await using (var file = File.Create(Path.Combine(dir, fileName)))
        {
            await content.CopyToAsync(file, ct);
        }
        return $"/{UploadsSegment}/{folder}/{fileName}";
    }

    public Task DeleteAsync(string publicPath, CancellationToken ct = default)
    {
        var full = ResolveSafe(publicPath);
        if (full is not null && File.Exists(full)) File.Delete(full);
        return Task.CompletedTask;
    }

    public async Task<byte[]?> ReadAsync(string publicPath, CancellationToken ct = default)
    {
        var full = ResolveSafe(publicPath);
        return full is not null && File.Exists(full) ? await File.ReadAllBytesAsync(full, ct) : null;
    }

    /// <summary>Танҳо роҳҳои дохили /uploads қабул мешаванд (муҳофизат аз "../").</summary>
    private string? ResolveSafe(string publicPath)
    {
        var root = Path.GetFullPath(Path.Combine(webRootPath, UploadsSegment)) + Path.DirectorySeparatorChar;
        var full = Path.GetFullPath(Path.Combine(webRootPath, publicPath.TrimStart('/')));
        return full.StartsWith(root, StringComparison.OrdinalIgnoreCase) ? full : null;
    }
}
