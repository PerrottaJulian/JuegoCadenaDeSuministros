import { 
  useGetPlayerState, 
  useGetGameState, 
  useListEvents, 
  useAcknowledgeEvent, 
  useGetTransitQueue,
  useProcessArrivals,
  useAdvanceTurn,
  usePlaceOrder,
  useListOrders,
  useFulfillOrder,
  getGetPlayerStateQueryKey,
  getGetGameStateQueryKey,
  getListEventsQueryKey,
  getGetTransitQueueQueryKey,
  getListOrdersQueryKey,
  PlayerRole,
  OrderStatus
} from "@/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, Package, AlertCircle, CheckCircle2, Info, Truck } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  retailer: "Minorista",
  wholesaler: "Mayorista",
  factory: "Fábrica",
};

const PHASE_LABELS: Record<string, string> = {
  arrivals: "Llegadas",
  events: "Eventos",
  order: "Pedido",
  done: "Listo",
};

const NEXT_PHASE_LABELS: Record<string, string> = {
  arrivals: "Eventos",
  events: "Pedido",
  order: "Finalizar",
  done: "Turno",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  demand: "Demanda",
  arrival: "Llegada",
  cost: "Costo",
  stockout: "Faltante",
  info: "Info",
  order_received: "Pedido recibido",
};

