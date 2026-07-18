# Analytics Implementation Plan

A phased plan to grow the current single-screen dashboard into a real analytics suite that answers the core business questions in [context/analyticMVp.md](analyticMVp.md): _Are people buying? Where are sales coming from? What's selling? Where do customers drop off? Are we making money?_

> **Scope philosophy:** ship value in the order of _effort-to-value_, not doc order. Everything in **Phase 0 + 1** is queryable from tables we already have. Only **Phase 2** (traffic sources + top-of-funnel) needs new instrumentation, so it's deliberately last.

> **Status (2026-07-18):** Phase 0 ✅, Phase 1 ✅, and Phase 2 ✅ shipped. Phase 2 landed **headless** — event-ingest API + admin Traffic tab, no storefront instrumentation (integrators own that). Migration `0005_analytics_events.sql` **applied**; the funnel + first-touch channel-derivation SQL was runtime-verified against the DB (funnel counts + Organic/Social/Paid classification correct). Deferred: Phase 1's revenue-vs-orders dual-axis overlay, and Phase 2's daily-rollup job (raw-event queries suffice at MVP volume). The `apps/backend` `analytics` module is **standalone** (`src/modules/analytics/`).

---

## 0. Current state (baseline)

One endpoint feeds one screen.

- **Backend:** `GET /api/admin/dashboard/stats?period=today|7d|30d|90d` → [dashboard.service.ts](../apps/backend/src/modules/dashboard/services/dashboard.service.ts), [admin-dashboard.controller.ts](../apps/backend/src/modules/dashboard/controllers/admin-dashboard.controller.ts). Returns `revenue`, `orders`, `aov`, `conversion`, `returning` (each `{ current, prior, delta, sparkline }`) plus snapshot counts `pendingOrders`, `processingOrders`, `lowStockItems`. All org- + store-scoped.
- **Frontend:** [dashboard-page.tsx](../apps/frontend/src/features/dashboard/pages/dashboard-page.tsx) renders 4 KPI cards (Revenue, Orders, Conversion, AOV), one revenue area chart ([revenue-trend.tsx](../apps/frontend/src/features/dashboard/components/revenue-trend.tsx)), and a recent-orders table. Charts use **recharts** (already a dependency) via the shadcn `chart.tsx` wrapper.

### What's already computed but NOT displayed

The backend returns `returning`, `pendingOrders`, `processingOrders`, and `lowStockItems`, but the UI ignores them. Free wins.

### Data we have vs. data we don't

- **Rich:** orders, `order_line_items` (with `productName`, `quantity`, `unitPrice`, `totalPrice`), carts (status `active|converted|abandoned`), customers, `inventory_items`, `payments`, `refunds`, `product_variants.costPrice`.
- **Missing entirely:** any storefront traffic signal — no pageviews, sessions, referrers, or UTM capture anywhere in `apps/backend` or `apps/storefront`. This is the single constraint that pushes traffic + funnel-top to Phase 2.

### Conventions this plan follows

Mirror the existing admin feature structure ([context/frontend-guideline.md](frontend-guideline.md)): thin routes → `src/features/<module>/` → `server.ts` (server fns) + `queries.ts` (query options) + `pages/` + `components/`. Money stays in **integer cents** end-to-end; never format server-side. Backend analytics lives in its **own `analytics` module** ([src/modules/analytics/](../apps/backend/src/modules/analytics/)) — extracted out of `dashboard` so it can keep growing independently; it owns its `AnalyticsPeriod` type and exports `AnalyticsService`.

---

## Phase 0 — Fix what's broken, surface what's free ✅ Done

Small, high-trust changes. No new tables.

### 0.1 Fix the Conversion Rate metric (bug)

