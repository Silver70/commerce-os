# Frontend ↔ PRD Gap Analysis

Comparison between the current frontend mock data/UI shapes and the backend data model defined in the PRD. Organized by module with severity.

---

## Auth & Onboarding

**✅ Resolved**

The frontend custom login/signup forms are compatible with WorkOS. We will use the **WorkOS User Management API** (`authenticateWithPassword`, `createUser`) rather than the hosted AuthKit redirect flow. The backend exposes `POST /api/auth/login` and `POST /api/auth/signup` as thin wrappers over the WorkOS SDK. The PRD has been updated to reflect this.

Note: social OAuth (Google, Microsoft) still requires redirects if added later — the custom form approach only covers email/password.

Onboarding steps are largely aligned — they map to `organizations`, `shipping_zones`, and `api_keys` tables. One nuance: Step 1 sends `store-name` and `store-slug` as flat fields, but the backend will create a WorkOS Organization first, then write to the `organizations` table. Slug uniqueness must be validated server-side.

---

## Dashboard

**✅ Resolved**

`GET /api/admin/dashboard/stats?period=today|7d|30d|90d` has been added to the PRD (§6.3) with a full response shape. No new tables required — all metrics are derived from existing data:

- **Conversion rate** — cart-to-order rate from the `carts` table (`converted / (converted + abandoned)`)
- **Returning customers** — % of orders in period from customers who had a prior order, queried from `orders` + `customers`
- **Revenue / Orders / AOV** — aggregates from `orders`
- **Sparklines** — daily groupings of the same queries
- **Prior period comparison** — same queries with a shifted date range

---

## Products

**✅ Resolved (product list) / Pending (create form — serialization only)**

Product list updated in `apps/frontend/src/routes/admin/products_/index.tsx`:

| Before | After |
|---|---|
| `sku` (single string) | Single-variant: shows SKU. Multi-variant: shows "N variants" |
| `price` (single number) | `priceRange: { min, max }` in cents — renders as "$X.XX" or "$X.XX – $Y.YY" |
| `inventory` (single number) | `totalInventory` — sum across all variants |
| `category` (single string) | `categories: string[]` — thumbnail uses `categories[0]` for color |

The product create form (`/new.tsx`) combines variant + inventory fields into one `Variant` object — this is fine. The backend will split on write and merge on read. Field mapping for the API contract:

| Frontend `Variant` field | Backend table + column |
|---|---|
| `label` | `product_variants.name` |
| `compareAt` | `product_variants.compare_at_price` |
| `cost` | `product_variants.cost_price` |
| `stock` | `inventory_items.quantity` |
| `lowStockThreshold` | `inventory_items.low_stock_threshold` |
| `allowBackorder` | `inventory_items.allow_backorder` |
| `active` | `product_variants.is_active` |

---

## Orders

**✅ Resolved**

`POST /api/admin/orders` has been added to the PRD (§6.3) with a full request body spec. Business logic is documented in §7.6. Key decisions:

- Stock is decremented immediately (no reservation step) since an admin is confirming a real sale.
- Payment methods `cash`, `bank_transfer`, `card_manual`, `cheque`, `other` are supported via `provider: "manual"` on the existing `payments` table, with the method stored in `metadata` JSONB — no schema change needed.
- "Paid now" sets order to `paid` / payment to `captured` immediately. "Invoice" sets both to `pending`.
- Admin cannot override variant prices — always uses current price (price overrides are post-MVP).

**Minor — field naming on order detail**

| Frontend field | PRD `orders` table |
|---|---|
| `order.customer.name` (single string) | `customers.first_name` + `customers.last_name` |
| `order.shippingCost` | `orders.shipping_total` |
| `order.billingSameAsShipping` | Not stored — derived by comparing the two address snapshots |
| `payment.cardBrand`, `payment.cardLast4` | `payments.metadata` JSONB — not top-level fields |

Timeline field name differences:

| Frontend `TimelineEvent` field | PRD `order_timeline` column |
|---|---|
| `type` | `event_type` |
| `actor` (single display string) | `actor_type` + `actor_id` (two fields) |
| `time` | `created_at` |

---

## Customers

**Minor — name split and address structure**

| Frontend | PRD |
|---|---|
| `customer.name` (single string) | `customers.first_name` + `customers.last_name` |
| `customer.marketingOptIn` | `customers.accepts_marketing` |
| `customer.since` | `customers.created_at` |
| `stats.avgOrder` | Not stored — computed as `total_spent / order_count` |

The address form is missing several PRD fields: `address_line_2`, `first_name`, `last_name`, and `phone` on the address itself.

The frontend has a single `isDefault` boolean on an address. The PRD has **two separate booleans**: `is_default_billing` and `is_default_shipping`. A customer can have different default billing and shipping addresses.

The frontend has an `icon: "home" | "office"` field on addresses. This does not exist in the PRD — the PRD only has `label` (free text string). The backend will not store or return an `icon` field.

Address field naming differences:

| Frontend | PRD `addresses` column |
|---|---|
| `line1` | `address_line_1` |
| `region` | `state` |
| `zip` | `postal_code` |
| `country` (may be full name) | `country_code` (ISO 3166-1 alpha-2) |
| `isDefault` (single boolean) | `is_default_billing` + `is_default_shipping` |

