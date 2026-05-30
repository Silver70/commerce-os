# Backend Implementation Plan — Headless Commerce Engine

## Context

The backend is a fresh NestJS 11 scaffold at `apps/backend/src/` with only `AppModule` and `main.ts`. This plan covers building the full commerce engine described in the PRD — multi-tenant, GraphQL storefront API, REST admin API, Stripe payments, and WorkOS auth — in six progressive phases.

**Resolved decisions:**

- ORM: **Drizzle ORM** + Neon serverless PostgreSQL
- GraphQL: **Code-first** (`@nestjs/graphql` + `@apollo/server`)
- Media: **Cloudflare R2** (via AWS SDK S3-compatible)
- Stripe: **Single account** (tenant identified via metadata)

---

## Final Folder Structure

```
apps/backend/
├── drizzle.config.ts                          # Drizzle Kit migrations config
├── src/
│   ├── main.ts                                # Bootstrap (CORS, helmet, ValidationPipe, global prefix)
│   ├── app.module.ts                          # Root module (imports all feature modules)
│   │
│   ├── config/
│   │   └── configuration.ts                  # Typed env config (validated at startup via Joi)
│   │
│   ├── shared/
│   │   ├── database/
│   │   │   ├── database.module.ts             # Global Drizzle module (exports DB token)
│   │   │   ├── schema/
│   │   │   │   ├── index.ts                   # Barrel export of all schemas
│   │   │   │   ├── organizations.schema.ts
│   │   │   │   ├── api-keys.schema.ts
│   │   │   │   ├── products.schema.ts
│   │   │   │   ├── product-variants.schema.ts
│   │   │   │   ├── product-options.schema.ts
│   │   │   │   ├── product-option-values.schema.ts
│   │   │   │   ├── variant-option-values.schema.ts
│   │   │   │   ├── categories.schema.ts
│   │   │   │   ├── product-categories.schema.ts
│   │   │   │   ├── product-media.schema.ts
│   │   │   │   ├── inventory-items.schema.ts
│   │   │   │   ├── stock-reservations.schema.ts
│   │   │   │   ├── discounts.schema.ts
│   │   │   │   ├── coupons.schema.ts
│   │   │   │   ├── carts.schema.ts
│   │   │   │   ├── cart-items.schema.ts
│   │   │   │   ├── orders.schema.ts
│   │   │   │   ├── order-line-items.schema.ts
│   │   │   │   ├── order-timeline.schema.ts
│   │   │   │   ├── customers.schema.ts
│   │   │   │   ├── addresses.schema.ts
│   │   │   │   ├── payments.schema.ts
│   │   │   │   ├── refunds.schema.ts
│   │   │   │   ├── shipping-zones.schema.ts
│   │   │   │   ├── shipping-methods.schema.ts
│   │   │   │   ├── shipments.schema.ts
│   │   │   │   ├── tax-rates.schema.ts
│   │   │   │   └── audit-logs.schema.ts
│   │   │   └── migrations/                    # Drizzle Kit generated SQL migration files
│   │   │
│   │   ├── tenant/
│   │   │   ├── tenant-context.ts              # TenantContext interface (userId, organizationId, role)
│   │   │   ├── tenant-scoped.repository.ts    # Abstract base — auto-injects organization_id
│   │   │   └── rls.setup.ts                  # Helper to SET LOCAL app.current_org_id in a tx
│   │   │
│   │   ├── events/
│   │   │   ├── event-bus.module.ts            # Wraps @nestjs/event-emitter, exported globally
│   │   │   └── events.ts                      # Typed event class definitions (all events from PRD §4.4)
│   │   │
│   │   ├── graphql/
│   │   │   └── scalars/
│   │   │       ├── money.scalar.ts            # Money { amount, currency, formatted }
│   │   │       └── date-time.scalar.ts
│   │   │
│   │   ├── storage/
│   │   │   └── r2-storage.service.ts          # Cloudflare R2 via @aws-sdk/client-s3
│   │   │
│   │   └── utils/
│   │       ├── money.util.ts                  # Integer cent arithmetic (add, subtract, format)
│   │       ├── slug.util.ts                   # URL-safe slug generation + uniqueness suffix
│   │       └── pagination.util.ts             # Cursor encode/decode (base64 JSON)
│   │
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── constants/
│       │   │   └── permissions.ts             # PERMISSIONS matrix (PRD §3.5)
│       │   ├── controllers/
│       │   │   └── auth.controller.ts         # POST /api/auth/login, /api/auth/signup
│       │   ├── dto/
│       │   │   ├── signup.dto.ts
│       │   │   └── login.dto.ts
│       │   ├── services/
│       │   │   ├── workos-auth.service.ts     # WorkOS SDK: createUser, authenticateWithPassword, verifyJwt
│       │   │   ├── customer-auth.service.ts   # bcrypt + JWT issuance/verification for storefront customers
│       │   │   └── api-key.service.ts         # Generate (SHA-256 hash), lookup, revoke API keys
│       │   ├── guards/
│       │   │   ├── admin-auth.guard.ts        # Reads wos-session cookie → verifies WorkOS JWT → sets TenantContext
│       │   │   ├── storefront-auth.guard.ts   # X-API-Key → org lookup → optional customer JWT → sets TenantContext
│       │   │   └── rbac.guard.ts              # Reads @RequirePermission() metadata → checks role
│       │   ├── decorators/
│       │   │   ├── require-permission.decorator.ts   # @RequirePermission('products.create')
│       │   │   └── current-tenant.decorator.ts       # @CurrentTenant() param decorator
│       │   └── interceptors/
│       │       └── set-rls-context.interceptor.ts    # Runs SET LOCAL app.current_org_id after TenantContext is set
│       │
│       ├── tenant/
│       │   ├── tenant.module.ts
│       │   ├── dto/
│       │   │   └── update-organization.dto.ts
│       │   ├── services/
│       │   │   ├── tenant.service.ts                 # CRUD on organizations table
│       │   │   └── tenant-provisioning.service.ts    # Listens for tenant.created → seeds defaults + API key
│       │   └── controllers/
│       │       └── admin-organization.controller.ts  # GET/PATCH /api/admin/organization, member management
│       │
│       ├── product/
│       │   ├── product.module.ts
│       │   ├── services/
│       │   │   ├── product.service.ts         # CRUD, soft delete, status transitions
│       │   │   └── category.service.ts        # Tree CRUD, CTE-based ancestor queries
│       │   ├── repositories/
│       │   │   ├── product.repository.ts      # Extends TenantScopedRepository
│       │   │   └── category.repository.ts     # Extends TenantScopedRepository
│       │   ├── resolvers/
│       │   │   └── product.resolver.ts        # GQL: products, product, categories, category
│       │   ├── controllers/
│       │   │   └── admin-product.controller.ts  # REST: full product + variant + media CRUD (PRD §6.3)
│       │   └── dto/
│       │       ├── create-product.dto.ts
│       │       ├── update-product.dto.ts
│       │       ├── create-variant.dto.ts
│       │       ├── update-variant.dto.ts
│       │       └── product-filter.dto.ts
│       │
│       ├── inventory/
│       │   ├── inventory.module.ts
│       │   ├── dto/
│       │   │   └── adjust-inventory.dto.ts
│       │   ├── services/
│       │   │   └── inventory.service.ts       # reserve, release, convert, adjust, checkAvailability
│       │   ├── repositories/
│       │   │   └── inventory.repository.ts    # SELECT FOR UPDATE helpers
│       │   └── controllers/
│       │       └── admin-inventory.controller.ts  # GET /api/admin/inventory, PATCH /:variantId, GET /low-stock
│       │
│       ├── pricing/
│       │   ├── pricing.module.ts
│       │   ├── dto/
│       │   │   ├── create-discount.dto.ts
│       │   │   └── create-coupon.dto.ts
│       │   ├── services/
│       │   │   └── pricing-engine.service.ts  # applyDiscounts, validateCoupon, calculateTax
│       │   ├── repositories/
│       │   │   └── discount.repository.ts
│       │   └── controllers/
│       │       └── admin-discount.controller.ts  # Discount + coupon CRUD (PRD §6.3)
│       │
│       ├── cart/
│       │   ├── cart.module.ts
│       │   ├── dto/
│       │   │   ├── add-cart-item.dto.ts
│       │   │   └── checkout.dto.ts
│       │   ├── services/
│       │   │   ├── cart.service.ts            # create, addItem, updateItem, removeItem, applyCoupon, recalculate
│       │   │   └── checkout.service.ts        # Full checkout orchestration (PRD §7.1)
│       │   ├── repositories/
│       │   │   └── cart.repository.ts
│       │   └── resolvers/
│       │       └── cart.resolver.ts           # GQL mutations: createCart, addToCart, updateCartItem, removeFromCart, applyCoupon, removeCoupon, checkout
│       │
│       ├── order/
│       │   ├── order.module.ts
│       │   ├── dto/
│       │   │   ├── create-order.dto.ts
│       │   │   ├── update-order-status.dto.ts
│       │   │   └── create-refund.dto.ts
│       │   ├── services/
│       │   │   ├── order.service.ts           # State machine (PRD §7.4), transition validation, timeline entries
│       │   │   └── refund.service.ts          # Refund flow: Stripe refund → update order + restore inventory
│       │   ├── repositories/
│       │   │   └── order.repository.ts
│       │   ├── resolvers/
│       │   │   └── order.resolver.ts          # GQL: myOrders, myOrder (customer-facing)
│       │   └── controllers/
│       │       └── admin-order.controller.ts  # List, detail, status, notes, refund, shipment, manual create
│       │
│       ├── customer/
│       │   ├── customer.module.ts
│       │   ├── dto/
│       │   │   ├── register-customer.dto.ts
│       │   │   ├── update-customer.dto.ts
│       │   │   └── create-address.dto.ts
│       │   ├── services/
│       │   │   └── customer.service.ts        # Register, profile, addresses, status management
│       │   ├── repositories/
│       │   │   └── customer.repository.ts
│       │   ├── resolvers/
│       │   │   └── customer.resolver.ts       # GQL: me, register, login, updateProfile, address mutations
│       │   └── controllers/
│       │       └── admin-customer.controller.ts  # GET/PATCH customer list + detail
│       │
│       ├── payment/
│       │   ├── payment.module.ts
│       │   ├── interfaces/
│       │   │   └── payment-provider.interface.ts  # createPaymentIntent, capture, refund, verifyWebhook
│       │   ├── services/
│       │   │   ├── payment.service.ts         # Orchestrates provider calls, persists payment records
│       │   │   └── stripe.adapter.ts          # Implements PaymentProvider using Stripe SDK
│       │   └── controllers/
│       │       └── stripe-webhook.controller.ts  # POST /api/webhooks/stripe — verify sig → emit events
│       │
│       ├── shipping/
│       │   ├── shipping.module.ts
│       │   ├── dto/
│       │   │   ├── create-shipping-zone.dto.ts
│       │   │   └── create-shipping-method.dto.ts
│       │   ├── services/
│       │   │   └── shipping.service.ts        # Zone lookup by country, method list, rate calculation
│       │   └── controllers/
│       │       └── admin-shipping.controller.ts  # Zone + method CRUD (PRD §6.3)
│       │
│       └── audit/
│           ├── audit.module.ts
│           ├── dto/
│           │   └── audit-log-query.dto.ts
│           ├── services/
│           │   └── audit.service.ts           # log(entity, action, actor, changes, orgId)
│           ├── interceptors/
│           │   └── audit.interceptor.ts       # @UseInterceptors(AuditInterceptor) on mutating routes
│           └── controllers/
│               └── admin-audit.controller.ts  # GET /api/admin/audit-logs with filters
```

