namespace BeerGameAPI.Models;

public class TransitItem
{
    public int OrderId { get; set; }
    public PlayerRole FromRole { get; set; }
    public PlayerRole ToRole { get; set; }
    public int Quantity { get; set; }
    public int CreatedAtDay { get; set; }
    public int EstimatedArrivalDay { get; set; }
    public int TurnsRemaining { get; set; }
}
