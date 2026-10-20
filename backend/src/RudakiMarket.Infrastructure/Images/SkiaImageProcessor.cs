using System.Runtime.InteropServices;
using RudakiMarket.Application.Abstractions;
using SkiaSharp;

namespace RudakiMarket.Infrastructure.Images;

/// <summary>
/// Суратро бо SkiaSharp мехонад, самти EXIF-ро ислоҳ мекунад, агар заминааш сафед бошад — молро
/// дар маркази квадрати сафед мегузорад (<see cref="FitOnWhite"/>) ва ду WebP месозад:
/// калон (то 1200px) ва хурд барои корт (то 800px). Метамаълумот (EXIF, GPS) нест мешавад.
/// </summary>
public sealed class SkiaImageProcessor : IImageProcessor
{
    private const int MainSize = 1200;
    // Корт дар телефон ~175px × зичии экран 3 ≈ 525px — 800px бо захира (480px хира менамуд)
    private const int ThumbSize = 800;
    private const int Quality = 85;
    private const long MaxPixels = 40_000_000; // муҳофизат аз "decompression bomb"

    public ProcessedImage? Process(byte[] input)
    {
        using var oriented = Decode(input);
        return oriented is null ? null : new ProcessedImage(Encode(oriented, MainSize), Encode(oriented, ThumbSize));
    }

    public byte[]? Thumbnail(byte[] input)
    {
        using var oriented = Decode(input);
        return oriented is null ? null : Encode(oriented, ThumbSize);
    }

    private const int BannerSize = 1000;

    public byte[]? Banner(byte[] input)
    {
        // Сурати баннер аксаран шаффоф аст (мол бе замина) — FitOnWhite не, шаффофӣ мемонад
        using var oriented = DecodeOriented(input);
        return oriented is null ? null : Encode(oriented, BannerSize);
    }

    // Иконаи категория дар сайт то 52px намоён аст × зичии экран 3 ≈ 160px
    private const int IconSize = 160;

    public byte[]? Icon(byte[] input)
    {
        using var oriented = DecodeOriented(input);
        return oriented is null ? null : Encode(oriented, IconSize);
    }

    private static SKBitmap? Decode(byte[] input)
    {
        using var oriented = DecodeOriented(input);
        return oriented is null ? null : FitOnWhite(oriented);
    }

    private static SKBitmap? DecodeOriented(byte[] input)
    {
        using var data = SKData.CreateCopy(input);
        using var codec = SKCodec.Create(data);
        if (codec is null) return null;
        if ((long)codec.Info.Width * codec.Info.Height > MaxPixels) return null;

        using var decoded = SKBitmap.Decode(codec);
        return decoded is null ? null : ApplyOrigin(decoded, codec.EncodedOrigin);
    }

    private const byte Light = 236;        // аз ин равшантар — "сафед" (садои JPEG дар заминаи сафед)
    private const double MinWhiteBorder = 0.9; // кам аз 90% канорҳо сафед — сурати оддӣ, даст намезанем
    private const float Margin = 0.06f;      // ҳошия аз ҳар тараф

