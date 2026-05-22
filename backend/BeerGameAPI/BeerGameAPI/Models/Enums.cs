using System.Text.Json.Serialization;

namespace BeerGameAPI.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PlayerRole
{
    retailer,
    wholesaler,
    factory
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TurnPhase
{
    arrivals,
    events,
    order,
    done
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OrderStatus
{
    pending,
    in_transit,
    delivered
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GameEventType
{
    demand,
    arrival,
    cost,
    stockout,
    info,
    order_received
}
