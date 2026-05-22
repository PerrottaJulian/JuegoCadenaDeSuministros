using Microsoft.AspNetCore.Mvc;
using BeerGameAPI.Models;
using BeerGameAPI.Services;

namespace BeerGameAPI.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly GameService _game;

    public OrdersController(GameService game)
    {
        _game = game;
    }

    [HttpGet]
    public ActionResult<List<Order>> ListOrders(
        [FromQuery] PlayerRole? role,
        [FromQuery] OrderStatus? status)
    {
        return Ok(_game.GetOrders(role, status));
    }

    [HttpPost]
    public ActionResult<Order> PlaceOrder([FromBody] OrderInput input)
    {
        var order = _game.PlaceOrder(input.FromRole, input.Quantity);
        if (order == null)
            return BadRequest("Invalid order");
        return CreatedAtAction(nameof(ListOrders), new { id = order.Id }, order);
    }

    [HttpPost("{id}/fulfill")]
    public ActionResult<Order> FulfillOrder(int id)
    {
        var order = _game.FulfillOrder(id);
        if (order == null)
            return NotFound("Order not found or already processed");
        return Ok(order);
    }
}
