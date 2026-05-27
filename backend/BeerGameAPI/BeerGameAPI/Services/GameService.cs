using BeerGameAPI.Models;

namespace BeerGameAPI.Services;

public class GameService
{
    private const int LeadTime = 2;
    private const decimal HoldingCostPerUnit = 0.5m;
    private const decimal StockoutCostPerUnit = 1.0m;
    private const int InitialStock = 12;
    private const decimal InitialMoney = 100;
    private const int BaseDemand = 4;

    private static readonly List<PlayerRole> TurnOrder = [PlayerRole.retailer, PlayerRole.wholesaler, PlayerRole.factory];

    private int _currentDay;
    private PlayerRole _currentTurnRole;
    private TurnPhase _turnPhase;
    private readonly Dictionary<PlayerRole, PlayerState> _players = [];
    private readonly List<Order> _orders = [];
    private readonly List<GameEvent> _events = [];
    private readonly List<TurnSnapshot> _history = [];
    private int _nextOrderId = 1;
    private int _nextEventId = 1;
    private readonly Random _rng = new();

    public GameService()
    {
        Reset();
    }

    public void Reset()
    {
        _currentDay = 1;
        _currentTurnRole = PlayerRole.retailer;
        _turnPhase = TurnPhase.arrivals;
        _orders.Clear();
        _events.Clear();
        _history.Clear();
        _nextOrderId = 1;
        _nextEventId = 1;

        foreach (var role in TurnOrder)
        {
            _players[role] = new PlayerState
            {
                Role = role,
                Stock = InitialStock,
                Money = InitialMoney,
                Backlog = 0,
                PendingOrders = 0,
                TotalHoldingCost = 0,
                TotalStockoutCost = 0
            };
        }

        TakeSnapshot();
        GenerateDemandEvent(PlayerRole.retailer);
    }

    public GameState GetGameState()
    {
        return new GameState
        {
            CurrentDay = _currentDay,
            CurrentTurnRole = _currentTurnRole,
            TurnPhase = _turnPhase,
            Players = TurnOrder.Select(r => _players[r]).ToList(),
            IsGameOver = _currentDay > 50,
            WinnerRole = null
        };
    }

    public TurnInfo GetCurrentTurn()
    {
        return new TurnInfo
        {
            CurrentDay = _currentDay,
            CurrentTurnRole = _currentTurnRole,
            TurnPhase = _turnPhase,
            TurnOrder = TurnOrder
        };
    }

    public PlayerState? GetPlayerState(PlayerRole role)
    {
        return _players.GetValueOrDefault(role);
    }

    public List<Order> GetOrders(PlayerRole? role = null, OrderStatus? status = null)
    {
        var query = _orders.AsEnumerable();

        if (role.HasValue)
            query = query.Where(o => o.FromRole == role.Value || o.ToRole == role.Value);

        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);

