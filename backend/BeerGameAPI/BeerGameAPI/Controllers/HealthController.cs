using Microsoft.AspNetCore.Mvc;
using BeerGameAPI.Models;

namespace BeerGameAPI.Controllers;

[ApiController]
[Route("api/healthz")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<HealthStatus> Get()
    {
        return Ok(new HealthStatus { Status = "healthy" });
    }
}
