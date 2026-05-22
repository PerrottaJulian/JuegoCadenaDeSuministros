namespace BeerGameAPI.Models;

public class GameEvent
{
    public int Id { get; set; }
    public PlayerRole Role { get; set; }
    public GameEventType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public int Day { get; set; }
    public bool Acknowledged { get; set; }
    public Dictionary<string, object>? Data { get; set; }
}
