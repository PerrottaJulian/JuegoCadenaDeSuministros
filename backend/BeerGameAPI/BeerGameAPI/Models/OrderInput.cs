namespace BeerGameAPI.Models;

public class OrderInput
{
    public PlayerRole FromRole { get; set; }
    public int Quantity { get; set; }
}
