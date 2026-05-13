import { useGetHistoryData, useGetAnalyticsSummary, useGetTransitQueue, getGetHistoryDataQueryKey, getGetAnalyticsSummaryQueryKey, getGetTransitQueueQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Truck, Factory, TrendingUp, AlertTriangle } from "lucide-react";

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
    return <div className="p-8 text-center font-mono animate-pulse">Aggregating telemetry data...</div>;
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
          <p className="font-bold border-b border-border pb-1 mb-2">DAY {label}</p>
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
          <h1 className="text-3xl font-bold text-foreground uppercase tracking-tight">Performance Telemetry</h1>
          <p className="text-sm text-muted-foreground mt-1">Global supply chain historical metrics & transit logs</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground uppercase">Simulation Duration</div>
          <div className="text-2xl font-bold text-primary">{summary.totalDays} DAYS</div>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { role: 'retailer', data: summary.retailer, icon: Package, color: 'text-chart-1' },
          { role: 'wholesaler', data: summary.wholesaler, icon: Truck, color: 'text-chart-2' },
          { role: 'factory', data: summary.factory, icon: Factory, color: 'text-chart-3' }
        ].map(({ role, data, icon: Icon, color }) => (
          <Card key={role} className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm uppercase tracking-wider flex items-center gap-2 ${color}`}>
                <Icon className="h-4 w-4" /> {role} Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Avg Stockout Cost</p>
                <p className="text-lg font-bold text-destructive">${data.totalStockoutCost}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Avg Holding Cost</p>
                <p className="text-lg font-bold text-orange-400">${data.totalHoldingCost}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Stock Level Chart */}
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Inventory Levels Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="stepAfter" dataKey="retailerStock" name="Retailer" stroke={roleColors.retailer} strokeWidth={2} dot={false} />
                <Line type="stepAfter" dataKey="wholesalerStock" name="Wholesaler" stroke={roleColors.wholesaler} strokeWidth={2} dot={false} />
                <Line type="stepAfter" dataKey="factoryStock" name="Factory" stroke={roleColors.factory} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Financials Chart */}
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Capital Reserves Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="retailerMoney" name="Retailer" stroke={roleColors.retailer} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wholesalerMoney" name="Wholesaler" stroke={roleColors.wholesaler} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="factoryMoney" name="Factory" stroke={roleColors.factory} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Backlog Chart */}
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Backlog & Unfulfilled Demand</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="demand" name="Market Demand" stroke={roleColors.demand} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="retailerBacklog" name="Retailer Backlog" stroke={roleColors.retailer} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wholesalerBacklog" name="Wholesaler Backlog" stroke={roleColors.wholesaler} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="factoryBacklog" name="Factory Backlog" stroke={roleColors.factory} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Live Transit Queue */}
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Active Transit Network</span>
              <span className="text-xs bg-secondary px-2 py-1 rounded text-foreground">{transitQueue.length} Active Shipments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-mono text-xs text-muted-foreground">ROUTE</TableHead>
                    <TableHead className="font-mono text-xs text-muted-foreground text-right">QUANTITY</TableHead>
                    <TableHead className="font-mono text-xs text-muted-foreground text-right">EST. ARRIVAL</TableHead>
                    <TableHead className="font-mono text-xs text-muted-foreground text-right">TURNS LEFT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transitQueue.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground uppercase italic">Network idle</TableCell>
                    </TableRow>
                  ) : (
                    transitQueue.map((item) => (
                      <TableRow key={item.orderId} className="border-border/50 hover:bg-secondary/20">
                        <TableCell className="font-mono text-sm uppercase">
                          <span className="text-muted-foreground">{item.fromRole.substring(0,3)}</span>
                          <span className="mx-2 text-primary">→</span>
                          <span className="font-bold text-foreground">{item.toRole.substring(0,3)}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">Day {item.estimatedArrivalDay}</TableCell>
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
