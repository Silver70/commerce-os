# Customer Management + Price List — Implementation Plan

> Status: planning. Build **Phase 1 (Customers + Groups)** first, then **Phase 2 (Price Lists)**.
> Phase 2 depends on Phase 1 because a Price List binds to a customer group / individual customer.

## Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | `customers.password_hash` | **Nullable** — admin-created accounts have no password until set |
| 2 | Customer ↔ group cardinality | **One group per customer** (`customers.group_id` FK) |
| 3 | Price List targeting | **Groups + individual customers.** Precedence: `customer-assigned` > `group-assigned` > base price |
| 4 | Price model | **Per-list type**: `fixed` (explicit price per variant) or `adjustment` (signed % off/over base) |
| 5 | Volume/quantity tiers | **None in v1** (schema leaves room to add `min_quantity` later) |
| 6 | Admin-created account access | **Set-password token link** — null password + token table + public set-password endpoint (no email infra required; admin shares link manually) |

## Architectural invariants to preserve

- **Multi-tenancy**: every new table has `organization_id UUID NOT NULL` as the 2nd column; store-scoped tables also carry `store_id`. Tenant isolation in practice = explicit `eq(organizationId, …)` (and `storeId`) filters in repositories (the existing `TenantScopedRepository` pattern). NB: per-table RLS *policies* are not currently defined in migrations — do not rely on RLS for new tables; filter in the repo like every other module.
- **Money is always integer cents.** Use `shared/utils/money.util.ts` (`applyPercentage`, `add`, `subtract`). Never floats.
- **Order line items stay immutable snapshots** — orders never change when prices/lists change. No work needed there.
- **Price List resolution sits *below* the discount engine.** Pipeline: `base variant price → price-list override → (existing) PricingEngineService discounts/coupons/tax`. The discount engine already operates on `cartItem.unitPrice`, so if the resolved price is written into `unitPrice`, discounts stack on top with **zero changes to `PricingEngineService`**.
- **Migrations are additive.** Generate with `npm run db:generate`, apply with `npm run db:migrate` (drizzle-kit; IPv4-forced config already handled).

---

# PHASE 1 — Customer Management + Groups

## 1.1 Schema

### New table: `customer_groups` (org-scoped, NOT store-scoped — mirrors `customers`)
`src/shared/database/schema/customer-groups.schema.ts`
```
id              uuid pk default random
organizationId  uuid not null → organizations.id (cascade)
name            varchar(255) not null
description     text
createdAt       timestamp not null default now
updatedAt       timestamp not null default now
unique(organizationId, name)
```

### Alter `customers.schema.ts`
- `passwordHash`: **drop `.notNull()`** → `text('password_hash')` (nullable).
- Add `groupId uuid('group_id') → customer_groups.id (onDelete: 'set null')`, nullable.

### New table: `customer_set_password_tokens`
`src/shared/database/schema/customer-set-password-tokens.schema.ts`
```
id              uuid pk
organizationId  uuid not null → organizations.id (cascade)
customerId      uuid not null → customers.id (cascade)
tokenHash       text not null          -- store SHA-256/bcrypt of token, never the raw token
expiresAt       timestamp not null
usedAt          timestamp
createdAt       timestamp not null default now
index(tokenHash)
```

### Wire-up
- Add all three to `src/shared/database/schema/index.ts`.
- `npm run db:generate` → review generated SQL in `src/shared/database/migrations/`.
- `npm run db:migrate`.
- Safe operations only: nullable column adds + widening `password_hash` to nullable. No backfill.

## 1.2 Auth changes — `CustomerAuthService`

- **`login()`**: reject accounts with no password → `if (!customer.passwordHash) throw new UnauthorizedException('Password not set for this account')`. (bcrypt.compare would otherwise throw on null.)
- **`createByAdmin(email, orgId)`**: insert customer with `passwordHash: null`; reuse the existing duplicate-email check from `register()`. Returns the customer row.
- **`createSetPasswordToken(customerId, orgId)`**: generate `crypto.randomBytes(32).toString('hex')`; store its hash + `expiresAt` (e.g. now + 72h); return `{ token, expiresAt }` (raw token returned once, to admin).
- **`setPassword(rawToken, newPassword)`**: hash the raw token, look up an unused, unexpired row; bcrypt the new password (reuse `BCRYPT_ROUNDS = 12`); update `customers.password_hash`; mark token `usedAt`. Optionally auto-verify email. Returns the customer.

## 1.3 Customer Groups — service/repo/controller (live in `modules/customer`)

