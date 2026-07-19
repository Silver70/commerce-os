# Analytics Implementation Plan

A phased plan to grow the current single-screen dashboard into a real analytics suite that answers the core business questions in [context/analyticMVp.md](analyticMVp.md): _Are people buying? Where are sales coming from? What's selling? Where do customers drop off? Are we making money?_

> **Scope philosophy:** ship value in the order of _effort-to-value_, not doc order. Everything in **Phase 0 + 1** is queryable from tables we already have. Only **Phase 2** (traffic sources + top-of-funnel) needs new instrumentation, so it's deliberately last.

> **Status (2026-07-18):** Phase 0 ✅, Phase 1 ✅, and Phase 2 ✅ shipped. Phase 2 landed **headless** — event-ingest API + admin Traffic tab, no storefront instrumentation (integrators own that). Migration `0005_analytics_events.sql` **applied**; the funnel + first-touch channel-derivation SQL was runtime-verified against the DB (funnel counts + Organic/Social/Paid classification correct). Deferred: Phase 1's revenue-vs-orders dual-axis overlay, and Phase 2's daily-rollup job (raw-event queries suffice at MVP volume). The `apps/backend` `analytics` module is **standalone** (`src/modules/analytics/`).

> **Update (2026-07-19):** **Phase 3 📋 drafted below** — ship a first-party **drop-in tracking script** so any storefront gets instrumentation for free, and widen the event model from a 5-stage funnel logger into a general **behavioral collector**: page views, devices, locations, channels (incl. **LLM referrals**), click-level breakdown, form-submission tracking, and custom attributes. Nothing in Phase 3 is built yet; it also promotes two Phase 2 "loose ends" (the daily-rollup job + raw-event retention) from _optional_ to _required_, because clicks + pageviews multiply event volume 10–100×.

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

## Phase 3 — Behavioral collector + the drop-in tracking script 📋 Planned

Phase 2 built the ingest _contract_ but deliberately left instrumentation to integrators — so the pipeline exists with **zero data flowing** (grep confirms no storefront code posts to `/api/events`). Phase 3 closes both halves of the gap the user asked for:

1. **Ship a first-party drop-in script** (`ca.js`) so any storefront — ours or a third party's — gets full instrumentation from a single `<script>` tag, no integration work.
2. **Widen the event model** from a narrow 5-stage funnel logger into a general **behavioral collector**: page views, devices, locations, channels (incl. **LLM referrals**), click-level breakdown, form submissions, and arbitrary custom **attributes**.

> **Scope philosophy (unchanged):** effort-to-value order, and stay **headless**. The script is the reference integration, not a hard dependency — the ingest API stays the contract, so a store can still send its own events. Data flows the moment slices 3.1 + 3.2 land; the UI (3.4) just makes it visible.

> **The single shape change:** today's [`analytics_events`](../apps/backend/src/shared/database/schema/analytics-events.schema.ts) is fixed-column with a **closed enum** of 5 funnel stages. Clicks, form submits, and custom events need an **open taxonomy + a `properties` bag**. That, plus server-side enrichment (device/geo/channel) and the script, is the whole of Phase 3.

### 3.1 Schema evolution — open taxonomy + enrichment columns

Extend `analytics_events` in place (migration `0006_analytics_events_behavioral.sql`); no new raw-event table.

- **`event_type` enum → `varchar(48)`** (`ALTER COLUMN ... TYPE varchar USING event_type::text`, then drop the `analytics_event_type` type). The taxonomy is now open — validated at the app layer, not the DB. Reserved names keep the funnel working: `page_view`, `product_view`, `add_to_cart`, `checkout_start`, `purchase`; new reserved: `session_start`, `click`, `form_submit`, `custom`.
- **`visitor_id varchar(128)`** — persistent anonymous id from the script (distinct from `session_id`). Unlocks accurate uniques across sessions and returning-visitor rate at the traffic level, which the session-only model can't express.
- **`event_name varchar(128)`** — human label for `click` / `custom` events (e.g. `"Add to cart button"`, `"newsletter_signup"`).
- **`properties jsonb`** — the **attributes** bag. Click details (element tag, text, href, selector), form details (form id/name, field _names_), and any custom `props` live here — not in dedicated columns, since they're high-cardinality and varied.
- **`device_type varchar(16)`, `browser varchar(64)`, `os varchar(64)`** — server-derived (see 3.2).
- **`country_code char(2)`, `region varchar(128)`** — server-derived from IP/CDN header. **City deliberately omitted** at MVP (privacy).
- **Indexes:** add `(organization_id, store_id, visitor_id)` and `(organization_id, store_id, event_name, occurred_at)`. Keep the three existing composites.