---

## Phase 1 — Foundation + Auth (Weeks 1–3)

> Zero user-facing features. Everything else depends on this being correct.

### Step 1.1 — Install Dependencies

```bash
# Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# GraphQL
npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql

# Auth
npm install @workos-inc/node jsonwebtoken bcrypt
npm install @nestjs/passport passport passport-jwt
npm install -D @types/jsonwebtoken @types/bcrypt @types/passport-jwt

# Validation
npm install class-validator class-transformer

# Payments
npm install stripe

# Storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Events + Scheduling
npm install @nestjs/event-emitter @nestjs/schedule

# Security
npm install helmet

# Rate limiting
npm install @nestjs/throttler

# Config validation
npm install joi

# Swagger (REST docs)
npm install @nestjs/swagger
```

### Step 1.2 — Bootstrap (`main.ts`)

- Global prefix `/api` for all REST routes
- `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`
- `app.use(helmet())`
- CORS enabled (origins from `CORS_ORIGINS` env)
- Graceful shutdown hooks
- Swagger setup at `/api/docs`

### Step 1.3 — Config Module (`src/config/configuration.ts`)

- Joi validation schema for all env vars (fail fast on startup if missing)
- `ConfigModule.forRoot({ isGlobal: true, validationSchema })`
- Typed `ConfigService` usage everywhere (no `process.env` outside this file)

