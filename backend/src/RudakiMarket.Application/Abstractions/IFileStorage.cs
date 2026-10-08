namespace RudakiMarket.Application.Abstractions;

/// <summary>
/// Нигоҳдории файлҳо (иконаҳо, суратҳо). Ҳоло — диски маҳаллӣ (wwwroot/uploads);
/// дар production бо S3/MinIO иваз мешавад, бе тағйири мантиқи барнома.
/// </summary>
public interface IFileStorage
{
    /// <summary>Файлро нигоҳ медорад ва роҳи нисбии оммавӣ бармегардонад (масалан "/uploads/categories/x.webp").</summary>
    Task<string> SaveAsync(Stream content, string folder, string extension, CancellationToken ct = default);

    Task DeleteAsync(string publicPath, CancellationToken ct = default);

    /// <summary>Мӯҳтавои файл; null — агар нест бошад.</summary>
    Task<byte[]?> ReadAsync(string publicPath, CancellationToken ct = default);
}