⚠️ **Volume:** clicks + pageviews are **10–100× funnel-event volume.** Month-based **partitioning** of `analytics_events` should land with this migration (or immediately after) — retrofitting a partition key onto a large table is painful. See 3.5.

### 3.2 Ingest enrichment + transport fix

The current ingest is a raw insert ([event-ingest.service.ts](../apps/backend/src/modules/analytics/services/event-ingest.service.ts)). Phase 3 adds an **enrichment step** before insert:

- **Device** — parse `User-Agent` (`ua-parser-js`, small + maintained) → `device_type` / `browser` / `os`. **Drop known bots** (or flag + exclude from counts) to keep numbers clean.
- **Location** — resolve client IP → `country_code` / `region`. Prefer a CDN geo header (`CF-IPCountry`, `x-vercel-ip-country`) when present; optional GeoLite2 (`@maxmind/geoip2-node` + `GeoLite2-Country.mmdb`) fallback. Requires **`app.set('trust proxy', …)`** in [main.ts](../apps/backend/src/main.ts) so `X-Forwarded-For` is honored. **Derive geo, then discard the raw IP** — never store it (GDPR).
- **Channel / LLM referrals** — keep channel derivation at **query time** (no backfill, flexible), and extend the `CASE` in [`trafficSources`](../apps/backend/src/modules/analytics/services/analytics.service.ts#L200) with an **"AI Assistant"** bucket matching `chatgpt.com`, `chat.openai.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`, `you.com`, `poe.com`, plus `utm_source` values these set. High-value and currently invisible (they land in the generic "Referral" bucket today).

⚠️ **Transport fix the script forces:** `navigator.sendBeacon` (the only reliable on-unload transport) **cannot set an `X-API-Key` header.** The ingest route must also accept the key via **query param** (`POST /api/events?k=…`). A body field won't work — the global `ValidationPipe({ forbidNonWhitelisted: true })` ([main.ts](../apps/backend/src/main.ts)) rejects unknown body fields. Do this with a small ingest-specific guard variant (header **or** `?k=`), leaving [StorefrontAuthGuard](../apps/backend/src/modules/auth/guards/storefront-auth.guard.ts) untouched for GraphQL/cart. Also bump `ArrayMaxSize` from **50 → 100** in [track-events.dto.ts](../apps/backend/src/modules/analytics/dto/track-events.dto.ts) (click-heavy pages batch more), and confirm the `storefront` throttle bucket (100 req/min/key, [app.module.ts](../apps/backend/src/app.module.ts)) is sized for it — 100×100 = 10k events/min/key headroom.

### 3.3 The tracking script — `ca.js`

A ~4KB, zero-dependency IIFE built as a new monorepo package **`packages/analytics-js`** and served by the backend at a **stable, cacheable, unauthenticated** path (`GET /ca.js`). Integrators embed:

```html
<script src="https://api.<host>/ca.js" data-key="pk_live_…" defer></script>
```

Responsibilities:

- **Identity + sessionization** — persistent anonymous `visitor_id` + a `session_id` that rolls after 30 min inactivity. Two modes (see decision D2): a first-party cookie, or a **cookieless** daily-rotating hash (Plausible-style — no consent banner, at the cost of cross-day returning-visitor accuracy).
- **Page views** — fire on load, and patch `history.pushState`/`replaceState` + `popstate` so **SPA route changes** (our storefronts are TanStack Router) emit page views. Captures path, referrer, `utm_*`, title, viewport, language.
- **Click breakdown** — one **delegated** listener; records tag, truncated text, `href`, `id`, and nearest `data-ca-*` into `properties`. On/opt-in per decision D1.
- **Form submissions** — `submit` listener records form `id`/`name`/`action` + **field names only, never values** (PII). Optionally a `form_start` on first field focus for form-abandonment.
- **Custom events + attributes** — `window.ca('track', name, props)`; `props` → `properties`. Plus ecommerce helpers (`ca('productView', {productId})`, `ca('addToCart', …)`, `ca('purchase', {orderId, value})`) that keep the **Phase 2 funnel** populated.
- **Transport** — queue + batch; flush on a timer and on `visibilitychange:hidden` / `pagehide` via `sendBeacon` (falling back to `fetch({keepalive:true})`). Uses the `?k=` key form.
- **Consent + DNT** — honors Do-Not-Track / GPC when configured (`data-respect-dnt`); no-ops until `ca('consent','granted')` when consent-gating is enabled.

### 3.4 Admin surfaces — new tabs + endpoints

All reuse the existing `StatTile` / `DonutChart` / `BarChartCard` / `RankedBarList` components and follow the `server.ts` / `queries.ts` / `pages` / `components` layout in [src/features/analytics/](../apps/frontend/src/features/analytics/). New endpoints are `dashboard.read`-scoped and period-aware, mirroring [admin-analytics.controller.ts](../apps/backend/src/modules/analytics/controllers/admin-analytics.controller.ts).

| Surface | Endpoint | Content |
| --- | --- | --- |
| **Traffic** (extend) | `.../analytics/traffic` | Add an **AI Assistant** channel tile + a **Top referrers** table |
| **Audience** (new tab) | `GET .../analytics/audience` | Device-type donut, browser + OS bars, **country** table, language bar |
| **Behavior** (new tab) | `GET .../analytics/behavior` | **Top pages** (views + uniques), **top clicks** (element + text), **form submissions** (starts vs submits, top forms), entry/exit pages |

Wire the two new tabs into [analytics-page.tsx](../apps/frontend/src/features/analytics/pages/analytics-page.tsx) alongside Sales / Orders / Traffic / Customers / Inventory, each behind its own Suspense boundary.

### 3.5 Volume, rollups & retention (now required, not deferred)

Phase 2 flagged the daily rollup + retention as optional at funnel-only volume. With clicks + pageviews they're **table stakes**:

- **Rollup job** — a nightly `@Cron` (reuse `ScheduleModule`) aggregates raw events into summary tables keyed by `(organization_id, store_id, day, dimension)` — pageviews-by-path, sessions-by-channel, device/geo breakdowns. Admin queries hit rollups for anything older than "today"; today reads raw.
- **Retention TTL** — a cron deletes raw `analytics_events` past ~90 days; rollups are permanent.
- **Partitioning** — month partitions on `analytics_events` (from 3.1) make the TTL a cheap `DROP PARTITION` instead of a mass `DELETE`.

### 3.6 Privacy & compliance

This is where the data model turns from "orders we already had" into **real behavioral tracking** — treat it as such:

- **No PII in the payload** — form **field names only**, never values; truncate click text; option to strip query-string values from `path`.
- **No raw IP stored** — geo is derived at ingest, IP discarded.
- **Cookieless-first** — default to the rotating-hash `visitor_id` (decision D2) so the script drops in without a consent banner in most jurisdictions.
- **DNT / GPC honored**, and a **consent-gating** no-op mode for stores that need it.

### Feature → delivery map

| Feature (requested)      | Lands in     | Mechanism                                                          |
| ------------------------ | ------------ | ----------------------------------------------------------------- |
| **Page views**           | 3.1/3.3/3.4  | `page_view` + SPA route hook → Behavior · Top pages               |
| **Devices**              | 3.2/3.4      | UA parse → `device_type`/`browser`/`os` → Audience                |
| **Locations**            | 3.2/3.4      | IP/CDN header → `country_code`/`region` → Audience                |
| **Channels**             | 3.2/3.4      | query-time derivation (extended) → Traffic                        |
| **LLM referrals**        | 3.2/3.4      | "AI Assistant" bucket in the channel `CASE` → Traffic tile        |
| **Click breakdown**      | 3.1/3.3/3.4  | `click` events + `properties` → Behavior · Top clicks             |
| **Form submissions**     | 3.1/3.3/3.4  | `form_submit` (+ `form_start`) → Behavior · Forms                 |
| **Attributes**           | 3.1/3.3      | `properties jsonb` + `ca('track', name, props)`                   |

### Decisions needed before building

| #  | Decision                    | Options                                                        | Recommendation                                                              |
| -- | --------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| D1 | **Autocapture default**     | Clicks/forms on-by-default vs opt-in via `data-ca-*`          | **Opt-in** for clicks/forms (privacy + volume), with a global `data-autocapture` escape hatch |
| D2 | **Visitor identity**        | Persistent cookie vs cookieless rotating hash                 | **Cookieless default**, persistent as opt-in                                |
| D3 | **Ingest key**              | Reuse the storefront read key vs a new write-only publishable key | New **publishable ingest key** eventually; **reuse acceptable for MVP** (documented caveat: it's exposed in a public `<script>`) |
| D4 | **Geo source**              | CDN header only vs bundle GeoLite2                            | **CDN header first**, GeoLite2 fallback only if a store isn't behind a geo-aware edge |
| D5 | **Script hosting**          | Backend static route (`GET /ca.js`) vs external CDN           | **Backend route** for MVP (versioned + long cache), CDN later               |

### Phase 3 sequencing

Four slices; data flows after the first two.

| Slice  | Scope                                                    | Effort | Unblocks                          |
| ------ | ------------------------------------------------------- | ------ | --------------------------------- |
| **A**  | 3.1 schema widen + 3.2 enrichment + `?k=` guard variant | M      | events can be ingested + enriched |
| **B**  | 3.3 `ca.js` package + `GET /ca.js`                      | M      | any storefront emits real data    |
| **C**  | 3.4 Audience + Behavior tabs + LLM channel in Traffic   | M      | the data becomes visible          |
| **D**  | 3.5 rollup job + retention TTL + partitioning           | M–L    | keeps queries fast as traffic grows |

Recommended order **A → B → C → D**; A+B together light up live data, C makes it visible, D must land before real traffic scales.

> **Status (2026-07-19):** slices **A ✅**, **B ✅**, and **C ✅** shipped & verified. A: `analytics_events` widened (migration `0006` applied), server-side device/geo enrichment, `?k=` ingest guard — smoke-tested end-to-end. B: `@repo/analytics-js` builds `ca.js` (5.7KB min, cookieless, SPA page views, opt-in click/form autocapture, `sendBeacon`/keepalive transport), served by the backend at `GET /ca.js` (byte-identical + ETag/304 verified; ran the minified bundle in a stubbed-DOM harness). C: two new admin endpoints (`/analytics/audience`, `/analytics/behavior`) + **Audience** and **Behavior** tabs, an **AI Assistant** channel + **top-referrers** in Traffic, and a `device_type <> 'bot'` filter across every event query — verified by running the real `AnalyticsService` against seeded DB rows (AI classification, referrer-host extraction, jsonb click/form fallbacks, bot exclusion all correct). **Live data now flows and is fully visualized.** D: permanent daily-rollup table (`analytics_daily_metrics`, migration `0007` applied) + idempotent nightly `@Cron` aggregation (summary/device/browser/os/country/channel/page, bots excluded) + a retention-TTL purge cron (`ANALYTICS_RETENTION_DAYS`, default 90d, `0` disables) — verified against the DB (rollup counts, bot exclusion, idempotency, and the purge predicate all correct; no destructive purge run on shared data). **Table partitioning intentionally deferred** — retention keeps the table bounded, and converting a live table to partitioned is a heavy migration not justified at current volume. **Phase 3 is complete except the deferred partitioning.**

---

## Deliberately deferred (per the MVP doc's "leave out")

LTV, cohort retention, churn, click **heatmaps** (Phase 3 gives per-element click _counts_, not positional overlays), full self-serve **segmentation** (Phase 3's `properties` bag is the groundwork, not the query UI), geo **maps** (Phase 3 ships a country _table_; a choropleth is later), ad-campaign ROI, demand forecasting, predictive analytics. Revisit once Phase 3 has accumulated data.

---

## Sequencing summary

| Phase                                                                              | Effort | Value        | Blocked by            | Status                    |
| ---------------------------------------------------------------------------------- | ------ | ------------ | --------------------- | ------------------------- |
| **0** — fix conversion + surface computed metrics                                  | XS     | High (trust) | —                     | ✅ Done                   |
| **1** — sales/product/category/status/customer/profit/abandonment/refund/inventory | M      | Highest      | 0.1 (for abandonment) | ✅ Done (item 6 deferred) |
| **2** — traffic sources + full funnel                                              | L      | High         | new events pipeline   | ✅ Done (headless)        |
| **3** — behavioral collector + drop-in script (devices, geo, channels/LLM, clicks, forms, attributes) | L | High | schema widen + `ca.js` | 📋 Planned |

Recommended order: **0 → 1 → 2 → 3**. Phase 0 is a day's work and removes a misleading number; Phase 1 is the value core and touches no new infrastructure; Phase 2 is the larger build, cleanly isolated behind the new `analytics_events` table + ingest API; Phase 3 turns that dormant pipeline into a live behavioral collector via a first-party script (slices A→D, see above).

**Remaining loose ends:** (1) the revenue-vs-orders dual-axis overlay (Phase 1, item 6) — a small frontend-only change. (2) Phase 2's daily-rollup job + raw-event retention are **now folded into Phase 3.5**, where clicks + pageviews make them required rather than optional. None block the shipped functionality. (Migration `0005` is applied; Phase 3's `0006` is not.)