- `repositories/customer-group.repository.ts`: `findAll(orgId)`, `findById(id, orgId)`, `create`, `update`, `delete`. All filtered by `organizationId`.
- `services/customer-group.service.ts`: thin CRUD + not-found handling (mirror `category.service.ts` shape).
- `dto/`: `CreateCustomerGroupDto { name; description? }`, `UpdateCustomerGroupDto` (partial).
- `controllers/admin-customer-group.controller.ts` → `@Controller('admin/customer-groups')`, guarded by `AdminAuthGuard + RbacGuard`, CRUD endpoints. Mirror `admin-discount.controller.ts` exactly.
- Register controller + providers in `customer.module.ts`.

## 1.4 Customer service/repo/controller changes

`CustomerRepository`:
- Extend `update()`'s `Pick<>` to allow `groupId`.
- `findAll(orgId, opts?)`: support `status` filter + `limit`/`cursor` (the frontend server fn already sends these — see `apps/frontend/src/features/customers/server.ts`). Keep `desc(createdAt)`. Optional `groupId` filter.
- `create(orgId, { email, firstName, lastName, phone, groupId, marketingOptIn })` — inserts via `CustomerAuthService.createByAdmin` then patches profile, OR insert directly with null hash (keep password logic in auth service).

`CustomerService`:
- `createCustomer(orgId, dto)`: dup-check → create (null password) → set profile + group → emit event → **also create a set-password token and return the link** so the admin can copy it. Return `{ customer, setPasswordUrl }`.
- `updateCustomer(customerId, orgId, dto)`: edit firstName/lastName/phone/marketingOptIn/**groupId**.
- `generateSetPasswordLink(customerId, orgId)`: standalone action for the detail page ("resend link").

DTOs:
- `CreateCustomerDto { email; firstName?; lastName?; phone?; groupId?; marketingOptIn? }`
- `AdminUpdateCustomerDto` (partial of the above incl. `groupId`).

`admin-customer.controller.ts` additions (keep existing list/get/status):
- `POST /admin/customers` → `customers.create` → create + return `{ customer, setPasswordUrl }`.
- `PATCH /admin/customers/:id` → `customers.update` → edit details + group.
- `POST /admin/customers/:id/set-password-link` → `customers.update` → (re)issue link.
- Update `GET /admin/customers` to read `status`/`limit`/`cursor` query params.

## 1.5 Public set-password endpoint

- `POST /customer/set-password` (unauthenticated — the token *is* the credential). Body `{ token, password }`. Put on the existing storefront customer surface (`auth.controller.ts` or a `customer.controller.ts`). Calls `CustomerAuthService.setPassword`. On success may auto-login (issue JWT) or just return 200.

## 1.6 Permissions (`auth/constants/permissions.ts`)

- Add `'customers.create': ['super_admin', 'support_agent']` (mirror `customers.update`).
- Reuse `customers.update` for group CRUD in v1 (no separate `customer_groups.*` perm) to keep RBAC small. Revisit if groups need finer control.

## 1.7 Events (`shared/events/events.ts`)

- Add `CustomerCreatedByAdminEvent(customerId, organizationId, email)` (distinct from `CustomerRegisteredEvent` for audit clarity). Optional but recommended; the audit interceptor already records admin mutations.

## 1.8 Frontend (Phase 1) — `apps/frontend`

- `features/customers/server.ts`: add `createCustomerServerFn` (POST `/api/admin/customers`), `updateCustomerServerFn` (PATCH), `generateSetPasswordLinkServerFn` (POST `.../set-password-link`).
- New `features/customer-groups/` (or fold into customers): `server.ts` + `queries.ts` for group CRUD; a small management page/section.
- Wire `components/create-customer-sheet.tsx` (currently UI-only) → call `createCustomerServerFn`; add a **group selector**; on success show the returned **set-password link** to copy.
- `pages/customer-detail-page.tsx`: add group assignment control, "Edit details", and a "Generate set-password link" action.
- New storefront route `routes/auth/set-password.tsx` → form posting `{token,password}` to the public endpoint (token read from query string).
- `types/api.ts`: add `CustomerGroup`; extend `Customer` with `groupId` (+ optional embedded `group`). (Heed the field-name parity notes in the type-audit memory.)

## 1.9 Phase 1 verification

- Unit: `setPassword` rejects expired/used/invalid tokens; `login` rejects null-password accounts.
- Manual/e2e: admin creates customer → copies link → sets password → logs in from storefront.
- Confirm migration applied; update `seeds/seed.ts` if it references customer columns.

---

# PHASE 2 — Price Lists

## 2.1 Resolution model (the core new logic)

For a given `(variantId, orgId, storeId, customerId?, now)`:
1. `base = variant.price`.
2. Resolve `groupId` from the customer (null for guests).
3. **Candidate lists** = price lists where `org+store` match, `is_active`, `now` within `[startsAt, endsAt]` (nulls = open), AND assigned to either this `customerId` or this `groupId`.
4. **Pick** in order: customer-assigned beat group-assigned; within a tier, lowest `priority` int wins; tiebreak newest `createdAt`.
5. Apply the chosen list to the variant:
   - `fixed`: use the explicit row in `price_list_prices` for that variant. **If the list has no row for this variant, the list does not cover it** → fall through to the next candidate, else `base`.
   - `adjustment`: `effective = round(base * (1 + adjustmentBasisPoints / 10000))` (negative bps = cheaper; positive = markup). Clamp `>= 0`.
6. Result = effective unit price (+ which list applied, for transparency).

Guests and customers with no matching list → `base`. Discounts/coupons/tax run afterward, unchanged.

## 2.2 Schema (store-scoped, like discounts)

### `price_lists.schema.ts`
```
id                    uuid pk
organizationId        uuid not null → organizations.id (cascade)
storeId               uuid not null → stores.id (cascade)
name                  varchar(255) not null
type                  enum price_list_type ['fixed','adjustment'] not null
adjustmentBasisPoints integer            -- required when type='adjustment'; signed (e.g. -1500 = 15% off)
priority              integer not null default 100   -- lower wins
isActive              boolean not null default true
startsAt              timestamp
endsAt                timestamp
createdAt / updatedAt
```

### `price_list_prices.schema.ts` (only used by `type='fixed'`)
```
id              uuid pk
organizationId  uuid not null → organizations.id (cascade)
priceListId     uuid not null → price_lists.id (cascade)
variantId       uuid not null → product_variants.id (cascade)
price           integer not null
unique(priceListId, variantId)
-- (v1: one price per variant. Future tiers would add min_quantity + drop the unique.)
```

### `price_list_assignments.schema.ts`
```
id              uuid pk
organizationId  uuid not null → organizations.id (cascade)
priceListId     uuid not null → price_lists.id (cascade)
customerId      uuid → customers.id (cascade)         -- nullable
groupId         uuid → customer_groups.id (cascade)   -- nullable
-- exactly one of customerId / groupId is set (enforce in service; optional CHECK)
unique(priceListId, customerId)
unique(priceListId, groupId)
index(customerId)  index(groupId)
```
Add all three to `schema/index.ts`; generate + migrate.

## 2.3 Pricing module additions

- `repositories/price-list.repository.ts`:
  - `findCandidateLists(orgId, storeId, customerId|null, groupId|null, now)` — join assignments, filter active + window, ordered by tier then priority then createdAt.
  - `findFixedPrices(priceListIds[], variantIds[])` — single batched query.
  - CRUD for lists, prices (bulk upsert of variant rows), assignments.
- `services/price-resolver.service.ts` (**new**):
  - `resolve(variantIds[], ctx{orgId, storeId, customerId?}, basePrices: Map): Promise<Map<variantId, { unitPrice, appliedPriceListId? }>>`
  - Resolve `groupId` (inject `CustomerRepository` from CustomerModule, or accept `groupId` as a param to avoid a cross-module import — prefer passing `groupId`/`customerId` and let the caller resolve the group, or import CustomerRepository which is already exported).
  - **Batch everything**: one candidate-list query, one fixed-price query for the whole variant set → no N+1.
- Export `PriceResolverService` from `PricingModule`; add the repo to providers.
- Permissions: add `'price_lists.read'` and `'price_lists.write'` → `['super_admin','product_manager']` (mirror `discounts.*`).

## 2.4 Integration A — Cart (correctness-critical)

- `CartService.addItem`: today stamps `variant.price` (`cart.service.ts:59`). Change to call `PriceResolverService.resolve([variantId], {orgId, storeId, customerId: cart.customerId}, base)` and write the resolved unit price via `cartRepo.upsertItem`. The cart row already carries `customerId`, so **no signature change** is needed.
- `CartService.recalculate`: **re-resolve unit prices each recalc** (chosen behavior) so the cart reflects current contract pricing — important when a guest cart is later associated to a customer at login, or when an admin edits a list. Update `cart_items.unitPrice`/`totalPrice` before computing subtotal, then run discounts as today.
  - Wiring task: ensure the storefront calls `recalculate` after login/cart-association so prices refresh. `getOrCreateActiveCart` returns the existing cart — trigger a recalc there when `customerId` becomes known.
- `CheckoutService.checkout`: call `cartService.recalculate` (or resolve) **immediately before reserving inventory** to lock fresh prices; the rest of the snapshot flow (`order_line_items`) is unchanged.

## 2.5 Integration B — Storefront display (perf-sensitive)

- `product.resolver.ts` `toProductType` derives `price`/`minPrice`/`maxPrice` from raw `variant.price` (`:131-134`). To show contract prices it needs `ctx.req.tenantContext.customerId` and must **batch-resolve across every variant on the page** in the `products` list query (collect all variantIds → one `resolve()` call → map back). Single `product` query resolves just that product's variants.
- **Recommended sequencing**: ship **cart/checkout pricing first** (2.4), then wire display (2.5) as a fast follow. Cart-first is correct and lower-risk; display is the heavier N+1-sensitive piece. (Decide whether browsing PLP/PDP must show contract prices on day one — for B2B usually yes, but it can lag the cart by a deploy.)

## 2.6 Admin CRUD + frontend (Phase 2)

- `controllers/admin-price-list.controller.ts` → `@Controller('admin/price-lists')`, guarded, `price_lists.*`. CRUD for lists; sub-routes for fixed prices (bulk set) and assignments (attach/detach group or customer). Mirror `admin-discount.controller.ts`.
- DTOs: `CreatePriceListDto` (name, type, adjustmentBasisPoints?, priority?, dates, isActive), `UpdatePriceListDto`, `SetPriceListPriceDto[]` (variantId, price), `CreateAssignmentDto` (customerId? | groupId?).
- Frontend `features/price-lists/`: list page; create/edit (type toggle fixed/adjustment, dates, priority, active); for `fixed` a variant-search price editor; assignment manager (pick groups/customers). Routes `routes/admin/price-lists_/{index,new,$id}.tsx`. Show applicable lists on the customer/group detail pages. Add types to `types/api.ts`.

## 2.7 Edge cases / rules to encode

- Guest (no customer) → base (no store-wide list type in v1).
- Customer with no group and no customer-assigned list → base.
- `fixed` list missing a variant row → not covered → next candidate, else base.
- `adjustment` rounding via money util; clamp effective `>= 0`.
- Inactive/out-of-window lists excluded.
- Deleting a list cascades its prices + assignments; existing orders are unaffected (snapshots).
- `compareAtPrice` left as the marketing "was" price (untouched in v1).
- **No `PricingEngineService` change**: discounts/coupons/tax stack on the resolved `unitPrice` automatically.

## 2.8 Phase 2 verification

- Unit (`price-resolver.service.spec.ts`): customer-over-group precedence; fixed vs adjustment; date windows; fallback to base; batch correctness; clamp.
- Integration: customer in a group gets list price in cart; guest gets base; price refresh on login-association.
- Regression: existing discount/coupon/tax tests still pass on top of resolved prices.

---

# Touch-point summary

**Phase 1 — modified:** `customers.schema.ts`, `schema/index.ts`, `customer-auth.service.ts`, `customer.service.ts`, `customer.repository.ts`, `admin-customer.controller.ts`, `customer.module.ts`, `permissions.ts`, `events.ts`; frontend `features/customers/*`, `create-customer-sheet.tsx`, `customer-detail-page.tsx`, `types/api.ts`.
**Phase 1 — new:** `customer-groups.schema.ts`, `customer-set-password-tokens.schema.ts`, customer-group repo/service/dto/controller, public set-password endpoint, `features/customer-groups/*`, `routes/auth/set-password.tsx`.

**Phase 2 — modified:** `cart.service.ts`, `checkout.service.ts`, `product.resolver.ts`, `pricing.module.ts`, `permissions.ts`, `types/api.ts`.
**Phase 2 — new:** `price-lists.schema.ts`, `price-list-prices.schema.ts`, `price-list-assignments.schema.ts`, `price-list.repository.ts`, `price-resolver.service.ts`, `admin-price-list.controller.ts` + DTOs, `features/price-lists/*` + routes.

**Risk:** Phase 1 is low (additive schema, isolated module). Phase 2 risk concentrates in two spots — cart price resolution/refresh (correctness) and storefront display batching (performance). Everything downstream of `unitPrice` is untouched.

# Defaulted assumptions (flag if any are wrong)

- Customer **groups are org-scoped**, price **lists are store-scoped** (consistent with `customers` vs `discounts` today).
- Cart **re-resolves prices on every `recalculate`** (chosen for B2B correctness on login-association).
- Display pricing (2.5) ships **after** cart pricing (2.4).
- `adjustment` stored as **signed basis points** (matches the tax-rate convention).
- Group CRUD reuses the **`customers.update`** permission in v1.