### Step 1.4 — Database Module (`src/shared/database/`)

- `DatabaseModule` marked `@Global()` — exports a `DRIZZLE_CLIENT` provider token
- Neon serverless driver: `neon(process.env.DATABASE_URL)` → `drizzle(sql, { schema })`
- All table schemas defined in `src/shared/database/schema/` using Drizzle's `pgTable`
  - Every tenant-scoped table: `organization_id: uuid('organization_id').notNull().references(() => organizations.id)` as the second column
  - Enums defined once and reused across schemas
- `drizzle.config.ts` at repo root points to schema + migrations folder
- First migration via `drizzle-kit generate` covers all tables + indexes from PRD Appendix A

### Step 1.5 — Tenant Infrastructure (`src/shared/tenant/`)

**`TenantContext` interface:**

```ts
export interface TenantContext {
  organizationId: string;
  userId?: string; // WorkOS user ID (admin) or null
  customerId?: string; // Customer UUID (storefront)
  role?: "super_admin" | "product_manager" | "support_agent";
  email?: string;
}
```

**`TenantScopedRepository` abstract class:**

- Constructor takes `db: DrizzleClient`, `table: PgTable`, and a `REQUEST`-scoped `TenantContext`
- `findMany(filters)` → always adds `eq(table.organizationId, ctx.organizationId)`
- `findById(id)` → `and(eq(table.id, id), eq(table.organizationId, ctx.organizationId))`
- `create(data)` → spreads `{ organizationId: ctx.organizationId, ...data }`
- `update(id, data)` → includes org_id check in WHERE clause
- `softDelete(id)` → sets `deletedAt` with org_id check

