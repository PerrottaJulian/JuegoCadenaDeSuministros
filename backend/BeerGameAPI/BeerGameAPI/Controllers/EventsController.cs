using Microsoft.AspNetCore.Mvc;
using BeerGameAPI.Models;
using BeerGameAPI.Services;

namespace BeerGameAPI.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly GameService _game;

    public EventsController(GameService game)
    {
        _game = game;
    }

    [HttpGet]
    public ActionResult<List<GameEvent>> ListEvents(
        [FromQuery] PlayerRole? role,
        [FromQuery] bool? acknowledged)
    {
        return Ok(_game.GetEvents(role, acknowledged));
    }

    [HttpPost("{id}/acknowledge")]
    public ActionResult<GameEvent> AcknowledgeEvent(int id)
    {
        var evt = _game.AcknowledgeEvent(id);
        if (evt == null)
            return NotFound("Event not found");
        return Ok(evt);
    }
}