    /// <summary>
    /// Агар заминаи сурат сафед ё шаффоф бошад (сурати мағозаҳо, акс дар варақи сафед): молро бурида,
    /// дар марказ бо ҳошияи хурд ба квадрати пурра сафед мегузорад — дар корт мол калон ва миёна менамояд.
    /// Сурат бо заминаи ранга (акси оддӣ) бетағйир мемонад.
    /// </summary>
    private static SKBitmap FitOnWhite(SKBitmap source)
    {
        int w = source.Width, h = source.Height;
        var info = new SKImageInfo(w, h, SKColorType.Rgba8888, SKAlphaType.Unpremul);
        var px = new byte[info.BytesSize];
        var pin = GCHandle.Alloc(px, GCHandleType.Pinned);
        try
        {
            using var pixmap = source.PeekPixels();
            if (pixmap is null || !pixmap.ReadPixels(info, pin.AddrOfPinnedObject(), info.RowBytes)) return source.Copy();
        }
        finally
        {
            pin.Free();
        }

        bool IsBackground(int x, int y)
        {
            var i = (y * w + x) * 4;
            return px[i + 3] < 16 || (px[i] >= Light && px[i + 1] >= Light && px[i + 2] >= Light);
        }

        // 1. Заминаи сафед? — аз рӯи канорҳои сурат
        long border = 0, white = 0;
        for (var x = 0; x < w; x++) { border += 2; if (IsBackground(x, 0)) white++; if (IsBackground(x, h - 1)) white++; }
        for (var y = 1; y < h - 1; y++) { border += 2; if (IsBackground(0, y)) white++; if (IsBackground(w - 1, y)) white++; }
        if (white < border * MinWhiteBorder) return source.Copy();

        // 2. Ҳудуди мол (ҳама чизи "на сафед")
        int x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (var y = 0; y < h; y++)
            for (var x = 0; x < w; x++)
                if (!IsBackground(x, y))
                {
                    if (x < x0) x0 = x;
                    if (x > x1) x1 = x;
                    if (y < y0) y0 = y;
                    if (y > y1) y1 = y;
                }
        if (x1 < 0) return source.Copy(); // сурат пурра сафед

        // 3. Квадрати сафед, мол дар марказ
        int cw = x1 - x0 + 1, ch = y1 - y0 + 1;
        var side = (int)Math.Ceiling(Math.Max(cw, ch) * (1 + 2 * Margin));
        var result = new SKBitmap(new SKImageInfo(side, side, SKColorType.Rgba8888, SKAlphaType.Premul));
        using (var canvas = new SKCanvas(result))
        using (var image = SKImage.FromBitmap(source))
        {
            canvas.Clear(SKColors.White);
            var left = (side - cw) / 2f;
            var top = (side - ch) / 2f;
            canvas.DrawImage(image, SKRect.Create(x0, y0, cw, ch), SKRect.Create(left, top, cw, ch), SKSamplingOptions.Default);
        }

        // 4. Пикселҳои қариб сафед → пурра сафед (заминаи тоза, бе "доғҳо"-и JPEG)
        var span = result.GetPixelSpan();
        for (var i = 0; i < span.Length; i += 4)
            if (span[i] >= 245 && span[i + 1] >= 245 && span[i + 2] >= 245)
            {
                span[i] = span[i + 1] = span[i + 2] = 255;
            }
        return result;
    }

    private static byte[] Encode(SKBitmap source, int maxSize)
    {
        var scale = Math.Min(1f, (float)maxSize / Math.Max(source.Width, source.Height));
        var width = Math.Max(1, (int)Math.Round(source.Width * scale));
        var height = Math.Max(1, (int)Math.Round(source.Height * scale));

        using var resized = scale < 1f
            ? source.Resize(new SKImageInfo(width, height, SKColorType.Rgba8888, SKAlphaType.Premul),
                new SKSamplingOptions(SKCubicResampler.Mitchell))
            : source.Copy();
        using var image = SKImage.FromBitmap(resized);
        using var encoded = image.Encode(SKEncodedImageFormat.Webp, Quality);
        return encoded.ToArray();
    }

    /// <summary>Сурати телефонҳо аксаран "хобида" сабт мешавад (EXIF Orientation) — онро рост мекунем.</summary>
    private static SKBitmap ApplyOrigin(SKBitmap bitmap, SKEncodedOrigin origin)
    {
        if (origin == SKEncodedOrigin.TopLeft) return bitmap.Copy();

        var swap = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop
            or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var result = new SKBitmap(swap ? bitmap.Height : bitmap.Width, swap ? bitmap.Width : bitmap.Height);
        using var canvas = new SKCanvas(result);
        var w = result.Width;
        var h = result.Height;
        switch (origin)
        {
            case SKEncodedOrigin.TopRight: canvas.Scale(-1, 1, w / 2f, 0); break;
            case SKEncodedOrigin.BottomRight: canvas.RotateDegrees(180, w / 2f, h / 2f); break;
            case SKEncodedOrigin.BottomLeft: canvas.Scale(1, -1, 0, h / 2f); break;
            // (x, y) → (y, x)
            case SKEncodedOrigin.LeftTop: canvas.Scale(-1, 1); canvas.RotateDegrees(90); break;
            // 90° бо самти соат: (x, y) → (w − y, x)
            case SKEncodedOrigin.RightTop: canvas.Translate(w, 0); canvas.RotateDegrees(90); break;
            // (x, y) → (w − y, h − x)
            case SKEncodedOrigin.RightBottom: canvas.Translate(w, h); canvas.Scale(-1, 1); canvas.RotateDegrees(-90); break;
            // 90° муқобили соат: (x, y) → (y, h − x)
            case SKEncodedOrigin.LeftBottom: canvas.Translate(0, h); canvas.RotateDegrees(-90); break;
        }
        using var image = SKImage.FromBitmap(bitmap);
        canvas.DrawImage(image, 0, 0, SKSamplingOptions.Default);
        return result;
    }
}
