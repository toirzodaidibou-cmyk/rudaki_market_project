namespace RudakiMarket.Domain.Entities;

/// <summary>Сурати мол: андозаи калон (то 1200px) ва хурд барои корт (то 800px), ҳарду WebP.</summary>
public sealed class ProductImage
{
    public int Id { get; private set; }
    public int ProductId { get; set; }
    public string Path { get; set; } = "";
    public string ThumbPath { get; set; } = "";
    public int SortOrder { get; set; }
}
