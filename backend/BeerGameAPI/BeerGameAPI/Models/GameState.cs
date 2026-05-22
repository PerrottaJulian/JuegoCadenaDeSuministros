namespace BeerGameAPI.Models;

public class GameState
{
    public int CurrentDay { get; set; }
    public PlayerRole CurrentTurnRole { get; set; }
    public TurnPhase TurnPhase { get; set; }
    public List<PlayerState> Players { get; set; } = [];
    public bool IsGameOver { get; set; }
    public string? WinnerRole { get; set; }
}
