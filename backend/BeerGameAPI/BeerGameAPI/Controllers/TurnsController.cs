using Microsoft.AspNetCore.Mvc;
using BeerGameAPI.Models;
using BeerGameAPI.Services;

namespace BeerGameAPI.Controllers;

[ApiController]
[Route("api/turns")]
public class TurnsController : ControllerBase
{
    private readonly GameService _game;

    public TurnsController(GameService game)
    {
        _game = game;
    }

    [HttpGet("current")]
    public ActionResult<TurnInfo> GetCurrentTurn()
    {
        return Ok(_game.GetCurrentTurn());
    }

    [HttpPost("advance")]
    public ActionResult<TurnInfo> AdvanceTurn()
    {
        return Ok(_game.AdvanceTurn());
    }

    [HttpPost("process-arrivals")]
    public ActionResult<ArrivalResult> ProcessArrivals([FromQuery] PlayerRole role)
    {
        return Ok(_game.ProcessArrivals(role));
    }
}
