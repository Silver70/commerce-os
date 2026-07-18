# Analytics Implementation Plan

A phased plan to grow the current single-screen dashboard into a real analytics suite that answers the core business questions in [context/analyticMVp.md](analyticMVp.md): _Are people buying? Where are sales coming from? What's selling? Where do customers drop off? Are we making money?_

> **Scope philosophy:** ship value in the order of _effort-to-value_, not doc order. Everything in **Phase 0 + 1** is queryable from tables we already have. Only **Phase 2** (traffic sources + top-of-funnel) needs new instrumentation, so it's deliberately last.

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

Mirror the existing admin feature structure ([context/frontend-guideline.md](frontend-guideline.md)): thin routes → `src/features/<module>/` → `server.ts` (server fns) + `queries.ts` (query options) + `pages/` + `components/`. Money stays in **integer cents** end-to-end; never format server-side. New backend work lives in the existing `dashboard` module (rename-optional to `analytics`).

---

## Phase 0 — Fix what's broken, surface what's free

Small, high-trust changes. No new tables.

### 0.1 Fix the Conversion Rate metric (bug)

Conversion is computed as `converted / (converted + abandoned)` carts ([dashboard.service.ts:232](../apps/backend/src/modules/dashboard/services/dashboard.service.ts#L232)), but **nothing ever sets a cart to `abandoned`** — the only status write is `→ converted` at [cart.repository.ts:161](../apps/backend/src/modules/cart/repositories/cart.repository.ts#L161). So the denominator ≈ the numerator and the card always reads ~100% (or 0%).

**Fix:** add a cart-expiry cron that flips stale `active` carts (past `expiresAt`) to `abandoned`. `ScheduleModule` is already wired ([app.module.ts:38](../apps/backend/src/app.module.ts#L38)) and there's a working `@Cron` precedent in [inventory.service.ts:257](../apps/backend/src/modules/inventory/services/inventory.service.ts#L257). This one job makes conversion _and_ cart-abandonment analytics real.

### 0.2 Render the metrics already returned

Add cards/sections for **returning-customer rate** (already computed) and wire the **snapshot counts** (`pendingOrders`, `processingOrders`, `lowStockItems`) into a small operational strip on the dashboard.

**Deliverable:** trustworthy conversion number + returning-rate card + ops snapshot. No API shape change beyond consuming existing fields.

---

## Phase 1 — Analytics from existing data (no new tracking)

The bulk of the MVP doc, all answerable with SQL over current tables. Suggested new endpoints under `/api/admin/analytics/*` (or extend the dashboard module), each period-aware and store-scoped, each returning integer-cents money.

| #   | Feature                                                               | Endpoint (proposed)                   | Source tables                                                    | Chart          |
| --- | --------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- | -------------- |
| 1   | **Sales by product** (top sellers: qty + revenue)                     | `GET .../analytics/top-products`      | `order_line_items`                                               | horizontal bar |
| 2   | **Sales by category**                                                 | `GET .../analytics/sales-by-category` | line item → `variantId` → `product_categories` → `categories` ⚠️ | horizontal bar |
| 3   | **Order status breakdown**                                            | `GET .../analytics/order-status`      | `orders.status`                                                  | donut          |
| 4   | **Customer growth** (new over time) + total-customers KPI             | `GET .../analytics/customer-growth`   | `customers.createdAt`                                            | line           |
| 5   | **New vs. returning**                                                 | (already computed)                    | `orders`                                                         | KPI / split    |
| 6   | **Revenue vs. orders trend** (overlay orders on the revenue chart)    | existing `stats`                      | `orders`                                                         | dual-axis line |
| 7   | **Cart abandonment rate + lost value**                                | `GET .../analytics/cart-abandonment`  | `carts` (needs 0.1)                                              | KPI + trend    |
| 8   | **Refund rate / refunded revenue**                                    | `GET .../analytics/refunds`           | `refunds`                                                        | KPI + trend    |
| 9   | **Discount & coupon effectiveness**                                   | `GET .../analytics/discounts`         | `orders.couponCode`, `discountAmount`                            | table          |
| 10  | **Payment success/failure rate**                                      | `GET .../analytics/payments`          | `payments.status`                                                | donut / KPI    |
| 11  | **Inventory overview** (low stock, out of stock, stock-on-hand value) | `GET .../analytics/inventory`         | `inventory_items` + `variants.costPrice`                         | bar + KPI      |

### The two high-value items the MVP doc _omits_ (do these first in Phase 1)

Our schema uniquely pays for these — most MVPs can't:

- **Gross margin / profit.** We store `product_variants.costPrice`, so margin = line-item `unitPrice`/`totalPrice` − cost. A profit KPI + margin-by-product view. `GET .../analytics/profit`.
- **Cart abandonment rate** (item 7). Directly answers the user's opening question ("where are they abandoning"), and only needs the Phase 0.1 job.

### ⚠️ Category-sales caveat

`order_line_items` snapshots `productName` but **not** category, and `variantId` is **nullable**. Sales-by-category must join to the _live_ variant→product→category, so recategorizing a product reshapes historical category charts, and manual/line items with no `variantId` fall into an "uncategorized" bucket. Acceptable for analytics — just not immutable like the rest of the order. If we later want true point-in-time category attribution, snapshot `category_id` onto line items at order creation.

### Frontend

Promote analytics to its own nav entry (`/admin/analytics`) alongside the existing dashboard, or expand the dashboard route into tabbed sections (Overview / Sales / Customers / Inventory). Reuse the recharts + shadcn `chart.tsx` setup; add `donut`/`horizontal-bar` chart wrappers. New feature dir: `src/features/analytics/` following the established `server.ts`/`queries.ts`/`pages`/`components` layout.

**Deliverable:** a genuine analytics dashboard answering "what's selling," "which categories," "are we profitable," "where are carts lost," "operational order/inventory health" — entirely from existing data.

---

## Phase 2 — Traffic & full funnel (needs instrumentation)

The MVP doc's most-wanted items we **cannot** answer today: **Traffic Source Breakdown** and the **top of the conversion funnel** (Visitors → Product Views → Add to Cart). The `carts` table only gives the funnel _bottom_ (Add-to-Cart → Checkout → Purchase). Everything above it requires capturing events the system never sees.

### 2.1 Event pipeline

1. **New table `analytics_events`** — `(id, organization_id, store_id, session_id, event_type, product_id?, variant_id?, path, referrer, utm_source, utm_medium, utm_campaign, occurred_at)`. `event_type` ∈ `page_view | product_view | add_to_cart | checkout_start | purchase`. Tenant-scoped like every other table (RLS + `organization_id` as 2nd column, per CLAUDE.md).
2. **Ingest endpoint** — lightweight REST, `X-API-Key` auth (same boundary the storefront already uses), batched, fire-and-forget. Bot filtering + basic rate limiting.
3. **Storefront instrumentation** — emit `page_view` / `product_view` / `add_to_cart` from `apps/storefront`, keyed by a session cookie. There's already a session lib at `apps/storefront/src/lib/session.ts` to piggyback on. Capture `referrer` + UTM params on first landing and persist to the session.

### 2.2 What it unlocks

- **Traffic source breakdown** (organic / ads / social / direct / referral) — donut, from `referrer` + UTM.
- **True conversion rate** = orders ÷ unique visitors (today's "conversion" is only cart-level).
- **Full conversion funnel** — Visitors → Product Views → Add to Cart → Checkout → Purchase, exposing exactly where drop-off happens.

### 2.3 Scale note

Event volume dwarfs order volume. Design for it from the start: index on `(organization_id, store_id, occurred_at)`, and plan a **daily rollup** job (reuse `ScheduleModule`) into a summary table so dashboards query aggregates, not raw events. Raw events can be retained on a shorter window.

**Deliverable:** the traffic + funnel views that answer the user's original "where are they coming from / where do they abandon" in full.

---

## Deliberately deferred (per the MVP doc's "leave out")

LTV, cohort retention, churn, heatmaps, advanced segmentation, geographic maps, ad-campaign ROI, demand forecasting, predictive analytics. Revisit once Phase 2 has accumulated data.

---

## Sequencing summary

| Phase                                                                              | Effort | Value        | Blocked by            |
| ---------------------------------------------------------------------------------- | ------ | ------------ | --------------------- |
| **0** — fix conversion + surface computed metrics                                  | XS     | High (trust) | —                     |
| **1** — sales/product/category/status/customer/profit/abandonment/refund/inventory | M      | Highest      | 0.1 (for abandonment) |
| **2** — traffic sources + full funnel                                              | L      | High         | new events pipeline   |

Recommended order: **0 → 1 → 2**. Phase 0 is a day's work and removes a misleading number; Phase 1 is the value core and touches no new infrastructure; Phase 2 is the larger build and is cleanly isolated behind a new events table + storefront instrumentation.
