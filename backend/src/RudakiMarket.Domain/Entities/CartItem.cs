namespace RudakiMarket.Domain.Entities;

/// <summary>Мол дар сабади мизоҷ (дар сервер — дар ҳама дастгоҳҳо якхела).</summary>
public sealed class CartItem
{
    public int CustomerId { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; }
    public DateTimeOffset AddedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
