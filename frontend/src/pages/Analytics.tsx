import { useGetHistoryData, useGetAnalyticsSummary, useGetTransitQueue, getGetHistoryDataQueryKey, getGetAnalyticsSummaryQueryKey, getGetTransitQueueQueryKey } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Truck, Factory, TrendingUp, AlertTriangle } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  retailer: "Minorista",
  wholesaler: "Mayorista",
  factory: "Fábrica",
};

export default function Analytics() {
  const { data: historyData } = useGetHistoryData({
    query: { refetchInterval: 5000, queryKey: getGetHistoryDataQueryKey() }
  });

  const { data: summary } = useGetAnalyticsSummary({
    query: { refetchInterval: 5000, queryKey: getGetAnalyticsSummaryQueryKey() }
  });

  const { data: transitQueue } = useGetTransitQueue({
    query: { refetchInterval: 5000, queryKey: getGetTransitQueueQueryKey() }
  });

  if (!historyData || !summary || !transitQueue) {
    return <div className="p-8 text-center font-mono animate-pulse">Agregando datos de telemetría...</div>;
  }

  const roleColors = {
    retailer: "hsl(var(--chart-1))",
    wholesaler: "hsl(var(--chart-2))",
    factory: "hsl(var(--chart-3))",
    demand: "hsl(var(--muted-foreground))"
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 shadow-lg rounded-md font-mono text-xs">
          <p className="font-bold border-b border-border pb-1 mb-2">DÍA {label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 py-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground uppercase">{entry.name}:</span>
              <span className="font-bold text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 dark font-mono animate-in fade-in duration-500 pb-12">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground uppercase tracking-tight">Telemetría de Rendimiento</h1>
          <p className="text-sm text-muted-foreground mt-1">Métricas históricas y registros de tránsito de la cadena de suministro</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground uppercase">Duración de la Simulación</div>
          <div className="text-2xl font-bold text-primary">{summary.totalDays} DÍAS</div>
        </div>
      </div>

      {/* Tarjetas KPI globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { role: 'retailer', data: summary.retailer, icon: Package, color: 'text-chart-1' },
          { role: 'wholesaler', data: summary.wholesaler, icon: Truck, color: 'text-chart-2' },
          { role: 'factory', data: summary.factory, icon: Factory, color: 'text-chart-3' }
        ].map(({ role, data, icon: Icon, color }) => (
          <Card key={role} className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm uppercase tracking-wider flex items-center gap-2 ${color}`}>
                <Icon className="h-4 w-4" /> Resumen {ROLE_LABELS[role] ?? role}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Costo por Faltante</p>
                <p className="text-lg font-bold text-destructive">${data.totalStockoutCost}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Costo de Almacenamiento</p>
                <p className="text-lg font-bold text-orange-400">${data.totalHoldingCost}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Gráfico de niveles de stock */}
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Niveles de Inventario en el Tiempo</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="stepAfter" dataKey="retailerStock" name="Minorista" stroke={roleColors.retailer} strokeWidth={2} dot={false} />
                <Line type="stepAfter" dataKey="wholesalerStock" name="Mayorista" stroke={roleColors.wholesaler} strokeWidth={2} dot={false} />
                <Line type="stepAfter" dataKey="factoryStock" name="Fábrica" stroke={roleColors.factory} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de capital */}
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Reservas de Capital en el Tiempo</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="retailerMoney" name="Minorista" stroke={roleColors.retailer} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wholesalerMoney" name="Mayorista" stroke={roleColors.wholesaler} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="factoryMoney" name="Fábrica" stroke={roleColors.factory} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de backlog */}
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Pedidos Pendientes y Demanda No Satisfecha</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="demand" name="Demanda del Mercado" stroke={roleColors.demand} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="retailerBacklog" name="Backlog Minorista" stroke={roleColors.retailer} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wholesalerBacklog" name="Backlog Mayorista" stroke={roleColors.wholesaler} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="factoryBacklog" name="Backlog Fábrica" stroke={roleColors.factory} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cola de tránsito en vivo */}
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Red de Tránsito Activa</span>
              <span className="text-xs bg-secondary px-2 py-1 rounded text-foreground">{transitQueue.length} Envío{transitQueue.length !== 1 ? "s" : ""} Activo{transitQueue.length !== 1 ? "s" : ""}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-mono text-xs text-muted-foreground">RUTA</TableHead>
                    <TableHead className="font-mono text-xs text-muted-foreground text-right">CANTIDAD</TableHead>
                    <TableHead className="font-mono text-xs text-muted-foreground text-right">LLEGADA EST.</TableHead>
                    <TableHead className="font-mono text-xs text-muted-foreground text-right">TURNOS REST.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transitQueue.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground uppercase italic">Red inactiva</TableCell>
                    </TableRow>
                  ) : (
                    transitQueue.map((item) => (
                      <TableRow key={item.orderId} className="border-border/50 hover:bg-secondary/20">
                        <TableCell className="font-mono text-sm uppercase">
                          <span className="text-muted-foreground">{(ROLE_LABELS[item.fromRole] ?? item.fromRole).substring(0,3)}</span>
                          <span className="mx-2 text-primary">→</span>
                          <span className="font-bold text-foreground">{(ROLE_LABELS[item.toRole] ?? item.toRole).substring(0,3)}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">Día {item.estimatedArrivalDay}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            item.turnsRemaining === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-secondary text-foreground'
                          }`}>
                            {item.turnsRemaining}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
