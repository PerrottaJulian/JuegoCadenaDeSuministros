namespace BeerGameAPI.Models;

public class PlayerState
{
    public PlayerRole Role { get; set; }
    public int Stock { get; set; }
    public decimal Money { get; set; }
    public int Backlog { get; set; }
    public int PendingOrders { get; set; }
    public decimal TotalHoldingCost { get; set; }
    public decimal TotalStockoutCost { get; set; }
}