**`rls.setup.ts`:**

```ts
// Called at the start of every database transaction that writes
export async function setRlsContext(db: DrizzleClient, orgId: string) {
  await db.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
}
```

### Step 1.6 — Shared Utilities

- **`money.util.ts`**: `add(a, b)`, `subtract(a, b)`, `multiply(cents, qty)`, `applyPercentage(cents, bps)`, `format(cents, currency)` — always integers, never floats
- **`slug.util.ts`**: `generateSlug(name)` → lowercase, hyphenated. `generateUniqueSlug(name, existingFn)` → appends `-2`, `-3` etc.
- **`pagination.util.ts`**: `encodeCursor(obj)` → base64 JSON. `decodeCursor(str)` → typed object. `buildCursorWhere(cursor, column)` → Drizzle `gt()` condition

### Step 1.7 — GraphQL Scalars + Server Setup

- `MoneyScalar`: serializes `{ amount: number, currency: string }` to `{ amount, currency, formatted }` — formatting in `money.util.ts`
- `DateTimeScalar`: ISO 8601 string ↔ Date
- `AppModule` imports `GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: true, context: ({ req }) => ({ tenantContext: req.tenantContext }) })`
- GraphQL endpoint: `POST /graphql` — **not** under `/api` prefix

### Step 1.8 — Auth Module

**WorkOS auth service (`workos-auth.service.ts`):**

- `signup(email, password, firstName, lastName)` → `workos.userManagement.createUser()`
- `login(email, password)` → `workos.userManagement.authenticateWithPassword()` → returns `{ accessToken, user, organizationId }`
- `verifyToken(token)` → `workos.userManagement.authenticateWithJwt()` → returns user + organizationId
- `getOrganizationMembership(userId, orgId)` → resolves role slug
- `createOrganization(name)` → `workos.organizations.createOrganization()`
- `createMembership(userId, orgId, roleSlug)` → `workos.userManagement.createOrganizationMembership()`

**Auth controller (`auth.controller.ts`):**

- `POST /api/auth/signup` → WorkOS createUser → tenant provisioning → set cookie
- `POST /api/auth/login` → WorkOS authenticateWithPassword → set httpOnly cookie with access token
- `POST /api/auth/logout` → clear cookie
- `GET /api/auth/me` → return current user + organizations list

**Admin auth guard (`admin-auth.guard.ts`):**

1. Extract `wos-session` cookie
2. `workosAuthService.verifyToken(token)` → user + organizationId
3. Fetch membership → get role slug
4. Set `req.tenantContext = { organizationId, userId, role, email }`
5. `await setRlsContext(db, organizationId)` (via a transaction or interceptor)

**Storefront auth guard (`storefront-auth.guard.ts`):**

1. Extract `X-API-Key` header → `apiKeyService.lookup(key)` → `organizationId`
2. Set `req.tenantContext = { organizationId }`
3. If `Authorization: Bearer <token>` present → `customerAuthService.verifyToken(token)` → add `customerId`

**RBAC guard (`rbac.guard.ts`):**

- Reads `@RequirePermission()` metadata via `Reflector`
- Checks `PERMISSIONS[permission].includes(req.tenantContext.role)`
- Throws `ForbiddenException` if denied

**PERMISSIONS matrix (`constants/permissions.ts`):**

```ts
export const PERMISSIONS = {
  "products.create": ["super_admin", "product_manager"],
  "products.read": ["super_admin", "product_manager", "support_agent"],
  "products.update": ["super_admin", "product_manager"],
  "products.delete": ["super_admin", "product_manager"],
  "orders.read": ["super_admin", "product_manager", "support_agent"],
  "orders.update": ["super_admin", "support_agent"],
  "orders.refund": ["super_admin"],
  "inventory.update": ["super_admin", "product_manager"],
  "discounts.write": ["super_admin", "product_manager"],
  "customers.update": ["super_admin", "support_agent"],
  "admin.manage": ["super_admin"],
  "settings.write": ["super_admin"],
  // ... full matrix from PRD §3.5
} as const;
```

**Customer auth service (`customer-auth.service.ts`):**