---

## Discounts

**Minor — enum value naming**

| Frontend | PRD |
|---|---|
| `type: "fixed"` | `type: "fixed_amount"` |
| `scope: "all"` | `scope: "order"` (order-level = applies to all items) |
| `status: "active" \| "scheduled" \| "expired"` | Not stored — derived from `is_active`, `starts_at`, `ends_at` |
| `startDate` | `starts_at` |
| `endDate` | `ends_at` |
| `usedCount` | `times_used` |
| `usageLimit` | `max_uses` |

The frontend embeds `coupons[]` inside the discount object. The backend returns them from a separate `coupons` table (either as a related include or separate endpoint).

`CouponCode` field mapping:

| Frontend | PRD `coupons` column |
|---|---|
| `perCustomer` | `max_uses_per_customer` |
| `used` | `times_used` |

---

## Settings

**Tax rates — storage format mismatch**

The frontend stores `rate` as a percentage float (e.g., `7.25`). The PRD stores it as **basis points integer** (`725` = 7.25%). The frontend must divide by 100 for display and multiply by 100 on save.

The frontend `type: "exclusive" | "inclusive"` maps to PRD `is_inclusive: boolean`. The frontend sends a string enum; the backend expects a boolean.

**API keys — missing fields**

Frontend `ApiKey` only has `{id, name, prefix, lastUsed}`. The PRD `api_keys` table also has `permissions` (scopes array) and `expires_at`. No UI exists for setting scopes or expiry.

**Audit log — actor structure**

Frontend `AuditEntry.actor` is a single display string. PRD `audit_logs` has `actor_type` (enum: admin/system/webhook/customer) and `actor_id` (WorkOS user ID or customer ID) as two separate fields. The frontend must compose the display string from both.

**Team members**

Frontend `TeamMember.id` will be a WorkOS user ID, not a database UUID. Role slugs (`super_admin`, `product_manager`, `support_agent`) match the PRD.

---

## Shipping

**Minor — naming only**

| Frontend `ShippingMethod` field | PRD `shipping_methods` column |
|---|---|
| `minOrder` | `min_order_amount` |
| `minDays` | `estimated_days_min` |
| `maxDays` | `estimated_days_max` |
| `active` | `is_active` |

PRD also has `position` (sort order) and `type` (always `flat_rate` for MVP) that the frontend does not expose in the UI.

---

## Summary by Severity

| Severity | Issue |
|---|---|
| ~~**Critical**~~ **✅ Resolved** | Auth: using WorkOS User Management API with custom UI — `POST /api/auth/login` and `POST /api/auth/signup` wrap WorkOS SDK calls. PRD updated. |
| ~~**Critical**~~ **✅ Resolved** | Manual order creation: `POST /api/admin/orders` added to PRD §6.3; manual payment methods via `provider: "manual"` documented in §7.6. |
| ~~**Moderate**~~ **✅ Resolved** | Dashboard KPIs: `GET /api/admin/dashboard/stats` added to PRD §6.3; all metrics derivable from existing tables, no schema changes needed. |
| ~~**Minor**~~ **✅ Resolved** | Product list updated to use `priceRange`, `totalInventory`, `categories[]`, and `variantCount` — matches what the backend will return. |
| ~~**Minor**~~ **✅ Resolved** | Customer `name` split into `firstName` + `lastName` across list, detail, and create form. `total` now in cents. |
| ~~**Minor**~~ **✅ Resolved** | Address type updated: added `addressLine2`, `firstName`, `lastName`, `phone`; `isDefault` split into `isDefaultBilling` + `isDefaultShipping`; field names aligned (`state`, `postalCode`, `countryCode`); `icon` derived from `label` in UI. |
| ~~**Minor**~~ **✅ Resolved** | Discount `type` updated to `"fixed_amount"`; `scope` updated to `"order"`. Fixed in index, new, and edit forms. |
| ~~**Minor**~~ **✅ Resolved** | Tax rate mock data now uses basis points integers (e.g. `725`); display divides by 100; form multiplies by 100 on save. |
| ~~**Minor**~~ **✅ Resolved** | Tax rate `TaxType` enum removed; replaced with `isInclusive: boolean` on `TaxRate` type. Form and table updated. |
| ~~**Minor**~~ **✅ Resolved** | Order timeline: `type` → `eventType`; `actor` string → `actorType` + `actorId` + `actorName`. Mock data, dot styles, and rendering updated. |
| ~~**Minor**~~ **✅ Resolved** | Audit log: `actor` string → `actorType` + `actorId` + `actorName`. Mock data and rendering updated. |
| ~~**Cosmetic**~~ **✅ Resolved** | Address `icon` field removed from type; icon is now derived from `label.toLowerCase().includes("home")` in the UI. |
| **Cosmetic** | Shipping method `position` and `type` fields not exposed in UI — managed by backend, no UI needed for MVP. |
| **Cosmetic** | API keys missing `permissions` and `expires_at` UI — post-MVP. |