Conversion is computed as `converted / (converted + abandoned)` carts ([dashboard.service.ts:232](../apps/backend/src/modules/dashboard/services/dashboard.service.ts#L232)), but **nothing ever sets a cart to `abandoned`** — the only status write is `→ converted` at [cart.repository.ts:161](../apps/backend/src/modules/cart/repositories/cart.repository.ts#L161). So the denominator ≈ the numerator and the card always reads ~100% (or 0%).

**Fix:** add a cart-expiry cron that flips stale `active` carts to `abandoned`. `ScheduleModule` is already wired ([app.module.ts:38](../apps/backend/src/app.module.ts#L38)) and there's a working `@Cron` precedent in [inventory.service.ts:257](../apps/backend/src/modules/inventory/services/inventory.service.ts#L257). This one job makes conversion _and_ cart-abandonment analytics real.

**Shipped as:** `CartService.expireStaleCarts` (`@Cron */15`) → `CartRepository.markStaleCartsAbandoned`. `carts.expiresAt` turned out to be **never populated**, so staleness is measured by **inactivity on `updatedAt`** (bumped on every mutation) past a 60-min window, and only carts that actually held items (`subtotal > 0`) are flipped — empty auto-created carts never pollute the conversion denominator. Because `abandoned` became reachable for the first time, the storefront was hardened too: `getCart` treats a non-active cart as empty and `addToCart` mints a fresh cart + retries once (a returning guest never gets stuck on a dead cart).

### 0.2 Render the metrics already returned

Add cards/sections for **returning-customer rate** (already computed) and wire the **snapshot counts** (`pendingOrders`, `processingOrders`, `lowStockItems`) into a small operational strip on the dashboard.

**Deliverable:** trustworthy conversion number + returning-rate card + ops snapshot. No API shape change beyond consuming existing fields.

---

## Phase 1 — Analytics from existing data (no new tracking) ✅ Done

The bulk of the MVP doc, all answerable with SQL over current tables. **Shipped as four grouped, tab-aligned endpoints** under `/api/admin/analytics/*` (rather than ~11 discrete ones, to cut frontend round-trips), all `dashboard.read`-scoped, period-aware (except `inventory`, which is point-in-time), returning integer-cents money — in the standalone [analytics module](../apps/backend/src/modules/analytics/):

- `GET /api/admin/analytics/sales` — top products, sales by category, profit/margin, coupon effectiveness
- `GET /api/admin/analytics/orders` — status breakdown, cart abandonment, refunds, payments
- `GET /api/admin/analytics/customers` — total/new customers, growth series, new-vs-returning
- `GET /api/admin/analytics/inventory` — low/out-of-stock, stock-on-hand, stock value at cost

The table below maps each metric to the endpoint it landed in.

| #   | Feature                                                               | Endpoint (built)          | Source tables                                                    | Chart          | Status      |
| --- | --------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------- | -------------- | ----------- |
| 1   | **Sales by product** (top sellers: qty + revenue)                     | `.../analytics/sales`     | `order_line_items`                                               | ranked bars    | ✅          |
| 2   | **Sales by category**                                                 | `.../analytics/sales`     | line item → `variantId` → `product_categories` → `categories` ⚠️ | ranked bars    | ✅          |
| 3   | **Order status breakdown**                                            | `.../analytics/orders`    | `orders.status`                                                  | donut          | ✅          |
| 4   | **Customer growth** (new over time) + total-customers KPI             | `.../analytics/customers` | `customers.createdAt`                                            | area           | ✅          |
| 5   | **New vs. returning**                                                 | `.../analytics/customers` | `orders`                                                         | donut / KPI    | ✅          |
| 6   | **Revenue vs. orders trend** (overlay orders on the revenue chart)    | dashboard `stats`         | `orders`                                                         | dual-axis line | ⬜ deferred |
| 7   | **Cart abandonment rate + lost value**                                | `.../analytics/orders`    | `carts` (needs 0.1)                                              | KPI            | ✅          |
| 8   | **Refund rate / refunded revenue**                                    | `.../analytics/orders`    | `refunds`                                                        | KPI            | ✅          |
| 9   | **Discount & coupon effectiveness**                                   | `.../analytics/sales`     | `orders.couponCode`, `discountAmount`                            | ranked bars    | ✅          |
| 10  | **Payment success/failure rate**                                      | `.../analytics/orders`    | `payments.status`                                                | donut / KPI    | ✅          |
| 11  | **Inventory overview** (low stock, out of stock, stock-on-hand value) | `.../analytics/inventory` | `inventory_items` + `variants.costPrice`                         | KPI + table    | ✅          |
| +   | **Gross margin / profit** (schema-unique)                             | `.../analytics/sales`     | `order_line_items` + `variants.costPrice`                        | KPI            | ✅          |

> Item 6 (revenue-vs-orders dual-axis overlay on the dashboard chart) is the one Phase 1 metric not yet built — both series (`revenue.sparkline`, `orders.sparkline`) are already returned by dashboard `stats`, so it's a frontend-only change to [revenue-trend.tsx](../apps/frontend/src/features/dashboard/components/revenue-trend.tsx) whenever wanted.

### The two high-value items the MVP doc _omits_ (shipped)

Our schema uniquely pays for these — most MVPs can't:

- **Gross margin / profit.** We store `product_variants.costPrice`, so margin = line-item `totalPrice` − cost. Shipped as a KPI in `/analytics/sales`, reported with a `coveragePct` caveat (share of revenue whose lines have a known cost) since `costPrice` is nullable.
- **Cart abandonment rate.** Directly answers the user's opening question ("where are they abandoning"); shipped in `/analytics/orders`, powered by the Phase 0.1 job.

### ⚠️ Category-sales caveat

`order_line_items` snapshots `productName` but **not** category, and `variantId` is **nullable**. Sales-by-category must join to the _live_ variant→product→category, so recategorizing a product reshapes historical category charts, and manual/line items with no `variantId` fall into an "uncategorized" bucket. Acceptable for analytics — just not immutable like the rest of the order. If we later want true point-in-time category attribution, snapshot `category_id` onto line items at order creation.

### Frontend (shipped)

Analytics got its **own nav entry** ([/admin/analytics](../apps/frontend/src/routes/admin/analytics.tsx)) alongside the dashboard, built as a tabbed page (period selector × **Sales / Orders / Customers / Inventory**), each tab lazy-loaded behind its own Suspense boundary. New feature dir [src/features/analytics/](../apps/frontend/src/features/analytics/) follows the established `server.ts`/`queries.ts`/`pages`/`components` layout, with reusable `RankedBarList`, `DonutChart`, and `StatTile` components on top of the recharts + shadcn `chart.tsx` setup. (Phase 0's returning-rate KPI and ops-snapshot strip stayed on the dashboard home.)

**Delivered:** a genuine analytics suite answering "what's selling," "which categories," "are we profitable," "where are carts lost," and "operational order/inventory health" — entirely from existing data.

---

## Phase 2 — Traffic & full funnel ✅ Done (headless)

The MVP doc's most-wanted items we couldn't answer before: **Traffic Source Breakdown** and the **top of the conversion funnel** (Visitors → Product Views → Add to Cart). The `carts` table only gives the funnel _bottom_; everything above it requires capturing events the system never saw.

> **Headless scope decision:** this is a headless platform, so Phase 2 shipped as **backend APIs any frontend can use** + the admin visualization — **not** storefront-specific instrumentation. The event-ingestion API is the contract; each integrating storefront owns its own `sessionId` and attribution capture. Our `apps/storefront` was intentionally left untouched.

### 2.1 Event pipeline (shipped)

1. **Table [`analytics_events`](../apps/backend/src/shared/database/schema/analytics-events.schema.ts)** — `(id, organization_id, store_id, session_id, event_type, product_id?, variant_id?, path, referrer, utm_source, utm_medium, utm_campaign, occurred_at, created_at)`. `event_type` ∈ `page_view | product_view | add_to_cart | checkout_start | purchase`. `organization_id` as 2nd column + explicit tenant scoping in every query (matches the codebase; RLS policies aren't in migrations for any table). Three composite indexes on `(org, store, …)`. Migration `0005_analytics_events.sql` — **applied**. `product_id`/`variant_id` are deliberately NOT FKs so events survive product deletion.
2. **Ingest endpoint** — `POST /api/events` ([StorefrontEventsController](../apps/backend/src/modules/analytics/controllers/storefront-events.controller.ts)), `X-API-Key` auth via the existing `StorefrontAuthGuard` (resolves org + store; tenant never trusted from the body), batched (≤50 events), returns `202`. Sits under the `storefront` rate-limit bucket.
3. **Instrumentation** — _delegated to the integrating frontend_ (headless). It sends `sessionId` + optional `referrer`/`utm_*`/`path`/`productId` per event; the backend derives channel + funnel at query time.

### 2.2 What it unlocks (shipped)

- **Traffic source breakdown** — first-touch channel (Direct / Organic Search / Social / Paid / Campaign / Referral) derived in SQL from `utm_*` + referrer host; donut in the admin **Traffic** tab.
- **True conversion rate** = orders ÷ unique visitors (vs. the cart-level "conversion" on the dashboard).
- **Full conversion funnel** — Visitors → Product Views → Add to Cart → Checkout → Purchase, distinct sessions per stage, with step drop-off. Served by `GET /api/admin/analytics/traffic?period=`; visualized in [traffic-tab.tsx](../apps/frontend/src/features/analytics/components/traffic-tab.tsx) + [funnel-chart.tsx](../apps/frontend/src/features/analytics/components/funnel-chart.tsx).

### 2.3 Scale note

Event volume dwarfs order volume. The composite indexes on `(organization_id, store_id, occurred_at | session_id | event_type,occurred_at)` are in place. A **daily rollup** job (reuse `ScheduleModule`) into a summary table is **not yet built** — current queries hit raw events, which is fine at MVP volume; add the rollup before traffic scales. Raw-event retention/TTL is also a future concern.

**Delivered:** the traffic + funnel views that answer "where are they coming from / where do they abandon" — for any frontend that posts to the ingest API. (The admin Traffic tab shows an empty-state hint until events flow in.)

---

## Deliberately deferred (per the MVP doc's "leave out")

LTV, cohort retention, churn, heatmaps, advanced segmentation, geographic maps, ad-campaign ROI, demand forecasting, predictive analytics. Revisit once Phase 2 has accumulated data.

---

## Sequencing summary

| Phase                                                                              | Effort | Value        | Blocked by            | Status                    |
| ---------------------------------------------------------------------------------- | ------ | ------------ | --------------------- | ------------------------- |
| **0** — fix conversion + surface computed metrics                                  | XS     | High (trust) | —                     | ✅ Done                   |
| **1** — sales/product/category/status/customer/profit/abandonment/refund/inventory | M      | Highest      | 0.1 (for abandonment) | ✅ Done (item 6 deferred) |
| **2** — traffic sources + full funnel                                              | L      | High         | new events pipeline   | ✅ Done (headless)        |

Recommended order: **0 → 1 → 2**. Phase 0 is a day's work and removes a misleading number; Phase 1 is the value core and touches no new infrastructure; Phase 2 is the larger build, cleanly isolated behind the new `analytics_events` table + ingest API.

**Remaining loose ends:** (1) the daily-rollup job for `analytics_events` (Phase 2.3) before traffic scales; (2) the revenue-vs-orders dual-axis overlay (Phase 1, item 6) — a small frontend-only change. None block the shipped functionality. (Migration `0005` is applied.)
