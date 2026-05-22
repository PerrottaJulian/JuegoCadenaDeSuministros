namespace BeerGameAPI.Models;

public class TurnInfo
{
    public int CurrentDay { get; set; }
    public PlayerRole CurrentTurnRole { get; set; }
    public TurnPhase TurnPhase { get; set; }
    public List<PlayerRole> TurnOrder { get; set; } = [];
}
