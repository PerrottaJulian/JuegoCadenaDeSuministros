namespace BeerGameAPI.Models;

public class TurnSnapshot
{
    public int Day { get; set; }
    public int RetailerStock { get; set; }
    public int WholesalerStock { get; set; }
    public int FactoryStock { get; set; }
    public decimal RetailerMoney { get; set; }
    public decimal WholesalerMoney { get; set; }
    public decimal FactoryMoney { get; set; }
    public int RetailerBacklog { get; set; }
    public int WholesalerBacklog { get; set; }
    public int FactoryBacklog { get; set; }
    public int Demand { get; set; }
}