export default function PlayerDashboard({ role }: { role: PlayerRole }) {
  const queryClient = useQueryClient();
  const [orderQuantity, setOrderQuantity] = useState("0");

  const { data: gameState } = useGetGameState({
    query: { refetchInterval: 2000, queryKey: getGetGameStateQueryKey() }
  });

  const { data: playerState } = useGetPlayerState(role, {
    query: { enabled: !!role, queryKey: getGetPlayerStateQueryKey(role), refetchInterval: 2000 }
  });

  const { data: events } = useListEvents({ role }, {
    query: { enabled: !!role, queryKey: getListEventsQueryKey({ role }), refetchInterval: 2000 }
  });

  const { data: transitQueue } = useGetTransitQueue({
    query: { queryKey: getGetTransitQueueQueryKey(), refetchInterval: 2000 }
  });

  const acknowledgeEvent = useAcknowledgeEvent();
  const processArrivals = useProcessArrivals();
  const advanceTurn = useAdvanceTurn();
  const placeOrder = usePlaceOrder();
  const fulfillOrder = useFulfillOrder();

  const { data: pendingOrders } = useListOrders(
    { role, status: "pending" as OrderStatus },
    { query: { enabled: !!role, queryKey: getListOrdersQueryKey({ role, status: "pending" as any }), refetchInterval: 2000 } }
  );

  const ordersToFulfill = pendingOrders?.filter(o => o.toRole === role && o.status === "pending") || [];

  const isMyTurn = gameState?.currentTurnRole === role;
  const isLocked = !isMyTurn;

  const handleAcknowledge = (id: number) => {
    acknowledgeEvent.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey({ role }) });
      }
    });
  };

  const handleProcessArrivals = () => {
    processArrivals.mutate({ params: { role } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlayerStateQueryKey(role) });
        queryClient.invalidateQueries({ queryKey: getGetGameStateQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey({ role }) });
      }
    });
  };

  const handleAdvanceTurn = () => {
    advanceTurn.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGameStateQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlayerStateQueryKey(role) });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey({ role }) });
        queryClient.invalidateQueries({ queryKey: getGetTransitQueueQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ role, status: "pending" as any }) });
      }
    });
  };

  const handleFulfillOrder = (orderId: number) => {
    fulfillOrder.mutate({ id: orderId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlayerStateQueryKey(role) });
        queryClient.invalidateQueries({ queryKey: getGetGameStateQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTransitQueueQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ role, status: "pending" as any }) });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey({ role }) });
      }
    });
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    placeOrder.mutate({ data: { fromRole: role, quantity: parseInt(orderQuantity) || 0 } }, {
      onSuccess: () => {
        setOrderQuantity("0");
        queryClient.invalidateQueries({ queryKey: getGetPlayerStateQueryKey(role) });
        queryClient.invalidateQueries({ queryKey: getGetGameStateQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey({ role }) });
        queryClient.invalidateQueries({ queryKey: getGetTransitQueueQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ role, status: "pending" as any }) });
      }
    });
  };

  const pendingEvents = events?.filter(e => !e.acknowledged) || [];
  const historyEvents = events?.filter(e => e.acknowledged).slice(-10) || [];
  const myTransitQueue = transitQueue?.filter(t => t.toRole === role) || [];
  const myOutboundOrders = transitQueue?.filter(t => t.fromRole === role) || [];

  if (!playerState || !gameState) return <div className="p-8 font-mono animate-pulse">Iniciando terminal...</div>;

  return (
    <div className="relative min-h-[calc(100vh-6rem)] flex flex-col gap-6 dark font-mono animate-in fade-in duration-500">
      
      {isLocked && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <div className={cn("flex flex-col items-center p-8 bg-card rounded-lg shadow-2xl max-w-md text-center",
              role === "retailer" && "border-chart-1",
              role === "wholesaler" && "border-chart-2",
              role === "factory" && "border-chart-3"
            )}>
            <Lock className={cn("h-16 w-16 mb-4",
              role === "retailer" && "text-chart-1",
              role === "wholesaler" && "text-chart-2",
              role === "factory" && "text-chart-3"
            )} />
            <h2 className={cn("text-2xl font-bold uppercase tracking-widest mb-2",
              role === "retailer" && "text-chart-1",
              role === "wholesaler" && "text-chart-2",
              role === "factory" && "text-chart-3"
            )}>
              Terminal Bloqueada
            </h2>
            <p className="text-muted-foreground">
              Esperando que {ROLE_LABELS[gameState.currentTurnRole] ?? gameState.currentTurnRole} complete su turno.
            </p>
            <div className="mt-6 flex gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-75" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-300" />
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className={cn("border-b-4 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4",
          role === "retailer" && "border-chart-1",
          role === "wholesaler" && "border-chart-2",
          role === "factory" && "border-chart-3"
        )}>
        <div>
          <h1 className={cn("text-4xl font-bold uppercase tracking-tighter",
              role === "retailer" && "text-chart-1",
              role === "wholesaler" && "text-chart-2",
              role === "factory" && "text-chart-3"
            )}>
            {ROLE_LABELS[role] ?? role} <span className="text-muted-foreground font-light text-2xl">TERMINAL</span>
          </h1>
          <div className="flex gap-4 mt-2">
            <Badge variant="outline" className={cn(
              role === "retailer" && "border-chart-1/50 text-chart-1",
              role === "wholesaler" && "border-chart-2/50 text-chart-2",
              role === "factory" && "border-chart-3/50 text-chart-3"
            )}>
              DÍA {gameState.currentDay}
            </Badge>
            <Badge variant="outline" className="border-muted text-muted-foreground">
              FASE: {PHASE_LABELS[gameState.turnPhase] ?? gameState.turnPhase.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Controles de acción */}
        <div className="flex gap-3">
          <Button
            variant={gameState.turnPhase === "arrivals" ? "default" : "secondary"}
            className={cn("font-bold uppercase tracking-wider",
              gameState.turnPhase === "arrivals" && role === "retailer" && "bg-chart-1 text-white hover:bg-chart-1/90",
              gameState.turnPhase === "arrivals" && role === "wholesaler" && "bg-chart-2 text-white hover:bg-chart-2/90",
              gameState.turnPhase === "arrivals" && role === "factory" && "bg-chart-3 text-white hover:bg-chart-3/90"
            )}
            disabled={!isMyTurn || gameState.turnPhase !== "arrivals"}
            onClick={handleProcessArrivals}
            data-testid="button-process-arrivals"
          >
            <Truck className="mr-2 h-4 w-4" />
            Procesar Llegadas
          </Button>
          
          <Button
            variant="default"
            className={cn("font-bold uppercase tracking-wider",
              role === "retailer" && "bg-chart-1 text-white hover:bg-chart-1/90",
              role === "wholesaler" && "bg-chart-2 text-white hover:bg-chart-2/90",
              role === "factory" && "bg-chart-3 text-white hover:bg-chart-3/90"
            )}
            disabled={!isMyTurn}
            onClick={handleAdvanceTurn}
            data-testid="button-advance-turn"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {gameState.turnPhase === "done" ? "Finalizar Turno" : `Siguiente → ${NEXT_PHASE_LABELS[gameState.turnPhase]}`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna izquierda: Estadísticas y formulario de pedido */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Tarjeta KPI principal */}
          <Card className="border-border/50 shadow-md">
            <CardHeader className="bg-card/50 pb-4 border-b border-border/50">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ActivityIcon /> Métricas Operativas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-px bg-border/50 p-px">
              <div className="bg-card p-4 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Nivel de Stock</span>
                <span className="text-3xl font-bold mt-1 text-foreground">{playerState.stock}</span>
              </div>
              <div className="bg-card p-4 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Capital</span>
                <span className="text-3xl font-bold mt-1 text-chart-4">${playerState.money}</span>
              </div>
              <div className="bg-card p-4 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Pedidos Pendientes</span>
                <span className="text-3xl font-bold mt-1 text-destructive">{playerState.backlog}</span>
              </div>
              <div className="bg-card p-4 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Costos Totales</span>
                <span className="text-3xl font-bold mt-1 text-chart-2">${playerState.totalHoldingCost + playerState.totalStockoutCost}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pedidos por despachar (fulfill) */}
          <Card className="border-border/50 shadow-md">
            <CardHeader className="bg-card/50 pb-4 border-b border-border/50">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" /> Pedidos por Despachar
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {ordersToFulfill.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">Sin pedidos pendientes</p>
              ) : (
                <div className="space-y-3">
                  {ordersToFulfill.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                      <div>
                        <span className="text-sm font-bold">{order.quantity} uds.</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          de {ROLE_LABELS[order.fromRole] ?? order.fromRole}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        className={cn("uppercase text-xs text-white",
                          role === "retailer" && "bg-chart-1 hover:bg-chart-1/90",
                          role === "wholesaler" && "bg-chart-2 hover:bg-chart-2/90",
                          role === "factory" && "bg-chart-3 hover:bg-chart-3/90"
                        )}
                        disabled={!isMyTurn || fulfillOrder.isPending}
                        onClick={() => handleFulfillOrder(order.id)}
                      >
                        Despachar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulario de pedido (oculto para fábrica) */}
          {role !== "factory" && <Card className={cn("border-2 transition-all",
            gameState.turnPhase === "order" && isMyTurn && role === "retailer" && "border-chart-1 shadow-[0_0_15px_hsla(221,83%,53%,0.2)]",
            gameState.turnPhase === "order" && isMyTurn && role === "wholesaler" && "border-chart-2 shadow-[0_0_15px_hsla(24,93%,50%,0.2)]",
            !(gameState.turnPhase === "order" && isMyTurn) && "border-border/50"
          )}>
            <CardHeader className={cn("pb-4",
              gameState.turnPhase === "order" && isMyTurn && role === "retailer" && "bg-chart-1/10",
              gameState.turnPhase === "order" && isMyTurn && role === "wholesaler" && "bg-chart-2/10",
              !(gameState.turnPhase === "order" && isMyTurn) && "bg-card/50"
            )}>
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4" /> Orden de Suministro
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handlePlaceOrder} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderQuantity" className="text-xs uppercase tracking-wider text-muted-foreground">Cantidad del Pedido</Label>
                  <div className="flex gap-2">
                    <Input
                      id="orderQuantity"
                      type="number"
                      min="0"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(e.target.value)}
                      disabled={!isMyTurn || gameState.turnPhase !== "order"}
                      className="font-mono text-lg bg-background border-border focus-visible:ring-1 focus-visible:ring-offset-0"
                      data-testid="input-order-quantity"
                    />
                    <Button 
                      type="submit" 
                      disabled={!isMyTurn || gameState.turnPhase !== "order" || placeOrder.isPending}
                      className={cn("w-32 uppercase tracking-wider text-white",
                        isMyTurn && gameState.turnPhase === "order" && role === "retailer" && "bg-chart-1 hover:bg-chart-1/90",
                        isMyTurn && gameState.turnPhase === "order" && role === "wholesaler" && "bg-chart-2 hover:bg-chart-2/90"
                      )}
                      data-testid="button-place-order"
                    >
                      Emitir OC
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>}
        </div>

        {/* Columna central: Registro de eventos */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 border-border/50 flex flex-col h-[500px]">
            <CardHeader className="bg-card/50 pb-4 border-b border-border/50 shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Registro Operativo
                </CardTitle>
                {pendingEvents.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">{pendingEvents.length} Pendiente{pendingEvents.length !== 1 ? "s" : ""}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              <div className="divide-y divide-border/50">
                {pendingEvents.map(event => (
                  <div key={event.id} className="p-4 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <EventBadge type={event.type} />
                        <span className="text-xs text-muted-foreground">Día {event.day}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleAcknowledge(event.id)}
                        disabled={!isMyTurn}
                        className="h-7 text-xs uppercase"
                        data-testid={`button-ack-event-${event.id}`}
                      >
                        Confirmar
                      </Button>
                    </div>
                    <p className="text-sm text-foreground">{event.message}</p>
                  </div>
                ))}

                {historyEvents.map(event => (
                  <div key={event.id} className="p-4 bg-card opacity-60 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <EventBadge type={event.type} />
                      <span className="text-xs text-muted-foreground">Día {event.day}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.message}</p>
                  </div>
                ))}

                {pendingEvents.length === 0 && historyEvents.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                    <Info className="h-8 w-8 opacity-20" />
                    Sin eventos recientes
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: Logística y tránsito */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 border-border/50 h-[500px] flex flex-col">
            <CardHeader className="bg-card/50 pb-4 border-b border-border/50 shrink-0">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" /> Manifiesto de Tránsito
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1 space-y-6">
              
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 border-b border-border/50 pb-1">Envíos Entrantes</h3>
                {myTransitQueue.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 italic">Sin envíos entrantes</p>
                ) : (
                  <div className="space-y-3">
                    {myTransitQueue.map((item, i) => (
                      <div key={i} className="bg-secondary/30 rounded p-3 text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-foreground">CANT: {item.quantity}</span>
                          <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                            {item.turnsRemaining} turno{item.turnsRemaining !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full transition-all" 
                            style={{ width: `${Math.max(10, 100 - (item.turnsRemaining * 25))}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground uppercase">
                          <span>De: {ROLE_LABELS[item.fromRole] ?? item.fromRole}</span>
                          <span>Llegada estimada: Día {item.estimatedArrivalDay}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 border-b border-border/50 pb-1">Pedidos Realizados / Salientes</h3>
                {myOutboundOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 italic">Sin pedidos salientes activos</p>
                ) : (
                  <div className="space-y-2">
                    {myOutboundOrders.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-2 text-sm bg-card border border-border/50 rounded">
                        <div className="flex items-center gap-2">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          <span>CANT: {item.quantity}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Para: {ROLE_LABELS[item.toRole] ?? item.toRole}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const getStyle = () => {
    switch(type) {
      case 'demand': return 'bg-chart-1/20 text-chart-1 border-chart-1/50';
      case 'arrival': return 'bg-chart-4/20 text-chart-4 border-chart-4/50';
      case 'cost': return 'bg-chart-2/20 text-chart-2 border-chart-2/50';
      case 'stockout': return 'bg-destructive/20 text-destructive border-destructive/50';
      case 'info': return 'bg-muted text-muted-foreground border-muted';
      case 'order_received': return 'bg-primary/20 text-primary border-primary/50';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase font-mono px-1.5 py-0", getStyle())}>
      {EVENT_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

function ActivityIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
  )
}
