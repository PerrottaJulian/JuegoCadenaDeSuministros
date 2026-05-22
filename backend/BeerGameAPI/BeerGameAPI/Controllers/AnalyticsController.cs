using Microsoft.AspNetCore.Mvc;
using BeerGameAPI.Models;
using BeerGameAPI.Services;

namespace BeerGameAPI.Controllers;

[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly GameService _game;

    public AnalyticsController(GameService game)
    {
        _game = game;
    }

    [HttpGet("summary")]
    public ActionResult<AnalyticsSummary> GetSummary()
    {
        return Ok(_game.GetAnalyticsSummary());
    }

    [HttpGet("history")]
    public ActionResult<List<TurnSnapshot>> GetHistory()
    {
        return Ok(_game.GetHistory());
    }

    [HttpGet("transit")]
    public ActionResult<List<TransitItem>> GetTransit()
    {
        return Ok(_game.GetTransitQueue());
    }
}
