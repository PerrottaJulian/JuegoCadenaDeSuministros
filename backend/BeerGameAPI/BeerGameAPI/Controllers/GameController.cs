using Microsoft.AspNetCore.Mvc;
using BeerGameAPI.Models;
using BeerGameAPI.Services;

namespace BeerGameAPI.Controllers;

[ApiController]
[Route("api/game")]
public class GameController : ControllerBase
{
    private readonly GameService _game;

    public GameController(GameService game)
    {
        _game = game;
    }

    [HttpGet("state")]
    public ActionResult<GameState> GetState()
    {
        return Ok(_game.GetGameState());
    }

    [HttpPost("reset")]
    public ActionResult<GameState> Reset()
    {
        _game.Reset();
        return Ok(_game.GetGameState());
    }

    [HttpGet("players/{role}")]
    public ActionResult<PlayerState> GetPlayerState(PlayerRole role)
    {
        var player = _game.GetPlayerState(role);
        if (player == null)
            return NotFound();
        return Ok(player);
    }
}
