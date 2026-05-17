import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ShoppingCartIcon,
  UsersIcon,
  RotateCcwIcon,
  AlertTriangleIcon,
  PackageIcon,
  ZapIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Badge } from "~/components/ui/badge"
import { Progress } from "~/components/ui/progress"
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

const FUNNEL_DATA: Record<Period, { stage: string; count: number }[]> = {
  today: [
    { stage: "Visitors", count: 5200 },
    { stage: "Product Views", count: 1480 },
    { stage: "Add to Cart", count: 420 },
    { stage: "Checkout", count: 148 },
    { stage: "Purchases", count: 94 },
  ],
  "7d": [
    { stage: "Visitors", count: 120000 },
    { stage: "Product Views", count: 32000 },
    { stage: "Add to Cart", count: 9100 },
    { stage: "Checkout", count: 3200 },
    { stage: "Purchases", count: 1842 },
  ],
  "30d": [
    { stage: "Visitors", count: 498000 },
    { stage: "Product Views", count: 134000 },
    { stage: "Add to Cart", count: 38200 },
    { stage: "Checkout", count: 13400 },
    { stage: "Purchases", count: 7490 },
  ],
  "90d": [
    { stage: "Visitors", count: 1560000 },
    { stage: "Product Views", count: 421000 },
    { stage: "Add to Cart", count: 118000 },
    { stage: "Checkout", count: 41200 },
    { stage: "Purchases", count: 23600 },
  ],
}

const CHANNEL_DATA = [
  { channel: "Organic Search", revenue: 31400 },
  { channel: "Paid Ads", revenue: 22100 },
  { channel: "Email", revenue: 14800 },
  { channel: "Direct", revenue: 9200 },
  { channel: "Social", revenue: 4600 },
  { channel: "Affiliates", revenue: 2130 },
]

const CUSTOMER_DONUT = [
  { name: "New", value: 59, fill: "hsl(var(--chart-1))" },
  { name: "Returning", value: 41, fill: "hsl(var(--chart-2))" },
]

const CUSTOMER_TREND: Record<Period, { date: string; new: number; returning: number }[]> = {
  today: Array.from({ length: 24 }, (_, i) => ({
    date: `${i}:00`,
    new: Math.floor(20 + Math.random() * 15),
    returning: Math.floor(12 + Math.random() * 10),
  })),
  "7d": [
    { date: "Mon", new: 142, returning: 78 },
    { date: "Tue", new: 168, returning: 112 },
    { date: "Wed", new: 155, returning: 110 },
    { date: "Thu", new: 190, returning: 120 },
    { date: "Fri", new: 224, returning: 156 },
    { date: "Sat", new: 198, returning: 142 },
    { date: "Sun", new: 148, returning: 82 },
  ],
  "30d": Array.from({ length: 30 }, (_, i) => ({
    date: `${i + 1}`,
    new: Math.floor(120 + i * 4 + Math.random() * 40),
    returning: Math.floor(80 + i * 2.5 + Math.random() * 25),
  })),
  "90d": Array.from({ length: 13 }, (_, i) => ({
    date: `W${i + 1}`,
    new: Math.floor(800 + i * 60 + Math.random() * 150),
    returning: Math.floor(520 + i * 40 + Math.random() * 100),
  })),
}

const TOP_PRODUCTS = [
  { name: "Wireless Headphones Pro", revenue: 12400, units: 248, conversion: 4.2, stock: 82, trend: "up" },
  { name: "Leather Minimalist Wallet", revenue: 8900, units: 445, conversion: 5.1, stock: 67, trend: "up" },
  { name: "Ceramic Pour-Over Kit", revenue: 7200, units: 180, conversion: 3.8, stock: 14, trend: "down" },
  { name: "Merino Wool Crew Neck", revenue: 6800, units: 136, conversion: 2.9, stock: 45, trend: "up" },
  { name: "Stainless Travel Bottle", revenue: 5600, units: 373, conversion: 6.2, stock: 91, trend: "up" },
  { name: "Bamboo Desk Organizer", revenue: 4100, units: 205, conversion: 3.1, stock: 28, trend: "down" },
]

