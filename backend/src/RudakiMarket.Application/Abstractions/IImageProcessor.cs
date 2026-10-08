namespace RudakiMarket.Application.Abstractions;

/// <summary>Сурати коркардшуда: калон (то 1200px) ва хурд барои корт (то 800px), ҳарду WebP, бе метамаълумот (EXIF).</summary>
public sealed record ProcessedImage(byte[] Main, byte[] Thumb);

public interface IImageProcessor
{
    /// <summary>Суратро мехонад, ба WebP табдил медиҳад ва хурд мекунад. Агар файл сурат набошад — null.</summary>
    ProcessedImage? Process(byte[] input);

    /// <summary>Танҳо сурати хурд барои корт (барои аз нав сохтани суратҳои мавҷуда). Агар сурат набошад — null.</summary>
    byte[]? Thumbnail(byte[] input);
}
