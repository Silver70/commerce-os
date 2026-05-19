import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
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
  TagIcon,
  ActivityIcon,
  UsersIcon,
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

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardPage,
})

// ─── Fake Data ────────────────────────────────────────────────────────────────

type Period = "today" | "7d" | "30d" | "90d"

const REVENUE_TREND: Record<Period, { date: string; current: number; prior: number }[]> = {
  today: Array.from({ length: 24 }, (_, i) => ({
    date: `${i}:00`,
    current: Math.floor(800 + Math.sin(i * 0.5) * 400 + Math.random() * 200),
    prior: Math.floor(700 + Math.sin(i * 0.5) * 350 + Math.random() * 150),
  })),
  "7d": [
    { date: "Mon", current: 9200, prior: 8100 },
    { date: "Tue", current: 11400, prior: 9800 },
    { date: "Wed", current: 10800, prior: 10200 },
    { date: "Thu", current: 13200, prior: 11400 },
    { date: "Fri", current: 15600, prior: 12800 },
    { date: "Sat", current: 14100, prior: 11200 },
    { date: "Sun", current: 9930, prior: 8600 },
  ],
  "30d": Array.from({ length: 30 }, (_, i) => ({
    date: `${i + 1}`,
    current: Math.floor(8000 + Math.sin(i * 0.3) * 3000 + i * 120 + Math.random() * 1000),
    prior: Math.floor(7000 + Math.sin(i * 0.3) * 2500 + i * 90 + Math.random() * 800),
  })),
  "90d": Array.from({ length: 13 }, (_, i) => ({
    date: `W${i + 1}`,
    current: Math.floor(55000 + i * 2800 + Math.sin(i * 0.8) * 8000),
    prior: Math.floor(48000 + i * 2200 + Math.sin(i * 0.8) * 6000),
  })),
}

const KPI_DATA: Record<Period, {
  revenue: number; revenueDelta: number; revenueSparkline: number[]
  orders: number; ordersDelta: number; ordersSparkline: number[]
  aov: number; aovDelta: number; aovSparkline: number[]
  conversion: number; conversionDelta: number; conversionSparkline: number[]
  returning: number; returningDelta: number; returningSparkline: number[]
}> = {
  today: {
    revenue: 4820, revenueDelta: 8.2, revenueSparkline: [320, 410, 380, 520, 490, 600, 580],
    orders: 94, ordersDelta: 5.1, ordersSparkline: [60, 72, 68, 85, 80, 94, 90],
    aov: 51.28, aovDelta: 2.9, aovSparkline: [48, 49, 50, 51, 50, 52, 51],
    conversion: 3.6, conversionDelta: 0.3, conversionSparkline: [3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.6],
    returning: 38, returningDelta: 2.0, returningSparkline: [32, 33, 34, 35, 36, 37, 38],
  },
  "7d": {
    revenue: 84230, revenueDelta: 12.4, revenueSparkline: [9200, 11400, 10800, 13200, 15600, 14100, 9930],
    orders: 1842, ordersDelta: 8.1, ordersSparkline: [220, 280, 265, 310, 380, 340, 240],
    aov: 45.72, aovDelta: -2.3, aovSparkline: [48, 47, 46, 46, 45, 46, 45],
    conversion: 3.8, conversionDelta: 0.4, conversionSparkline: [3.2, 3.4, 3.5, 3.7, 3.9, 3.8, 3.8],
    returning: 41, returningDelta: 3.1, returningSparkline: [36, 37, 38, 39, 40, 41, 41],
  },
  "30d": {
    revenue: 342800, revenueDelta: 18.7, revenueSparkline: [42000, 48000, 44000, 52000, 58000, 55000, 62000],
    orders: 7490, ordersDelta: 14.2, ordersSparkline: [900, 1050, 980, 1120, 1280, 1200, 1380],
    aov: 45.77, aovDelta: 3.8, aovSparkline: [43, 44, 45, 45, 46, 46, 47],
    conversion: 4.1, conversionDelta: 0.7, conversionSparkline: [3.4, 3.5, 3.7, 3.8, 4.0, 4.1, 4.1],
    returning: 44, returningDelta: 5.2, returningSparkline: [38, 39, 40, 41, 42, 43, 44],
  },
  "90d": {
    revenue: 1084200, revenueDelta: 22.1, revenueSparkline: [280000, 310000, 335000, 360000, 345000, 390000, 420000],
    orders: 23600, ordersDelta: 19.8, ordersSparkline: [5800, 6200, 6800, 7100, 6900, 7600, 8200],
    aov: 45.94, aovDelta: 1.9, aovSparkline: [44, 44, 45, 45, 46, 46, 46],
    conversion: 4.3, conversionDelta: 0.9, conversionSparkline: [3.3, 3.5, 3.7, 3.9, 4.1, 4.2, 4.3],
    returning: 47, returningDelta: 8.4, returningSparkline: [37, 39, 41, 43, 44, 46, 47],
  },
}

type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "refunded"

