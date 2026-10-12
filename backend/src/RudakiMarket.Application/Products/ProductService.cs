using Microsoft.EntityFrameworkCore;
using RudakiMarket.Application.Abstractions;
using RudakiMarket.Application.Categories;
using RudakiMarket.Application.Common;
using RudakiMarket.Domain.Entities;

namespace RudakiMarket.Application.Products;

public sealed class ProductService(IAppDbContext db, IFileStorage files, IImageProcessor images, ITextSearch search, ISiteCache siteCache, TimeProvider clock)
{
    public const int MaxImages = 8;
    public const int MaxImageBytes = 5 * 1024 * 1024; // 5 MB
    public const int MaxPageSize = 60;
    private const int MaxNameLength = 200;
    private const int MaxDescriptionLength = 2000;
    private const int MaxSizeLabelLength = 20;
    private const decimal MaxPrice = 10_000_000m;

    // --- Рӯйхатҳо (ҳамеша саҳифа ба саҳифа — барои миллионҳо мол) ---

    /// <param name="photo">
    /// null — ҳама; "temporary" — сурати муваққатӣ (пурфурӯшҳо аввал — аввал онҳоро аксбардорӣ кунед);
    /// "none" — бе сурат.
    /// </param>
    public async Task<PagedResult<ProductListItemDto>> ListAsync(
        string? term, int? categoryId, int page, int pageSize, CancellationToken ct, string? photo = null)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);
        var query = db.Products.AsNoTracking();
        if (categoryId is not null) query = query.Where(p => p.CategoryId == categoryId);
        var q = term?.Trim();
        if (!string.IsNullOrEmpty(q)) query = search.ProductsByName(query, q);
        if (photo == "temporary") query = query.Where(p => p.TemporaryPhoto);
        else if (photo == "none") query = query.Where(p => !p.Images.Any());

        var total = await query.CountAsync(ct);
        var ordered = photo == "temporary"
            ? query.OrderByDescending(p => db.OrderItems.Where(i => i.ProductId == p.Id).Sum(i => (int?)i.Quantity) ?? 0)
                .ThenByDescending(p => p.Id)
            : query.OrderByDescending(p => p.Id);
        var items = await ordered
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new ProductListItemDto(
                p.Id, p.CategoryId, new LocalizedNames(p.NameTg, p.NameRu, p.NameEn, p.NameUz),
                p.Price, p.OldPrice, p.SizeLabel, p.IsNew, p.IsActive,
                p.Images.OrderBy(i => i.SortOrder).Select(i => i.ThumbPath).FirstOrDefault(),
                p.Images.Count, p.TemporaryPhoto))
            .ToListAsync(ct);
        return new PagedResult<ProductListItemDto>(items, total, page, pageSize);
    }

    /// <summary>
    /// Молҳои фаъол барои сайт. Агар categorySlug null бошад — аз ҳамаи категорияҳои фаъол;
    /// вагарна — танҳо аз ҳамон категория. Ихтиёрӣ: ҷустуҷӯ (term), тартиб (sort) ва нарх (min/max).
    /// </summary>
    public async Task<Result<PagedResult<PublicProductDto>>> ListPublicAsync(
        string? categorySlug, int page, int pageSize, CancellationToken ct,
        string? term = null, string? sort = null, decimal? minPrice = null, decimal? maxPrice = null)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);
        var query = db.Products.AsNoTracking().Where(p => p.IsActive);

        if (string.IsNullOrWhiteSpace(categorySlug))
        {
            // Молҳои категорияи пинҳоншуда дар саҳифаи асосӣ ва ҷустуҷӯ ҳам нишон дода намешаванд
            query = query.Where(p => p.Category!.IsActive);
        }
        else
        {
            var categoryId = await db.Categories.AsNoTracking()
                .Where(c => c.Slug == categorySlug && c.IsActive)
                .Select(c => (int?)c.Id)
                .FirstOrDefaultAsync(ct);
            if (categoryId is null) return Result<PagedResult<PublicProductDto>>.NotFound();
            query = query.Where(p => p.CategoryId == categoryId);
        }

        var q = term?.Trim();
        if (q is { Length: > 0 }) query = search.ProductsByName(query, q[..Math.Min(q.Length, 100)]);
        if (minPrice is > 0) query = query.Where(p => p.Price >= minPrice);
        if (maxPrice is > 0) query = query.Where(p => p.Price <= maxPrice);

        var total = await query.CountAsync(ct);
        IOrderedQueryable<Product> ordered = sort switch
        {
            ProductSort.Cheap => query.OrderBy(p => p.Price).ThenByDescending(p => p.Id),
            ProductSort.Expensive => query.OrderByDescending(p => p.Price).ThenByDescending(p => p.Id),
            // Аксиядорҳо аввал (бузургтарин тахфиф), баъд навтаринҳо
            ProductSort.Discount => query
                .OrderByDescending(p => p.OldPrice != null && p.OldPrice > p.Price ? (p.OldPrice - p.Price) / p.OldPrice : 0)
                .ThenByDescending(p => p.Id),
            ProductSort.New => query.OrderByDescending(p => p.Id),
            // Пешфарз: дар ҷустуҷӯ — мувофиқтарин, дар каталог — навтаринҳо
            _ => q is { Length: > 0 } ? search.OrderByRelevance(query, q) : query.OrderByDescending(p => p.Id),
        };
        var items = await ordered
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new PublicProductDto(
                p.Id, new LocalizedNames(p.NameTg, p.NameRu, p.NameEn, p.NameUz),
                p.Price, p.OldPrice, p.SizeLabel, p.IsNew,
                p.Images.OrderBy(i => i.SortOrder).Select(i => i.ThumbPath).Take(3).ToList()))
            .ToListAsync(ct);
        return Result<PagedResult<PublicProductDto>>.Ok(new PagedResult<PublicProductDto>(items, total, page, pageSize));
    }

    public const int SimilarLimit = 12;

    /// <summary>
    /// Саҳифаи мол дар сайт: маълумоти пурра, ҳамаи суратҳо, категория ва то 12 моли монанд
    /// (ҳамон категория, аввал аз ҳамон навъ — калимаи аввали ном, баъд навтаринҳо).
    /// Мол ё категорияи пинҳон → NotFound.
    /// </summary>
    public async Task<Result<PublicProductDetailDto>> GetPublicAsync(int id, CancellationToken ct)
    {
        var p = await db.Products.AsNoTracking()
            .Where(x => x.Id == id && x.IsActive && x.Category!.IsActive)
            .Select(x => new
            {
                x.Id, x.CategoryId, x.NameTg, x.NameRu, x.NameEn, x.NameUz,
                x.DescriptionTg, x.DescriptionRu, x.DescriptionEn, x.DescriptionUz,
                x.Price, x.OldPrice, x.SizeLabel, x.IsNew,
                Category = new PublicCategoryRef(x.Category!.Slug,
                    new LocalizedNames(x.Category.NameTg, x.Category.NameRu, x.Category.NameEn, x.Category.NameUz)),
                Images = x.Images.OrderBy(i => i.SortOrder).Select(i => new ProductImageDto(i.Id, i.Path, i.ThumbPath)).ToList(),
            })
            .FirstOrDefaultAsync(ct);
        if (p is null) return Result<PublicProductDetailDto>.NotFound();

        var sameCategory = db.Products.AsNoTracking().Where(x => x.CategoryId == p.CategoryId && x.Id != p.Id && x.IsActive);
        var firstWord = p.NameRu.Split(' ', 2)[0];
        var similar = await Project(search.OrderByRelevance(sameCategory, firstWord).Take(SimilarLimit)).ToListAsync(ct);

        return Result<PublicProductDetailDto>.Ok(new PublicProductDetailDto(
            p.Id, new LocalizedNames(p.NameTg, p.NameRu, p.NameEn, p.NameUz),
            new LocalizedNames(p.DescriptionTg ?? "", p.DescriptionRu ?? "", p.DescriptionEn ?? "", p.DescriptionUz ?? ""),
            p.Price, p.OldPrice, p.SizeLabel, p.IsNew, p.Images, p.Category, similar));

        static IQueryable<PublicProductDto> Project(IQueryable<Product> q) => q.Select(x => new PublicProductDto(
            x.Id, new LocalizedNames(x.NameTg, x.NameRu, x.NameEn, x.NameUz),
            x.Price, x.OldPrice, x.SizeLabel, x.IsNew,
            x.Images.OrderBy(i => i.SortOrder).Select(i => i.ThumbPath).Take(3).ToList()));
    }

    /// <summary>Як sitemap ≤ 50 000 URL: 4 забон × 12 000 мол. Барои зиёдтар — sitemap index (дар оянда).</summary>
    public const int SitemapLimit = 12_000;

    /// <summary>Молҳои фаъол (дар категорияи фаъол) барои sitemap.xml — танҳо id ва санаи тағйир, навтаринҳо аввал.</summary>
    public async Task<IReadOnlyList<SitemapProductDto>> ListForSitemapAsync(CancellationToken ct) =>
        await db.Products.AsNoTracking()
            .Where(p => p.IsActive && p.Category!.IsActive)
            .OrderByDescending(p => p.Id)
            .Take(SitemapLimit)
            .Select(p => new SitemapProductDto(p.Id, p.UpdatedAt))
            .ToListAsync(ct);

    public const int HomeLimit = 20;

    /// <summary>
    /// Саҳифаи асосӣ: то 20 мол — аввал аксиядорҳо (OldPrice &gt; Price, навтаринҳо аввал),
    /// баъд бо молҳои навтарини бе аксия пур мешавад. Боқимонда — дар каталог.
    /// </summary>
    public async Task<IReadOnlyList<PublicProductDto>> ListHomeAsync(CancellationToken ct)
    {
        var active = db.Products.AsNoTracking().Where(p => p.IsActive && p.Category!.IsActive);

        var items = await Project(active.Where(p => p.OldPrice != null && p.OldPrice > p.Price)
                .OrderByDescending(p => p.Id).Take(HomeLimit))
            .ToListAsync(ct);
        if (items.Count < HomeLimit)
        {
            items.AddRange(await Project(active.Where(p => p.OldPrice == null || p.OldPrice <= p.Price)
                    .OrderByDescending(p => p.Id).Take(HomeLimit - items.Count))
                .ToListAsync(ct));
        }
        return items;

        static IQueryable<PublicProductDto> Project(IQueryable<Product> q) => q.Select(p => new PublicProductDto(
            p.Id, new LocalizedNames(p.NameTg, p.NameRu, p.NameEn, p.NameUz),
            p.Price, p.OldPrice, p.SizeLabel, p.IsNew,
            p.Images.OrderBy(i => i.SortOrder).Select(i => i.ThumbPath).Take(3).ToList()));
    }

    // --- CRUD ---

    public async Task<Result<ProductDto>> GetAsync(int id, CancellationToken ct)
    {
        var p = await db.Products.AsNoTracking().Include(x => x.Images).FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? Result<ProductDto>.NotFound() : Result<ProductDto>.Ok(ToDto(p));
    }

    public async Task<Result<ProductDto>> CreateAsync(SaveProductRequest request, CancellationToken ct)
    {
        var (req, errors) = await ValidateAsync(request, ct);
        if (errors.Count > 0) return Result<ProductDto>.Invalid(errors);

        var now = clock.GetUtcNow();
        var product = new Product { CreatedAt = now };
        Apply(product, req, now);
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Products], ct);
        return Result<ProductDto>.Ok(ToDto(product));
    }

    public async Task<Result<ProductDto>> UpdateAsync(int id, SaveProductRequest request, CancellationToken ct)
    {
        var product = await db.Products.Include(x => x.Images).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (product is null) return Result<ProductDto>.NotFound();

        var (req, errors) = await ValidateAsync(request, ct);
        if (errors.Count > 0) return Result<ProductDto>.Invalid(errors);

        Apply(product, req, clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Products], ct);
        return Result<ProductDto>.Ok(ToDto(product));
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var product = await db.Products.Include(x => x.Images).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (product is null) return false;

        var paths = product.Images.SelectMany(i => new[] { i.Path, i.ThumbPath }).ToList();
        db.Products.Remove(product);
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Products], ct);
        foreach (var path in paths) await files.DeleteAsync(path, ct);
        return true;
    }

    // --- Суратҳо ---

    /// <summary>Суратҳоро илова мекунад (ба охири рӯйхат). Ҳар сурат ба WebP (1200px + 480px) табдил мешавад.</summary>
    public async Task<Result<ProductDto>> AddImagesAsync(int id, IReadOnlyList<UploadFile> uploads, CancellationToken ct)
    {
        var product = await db.Products.Include(x => x.Images).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (product is null) return Result<ProductDto>.NotFound();
        if (uploads.Count == 0) return Result<ProductDto>.Invalid("images", "Ягон сурат интихоб нашудааст.");
        if (product.Images.Count + uploads.Count > MaxImages)
            return Result<ProductDto>.Invalid("images", $"Ҳар мол то {MaxImages} сурат дошта метавонад.");

        // Аввал ҳамаро месанҷем — агар яке нодуруст бошад, ҳеҷ кадом нигоҳ дошта намешавад
        var processed = new List<ProcessedImage>();
        foreach (var upload in uploads)
        {
            if (upload.Content.Length > MaxImageBytes)
                return Result<ProductDto>.Invalid("images", $"«{upload.FileName}»: андоза бояд то 5 MB бошад.");
            var image = images.Process(upload.Content);
            if (image is null)
                return Result<ProductDto>.Invalid("images", $"«{upload.FileName}» сурат нест ё вайрон аст.");
            processed.Add(image);
        }

        var order = product.Images.Count == 0 ? 0 : product.Images.Max(i => i.SortOrder) + 1;
        foreach (var image in processed)
        {
            product.Images.Add(new ProductImage
            {
                Path = await files.SaveAsync(new MemoryStream(image.Main), "products", "webp", ct),
                ThumbPath = await files.SaveAsync(new MemoryStream(image.Thumb), "products", "webp", ct),
                SortOrder = order++,
            });
        }
        product.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Products], ct);
        return Result<ProductDto>.Ok(ToDto(product));
    }

    public async Task<Result<ProductDto>> DeleteImageAsync(int id, int imageId, CancellationToken ct)
    {
        var product = await db.Products.Include(x => x.Images).FirstOrDefaultAsync(x => x.Id == id, ct);
        var image = product?.Images.FirstOrDefault(i => i.Id == imageId);
        if (product is null || image is null) return Result<ProductDto>.NotFound();

        product.Images.Remove(image);
        db.ProductImages.Remove(image);
        product.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Products], ct);
        await files.DeleteAsync(image.Path, ct);
        await files.DeleteAsync(image.ThumbPath, ct);
        return Result<ProductDto>.Ok(ToDto(product));
    }

    /// <summary>
    /// Суратҳои хурди кортро аз суратҳои калон аз нав месозад (масалан, пас аз иваз шудани андозаи корт).
    /// Файли нав бо номи нав сабт мешавад (браузерҳо суратҳоро як сол кэш мекунанд), кӯҳна нест мешавад.
    /// Қисм-қисм кор мекунад — барои миллионҳо сурат ҳам.
    /// </summary>
    /// <returns>(аз нав сохта шуд, гузаронида шуд — файли калон нест ё вайрон)</returns>
    public async Task<(int Done, int Skipped)> RegenerateThumbnailsAsync(CancellationToken ct)
    {
        const int batchSize = 100;
        int done = 0, skipped = 0, lastId = 0;
        while (true)
        {
            var batch = await db.ProductImages.Where(i => i.Id > lastId).OrderBy(i => i.Id).Take(batchSize).ToListAsync(ct);
            if (batch.Count == 0) break;
            lastId = batch[^1].Id;

            var oldThumbs = new List<string>();
            foreach (var image in batch)
            {
                var source = await files.ReadAsync(image.Path, ct);
                var thumb = source is null ? null : images.Thumbnail(source);
                if (thumb is null) { skipped++; continue; }
                oldThumbs.Add(image.ThumbPath);
                image.ThumbPath = await files.SaveAsync(new MemoryStream(thumb), "products", "webp", ct);
                done++;
            }
            await db.SaveChangesAsync(ct);
            foreach (var path in oldThumbs) await files.DeleteAsync(path, ct);
        }
        if (done > 0) await siteCache.InvalidateAsync([SiteCacheTags.Products], ct);
        return (done, skipped);
    }

    /// <summary>Тартиби суратҳо: рӯйхати ҳамаи id-ҳо бо тартиби нав (аввалин — асосӣ).</summary>
    public async Task<Result<ProductDto>> ReorderImagesAsync(int id, IReadOnlyList<int> imageIds, CancellationToken ct)
    {
        var product = await db.Products.Include(x => x.Images).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (product is null) return Result<ProductDto>.NotFound();

        var current = product.Images.Select(i => i.Id).Order().ToList();
        if (!current.SequenceEqual(imageIds.Order()))
            return Result<ProductDto>.Invalid("images", "Рӯйхати суратҳо нодуруст аст.");

        for (var i = 0; i < imageIds.Count; i++)
            product.Images.First(x => x.Id == imageIds[i]).SortOrder = i;
        product.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        await siteCache.InvalidateAsync([SiteCacheTags.Products], ct);
        return Result<ProductDto>.Ok(ToDto(product));
    }

    // --- Ёрирасонҳо ---

    private async Task<(SaveProductRequest Request, Dictionary<string, string[]> Errors)> ValidateAsync(SaveProductRequest r, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var name = new LocalizedNames(Clean(r.Name?.Tg), Clean(r.Name?.Ru), Clean(r.Name?.En), Clean(r.Name?.Uz));
        var description = new LocalizedNames(
            Clean(r.Description?.Tg), Clean(r.Description?.Ru), Clean(r.Description?.En), Clean(r.Description?.Uz));
        var sizeLabel = string.IsNullOrWhiteSpace(r.SizeLabel) ? null : r.SizeLabel.Trim();

        foreach (var (key, value) in new[] { ("name.tg", name.Tg), ("name.ru", name.Ru), ("name.en", name.En), ("name.uz", name.Uz) })
        {
            if (value.Length == 0) errors[key] = ["Ном ҳатмист."];
            else if (value.Length > MaxNameLength) errors[key] = [$"Ном бояд то {MaxNameLength} аломат бошад."];
        }
        foreach (var (key, value) in new[] { ("description.tg", description.Tg), ("description.ru", description.Ru), ("description.en", description.En), ("description.uz", description.Uz) })
            if (value.Length > MaxDescriptionLength) errors[key] = [$"Тавсиф бояд то {MaxDescriptionLength} аломат бошад."];

        if (r.Price <= 0 || r.Price > MaxPrice) errors["price"] = ["Нарх бояд аз 0 зиёд бошад."];
        else if (decimal.Round(r.Price, 2) != r.Price) errors["price"] = ["Нарх ҳадди аксар 2 рақам баъди вергул дорад."];
        if (r.OldPrice is { } old && (old <= r.Price || old > MaxPrice || decimal.Round(old, 2) != old))
            errors["oldPrice"] = ["Нархи пешина бояд аз нархи ҷорӣ калонтар бошад."];
        if (sizeLabel?.Length > MaxSizeLabelLength) errors["sizeLabel"] = [$"То {MaxSizeLabelLength} аломат (масалан: 1 л)."];

        if (!await db.Categories.AnyAsync(c => c.Id == r.CategoryId, ct)) errors["categoryId"] = ["Категорияро интихоб кунед."];

        return (r with { Name = name, Description = description, SizeLabel = sizeLabel }, errors);
    }

    private static string Clean(string? s) => (s ?? "").Trim();
    private static string? NullIfEmpty(string s) => s.Length == 0 ? null : s;

    private static (int Page, int PageSize) NormalizePaging(int page, int pageSize) =>
        (Math.Max(1, page), Math.Clamp(pageSize <= 0 ? 24 : pageSize, 1, MaxPageSize));


    private static void Apply(Product p, SaveProductRequest r, DateTimeOffset now)
    {
        p.CategoryId = r.CategoryId;
        p.NameTg = r.Name.Tg;
        p.NameRu = r.Name.Ru;
        p.NameEn = r.Name.En;
        p.NameUz = r.Name.Uz;
        p.DescriptionTg = NullIfEmpty(r.Description!.Tg);
        p.DescriptionRu = NullIfEmpty(r.Description.Ru);
        p.DescriptionEn = NullIfEmpty(r.Description.En);
        p.DescriptionUz = NullIfEmpty(r.Description.Uz);
        p.Price = r.Price;
        p.OldPrice = r.OldPrice;
        p.SizeLabel = r.SizeLabel;
        p.IsNew = r.IsNew;
        p.IsActive = r.IsActive;
        // null — бетағйир (масалан, тугмаи «Дар сайт» дар рӯйхат ё муштариёни кӯҳна)
        if (r.TemporaryPhoto is { } temporary) p.TemporaryPhoto = temporary;
        p.UpdatedAt = now;
    }

    private static ProductDto ToDto(Product p) => new(
        p.Id, p.CategoryId,
        new LocalizedNames(p.NameTg, p.NameRu, p.NameEn, p.NameUz),
        new LocalizedNames(p.DescriptionTg ?? "", p.DescriptionRu ?? "", p.DescriptionEn ?? "", p.DescriptionUz ?? ""),
        p.Price, p.OldPrice, p.SizeLabel, p.IsNew, p.IsActive,
        p.Images.OrderBy(i => i.SortOrder).Select(i => new ProductImageDto(i.Id, i.Path, i.ThumbPath)).ToList(),
        p.CreatedAt, p.UpdatedAt, p.TemporaryPhoto);
}
