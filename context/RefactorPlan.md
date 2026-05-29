# Refactor Plan — Multi-Store Support (One Org → Many Stores)

## Context

The backend was built with `organization` as the single tenancy boundary: every tenant-scoped table carries `organization_id` as its second column, the storefront API key resolves to an `organizationId`, and `TenantContext` only knows about `organizationId`. The original product intent, however, is for **one organization to operate multiple independent stores** (separate catalogs, orders, inventory, currencies, storefront keys), while sharing one customer base and one billing/ownership umbrella.

This is the cheapest possible moment to make the change: the schema is effectively greenfield — only a single baseline migration exists (`0000_faulty_proteus.sql`) and there is no production data — so we can regenerate the schema rather than write a data backfill.

**Decisions driving this plan:**

- **Scope model:** _Shared customers, rest per-store._ `customers` and `addresses` stay org-scoped (one login works across all of an org's stores). Catalog, inventory, pricing, cart, order, payment, shipping, and audit data become store-scoped.
- **Admin model:** _Active store switcher._ An admin selects one active store; all store-scoped admin calls carry that `store_id`. Org-level endpoints (store management, members, API keys listing) work without an active store.
- **Keys & payments:** _Key per store; Stripe metadata per store._ Each storefront API key resolves to a single store (and therefore its org). Stripe stays single-account; payment metadata carries `storeId`.

**Outcome:** A `stores` table sits between `organizations` and all store-scoped data. `store_id` becomes the primary isolation key for store-scoped tables; `organization_id` is retained on them for ownership/rollup and FK integrity. Customers remain a shared org-level resource.

---

## 1. New `stores` table + organization changes

**New schema `src/shared/database/schema/stores.schema.ts`:**

```
stores
  id              uuid pk
  organizationId  uuid not null  → organizations.id (cascade)
  name            varchar(255) not null
  slug            varchar(255) not null      // UNIQUE(organization_id, slug)
  currency        varchar(3)  not null default 'USD'
  timezone        varchar(100) not null default 'UTC'
  isActive        boolean not null default true
  deletedAt       timestamp
  createdAt/updatedAt
```

Add `export *` line to `schema/index.ts` (place it directly after `organizations.schema`).

**`organizations.schema.ts`:** keep `currency`/`timezone` as _defaults for new stores_ (no behavior change needed); the authoritative per-store values now live on `stores`.

---

## 2. Add `store_id` to store-scoped tables

For every table below, add as the **third column** (after `organizationId`):

```ts
storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
```

and move per-org uniqueness to per-store.

**Store-scoped tables (get `store_id`):**
`products`, `product_variants`, `product_options`, `product_option_values`, `categories`, `product_media`, `inventory_items`, `stock_reservations`, `discounts`, `coupons`, `tax_rates`, `carts`, `cart_items`, `orders`, `order_line_items`, `order_timeline`, `payments`, `refunds`, `shipping_zones`, `shipping_methods`, `shipments`.

**Unique-constraint changes** (org → store):

- `products`: `unique('products_org_slug_unique').on(org, slug)` → `.on(storeId, slug)`
- `product_variants`: `(org, sku)` → `(storeId, sku)`
- `categories`: `(org, slug)` → `(storeId, slug)`
- `coupons`: `(org, code)` → `(storeId, code)`
- `orders`: `(org, orderNumber)` → `(storeId, orderNumber)`

**`api_keys`:** add `storeId` (not null, → stores.id, cascade). Keep `organizationId` for admin listing/rollup.

**Stays org-scoped (NO `store_id`):** `customers` (keeps `unique(organization_id, email)`), `addresses`, `organizations`.

**Junction tables unchanged** (`variant_option_values`, `product_categories`) — they remain parent-scoped.

**`audit_logs`:** add `storeId` **nullable** — org-level admin actions (creating a store, managing members) have no active store.

---

## 3. Migration

Pre-production, no data to preserve. After editing all schema files:

1. Delete `src/shared/database/migrations/0000_faulty_proteus.sql` and the `meta/` folder, then regenerate a fresh baseline: `npx drizzle-kit generate` (uses `drizzle.config.ts`).
2. Apply to dev DB via the existing migrate script (`src/shared/database/migrate.ts`) or `npx drizzle-kit push`.

(If a clean drop isn't desired, generate an incremental migration instead — but baseline regeneration is simplest here.)

---

## 4. Tenant context + isolation primitives

**`src/shared/tenant/tenant-context.ts`** — add `storeId`:

```ts
export interface TenantContext {
  organizationId: string;
  storeId?: string; // storefront: always set; admin: the active store (absent on org-level routes)
  userId?: string;
  customerId?: string;
  role?: "super_admin" | "product_manager" | "support_agent";
  email?: string;
}
```

**`src/shared/tenant/tenant-scoped.repository.ts`** — the base class is referenced by few repos today, but extend it for those that do: add a `storeFilter` getter and a `requireStore()` helper, and have `create()` inject `storeId` when the table has that column. Most repositories thread IDs manually (see §6).

**`src/shared/tenant/rls.setup.ts`** — set both keys:

```ts
export async function setRlsContext(db, orgId: string, storeId?: string) {
  await db.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
  if (storeId)
    await db.execute(sql`SET LOCAL app.current_store_id = ${storeId}`);
}
```

Update `src/modules/auth/interceptors/set-rls-context.interceptor.ts` to pass `ctx.storeId`.

---

## 5. Auth guards + API key service

**`api-key.service.ts`:**

- `generate(orgId, storeId, name, createdBy?)` — persist `storeId`.
- `lookup(rawKey)` → return `{ organizationId, storeId }` (currently returns a bare `organizationId` string — change the return type and update the one caller).
- Add `listByStore(storeId)`; keep `listByOrg` for org rollup.

**`storefront-auth.guard.ts`:** set both ids from the lookup:

```ts
const { organizationId, storeId } = await this.apiKeyService.lookup(rawKey);
request.tenantContext = { organizationId, storeId };
```

Customer-token check stays org-scoped (`payload.organizationId === organizationId`) — shared customers means a token is valid across the org's stores.

**`admin-auth.guard.ts`:** after resolving the org, resolve the **active store**:

- Read `x-store-id` header (fallback: `wos-active-store` cookie).
- Validate the store row exists, `organizationId` matches, and `isActive`; else `ForbiddenException`.
- Set `tenantContext.storeId`. Leave it unset for org-level routes (don't hard-fail in the guard; enforce per-route — see §6).
- Dev `SKIP_AUTH` path: also resolve a default store for `DEV_ORG_ID` (first active store of the dev org) so local dev keeps working.

---

## 6. Repositories & services — the repeating pattern

Every store-scoped repository method currently takes `orgId: string` and applies `eq(table.organizationId, orgId)`. The pattern repeats: **add a `storeId: string` parameter and an `eq(table.storeId, storeId)` condition**, and include `storeId` in every `.insert().values(...)`.

Representative file: `src/modules/product/repositories/product.repository.ts` — `findBySlug`, `findById`, `slugExists`, `findWithFilters`, `findDetail`, `create`, `createVariant`, `addMedia`, `skuExists`, etc. all gain `storeId` filtering/insertion. Apply the same across:

- `order/repositories/order.repository.ts`
- `cart/repositories/cart.repository.ts`
- `inventory/repositories/inventory.repository.ts`
- `pricing/repositories/discount.repository.ts`
- `customer/repositories/customer.repository.ts` → **unchanged** (org-scoped) except where it touches store-scoped joins.
- shipping / payment / audit data access.

**Services** read `storeId` from the injected `TenantContext` (via `@CurrentTenant()`) and pass it down — `storeId` must **never** be accepted from request bodies (same rule as `organizationId`). Add a small guard in store-scoped services: if `ctx.storeId` is missing, throw `BadRequestException('Active store required')`.

**`checkout.service.ts`** (the most complex): thread `storeId` through cart load, reservation, order + line-item snapshots, and payment creation — all rows written must carry the active store.

---

## 7. Store module (admin) + provisioning

**New `src/modules/tenant/` additions (or a dedicated `store` module):**

- `store.service.ts` — CRUD over `stores` (scoped by `organizationId`).
- `admin-store.controller.ts` — `GET/POST /api/admin/stores`, `GET/PATCH/DELETE /api/admin/stores/:id`. These are **org-level** routes (require org, not active store).
- API-key creation moves under a store: `POST /api/admin/stores/:storeId/api-keys` (or accept `storeId` in body), since keys are store-scoped now.

**`tenant-provisioning.service.ts`:** on `tenant.created`, after inserting the organization, **create a default store**, then seed the default shipping zone, default tax rate, and first API key **under that store** (not the org).

---

## 8. Payments / Stripe

- `payment.service.ts` / `stripe.adapter.ts`: include `storeId` in `PaymentIntent.metadata` alongside `organizationId`.
- `stripe-webhook.controller.ts`: continue resolving org+store from the internal `payments` record by `paymentIntentId` (never trust webhook metadata for tenancy).

---

## 9. Frontend touchpoints (follow-up, not core backend)

The frontend onboarding/auth files already in-flight will need:

- Onboarding to **create the first store** after org creation.
- An **active-store switcher** in the admin shell that sends `X-Store-Id` on admin API calls (header or persisted cookie).
- Storefront calls already carry the per-store `X-API-Key` — no change beyond using the right store's key.

These are listed for awareness; this plan's implementation scope is the backend.

---

## 10. Verification

1. **Type + build:** `npm run check-types` and `npx turbo build --filter=backend` pass after schema + signature changes.
2. **Migration:** regenerate baseline, push to dev DB; confirm `stores` exists and every store-scoped table has `store_id` with the new unique constraints.
3. **Cross-store isolation test** (extend the Phase-1 isolation suite): under one org, create Store A and Store B with separate API keys; create a product in Store A; query with Store B's key → empty; `findById` of A's product UUID with B's context → null.
4. **Shared-customer test:** register a customer via Store A's key; confirm the same customer/login resolves under Store B's key (same org), and that a cart created in each store is tagged with the correct `store_id`.
5. **Checkout end-to-end:** cart → checkout under Store A → order, line items, payment all carry Store A's `store_id`; Stripe metadata includes `storeId`.
6. **Admin switcher:** admin call without `X-Store-Id` to a store-scoped route → `BadRequestException`; with a valid `X-Store-Id` → scoped data; with a store from another org → `ForbiddenException`.

---

## Critical files (quick reference)

| File                                             | Change                                   |
| ------------------------------------------------ | ---------------------------------------- |
| `schema/stores.schema.ts` (new)                  | The new tenancy layer                    |
| `schema/index.ts`                                | Export `stores`                          |
| ~21 store-scoped `*.schema.ts`                   | Add `store_id` + move unique constraints |
| `schema/api-keys.schema.ts`                      | Add `store_id`                           |
| `shared/tenant/tenant-context.ts`                | Add `storeId`                            |
| `shared/tenant/rls.setup.ts`                     | Set `app.current_store_id`               |
| `auth/services/api-key.service.ts`               | `generate`/`lookup` return store         |
| `auth/guards/storefront-auth.guard.ts`           | Set `storeId` from key                   |
| `auth/guards/admin-auth.guard.ts`                | Resolve active store from header/cookie  |
| all store-scoped repositories                    | Add `storeId` filter + insert            |
| `cart/services/checkout.service.ts`              | Thread `storeId` through checkout        |
| `tenant/services/tenant-provisioning.service.ts` | Seed default store                       |
| `tenant/.../admin-store.controller.ts` (new)     | Store CRUD                               |
| `payment/services/*`                             | `storeId` in Stripe metadata             |