- `register(email, password, orgId)` → bcrypt hash → insert into `customers`
- `login(email, password, orgId)` → lookup by `(email, orgId)` → bcrypt compare → issue JWT
- `verifyToken(token)` → verify with `CUSTOMER_JWT_SECRET` → return `{ customerId, organizationId }`
- JWT payload: `{ sub: customerId, organizationId }`. Access TTL: 15m, refresh: 7d

**API key service (`api-key.service.ts`):**

- `generate(orgId, name, createdBy)` → crypto `randomBytes(32)` → SHA-256 hash → store hash + first-8-char prefix → return raw key once (not stored)
- `lookup(rawKey)` → SHA-256 hash → DB lookup → return `organizationId`
- `revoke(id, orgId)` → soft deactivate with org_id check

### Step 1.9 — Tenant Module

**Tenant provisioning service** (listens to `tenant.created` event):

1. Create WorkOS Organization → get `workosOrgId`
2. Create WorkOS membership (user → org, role: `super_admin`)
3. Insert into `organizations` table: `{ workosOrgId, name, slug }`
4. Seed: default shipping zone (domestic, flat-rate $0), default tax rate (0%), first API key
5. Emit done

**Admin organization controller:**

- `GET /api/admin/organization` — current org settings
- `PATCH /api/admin/organization` — update name/currency/timezone
- `POST /api/admin/organization/members` — invite via WorkOS
- `GET /api/admin/organization/members` — list with roles
- `PATCH /api/admin/organization/members/:id` — change role
- `DELETE /api/admin/organization/members/:id` — remove member

### Step 1.10 — Audit Module

**Audit service:**

```ts
log({
  entityType,
  entityId,
  action,
  actorType,
  actorId,
  changes,
  organizationId,
  ipAddress,
});
```

**Audit interceptor** (`audit.interceptor.ts`):

- Applied via `@UseInterceptors(AuditInterceptor('product', 'updated'))` on admin routes
- Captures before/after state and calls `auditService.log()`

### Step 1.11 — Event Bus Module

- `EventBusModule` wraps `@nestjs/event-emitter`, marked `@Global()`
- All events are typed classes (e.g., `OrderCreatedEvent`, `PaymentSucceededEvent`)
- Handlers in each module use `@OnEvent('order.created')` NestJS decorator

### Step 1.12 — Verification

Write integration tests:

1. Create tenant A and tenant B with separate API keys
2. Create a product under tenant A
3. Query products as tenant B → assert empty result
4. Attempt to `findById` tenant A's product UUID with tenant B's context → assert null

---

## Phase 2 — Catalog (Weeks 4–5)

### Step 2.1 — Product + Category Schemas

Define in `shared/database/schema/`:

- `products` — with `UNIQUE(organization_id, slug)`, soft delete `deleted_at`
- `product_variants` — with `UNIQUE(organization_id, sku)`
- `product_options`, `product_option_values`, `variant_option_values` (pivot)
- `categories` — self-referencing `parent_id`, `UNIQUE(organization_id, slug)`
- `product_categories` (pivot, no `organization_id` needed)
- `product_media` — `position: 0` = primary image

Generate and run migration. Apply RLS policy template (Appendix C of PRD) to all new tables.

### Step 2.2 — Product Service

- `create(dto, tenantCtx)` → generate slug (unique check via repo), insert product + options + variants atomically in a transaction
- `update(id, dto, tenantCtx)` → partial update, re-slug if name changed
- `softDelete(id, tenantCtx)` → sets `deleted_at`
- `listWithFilters(filters, cursor, limit)` → Drizzle query with `organization_id` + status + category filters + cursor pagination
- `getDetail(id)` → product + all variants + options + media + categories (single query with joins or parallel selects)

### Step 2.3 — Category Service

- `getTree(tenantCtx)` → recursive CTE via `db.execute(sql`WITH RECURSIVE...`)`, returns nested structure
- `create`, `update`, `delete` with position management

### Step 2.4 — Product Resolver (GraphQL)

Object types (code-first):

```ts
@ObjectType() Product { id, name, slug, variants, options, images, priceRange, inStock, ... }
@ObjectType() ProductVariant { id, sku, name, price: Money, inventory: InventoryStatus, ... }
@ObjectType() ProductConnection { edges, pageInfo, totalCount }
```

Queries: `products(first, after, filter, sort)`, `product(slug?, id?)`, `categories()`, `category(slug)`

### Step 2.5 — Admin Product Controller (REST)

Full CRUD from PRD §6.3:

- `GET /api/admin/products` — paginated list with filters
- `POST /api/admin/products` — create (guards: `AdminAuthGuard`, `@RequirePermission('products.create')`)
- `GET/PATCH/DELETE /api/admin/products/:id`
- `POST/PATCH/DELETE /api/admin/products/:id/variants/:vid`
- `POST/DELETE /api/admin/products/:id/media/:mid`
- `PATCH /api/admin/products/:id/media/reorder`