const RECENT_ORDERS: {
  id: string
  customer: string
  email: string
  date: string
  items: number
  status: OrderStatus
  total: number
}[] = [
  { id: "#10042", customer: "Marcus Webb",   email: "marcus.w@email.com",  date: "May 18, 2026", items: 3, status: "shipped",    total: 187 },
  { id: "#10041", customer: "Sophia Lin",    email: "sophia.l@email.com",  date: "May 18, 2026", items: 1, status: "paid",       total: 34  },
  { id: "#10040", customer: "James Torres",  email: "james.t@email.com",   date: "May 17, 2026", items: 2, status: "processing", total: 122 },
  { id: "#10039", customer: "Aisha Karimi",  email: "aisha.k@email.com",   date: "May 17, 2026", items: 4, status: "delivered",  total: 268 },
  { id: "#10038", customer: "Chris Dunn",    email: "chris.d@email.com",   date: "May 16, 2026", items: 1, status: "delivered",  total: 28  },
  { id: "#10037", customer: "Priya Mehta",   email: "priya.m@email.com",   date: "May 16, 2026", items: 2, status: "refunded",   total: 96  },
  { id: "#10036", customer: "Noah Baxter",   email: "noah.b@email.com",    date: "May 15, 2026", items: 3, status: "delivered",  total: 211 },
]

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

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  sparkline,
  icon: Icon,
  format = "currency",
}: {
  label: string
  value: number
  delta: number
  sparkline: number[]
  icon: React.ElementType
  format?: "currency" | "number" | "percent" | "percent-plain"
}) {
  const positive = delta >= 0
  const displayValue =
    format === "currency"
      ? fmt(value)
      : format === "percent" || format === "percent-plain"
        ? `${value}%`
        : fmtCount(value)

  const bars = sparkline.slice(-5)
  const maxVal = Math.max(...bars)
  const barColor = positive ? "hsl(var(--chart-1))" : "var(--destructive)"

  return (
    <Card>
      <CardContent className="p-5">
        {/* Top row: label + icon (left) | trend pill (right) */}
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
        {/* Bottom row: hero number (left) | spark bars (right) */}
        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl font-bold tracking-tight tabular-nums leading-none">{displayValue}</p>
          <div className="flex items-end gap-[3px] h-8 shrink-0">
            {bars.map((v, i) => {
              const height = Math.max((v / maxVal) * 32, 5)
              const opacity = 0.15 + (i / (bars.length - 1)) * 0.85
              return (
                <div
                  key={i}
                  className="w-2 rounded-full"
                  style={{ height: `${height}px`, backgroundColor: barColor, opacity }}
                />
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Revenue Trend ───────────────────────────────────────────────────────────

const trendConfig: ChartConfig = {
  current: { label: "This period", color: "hsl(var(--chart-1))" },
  prior: { label: "Prior period", color: "hsl(var(--chart-2))" },
}

function RevenueTrend({ period }: { period: Period }) {
  const data = REVENUE_TREND[period]
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Revenue</CardTitle>
            <CardDescription className="text-xs">Current vs prior period</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--chart-1))]" />
              This period
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" />
              Prior period
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={trendConfig} className="h-64 w-full">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="priorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
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
              tickFormatter={(v) => fmt(v)}
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
              dataKey="prior"
              stroke="hsl(var(--chart-2))"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#priorGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#currentGrad)"
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── Recent Orders ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    "text-muted-foreground border-border bg-muted/40",
  paid:       "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900",
  processing: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900",
  shipped:    "text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900",
  delivered:  "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900",
  refunded:   "text-destructive border-destructive/20 bg-destructive/10",
}

function RecentOrders() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <CardDescription className="text-xs">Last 7 orders across all channels</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="pl-6 text-xs font-medium">Order</TableHead>
              <TableHead className="text-xs font-medium">Customer</TableHead>
              <TableHead className="text-xs font-medium">Date</TableHead>
              <TableHead className="text-xs font-medium text-center">Items</TableHead>
              <TableHead className="text-xs font-medium">Status</TableHead>
              <TableHead className="text-xs font-medium text-right pr-6">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RECENT_ORDERS.map((order) => (
              <TableRow key={order.id} className="group">
                <TableCell className="pl-6 text-sm font-mono font-medium text-muted-foreground">
                  {order.id}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium leading-none">{order.customer}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{order.date}</TableCell>
                <TableCell className="text-sm text-center text-muted-foreground">{order.items}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[11px] px-2 py-0 capitalize font-medium ${STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold pr-6">
                  ${order.total.toFixed(2)}
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
  const kpi = KPI_DATA[period]

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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Revenue" value={kpi.revenue} delta={kpi.revenueDelta} sparkline={kpi.revenueSparkline} icon={DollarSignIcon} format="currency" />
        <KpiCard label="Orders" value={kpi.orders} delta={kpi.ordersDelta} sparkline={kpi.ordersSparkline} icon={ShoppingCartIcon} format="number" />
        <KpiCard label="Avg Order Value" value={kpi.aov} delta={kpi.aovDelta} sparkline={kpi.aovSparkline} icon={TagIcon} format="currency" />
        <KpiCard label="Conversion Rate" value={kpi.conversion} delta={kpi.conversionDelta} sparkline={kpi.conversionSparkline} icon={ActivityIcon} format="percent-plain" />
        <KpiCard label="Returning Customers" value={kpi.returning} delta={kpi.returningDelta} sparkline={kpi.returningSparkline} icon={UsersIcon} format="percent-plain" />
      </div>

      {/* Revenue Chart — full width */}
      <RevenueTrend period={period} />

      {/* Recent Orders */}
      <RecentOrders />
    </div>
  )
}
