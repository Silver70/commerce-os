import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  ShoppingCartIcon,
  PercentIcon,
  TagIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Badge } from "~/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart"
import { dashboardStatsQueryOptions } from "~/queries/dashboard"
import { ordersQueryOptions } from "~/queries/orders"
import { formatMoney } from "~/lib/money"
import type { OrderStatus, Period } from "~/types/api"

export const Route = createFileRoute("/admin/dashboard")({
  loaderDeps: ({ search }: { search: Record<string, string> }) => ({
    period: (search.period ?? "7d") as Period,
  }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(dashboardStatsQueryOptions(deps.period)),
      context.queryClient.ensureQueryData(ordersQueryOptions({})),
    ]),
  component: DashboardPage,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `$${(n / 1_000).toFixed(1)}k`
      : `$${n.toLocaleString()}`
}

function fmtCount(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}k`
      : n.toLocaleString()
}

const PERIOD_DAYS: Record<Period, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
}

function sparklineToTrend(
  sparkline: number[],
  period: Period,
): { date: string; revenue: number }[] {
  const days = PERIOD_DAYS[period]
  const start = new Date()
  start.setDate(start.getDate() - days)

  return sparkline.map((revenue, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue,
    }
  })
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  format = "currency",
}: {
  label: string
  value: number
  delta: number
  icon: React.ElementType
  format?: "currency" | "number" | "percent"
}) {
  const positive = delta >= 0
  const displayValue =
    format === "currency"
      ? fmt(value)
      : format === "percent"
        ? `${value}%`
        : fmtCount(value)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-muted shrink-0">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
          </div>
          <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            positive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive"
          }`}>
            {positive ? <TrendingUpIcon className="h-3 w-3" /> : <TrendingDownIcon className="h-3 w-3" />}
            {Math.abs(delta)}%
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight tabular-nums leading-none">{displayValue}</p>
      </CardContent>
    </Card>
  )
}

// ─── Revenue Trend ───────────────────────────────────────────────────────────

const trendConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
}

function RevenueTrend({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Revenue</CardTitle>
            <CardDescription className="text-xs">Current period trend</CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--chart-1))]" />
            This period
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={trendConfig} className="h-64 w-full">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => fmt(v)}
              width={56}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => fmt(value as number)}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── Recent Orders ────────────────────────────────────────────────────────────

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    "text-muted-foreground border-border bg-muted/40",
  paid:       "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900",
  processing: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900",
  shipped:    "text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900",
  delivered:  "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900",
  refunded:   "text-destructive border-destructive/20 bg-destructive/10",
  cancelled:  "text-destructive border-destructive/30 bg-transparent",
}

function RecentOrders() {
  const { data } = useSuspenseQuery(ordersQueryOptions({}))
  const orders = data.orders.slice(0, 7)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <CardDescription className="text-xs">Latest orders across all channels</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="pl-6 text-xs font-medium">Order</TableHead>
              <TableHead className="text-xs font-medium">Customer</TableHead>
              <TableHead className="text-xs font-medium">Date</TableHead>
              <TableHead className="text-xs font-medium">Status</TableHead>
              <TableHead className="text-xs font-medium text-right pr-6">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="group">
                <TableCell className="pl-6 text-sm font-mono font-medium text-muted-foreground">
                  {order.orderNumber}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium leading-none">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.customerEmail}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[11px] px-2 py-0 capitalize font-medium ${ORDER_STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold pr-6">
                  {formatMoney(order.total, order.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
]

function DashboardPage() {
  const [period, setPeriod] = React.useState<Period>("7d")
  const { data: stats } = useSuspenseQuery(dashboardStatsQueryOptions(period))

  const revenueTrend = sparklineToTrend(stats.revenue.sparkline, period)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back. Here&apos;s what&apos;s happening with your store.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            {PERIOD_LABELS.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="text-xs">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={stats.revenue.current}
          delta={stats.revenue.delta}
          icon={DollarSignIcon}
          format="currency"
        />
        <KpiCard
          label="Orders"
          value={stats.orders.current}
          delta={stats.orders.delta}
          icon={ShoppingCartIcon}
          format="number"
        />
        <KpiCard
          label="Conversion"
          value={stats.conversion.current}
          delta={stats.conversion.delta}
          icon={PercentIcon}
          format="percent"
        />
        <KpiCard
          label="Avg Order Value"
          value={stats.aov.current}
          delta={stats.aov.delta}
          icon={TagIcon}
          format="currency"
        />
      </div>

      {/* Revenue Chart — full width */}
      <RevenueTrend data={revenueTrend} />

      {/* Recent Orders */}
      <RecentOrders />
    </div>
  )
}