### Step 2.6 — R2 Storage Service

- `upload(key, buffer, contentType)` → `PutObjectCommand` to R2 bucket
- `delete(key)` → `DeleteObjectCommand`
- `getPublicUrl(key)` → `${STORAGE_PUBLIC_URL}/${key}`
- Media controller endpoints upload buffer → R2 → store CDN URL in `product_media`

### Step 2.7 — Inventory Module

`inventory_items` created automatically when a variant is created (via event or direct call in ProductService).

Inventory service methods:

- `checkAvailability(variantId, qty, orgId)` → `available = quantity - reserved >= qty`
- `reserve(variantId, qty, cartId, orgId)` → `SELECT FOR UPDATE` → insert `stock_reservation` + increment `reserved`
- `release(reservationId, orgId)` → decrement `reserved`, set reservation `status = released`
- `convert(reservationId, orgId)` → decrement `quantity`, set reservation `status = converted`
- `adjust(variantId, qty, reason, adminId, orgId)` → direct `quantity` update + audit log

---

## Phase 3 — Pricing + Cart (Weeks 6–7)

### Step 3.1 — Pricing Engine

`PricingEngine` service (injected by CartService and CheckoutService):

```ts
applyDiscounts(items: CartItemWithVariant[], couponCode: string | null, orgId: string): DiscountResult
calculateTax(items: PricedItem[], shippingAddress: Address, orgId: string): TaxResult
```

Discount application order:

