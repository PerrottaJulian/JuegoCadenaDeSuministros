namespace BeerGameAPI.Models;

public class ArrivalResult
{
    public int ArrivedQuantity { get; set; }
    public int NewStock { get; set; }
    public decimal HoldingCostCharged { get; set; }
    public List<GameEvent> Events { get; set; } = [];
}
