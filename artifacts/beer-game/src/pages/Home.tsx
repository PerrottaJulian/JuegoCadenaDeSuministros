import { useGetGameState, useResetGame, getGetGameStateQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Truck, Factory, RotateCcw, AlertTriangle, CheckCircle2, TrendingUp, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  retailer: "Minorista",
  wholesaler: "Mayorista",
  factory: "Fábrica",
};

export default function Home() {
  const queryClient = useQueryClient();
  const { data: gameState, isLoading } = useGetGameState({
    query: { refetchInterval: 2000, queryKey: getGetGameStateQueryKey() }
  });
  
  const resetGame = useResetGame();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-primary">
          <RotateCcw className="h-8 w-8" />
        </div>
      </div>
    );
  }

  if (!gameState) {
    return <div>Error al cargar el estado del juego</div>;
  }

  const handleReset = () => {
    resetGame.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGameStateQueryKey() });
      }
    });
  };

  const getRoleColor = (role: string) => {
    if (role === 'retailer') return 'text-chart-1 border-chart-1/50 bg-chart-1/10';
    if (role === 'wholesaler') return 'text-chart-2 border-chart-2/50 bg-chart-2/10';
    if (role === 'factory') return 'text-chart-3 border-chart-3/50 bg-chart-3/10';
    return 'text-muted-foreground';
  };

  const getRoleIcon = (role: string) => {
    if (role === 'retailer') return <Package className="h-6 w-6" />;
    if (role === 'wholesaler') return <Truck className="h-6 w-6" />;
    if (role === 'factory') return <Factory className="h-6 w-6" />;
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 dark">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-mono font-bold tracking-tight text-foreground uppercase">
            Centro de Operaciones
          </h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm">
            Monitorea y coordina la red global de cadena de suministro
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={handleReset} 
            disabled={resetGame.isPending}
            className="font-mono"
            data-testid="button-reset-game"
          >
            <RotateCcw className={cn("mr-2 h-4 w-4", resetGame.isPending && "animate-spin")} />
            REINICIAR PARTIDA
          </Button>
        </div>
      </div>

      {gameState.isGameOver && (
        <div className="bg-primary/20 border border-primary p-6 rounded-lg text-center font-mono">
          <h2 className="text-2xl font-bold text-primary mb-2">SIMULACIÓN COMPLETADA</h2>
          <p className="text-muted-foreground">
            Ganador: <span className={getRoleColor(gameState.winnerRole || '')}>{ROLE_LABELS[gameState.winnerRole ?? ''] ?? gameState.winnerRole?.toUpperCase()}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {gameState.players.map((player) => (
          <Card key={player.role} className={cn("border-2 relative overflow-hidden", 
            gameState.currentTurnRole === player.role ? "border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "border-border/50"
          )}>
            {gameState.currentTurnRole === player.role && (
              <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
            )}
            <CardHeader className="bg-card/50 pb-4">
              <div className="flex justify-between items-center">
                <div className={cn("p-2 rounded-md", getRoleColor(player.role))}>
                  {getRoleIcon(player.role)}
                </div>
                {gameState.currentTurnRole === player.role && (
                  <Badge className="bg-primary hover:bg-primary text-primary-foreground font-mono">
                    TURNO ACTIVO
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl font-mono uppercase mt-4">{ROLE_LABELS[player.role] ?? player.role}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-mono uppercase">Nivel de Stock</p>
                  <p className="text-2xl font-mono font-medium flex items-center gap-2">
                    {player.stock} 
                    {player.stock < 5 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-mono uppercase">Capital</p>
                  <p className="text-2xl font-mono font-medium text-emerald-500">
                    ${player.money}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-mono uppercase">Pedidos Pendientes</p>
                  <p className="text-2xl font-mono font-medium text-destructive">
                    {player.backlog}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-mono uppercase">Costos Totales</p>
                  <p className="text-2xl font-mono font-medium text-muted-foreground">
                    ${player.totalHoldingCost + player.totalStockoutCost}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <Link href={`/${player.role}`} className="w-full">
                  <Button className="w-full font-mono uppercase group" variant={gameState.currentTurnRole === player.role ? "default" : "secondary"}>
                    Acceder a Terminal
                    <TrendingUp className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 bg-card border border-border p-6 rounded-lg">
        <h3 className="text-lg font-mono font-bold mb-6 text-foreground uppercase tracking-wider">Flujo de Cadena de Suministro</h3>
        <div className="flex items-center justify-between px-8 relative">
          <div className="absolute top-1/2 left-16 right-16 h-0.5 bg-border -translate-y-1/2 z-0" />
          
          <div className="relative z-10 flex flex-col items-center bg-card px-4">
            <div className="h-12 w-12 rounded-full border-2 border-chart-1 text-chart-1 flex items-center justify-center bg-background">
              <Package className="h-6 w-6" />
            </div>
            <span className="mt-2 font-mono text-sm font-bold text-chart-1">MINORISTA</span>
            <span className="text-xs text-muted-foreground font-mono mt-1">Demanda del Consumidor</span>
          </div>

          <div className="relative z-10 flex flex-col items-center bg-card px-4">
            <div className="h-12 w-12 rounded-full border-2 border-chart-2 text-chart-2 flex items-center justify-center bg-background">
              <Truck className="h-6 w-6" />
            </div>
            <span className="mt-2 font-mono text-sm font-bold text-chart-2">MAYORISTA</span>
            <span className="text-xs text-muted-foreground font-mono mt-1">Distribución</span>
          </div>

          <div className="relative z-10 flex flex-col items-center bg-card px-4">
            <div className="h-12 w-12 rounded-full border-2 border-chart-3 text-chart-3 flex items-center justify-center bg-background">
              <Factory className="h-6 w-6" />
            </div>
            <span className="mt-2 font-mono text-sm font-bold text-chart-3">FÁBRICA</span>
            <span className="text-xs text-muted-foreground font-mono mt-1">Producción</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>{children}</span>
}
