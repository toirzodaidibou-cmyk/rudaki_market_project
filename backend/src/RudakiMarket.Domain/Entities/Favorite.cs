namespace RudakiMarket.Domain.Entities;

/// <summary>Моли писандидаи мизоҷ (❤️).</summary>
public sealed class Favorite
{
    public int CustomerId { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
