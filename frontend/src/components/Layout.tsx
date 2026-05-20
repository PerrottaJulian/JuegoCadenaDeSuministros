import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, BarChart3, Settings, Package, Truck, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetGameState, getGetGameStateQueryKey } from "@/api-client";

const ROLE_LABELS: Record<string, string> = {
  retailer: "Minorista",
  wholesaler: "Mayorista",
  factory: "Fábrica",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: gameState } = useGetGameState({
    query: { refetchInterval: 2000, queryKey: getGetGameStateQueryKey() }
  });

  const navItems = [
    { href: "/", label: "Centro Ops.", icon: LayoutDashboard },
    { href: "/retailer", label: "Minorista", icon: Package, role: "retailer" },
    { href: "/wholesaler", label: "Mayorista", icon: Truck, role: "wholesaler" },
    { href: "/factory", label: "Fábrica", icon: Factory, role: "factory" },
    { href: "/analytics", label: "Analíticas", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-mono font-bold tracking-tight text-lg hidden md:inline-block">
                LOGNET // TERMINAL
              </span>
            </div>
            
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                const isTurn = gameState?.currentTurnRole === item.role;
                
                return (
                  <Link key={item.href} href={item.href} className="flex items-center">
                    <span 
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors rounded-md",
                        isActive 
                          ? "bg-secondary text-secondary-foreground" 
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                        isTurn && !isActive && "text-primary hover:text-primary animate-pulse"
                      )}
                      data-testid={`nav-link-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="hidden sm:inline-block">{item.label}</span>
                      {isTurn && (
                        <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {gameState && (
            <div className="flex items-center gap-4 text-sm font-mono">
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">Día Actual</span>
                <span className="font-bold text-primary">DÍA {gameState.currentDay}</span>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">Turno Activo</span>
                <span className={cn(
                  "font-bold uppercase",
                  gameState.currentTurnRole === "retailer" ? "text-chart-1" :
                  gameState.currentTurnRole === "wholesaler" ? "text-chart-2" :
                  "text-chart-3"
                )}>
                  {ROLE_LABELS[gameState.currentTurnRole] ?? gameState.currentTurnRole}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
