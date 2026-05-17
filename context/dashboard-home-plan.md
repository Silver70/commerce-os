# Dashboard Home Page — Implementation Plan

## Overview

A full-featured eCommerce command-center dashboard built inside the existing `/admin/dashboard` route. All data is hard-coded fake data for now. The page answers the merchant's five core questions in under 10 seconds: revenue health, growth trends, traffic sources, winning products, and operational issues.

---

## Charting Library Decision

### Primary: **Recharts** (via shadcn/ui `<Chart>` primitives)

**Why Recharts:**
- shadcn/ui ships a first-class `Chart` component built on top of Recharts that hooks into CSS variables for theming, making it automatically light/dark-mode aware.
- We already have shadcn/ui wired up — adding `recharts` is one `npm install`.
- Produces smooth, beautifully styled charts with minimal config.
- Supports: LineChart, AreaChart, BarChart, RadialBarChart, PieChart/DonutChart — covers 90% of our needs.

**What Recharts does NOT cover:**
- Conversion Funnel — built as a custom SVG component (no third-party needed).
- Geographic map — built as a styled table/bar breakdown by region (map libs are heavy; skip for now, revisit when real data arrives).

### No other chart libraries needed.

---

## New Dependencies Required

| Package | Version | Why |
|---------|---------|-----|
| `recharts` | `^2.15.x` | Powers all charts via shadcn Chart component |

### shadcn components to add

Run from `apps/frontend/`:
```sh
npx shadcn@latest add chart
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add progress
npx shadcn@latest add tabs
```

---

## Page Layout

The dashboard uses a responsive CSS grid. Three layout zones:

```
┌─────────────────────────────────────────────────────┐
│  Date Range Tabs  (Today / 7d / 30d / 90d / Custom) │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│ Revenue  │  Orders  │   AOV    │ Conv.Rate│ Return% │  ← KPI Row
├──────────┴──────────┴──────────┴──────────┴─────────┤
│          Revenue Trend (Line Chart, 2/3 width)       │
│                              │ Conversion Funnel     │ ← Row 2
│                              │ (1/3 width, custom)   │
├─────────────────────┬────────┴───────────────────────┤
│ Channel Performance │ New vs Returning Customers      │ ← Row 3
│ (Horiz. Bar)        │ (Donut + Stacked Area)          │
├─────────────────────┴─────────────────────────────────┤
│         Top Products Table                            │ ← Row 4
├─────────────────────┬─────────────────────────────────┤
│ Inventory Alerts    │ Live Activity Feed              │ ← Row 5
│ (Status bars)       │ (Simulated order stream)        │
└─────────────────────┴─────────────────────────────────┘
```

---

## Section-by-Section Breakdown

### 1. Period Selector (Top of page)

A row of tab-style buttons: `Today | Last 7 days | Last 30 days | Last 90 days`.

- State held in a `useState` hook on the page component.
- Switching period updates all fake data arrays (each period has its own pre-baked dataset).
- Uses shadcn `<Tabs>` component.

---

### 2. KPI Stat Cards

Five cards in a responsive grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`).

| Card | Primary Value | Delta | Sparkline |
|------|--------------|-------|-----------|
| Total Revenue | $84,230 | +12.4% | 7-point line |
| Orders | 1,842 | +8.1% | 7-point line |
| Avg Order Value | $45.72 | -2.3% | 7-point line |
| Conversion Rate | 3.8% | +0.4pp | 7-point line |
| Returning Customers | 41% | +3.1% | 7-point line |

**Sparkline implementation**: A tiny `<AreaChart>` via Recharts (no axes, no grid, no tooltip, just the line and filled area). Width ~80px, height ~32px. This makes the number feel alive without clutter.

**Delta color**: green if positive, red if negative, gray if zero.

---

### 3. Revenue Trend Chart

A full-width `<AreaChart>` with:
- **Primary series**: Current period revenue (filled area, brand color)
- **Comparison series**: Same period prior year (dashed line, muted color)
- **X axis**: Date labels (day/week depending on period)
- **Y axis**: Dollar values, formatted as `$XX,XXX`
- **Tooltip**: Shows both values on hover with formatted dollar amounts
- **Legend**: "This period" vs "Prior period"

Uses `shadcn Chart` component wrapping `recharts AreaChart`.

---

### 4. Conversion Funnel

A custom SVG/CSS funnel (no library). Five stages rendered as trapezoids that narrow from top to bottom.

```
Stages:
  Visitors      120,000   100%
  Product Views  32,000    26.7%
  Add to Cart     9,100     7.6%
  Checkout        3,200     2.7%
  Purchases       1,842     1.5%
