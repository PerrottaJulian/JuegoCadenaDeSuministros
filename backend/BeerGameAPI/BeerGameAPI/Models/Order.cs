namespace BeerGameAPI.Models;

public class Order
{
    public int Id { get; set; }
    public PlayerRole FromRole { get; set; }
    public PlayerRole ToRole { get; set; }
    public int Quantity { get; set; }
    public OrderStatus Status { get; set; }
    public int CreatedAtDay { get; set; }
    public int EstimatedArrivalDay { get; set; }
    public int? DeliveredAtDay { get; set; }
}
