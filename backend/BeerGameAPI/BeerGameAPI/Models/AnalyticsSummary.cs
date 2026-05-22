namespace BeerGameAPI.Models;

public class PlayerSummary
{
    public int Stock { get; set; }
    public decimal Money { get; set; }
    public int Backlog { get; set; }
    public decimal TotalHoldingCost { get; set; }
    public decimal TotalStockoutCost { get; set; }
}

public class AnalyticsSummary
{
    public int TotalDays { get; set; }
    public PlayerSummary Retailer { get; set; } = new();
    public PlayerSummary Wholesaler { get; set; } = new();
    public PlayerSummary Factory { get; set; } = new();
}