        return query.ToList();
    }

    public Order? FulfillOrder(int orderId)
    {
        var order = _orders.FirstOrDefault(o => o.Id == orderId);
        if (order == null || order.Status != OrderStatus.pending)
            return null;

        var supplier = _players.GetValueOrDefault(order.ToRole);
        if (supplier == null)
            return null;

        var shipQty = Math.Min(order.Quantity, supplier.Stock);
        supplier.Stock -= shipQty;

        order.Status = OrderStatus.in_transit;
        order.EstimatedArrivalDay = _currentDay + LeadTime;

        _events.Add(new GameEvent
        {
            Id = _nextEventId++,
            Role = order.FromRole,
            Type = GameEventType.arrival,
            Message = $"Envío de {shipQty} unidades en camino desde {GetRoleLabel(order.ToRole)}. Llegada estimada: Día {order.EstimatedArrivalDay}.",
            Day = _currentDay,
            Acknowledged = false
        });

        var remaining = order.Quantity - shipQty;
        if (remaining > 0)
        {
            _players[order.FromRole].Backlog += remaining;
        }

        return order;
    }

    public Order? PlaceOrder(PlayerRole fromRole, int quantity)
    {
        if (quantity <= 0)
            return null;

        var buyer = _players.GetValueOrDefault(fromRole);
        if (buyer == null)
            return null;

        var toRole = GetSupplier(fromRole);
        if (toRole == null)
            return null;

        var order = new Order
        {
            Id = _nextOrderId++,
            FromRole = fromRole,
            ToRole = toRole.Value,
            Quantity = quantity,
            Status = OrderStatus.pending,
            CreatedAtDay = _currentDay,
            EstimatedArrivalDay = 0,
            DeliveredAtDay = null
        };

        _orders.Add(order);

        buyer.PendingOrders++;

        _events.Add(new GameEvent
        {
            Id = _nextEventId++,
            Role = fromRole,
            Type = GameEventType.info,
            Message = $"Orden de {quantity} unidades emitida a {GetRoleLabel(toRole.Value)}.",
            Day = _currentDay,
            Acknowledged = false
        });

        _events.Add(new GameEvent
        {
            Id = _nextEventId++,
            Role = toRole.Value,
            Type = GameEventType.order_received,
            Message = $"Pedido de {quantity} unidades recibido desde {GetRoleLabel(fromRole)}.",
            Day = _currentDay,
            Acknowledged = false,
            Data = new Dictionary<string, object> { ["orderId"] = order.Id }
        });

        return order;
    }

    public TurnInfo AdvanceTurn()
    {
        if (_turnPhase == TurnPhase.arrivals)
        {
            _turnPhase = TurnPhase.events;
        }
        else if (_turnPhase == TurnPhase.events)
        {
            _turnPhase = TurnPhase.order;
        }
        else if (_turnPhase == TurnPhase.order)
        {
            _turnPhase = TurnPhase.done;
        }
        else if (_turnPhase == TurnPhase.done)
        {
            var currentIdx = TurnOrder.IndexOf(_currentTurnRole);
            var nextIdx = (currentIdx + 1) % TurnOrder.Count;
            _currentTurnRole = TurnOrder[nextIdx];
            _turnPhase = TurnPhase.arrivals;

            if (nextIdx == 0)
            {
                _currentDay++;
                TakeSnapshot();
                GenerateDemandEvent(PlayerRole.retailer);
            }
        }

        return GetCurrentTurn();
    }

    public ArrivalResult ProcessArrivals(PlayerRole role)
    {
        var player = _players.GetValueOrDefault(role);
        if (player == null)
            return new ArrivalResult();

        var arrivingOrders = _orders
            .Where(o => o.FromRole == role && o.Status == OrderStatus.in_transit && o.EstimatedArrivalDay <= _currentDay)
            .ToList();

        var totalArrived = arrivingOrders.Sum(o => o.Quantity);
        var holdingCost = player.Stock * HoldingCostPerUnit;

        player.Stock += totalArrived;
        player.Money -= holdingCost;
        player.TotalHoldingCost += holdingCost;

        var events = new List<GameEvent>();

        if (holdingCost > 0)
        {
            events.Add(new GameEvent
            {
                Id = _nextEventId++,
                Role = role,
                Type = GameEventType.cost,
                Message = $"Costo de almacenamiento: ${holdingCost:F1} por {player.Stock - totalArrived} unidades en inventario.",
                Day = _currentDay,
                Acknowledged = false
            });
        }

        if (totalArrived > 0)
        {
            events.Add(new GameEvent
            {
                Id = _nextEventId++,
                Role = role,
                Type = GameEventType.arrival,
                Message = $"Llegaron {totalArrived} unidades. Stock actual: {player.Stock}.",
                Day = _currentDay,
                Acknowledged = false
            });
        }

        foreach (var order in arrivingOrders)
        {
            order.Status = OrderStatus.delivered;
            order.DeliveredAtDay = _currentDay;
            player.PendingOrders = Math.Max(0, player.PendingOrders - 1);
        }

        if (player.Backlog > 0 && totalArrived > 0)
        {
            var fulfillBacklog = Math.Min(player.Backlog, totalArrived);
            player.Backlog -= fulfillBacklog;
        }

        if (player.Backlog > 0)
        {
            var stockoutCost = player.Backlog * StockoutCostPerUnit;
            player.Money -= stockoutCost;
            player.TotalStockoutCost += stockoutCost;

            events.Add(new GameEvent
            {
                Id = _nextEventId++,
                Role = role,
                Type = GameEventType.stockout,
                Message = $"Costo por faltante: ${stockoutCost:F1} por {player.Backlog} pedidos insatisfechos.",
                Day = _currentDay,
                Acknowledged = false
            });
        }

        _events.AddRange(events);

        return new ArrivalResult
        {
            ArrivedQuantity = totalArrived,
            NewStock = player.Stock,
            HoldingCostCharged = holdingCost,
            Events = events
        };
    }

    public List<GameEvent> GetEvents(PlayerRole? role = null, bool? acknowledged = null)
    {
        var query = _events.AsEnumerable();

        if (role.HasValue)
            query = query.Where(e => e.Role == role.Value);

        if (acknowledged.HasValue)
            query = query.Where(e => e.Acknowledged == acknowledged.Value);

        return query.ToList();
    }

    public GameEvent? AcknowledgeEvent(int eventId)
    {
        var evt = _events.FirstOrDefault(e => e.Id == eventId);
        if (evt == null)
            return null;

        evt.Acknowledged = true;
        return evt;
    }

    public AnalyticsSummary GetAnalyticsSummary()
    {
        return new AnalyticsSummary
        {
            TotalDays = _currentDay - 1,
            Retailer = ToPlayerSummary(_players[PlayerRole.retailer]),
            Wholesaler = ToPlayerSummary(_players[PlayerRole.wholesaler]),
            Factory = ToPlayerSummary(_players[PlayerRole.factory])
        };
    }

    public List<TurnSnapshot> GetHistory()
    {
        return [.. _history];
    }

    public List<TransitItem> GetTransitQueue()
    {
        return _orders
            .Where(o => o.Status == OrderStatus.in_transit)
            .Select(o => new TransitItem
            {
                OrderId = o.Id,
                FromRole = o.FromRole,
                ToRole = o.ToRole,
                Quantity = o.Quantity,
                CreatedAtDay = o.CreatedAtDay,
                EstimatedArrivalDay = o.EstimatedArrivalDay,
                TurnsRemaining = Math.Max(0, o.EstimatedArrivalDay - _currentDay)
            })
            .ToList();
    }

    private void TakeSnapshot()
    {
        _history.Add(new TurnSnapshot
        {
            Day = _currentDay,
            RetailerStock = _players[PlayerRole.retailer].Stock,
            WholesalerStock = _players[PlayerRole.wholesaler].Stock,
            FactoryStock = _players[PlayerRole.factory].Stock,
            RetailerMoney = _players[PlayerRole.retailer].Money,
            WholesalerMoney = _players[PlayerRole.wholesaler].Money,
            FactoryMoney = _players[PlayerRole.factory].Money,
            RetailerBacklog = _players[PlayerRole.retailer].Backlog,
            WholesalerBacklog = _players[PlayerRole.wholesaler].Backlog,
            FactoryBacklog = _players[PlayerRole.factory].Backlog,
            Demand = BaseDemand
        });
    }

    private void GenerateDemandEvent(PlayerRole role)
    {
        var demand = BaseDemand + _rng.Next(-1, 2);

        var retailer = _players[PlayerRole.retailer];
        var fulfilled = Math.Min(demand, retailer.Stock);
        retailer.Stock -= fulfilled;

        var unmet = demand - fulfilled;
        if (unmet > 0)
            retailer.Backlog += unmet;

        _events.Add(new GameEvent
        {
            Id = _nextEventId++,
            Role = PlayerRole.retailer,
            Type = GameEventType.demand,
            Message = $"Demanda del mercado: {demand} unidades. Satisfechas: {fulfilled}, Pendientes: {unmet}.",
            Day = _currentDay,
            Acknowledged = false,
            Data = new Dictionary<string, object> { ["demand"] = demand, ["fulfilled"] = fulfilled }
        });
    }

    private static PlayerRole? GetSupplier(PlayerRole role)
    {
        return role switch
        {
            PlayerRole.retailer => PlayerRole.wholesaler,
            PlayerRole.wholesaler => PlayerRole.factory,
            PlayerRole.factory => null,
            _ => null
        };
    }

    private static string GetRoleLabel(PlayerRole role)
    {
        return role switch
        {
            PlayerRole.retailer => "Minorista",
            PlayerRole.wholesaler => "Mayorista",
            PlayerRole.factory => "Fábrica",
            _ => role.ToString()
        };
    }

    private static PlayerSummary ToPlayerSummary(PlayerState p)
    {
        return new PlayerSummary
        {
            Stock = p.Stock,
            Money = p.Money,
            Backlog = p.Backlog,
            TotalHoldingCost = p.TotalHoldingCost,
            TotalStockoutCost = p.TotalStockoutCost
        };
    }
}