```

Each stage:
- Trapezoid shape using `clip-path: polygon(...)` on a div
- Label on left (stage name + count)
- Drop-off % on right in muted text
- Hover shows exact conversion rate

Color: gradient from brand primary (top) to brand primary/40 (bottom).

---

### 5. Channel Performance

Horizontal `<BarChart>` (Recharts) showing revenue by acquisition channel.

Channels (fake data):
- Organic Search: $31,400
- Paid Ads: $22,100
- Email: $14,800
- Direct: $9,200
- Social: $4,600
- Affiliates: $2,130

Each bar has a tooltip showing revenue + % of total. Bars animate on mount.

---

### 6. Customer Analytics

Two sub-panels side by side:

**Left — Donut Chart**: New vs Returning split  
- `<PieChart>` with `innerRadius` set (donut style)  
- Center label shows dominant segment  
- Legend below

**Right — Stacked Area Chart**: Customer growth over time  
- New customers (primary color, filled)  
- Returning customers (secondary color, filled, stacked)  
- X axis: dates, Y axis: customer count

---

### 7. Top Products Table

A styled `<Table>` with 6 columns:

| # | Product | Revenue | Units | Conv. | Stock |
|---|---------|---------|-------|-------|-------|
| 1 | Wireless Headphones | $12,400 | 248 | 4.2% | ████░ 82% |
| 2 | Leather Wallet | $8,900 | 445 | 5.1% | ████░ 67% |

- Revenue column has a thin horizontal progress bar behind the value (max = highest revenue product).
- Stock shown as a color-coded bar: green >50%, amber 20–50%, red <20%.
- Tiny trend arrow (▲/▼) beside revenue.
- Clicking a row is a no-op for now (will navigate to product detail later).

---

### 8. Inventory Alerts

A card with a list of at-risk items, each row showing:
- Product name
- Current stock vs threshold
- "Days to stockout" estimate
- Color-coded badge: `Critical` (red) / `Low` (amber) / `Overstock` (blue)

Uses shadcn `<Badge>` and `<Progress>` components.

Fake data: 5 items (2 critical, 2 low, 1 overstock).

---

### 9. Live Activity Feed

A card simulating a real-time order stream. Uses `setInterval` to prepend a new fake order event every 4 seconds, keeping the last 8 visible with a slide-in animation.

Each event shows:
- Avatar initials
- Customer name (fake)
- Product purchased
- Order value
- "X seconds ago" relative timestamp

This gives the dashboard a "command center" feel and makes demos impressive.

Uses `useState` + `useEffect` with cleanup. No WebSocket needed — pure fake data cycling through a pool of 20 pre-baked events.

---

## File Structure

Everything lives in a single file for now (easy to split later):

```
apps/frontend/src/routes/admin/dashboard.tsx
```

Internal structure:
```tsx
// Fake data constants (top of file)
const FAKE_DATA = { ... }

// Small sub-components (defined in same file)
function KpiCard({ ... }) { ... }
function SparkLine({ ... }) { ... }
function RevenueTrend({ ... }) { ... }
function ConversionFunnel({ ... }) { ... }
function ChannelChart({ ... }) { ... }
function CustomerAnalytics({ ... }) { ... }
function TopProductsTable({ ... }) { ... }
function InventoryAlerts({ ... }) { ... }
function LiveFeed({ ... }) { ... }

// Main page
function DashboardPage() { ... }
```

---

## Styling Approach

- **Colors**: Use CSS variables (`hsl(var(--primary))`, `hsl(var(--muted))`, etc.) everywhere so light/dark mode works automatically.
- **Grid**: Tailwind CSS grid utilities. Two breakpoints: `md` and `lg`.
- **Cards**: shadcn `<Card>` with `<CardHeader>` / `<CardContent>`.
- **Typography**: Match existing admin font (Geist variable font already loaded).
- **Animations**: `tw-animate-css` already installed — use `animate-in`, `fade-in` on mount for cards.
- **Charts**: Recharts tooltip styled to match shadcn design system via the `ChartTooltip` / `ChartTooltipContent` shadcn primitives.

---

## Implementation Order

1. Install `recharts`, add shadcn `chart`, `card`, `table`, `progress`, `tabs` components
2. Write all fake data constants
3. KPI cards + sparklines
4. Revenue trend area chart
5. Conversion funnel (custom SVG)
6. Channel bar chart
7. Customer analytics (donut + stacked area)
8. Top products table
9. Inventory alerts
10. Live activity feed
11. Wire up period selector to swap datasets
12. Polish: spacing, colors, animations, responsive breakpoints