const INVENTORY_ALERTS = [
  { name: "Ceramic Pour-Over Kit", sku: "CPK-001", stock: 14, threshold: 50, daysLeft: 3, status: "critical" },
  { name: "Bamboo Desk Organizer", sku: "BDO-003", stock: 28, threshold: 50, daysLeft: 7, status: "low" },
  { name: "Merino Wool Crew — S", sku: "MWC-S-04", stock: 8, threshold: 30, daysLeft: 2, status: "critical" },
  { name: "Linen Throw Pillow", sku: "LTP-002", stock: 34, threshold: 40, daysLeft: 11, status: "low" },
  { name: "Rubber Plant (Large)", sku: "RPL-007", stock: 380, threshold: 80, daysLeft: null, status: "overstock" },
]

const LIVE_EVENTS_POOL = [
  { name: "Marcus W.", product: "Wireless Headphones Pro", value: 89, initials: "MW" },
  { name: "Sophia L.", product: "Leather Minimalist Wallet", value: 34, initials: "SL" },
  { name: "James T.", product: "Ceramic Pour-Over Kit", value: 54, initials: "JT" },
  { name: "Aisha K.", product: "Merino Wool Crew Neck", value: 68, initials: "AK" },
  { name: "Chris D.", product: "Stainless Travel Bottle", value: 28, initials: "CD" },
  { name: "Priya M.", product: "Bamboo Desk Organizer", value: 42, initials: "PM" },
  { name: "Noah B.", product: "Wireless Headphones Pro", value: 89, initials: "NB" },
  { name: "Elena R.", product: "Linen Throw Pillow", value: 56, initials: "ER" },
  { name: "Diego F.", product: "Rubber Plant (Large)", value: 120, initials: "DF" },
  { name: "Yuki S.", product: "Stainless Travel Bottle", value: 28, initials: "YS" },
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

// ─── Sparkline ───────────────────────────────────────────────────────────────

const sparkConfig: ChartConfig = { value: { color: "hsl(var(--chart-1))" } }

function SparkLine({ data, positive }: { data: number[]; positive: boolean }) {
  const chartData = data.map((v, i) => ({ i, value: v }))
  return (
    <ChartContainer config={sparkConfig} className="h-8 w-20">
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={positive ? "hsl(var(--chart-1))" : "hsl(var(--destructive))"} stopOpacity={0.3} />
            <stop offset="95%" stopColor={positive ? "hsl(var(--chart-1))" : "hsl(var(--destructive))"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={positive ? "hsl(var(--chart-1))" : "hsl(var(--destructive))"}
          strokeWidth={1.5}
          fill="url(#sparkGrad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
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

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-tight truncate">{displayValue}</p>
            <div className="flex items-center gap-1 mt-1">
              {positive
                ? <TrendingUpIcon className="h-3 w-3 text-emerald-500" />
                : <TrendingDownIcon className="h-3 w-3 text-destructive" />}
              <span className={`text-xs font-medium ${positive ? "text-emerald-500" : "text-destructive"}`}>
                {positive ? "+" : ""}{delta}%
              </span>
              <span className="text-xs text-muted-foreground">vs prior</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <SparkLine data={sparkline} positive={positive} />
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
    <Card className="col-span-2">
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
        <ChartContainer config={trendConfig} className="h-56 w-full">
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
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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

// ─── Conversion Funnel ───────────────────────────────────────────────────────

function ConversionFunnel({ period }: { period: Period }) {
  const data = FUNNEL_DATA[period]
  const max = data[0].count

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Conversion Funnel</CardTitle>
        <CardDescription className="text-xs">Session to purchase</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-1.5">
          {data.map((stage, i) => {
            const pct = (stage.count / max) * 100
            const dropoff = i > 0 ? Math.round((1 - stage.count / data[i - 1].count) * 100) : null
            return (
              <div key={stage.stage}>
                {dropoff !== null && (
                  <div className="flex items-center gap-1.5 py-0.5 pl-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] text-muted-foreground shrink-0">−{dropoff}% drop</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div
                  className="relative flex items-center justify-between rounded px-3 py-2 text-sm font-medium transition-all"
                  style={{
                    background: `linear-gradient(135deg, hsl(var(--chart-1) / ${0.08 + (1 - i / data.length) * 0.16}) 0%, hsl(var(--chart-1) / ${0.04 + (1 - i / data.length) * 0.08}) 100%)`,
                    width: `${Math.max(pct, 40)}%`,
                    minWidth: "100%",
                  }}
                >
                  <div
                    className="absolute inset-0 rounded"
                    style={{
                      background: `linear-gradient(90deg, hsl(var(--chart-1) / ${0.12 + (1 - i / data.length) * 0.18}) 0%, transparent 100%)`,
                      width: `${pct}%`,
                      minWidth: "30%",
                    }}
                  />
                  <span className="relative z-10 text-xs font-semibold">{stage.stage}</span>
                  <span className="relative z-10 text-xs text-muted-foreground font-normal">
                    {fmtCount(stage.count)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Overall conversion</span>
          <span className="font-semibold text-foreground">
            {((data[data.length - 1].count / max) * 100).toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Channel Performance ─────────────────────────────────────────────────────

const channelConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
}

function ChannelChart() {
  const sorted = [...CHANNEL_DATA].sort((a, b) => b.revenue - a.revenue)
  const max = sorted[0].revenue
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Sales by Channel</CardTitle>
        <CardDescription className="text-xs">Revenue breakdown by acquisition</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={channelConfig} className="h-52 w-full">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
            barCategoryGap="28%"
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmt(v)}
            />
            <YAxis
              type="category"
              dataKey="channel"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={88}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(v) => fmt(v as number)} />}
            />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {sorted.map((entry, i) => (
                <Cell
                  key={entry.channel}
                  fill={`hsl(var(--chart-1) / ${0.4 + (1 - i / sorted.length) * 0.6})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex justify-between">
          <span>Total tracked revenue</span>
          <span className="font-semibold text-foreground">{fmt(CHANNEL_DATA.reduce((a, c) => a + c.revenue, 0))}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Customer Analytics ──────────────────────────────────────────────────────

const customerConfig: ChartConfig = {
  new: { label: "New", color: "hsl(var(--chart-1))" },
  returning: { label: "Returning", color: "hsl(var(--chart-2))" },
}

function CustomerAnalytics({ period }: { period: Period }) {
  const trend = CUSTOMER_TREND[period]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Customer Analytics</CardTitle>
        <CardDescription className="text-xs">New vs returning customers</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-4">
          {/* Donut */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <ChartContainer config={customerConfig} className="h-28 w-28">
              <PieChart>
                <Pie
                  data={CUSTOMER_DONUT}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={48}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {CUSTOMER_DONUT.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-1 mt-1">
              {CUSTOMER_DONUT.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.fill }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-semibold ml-auto pl-2">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stacked area */}
          <div className="flex-1 min-w-0">
            <ChartContainer config={customerConfig} className="h-44 w-full">
              <AreaChart data={trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="returning" stackId="1" stroke="hsl(var(--chart-2))" strokeWidth={1.5} fill="url(#retGrad)" dot={false} />
                <Area type="monotone" dataKey="new" stackId="1" stroke="hsl(var(--chart-1))" strokeWidth={1.5} fill="url(#newGrad)" dot={false} />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Top Products Table ───────────────────────────────────────────────────────

function TopProductsTable() {
  const maxRevenue = TOP_PRODUCTS[0].revenue
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Top Products</CardTitle>
            <CardDescription className="text-xs">By revenue this period</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="pl-6 text-xs font-medium w-6">#</TableHead>
              <TableHead className="text-xs font-medium">Product</TableHead>
              <TableHead className="text-xs font-medium text-right">Revenue</TableHead>
              <TableHead className="text-xs font-medium text-right">Units</TableHead>
              <TableHead className="text-xs font-medium text-right">Conv.</TableHead>
              <TableHead className="text-xs font-medium pr-6">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TOP_PRODUCTS.map((p, i) => (
              <TableRow key={p.name} className="group">
                <TableCell className="pl-6 text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium text-sm">
                  <div className="flex items-center gap-2">
                    {p.trend === "up"
                      ? <TrendingUpIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <TrendingDownIcon className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="truncate max-w-[160px]">{p.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-semibold">{fmt(p.revenue)}</span>
                    <div
                      className="h-0.5 rounded-full bg-[hsl(var(--chart-1))]"
                      style={{ width: `${(p.revenue / maxRevenue) * 48}px`, opacity: 0.6 }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{p.units.toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{p.conversion}%</TableCell>
                <TableCell className="pr-6">
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <Progress
                      value={p.stock}
                      className="h-1.5 flex-1"
                      style={{
                        ["--progress-color" as string]:
                          p.stock > 50 ? "hsl(var(--chart-2))"
                          : p.stock > 20 ? "hsl(var(--chart-4))"
                          : "hsl(var(--destructive))",
                      }}
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right">{p.stock}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Inventory Alerts ────────────────────────────────────────────────────────

function InventoryAlerts() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
              Inventory Alerts
            </CardTitle>
            <CardDescription className="text-xs">Items needing attention</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {INVENTORY_ALERTS.filter((a) => a.status !== "overstock").length} at risk
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-3">
        {INVENTORY_ALERTS.map((item) => {
          const pct = Math.min((item.stock / item.threshold) * 100, 200)
          const statusColors = {
            critical: "text-destructive border-destructive/20 bg-destructive/10",
            low: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900",
            overstock: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900",
          }
          return (
            <div key={item.sku} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">{item.sku}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.min(pct, 100)}
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
                    {item.stock} / {item.threshold}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 capitalize ${statusColors[item.status as keyof typeof statusColors]}`}
                >
                  {item.status}
                </Badge>
                {item.daysLeft !== null && (
                  <span className="text-[10px] text-muted-foreground">{item.daysLeft}d left</span>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Live Activity Feed ───────────────────────────────────────────────────────

type LiveEvent = {
  id: number
  name: string
  product: string
  value: number
  initials: string
  secondsAgo: number
}

function LiveFeed() {
  const [events, setEvents] = React.useState<LiveEvent[]>(() =>
    LIVE_EVENTS_POOL.slice(0, 5).map((e, i) => ({ ...e, id: i, secondsAgo: (i + 1) * 8 }))
  )
  const counterRef = React.useRef(events.length)

  React.useEffect(() => {
    const interval = setInterval(() => {
      const pool = LIVE_EVENTS_POOL
      const next = pool[counterRef.current % pool.length]
      const newEvent: LiveEvent = { ...next, id: counterRef.current, secondsAgo: 0 }
      counterRef.current += 1

      setEvents((prev) => [newEvent, ...prev.slice(0, 7)].map((e, i) => ({ ...e, secondsAgo: i === 0 ? 0 : e.secondsAgo + 4 })))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live Orders
            </CardTitle>
            <CardDescription className="text-xs">Real-time purchase activity</CardDescription>
          </div>
          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900" variant="outline">
            <ZapIcon className="h-2.5 w-2.5 mr-1" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-2.5">
        {events.map((event, i) => (
          <div
            key={event.id}
            className="flex items-center gap-3 transition-opacity"
            style={{ opacity: 1 - i * 0.1 }}
          >
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--chart-1)/0.15)] flex items-center justify-center text-xs font-semibold text-[hsl(var(--chart-1))] shrink-0">
              {event.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">{event.name}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{event.product}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">${event.value}</p>
              <p className="text-[10px] text-muted-foreground">
                {event.secondsAgo === 0 ? "just now" : `${event.secondsAgo}s ago`}
              </p>
            </div>
          </div>
        ))}
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
        <KpiCard label="Revenue" value={kpi.revenue} delta={kpi.revenueDelta} sparkline={kpi.revenueSparkline} icon={ShoppingCartIcon} format="currency" />
        <KpiCard label="Orders" value={kpi.orders} delta={kpi.ordersDelta} sparkline={kpi.ordersSparkline} icon={PackageIcon} format="number" />
        <KpiCard label="Avg Order Value" value={kpi.aov} delta={kpi.aovDelta} sparkline={kpi.aovSparkline} icon={ShoppingCartIcon} format="currency" />
        <KpiCard label="Conversion Rate" value={kpi.conversion} delta={kpi.conversionDelta} sparkline={kpi.conversionSparkline} icon={UsersIcon} format="percent-plain" />
        <KpiCard label="Returning Customers" value={kpi.returning} delta={kpi.returningDelta} sparkline={kpi.returningSparkline} icon={RotateCcwIcon} format="percent-plain" />
      </div>

      {/* Revenue Trend + Funnel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RevenueTrend period={period} />
        <ConversionFunnel period={period} />
      </div>

      {/* Channel + Customer */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChannelChart />
        <CustomerAnalytics period={period} />
      </div>

      {/* Top Products */}
      <TopProductsTable />

      {/* Inventory + Live Feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InventoryAlerts />
        <LiveFeed />
      </div>
    </div>
  )
}