1. Product-scoped discounts (match `scope = 'product'` + `scope_id = variant.productId`)
2. Category-scoped discounts (match `scope = 'category'` + product's categories)
3. Order-level discounts + coupon codes
4. Record full breakdown for order snapshot

### Step 3.2 — Tax Service

- Looks up `tax_rates` for `(country_code, state_code, orgId)`
- Rate in basis points: `7.25% = 725 bps`. Calculation: `Math.round(lineTotal * rate / 10000)`
- `is_inclusive`: if true, tax is included in price (back-calculate); if false, add on top

### Step 3.3 — Cart Module

**Cart service:**

- `createCart(orgId, customerId?)` → insert into `carts`, return cart with empty items
- `addItem(cartId, variantId, qty, orgId)` → check variant exists + active, snapshot `unit_price`, upsert `cart_items`, recalculate totals
- `recalculate(cartId, orgId)` → re-applies pricing engine, updates `subtotal/discount/tax/shipping/total`
- `applyCoupon(cartId, code, orgId)` → validate via pricing engine, store on cart
- `removeCoupon(cartId, orgId)` → clear, recalculate

**Cart resolver (GraphQL mutations):**
`createCart`, `addToCart`, `updateCartItem`, `removeFromCart`, `applyCoupon`, `removeCoupon`

All require `StorefrontAuthGuard` (X-API-Key only, no customer JWT needed for guest carts).

---

## Phase 4 — Checkout + Payments (Weeks 8–9)

### Step 4.1 — Shipping Module

- `getShippingRates(cartId, shippingAddress, orgId)`:
  1. Find matching `shipping_zone` by `shippingAddress.countryCode`
  2. Return active `shipping_methods` for that zone (name, price, estimated days)
  3. Apply free-shipping threshold if `min_order_amount` met
- GraphQL query: `shippingRates(input: ShippingRateInput!): [ShippingRate!]!`

### Step 4.2 — Customer Module

**Customer resolver (GraphQL):**

- `register(input)` → `customerAuthService.register()` → return `AuthPayload { accessToken, refreshToken, customer }`
- `login(input)` → `customerAuthService.login()` → return `AuthPayload`
- `refreshToken(token)` → verify refresh token → issue new access token
- `me` query → `@RequireCustomer()` guard → return customer from DB
- `myOrders(first, after)` → paginated order history
- Address mutations: `addAddress`, `updateAddress`, `deleteAddress`

### Step 4.3 — Payment Module

**PaymentProvider interface:**

```ts
interface PaymentProvider {
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string>,
  ): Promise<{ clientSecret: string; paymentIntentId: string }>;
  capturePayment(paymentIntentId: string): Promise<void>;
  refundPayment(
    chargeId: string,
    amount: number,
    reason?: string,
  ): Promise<{ refundId: string }>;
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event;
}
```

**StripeAdapter** implements `PaymentProvider`:

- Single Stripe account; tenant identified via `metadata: { organizationId }`
- `createPaymentIntent` → `stripe.paymentIntents.create({ amount, currency, metadata })`

**StripeWebhookController** (`POST /api/webhooks/stripe`):

- Raw body parsing (must bypass NestJS body parser for signature verification)
- `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`
- Handled events: `payment_intent.succeeded` → emit `PaymentSucceededEvent`; `payment_intent.payment_failed` → emit `PaymentFailedEvent`
- Resolve `organizationId` from `payment` table via `paymentIntentId` (never from webhook metadata)

### Step 4.4 — Checkout Service (the big one)

Implements PRD §7.1 exactly:

```ts
async checkout(cartId: string, input: CheckoutInput, tenantCtx: TenantContext): Promise<CheckoutResult>
```

Steps (all within a single DB transaction where possible):

1. Load + validate cart (items exist, variants active, prices current)
2. `inventoryService.reserve()` for each item — `SELECT FOR UPDATE`, rollback all on any failure
3. `pricingEngine.applyDiscounts()` + `pricingEngine.calculateTax()`
4. `shippingService.getMethodPrice(shippingMethodId)`
5. Create `order` record (status: `pending`) + `order_line_items` snapshots
6. Create `payment` record (status: `pending`) + call `stripeAdapter.createPaymentIntent()`
7. Update `cart.status = 'converted'`
8. Return `{ order, paymentClientSecret }`

**Reservation expiry background job** (`@nestjs/schedule`):

- `@Cron('*/5 * * * *')` → `inventoryService.expireStaleReservations()` → releases all `active` reservations past `expires_at`

### Step 4.5 — Event Handlers (Payment Events)

```ts
@OnEvent('payment.succeeded')
async handlePaymentSucceeded(event: PaymentSucceededEvent) {
  await this.orderService.markPaid(event.orderId, event.organizationId);
  await this.inventoryService.convertReservations(event.orderId, event.organizationId);
  await this.auditService.log({ action: 'payment_received', ... });
}

@OnEvent('payment.failed')
async handlePaymentFailed(event: PaymentFailedEvent) {
  await this.orderService.markFailed(event.orderId, event.organizationId);
  await this.inventoryService.releaseReservations(event.orderId, event.organizationId);
}
```

---

## Phase 5 — Order Management (Weeks 10–11)

### Step 5.1 — Order State Machine

Valid transitions (throw `BadRequestException` on invalid):

```
pending  → paid | cancelled
paid     → processing | refunded
processing → shipped | refunded
shipped  → delivered | refunded
delivered → refunded
```

`OrderService.transition(orderId, newStatus, actor, orgId)`:

1. Load order with org_id check
2. Validate transition is allowed
3. Update `orders.status`
4. Insert `order_timeline` entry
5. Emit appropriate event

### Step 5.2 — Manual Order Creation (Admin)

`POST /api/admin/orders` — implements PRD §7.6:

- No stock reservation — direct `inventoryService.adjust()` (decrement immediately)
- `payment.type = 'paid'` → `payment.status = captured`, `order.status = paid`
- `payment.type = 'invoice'` → `payment.status = pending`, `order.status = pending`
- `provider = 'manual'`, no Stripe call
- Timeline entry: "Order created manually by {adminName}"

### Step 5.3 — Refund Service

`initiateRefund(orderId, amount, reason, adminId, orgId)`:

1. Load order + payment with org_id checks
2. For Stripe orders: `stripeAdapter.refundPayment(chargeId, amount)` → get `refundId`
3. For manual orders: skip Stripe call, just update DB
4. Insert `refunds` record
5. Update `payment.status` (refunded vs partially_refunded based on amount)
6. Update `order.status = refunded` if full refund
7. `inventoryService.adjust(+qty)` to restore stock
8. Audit log + timeline entry

### Step 5.4 — Admin Order Controller

All routes under `AdminAuthGuard` + appropriate `@RequirePermission()`:

- `GET /api/admin/orders` — list with filters (status, date range, customer, payment status), cursor pagination
- `GET /api/admin/orders/:id` — full detail with timeline + line items + payment
- `PATCH /api/admin/orders/:id/status` — call `orderService.transition()`
- `POST /api/admin/orders/:id/notes` — insert timeline entry type `note_added`
- `POST /api/admin/orders/:id/refund` — call `refundService.initiateRefund()`
- `POST /api/admin/orders/:id/shipment` — create shipment record, update `fulfillment_status`

---

## Phase 6 — Admin APIs + Polish (Weeks 12–14)

### Step 6.1 — Dashboard Stats

`GET /api/admin/dashboard/stats?period=today|7d|30d|90d`

Each metric computed per PRD §6.3 table (data sources per metric). Use Drizzle `sql` tag for aggregation queries. Include prior-period comparison (shift date range back) and daily sparkline array.

### Step 6.2 — Remaining Admin Controllers

- `GET /api/admin/api-keys` + `POST` + `DELETE /:id`
- `GET/POST/PATCH/DELETE /api/admin/tax-rates`
- `GET /api/admin/audit-logs?entityType=&actorId=&from=&to=`

### Step 6.3 — Throttling

`ThrottlerModule.forRoot` with limits from PRD:

- Storefront routes: 100 req/min per API key
- Admin routes: 300 req/min per user

### Step 6.4 — Swagger / OpenAPI

`@nestjs/swagger` — annotate all admin controllers with `@ApiTags`, `@ApiOperation`, `@ApiResponse`. Auto-generated at `/api/docs`.

### Step 6.5 — Testing

**Unit tests** (co-located `*.spec.ts`):

- `pricing-engine.service.spec.ts` — discount stacking, coupon validation, tax calc (inclusive + exclusive)
- `inventory.service.spec.ts` — reserve/release/convert, concurrent reservation logic
- `order.service.spec.ts` — all valid + invalid state machine transitions
- `tenant-scoped.repository.spec.ts` — org_id always injected, findById rejects wrong org

**Integration tests** (`test/`):

- Full checkout flow: cart → checkout → Stripe webhook → order paid
- Cross-tenant isolation: tenant A data not accessible from tenant B context

**Seed script** (`src/shared/database/seeds/`):

- Creates demo org + admin user via WorkOS
- Seeds 10 products with variants, 2 categories, 5 orders in various states
- Generates a usable API key, prints it to console

---

## NestJS Best Practices Applied Throughout

| Concern             | Approach                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant context      | `REQUEST`-scoped provider — never singleton                                                                                                                                                                                                                                                                                                                                                                                      |
| Guard order         | `AdminAuthGuard` / `StorefrontAuthGuard` sets context → `RbacGuard` reads it                                                                                                                                                                                                                                                                                                                                                     |
| RLS setup           | Interceptor sets `SET LOCAL app.current_org_id` after auth, before any handler                                                                                                                                                                                                                                                                                                                                                   |
| Module boundaries   | Modules only expose Services — no cross-module repository imports                                                                                                                                                                                                                                                                                                                                                                |
| Money               | Never `number` in DTOs — always validated as `integer` via `@IsInt()`                                                                                                                                                                                                                                                                                                                                                            |
| Error format        | Global `HttpExceptionFilter` returns `{ error: { code, message, details } }`                                                                                                                                                                                                                                                                                                                                                     |
| Validation          | `ValidationPipe` with `whitelist: true, transform: true, forbidNonWhitelisted: true`                                                                                                                                                                                                                                                                                                                                             |
| Raw body            | Stripe webhook controller uses `@RawBody()` / custom middleware — not JSON parsed                                                                                                                                                                                                                                                                                                                                                |
| Transactions        | Drizzle `db.transaction()` wraps checkout + reservation atomically                                                                                                                                                                                                                                                                                                                                                               |
| Pagination          | All list endpoints use cursor-based pagination (never offset)                                                                                                                                                                                                                                                                                                                                                                    |
| GraphQL field types | **Always** pass an explicit type function to every `@Field()` decorator — `@Field(() => String)`, `@Field(() => Boolean)`, `@Field(() => Date)`, etc. Never use bare `@Field()`. NestJS GraphQL cannot infer the type from TypeScript metadata for nullable union types (`string \| null`, `Date \| null`) and will crash at startup with `UndefinedTypeError`. This applies to both `@ObjectType()` and `@InputType()` classes. |

---

## Critical Files (Quick Reference)

| File                                                  | Why it matters                                              |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `src/shared/tenant/tenant-scoped.repository.ts`       | Every data access goes through this — the org_id safety net |
| `src/shared/database/schema/index.ts`                 | Single source of truth for all table definitions            |
| `src/modules/auth/guards/admin-auth.guard.ts`         | Gate for all admin endpoints                                |
| `src/modules/auth/guards/storefront-auth.guard.ts`    | Gate for all GraphQL operations                             |
| `src/modules/auth/constants/permissions.ts`           | RBAC permission matrix                                      |
| `src/modules/cart/services/checkout.service.ts`       | Most complex service — orchestrates the full checkout flow  |
| `src/modules/order/services/order.service.ts`         | State machine — invalid transitions must throw              |
| `src/modules/inventory/services/inventory.service.ts` | All stock mutations — must be atomic                        |
| `src/shared/utils/money.util.ts`                      | All arithmetic — no floats anywhere                         |

---

## Verification Plan

After each phase:

1. **Phase 1**: Run `npm run test` — tenant isolation integration test passes; two orgs cannot see each other's data
2. **Phase 2**: Create a product via REST, query it via GraphQL with the org's API key — returns correct data
3. **Phase 3**: Add to cart, apply coupon, verify totals match expected cents values
4. **Phase 4**: Run checkout → receive Stripe client secret → simulate Stripe webhook → order transitions to `paid`, stock decremented
5. **Phase 5**: Test all state machine transitions including invalid ones; test manual order creation flow
6. **Phase 6**: Seed script runs cleanly; Swagger UI renders at `/api/docs`; cross-tenant isolation test suite passes
