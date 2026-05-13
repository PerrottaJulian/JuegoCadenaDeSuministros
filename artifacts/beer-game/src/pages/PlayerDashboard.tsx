import { useRoute } from "wouter";
import { 
  useGetPlayerState, 
  useGetGameState, 
  useListEvents, 
  useAcknowledgeEvent, 
  useGetTransitQueue,
  useProcessArrivals,
  useAdvanceTurn,
  usePlaceOrder,
  getGetPlayerStateQueryKey,
  getGetGameStateQueryKey,
  getListEventsQueryKey,
  getGetTransitQueueQueryKey,
  PlayerRole,
  GameStateTurnPhase
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, Package, DollarSign, AlertCircle, Clock, CheckCircle2, TrendingDown, TrendingUp, Info } from "lucide-react";
import { format } from "date-fns";

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

  const isMyTurn = gameState?.currentTurnRole === role;
  const isLocked = !isMyTurn;

  const roleColorTheme = 
    role === "retailer" ? "chart-1" : 
    role === "wholesaler" ? "chart-2" : 
    "chart-3";

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
      }
    });
  };

  const pendingEvents = events?.filter(e => !e.acknowledged) || [];
  const historyEvents = events?.filter(e => e.acknowledged).slice(0, 10) || [];
  const myTransitQueue = transitQueue?.filter(t => t.toRole === role) || [];
  const myOutboundOrders = transitQueue?.filter(t => t.fromRole === role) || [];

  if (!playerState || !gameState) return <div className="p-8 font-mono animate-pulse">Initializing terminal...</div>;

  return (
    <div className="relative min-h-[calc(100vh-6rem)] flex flex-col gap-6 dark font-mono animate-in fade-in duration-500">
      
      {isLocked && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <div className={`flex flex-col items-center p-8 bg-card border border-${roleColorTheme} rounded-lg shadow-2xl max-w-md text-center`}>
            <Lock className={`h-16 w-16 text-${roleColorTheme} mb-4`} />
            <h2 className={`text-2xl font-bold text-${roleColorTheme} uppercase tracking-widest mb-2`}>
              Terminal Locked
            </h2>
            <p className="text-muted-foreground">
              Waiting for {gameState.currentTurnRole.toUpperCase()}'s turn to complete.
            </p>
            <div className="mt-6 flex gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-75" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-300" />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`border-b-4 border-${roleColorTheme} pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4`}>
        <div>
          <h1 className={`text-4xl font-bold text-${roleColorTheme} uppercase tracking-tighter`}>
            {role} <span className="text-muted-foreground font-light text-2xl">TERMINAL</span>
          </h1>
          <div className="flex gap-4 mt-2">
            <Badge variant="outline" className={`border-${roleColorTheme}/50 text-${roleColorTheme}`}>
              DAY {gameState.currentDay}
            </Badge>
            <Badge variant="outline" className="border-muted text-muted-foreground">
              PHASE: {gameState.turnPhase.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3">
          <Button
            variant={gameState.turnPhase === "arrivals" ? "default" : "secondary"}
            className={cn("font-bold uppercase tracking-wider", gameState.turnPhase === "arrivals" && `bg-${roleColorTheme} text-${roleColorTheme}-foreground hover:bg-${roleColorTheme}/90`)}
            disabled={!isMyTurn || gameState.turnPhase !== "arrivals"}
            onClick={handleProcessArrivals}
            data-testid="button-process-arrivals"
          >
            <Truck className="mr-2 h-4 w-4" />
            Process Arrivals
          </Button>
          
          <Button
            variant={gameState.turnPhase === "done" ? "default" : "secondary"}
            className={cn("font-bold uppercase tracking-wider", gameState.turnPhase === "done" && `bg-${roleColorTheme} text-${roleColorTheme}-foreground hover:bg-${roleColorTheme}/90`)}
            disabled={!isMyTurn || gameState.turnPhase !== "done"}
            onClick={handleAdvanceTurn}
            data-testid="button-advance-turn"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            End Turn
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Stats & Order Form */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Main KPI Card */}
          <Card className="border-border/50 shadow-md">
            <CardHeader className="bg-card/50 pb-4 border-b border-border/50">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ActivityIcon /> Operating Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-px bg-border/50 p-px">
              <div className="bg-card p-4 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Stock Level</span>
                <span className="text-3xl font-bold mt-1 text-foreground">{playerState.stock}</span>
              </div>
              <div className="bg-card p-4 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Capital</span>
                <span className="text-3xl font-bold mt-1 text-emerald-500">${playerState.money}</span>
              </div>
              <div className="bg-card p-4 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Backlog</span>
                <span className="text-3xl font-bold mt-1 text-destructive">{playerState.backlog}</span>
              </div>
              <div className="bg-card p-4 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Total Costs</span>
                <span className="text-3xl font-bold mt-1 text-orange-500">${playerState.totalHoldingCost + playerState.totalStockoutCost}</span>
              </div>
            </CardContent>
          </Card>

          {/* Place Order Form */}
          <Card className={cn("border-2 transition-all", 
            gameState.turnPhase === "order" && isMyTurn ? `border-${roleColorTheme} shadow-[0_0_15px_rgba(var(--${roleColorTheme}),0.2)]` : "border-border/50"
          )}>
            <CardHeader className={cn("pb-4", gameState.turnPhase === "order" && isMyTurn ? `bg-${roleColorTheme}/10` : "bg-card/50")}>
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4" /> Supply Order
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handlePlaceOrder} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderQuantity" className="text-xs uppercase tracking-wider text-muted-foreground">Order Quantity</Label>
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
                      className={cn("w-32 uppercase tracking-wider", isMyTurn && gameState.turnPhase === "order" && `bg-${roleColorTheme} text-${roleColorTheme}-foreground hover:bg-${roleColorTheme}/90`)}
                      data-testid="button-place-order"
                    >
                      Issue PO
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Event Log */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 border-border/50 flex flex-col h-[500px]">
            <CardHeader className="bg-card/50 pb-4 border-b border-border/50 shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Operations Log
                </CardTitle>
                {pendingEvents.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">{pendingEvents.length} Pending</Badge>
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
                        <span className="text-xs text-muted-foreground">Day {event.day}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleAcknowledge(event.id)}
                        disabled={!isMyTurn}
                        className="h-7 text-xs uppercase"
                        data-testid={`button-ack-event-${event.id}`}
                      >
                        Acknowledge
                      </Button>
                    </div>
                    <p className="text-sm text-foreground">{event.message}</p>
                  </div>
                ))}

                {historyEvents.map(event => (
                  <div key={event.id} className="p-4 bg-card opacity-60 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <EventBadge type={event.type} />
                      <span className="text-xs text-muted-foreground">Day {event.day}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.message}</p>
                  </div>
                ))}

                {pendingEvents.length === 0 && historyEvents.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                    <Info className="h-8 w-8 opacity-20" />
                    No recent events
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Logistics & Transit */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 border-border/50 h-[500px] flex flex-col">
            <CardHeader className="bg-card/50 pb-4 border-b border-border/50 shrink-0">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" /> Transit Manifest
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1 space-y-6">
              
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 border-b border-border/50 pb-1">Incoming Shipments</h3>
                {myTransitQueue.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 italic">No incoming shipments</p>
                ) : (
                  <div className="space-y-3">
                    {myTransitQueue.map((item, i) => (
                      <div key={i} className="bg-secondary/30 rounded p-3 text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-foreground">QTY: {item.quantity}</span>
                          <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                            {item.turnsRemaining} turns
                          </Badge>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full transition-all" 
                            style={{ width: `${Math.max(10, 100 - (item.turnsRemaining * 25))}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground uppercase">
                          <span>From: {item.fromRole}</span>
                          <span>Est. Day: {item.estimatedArrivalDay}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 border-b border-border/50 pb-1">Outbound / Placed Orders</h3>
                {myOutboundOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 italic">No active outbound orders</p>
                ) : (
                  <div className="space-y-2">
                    {myOutboundOrders.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-2 text-sm bg-card border border-border/50 rounded">
                        <div className="flex items-center gap-2">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          <span>QTY: {item.quantity}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">To: {item.toRole}</span>
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
      case 'demand': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'arrival': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'cost': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'stockout': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase font-mono px-1.5 py-0", getStyle())}>
      {type}
    </Badge>
  );
}

function ActivityIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
  )
}
