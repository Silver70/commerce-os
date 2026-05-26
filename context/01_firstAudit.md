# Backend Code Audit — First Pass

**Date:** 2026-05-26  
**Scope:** `apps/backend/src/` — all 62 TypeScript source files  
**Stack:** NestJS · Drizzle ORM · Neon PostgreSQL · WorkOS · EventEmitter2 · Apollo GraphQL

---

## Executive Summary

The backend has a solid architectural foundation: multi-tenancy is enforced at every layer, the database schema covers the full e-commerce domain, and RBAC is properly modeled. However, only **3 of the 10 planned domain modules** are implemented (Auth, Tenant, Audit). The remaining 7 (Product, Order, Inventory, Cart, Customer, Payment, Shipping / Tax / Discount / Pricing) exist only as database schemas. One **critical security vulnerability** must be fixed before any production deployment, and several type-safety and design issues need attention before the codebase scales.

---

## File Inventory

```
src/
├── main.ts
├── app.module.ts
├── config/
│   └── configuration.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── constants/permissions.ts
│   │   ├── controllers/auth.controller.ts
│   │   ├── decorators/current-tenant.decorator.ts
│   │   ├── decorators/require-permission.decorator.ts
│   │   ├── guards/admin-auth.guard.ts
│   │   ├── guards/rbac.guard.ts
│   │   ├── guards/storefront-auth.guard.ts
│   │   ├── interceptors/set-rls-context.interceptor.ts
│   │   └── services/
│   │       ├── api-key.service.ts
│   │       ├── customer-auth.service.ts
│   │       └── workos-auth.service.ts
│   ├── audit/
│   │   ├── audit.module.ts
│   │   ├── controllers/admin-audit.controller.ts
│   │   ├── interceptors/audit.interceptor.ts
│   │   └── services/audit.service.ts
│   └── tenant/
│       ├── tenant.module.ts
│       ├── controllers/admin-organization.controller.ts
│       └── services/
│           ├── tenant.service.ts
│           └── tenant-provisioning.service.ts
└── shared/
    ├── database/
    │   ├── database.module.ts
    │   └── schema/ (29 schema files + index.ts)
    ├── events/
    │   ├── event-bus.module.ts
    │   └── events.ts
    ├── graphql/scalars/
    │   ├── date-time.scalar.ts
    │   └── money.scalar.ts
    ├── storage/r2-storage.service.ts
    ├── tenant/
    │   ├── rls.setup.ts
    │   ├── tenant-context.ts
    │   └── tenant-scoped.repository.ts
    └── utils/
        ├── money.util.ts
        ├── pagination.util.ts
        └── slug.util.ts
```

---

## Critical Issues

### 1. JWT Signature Not Verified — `workos-auth.service.ts:40-42`

```typescript
// VULNERABLE — no signature check
const payload = JSON.parse(
  Buffer.from(token.split(".")[1], "base64url").toString(),
);
```

The `verifyToken()` method manually decodes the JWT payload from base64 without ever verifying the cryptographic signature. An attacker can craft an arbitrary JWT with any `sub` / `org_id` and gain admin access to any tenant. This is a complete authentication bypass.

Contrast with `customer-auth.service.ts:84` which does it correctly:

```typescript
const payload = jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
```

**Fix:** Use the WorkOS SDK's built-in token verification (`workos.userManagement.authenticateWithJwt()` or the JWKS endpoint) rather than manual decoding. At minimum, fetch WorkOS's public key and call `jwt.verify()`.

---

### 2. `TenantCreatedEvent` Emitted With Empty `organizationId` — `auth.controller.ts:59`

```typescript
this.eventEmitter.emit(
  "tenant.created",
  new TenantCreatedEvent("", user.id, dto.email, dto.organizationName),
);
```

The `organizationId` field of `TenantCreatedEvent` is `''` at emit time because the WorkOS org doesn't exist yet — it gets created inside the event handler. The provisioning handler relies on `event.name` and `event.userId` only, so the empty string doesn't break anything today, but it makes the event semantically wrong and will mislead any future listener that reads `event.organizationId` (e.g., a metrics or analytics listener).

**Fix:** Either rename the field to make the pre-creation state clear (`pendingOrgName` etc.), or restructure so the org is created before the event is emitted and the real `organizationId` is passed.

---

## High-Priority Issues

### 3. Untyped WorkOS SDK Responses — `auth.controller.ts:78,85` and `admin-auth.guard.ts:36`

```typescript
// auth.controller.ts
res.cookie('wos-session', (result as any).accessToken, ...);
return { user: (result as any).user };

// admin-auth.guard.ts
const role = (membership?.role as any)?.slug ?? null;
```

The WorkOS Node SDK ships TypeScript types. Casting to `any` means compiler errors are suppressed and future SDK changes will silently break the login flow. Define or import the proper response types.

### 4. `TenantScopedRepository` is Fully Untyped — `tenant-scoped.repository.ts`

Seven `as any` casts on `this.table`, and all public methods return `any`. The class is generic over `TTable extends PgTable` but discards that information immediately. `softDelete()` also silently writes `deletedAt` to any table without knowing whether that column exists.

```typescript
async softDelete(id: string): Promise<any | null> {
  const rows = await this.db
    .update(this.table as any)      // loses type
    .set({ deletedAt: new Date() }) // assumes column exists
    ...
```

This is the core repository pattern used by all future domain modules. Fixing it now, before those modules are built, avoids a mass refactor later. The Drizzle ORM supports properly typed table generics.

### 5. No Database Indexes Defined

The schema has no explicit indexes beyond primary keys and the few `unique()` constraints. Missing indexes for common production query patterns:

| Table                | Column(s)                        | Query Pattern                    |
| -------------------- | -------------------------------- | -------------------------------- |
| `customers`          | `(organization_id, email)`       | Login, duplicate check           |
| `orders`             | `(organization_id, created_at)`  | Date-range listing               |
| `orders`             | `order_number`                   | Order lookup                     |
| `audit_logs`         | `(organization_id, created_at)`  | Audit log listing                |
| `carts`              | `(organization_id, customer_id)` | Active cart lookup               |
| `stock_reservations` | `expires_at`                     | Expiry job scan                  |
| `coupons`            | `(organization_id, code)`        | Coupon code redemption           |
| `api_keys`           | `key_hash`                       | Auth on every storefront request |

The `api_keys.key_hash` missing index is the most urgent — that column is queried on every storefront API call and has no index.

### 6. CORS Falls Back to Wildcard — `main.ts:21`

```typescript
origin: corsOrigins ? corsOrigins.split(',').map((o) => o.trim()) : true,
```

If `CORS_ORIGINS` is unset, `origin: true` reflects any origin with credentials, which defeats the httpOnly cookie security model. Add `CORS_ORIGINS` to the Joi validation schema as a required field in production (or at least default to `[]`/`false`).

---

## Medium Issues

### 7. `order_timeline.metadata` Is `text`, Not `jsonb` — `order-timeline.schema.ts`

The `metadata` column on the order timeline table stores arbitrary event data (shipment info, payment details, admin comments). It's typed as `text`, meaning queries against specific metadata fields are impossible and the data has no schema enforcement. Change to `jsonb`.

### 8. Inline DTOs in Controller — `auth.controller.ts:22-34`

`SignupDto` and `LoginDto` are declared as bare classes inside the controller file. This works but is inconsistent with the project's module structure and makes the DTOs invisible to Swagger's type reflection. Move them to `dto/` files and add `@ApiProperty()` decorators.

### 9. No Refresh Token Endpoint

`CustomerAuthService.login()` issues both `accessToken` (15m) and `refreshToken` (7d), but there is no endpoint to exchange a refresh token for a new access token. Storefront customers will be logged out after 15 minutes with no way to silently refresh. Either add a `/storefront/auth/refresh` endpoint or drop the refresh token from the response until the endpoint exists.

### 10. Tax Rate Units Undocumented

The `tax_rates.rate` column is an `integer`. The `money.util.ts` `applyPercentage()` function uses basis points (1% = 100). If tax rates follow the same convention, a 10% tax rate is stored as `1000`. This constraint should be documented in a schema comment or a type alias — it's easy for future developers to insert `10` thinking it means 10%.

### 11. Rate Limiting Is Global Only

`ThrottlerModule` is configured globally at 100 requests / 60 seconds with no per-route or per-API-key overrides. Checkout and payment endpoints should be more aggressively throttled; read-only catalog endpoints can be more permissive.

---

## What Works Well

**Multi-tenancy enforcement** is thorough. `organizationId` is on every table, the `TenantScopedRepository` injects it on every write, the RLS interceptor sets a Postgres session variable, and both guards set `request.tenantContext`. The layering is correct.

**API key security** is well-implemented. Keys are SHA256-hashed before storage, the raw key is never retrievable after generation, the key prefix is stored separately for UI display, and `lastUsedAt` is updated on each use (`api-key.service.ts`).

**Customer password security** uses bcrypt at 12 rounds (`customer-auth.service.ts:16`), which is a sensible cost for 2026 hardware.

**Environment validation** via Joi in `configuration.ts` enforces minimum secret lengths (`CUSTOMER_JWT_SECRET` min 64 chars) and validates all required env vars on startup. This will surface misconfiguration before the app accepts traffic.

**Event-driven provisioning** cleanly separates signup from org creation. If WorkOS is slow or fails, the signup response is not delayed, and the error is logged without exposing internals to the user.

**Money arithmetic** in `money.util.ts` is all integer-based with `Math.trunc()` — no floats, no rounding drift.

**Schema breadth** is impressive: 29 tables covering the full e-commerce lifecycle (orders, inventory, reservations, coupons, shipping, tax, refunds, audit). The schema is the single source of truth and it reflects the PRD accurately.

---

## Implementation Gaps (Schema Exists, Module Does Not)

These tables exist in the database schema but have no corresponding NestJS module, controller, or service:

| Domain    | Schema Tables                                                                                                                                            | Status      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Products  | `products`, `product_variants`, `product_options`, `product_option_values`, `variant_option_values`, `product_media`, `categories`, `product_categories` | Schema only |
| Inventory | `inventory_items`, `stock_reservations`                                                                                                                  | Schema only |
| Cart      | `carts`, `cart_items`                                                                                                                                    | Schema only |
| Orders    | `orders`, `order_line_items`, `order_timeline`                                                                                                           | Schema only |
| Customers | `customers`, `addresses`                                                                                                                                 | Schema only |
| Payments  | `payments`, `refunds`                                                                                                                                    | Schema only |
| Shipping  | `shipping_zones`, `shipping_methods`, `shipments`                                                                                                        | Schema only |
| Discounts | `discounts`, `coupons`                                                                                                                                   | Schema only |
| Tax       | `tax_rates`                                                                                                                                              | Schema only |

Additionally:

- No GraphQL resolvers exist despite the Apollo module being configured with `MoneyScalar` and `DateTimeScalar`
- No Stripe webhook endpoint
- No background job for stock reservation TTL expiry (the schema has `stock_reservations.expires_at` but nothing reads it)
- No email verification flow after admin signup (WorkOS creates the user with `emailVerified: false` and returns a success, but no verification email mechanism is wired up)

---

## Prioritized Fix List

| Priority | Issue                                       | File                                        | Effort  |
| -------- | ------------------------------------------- | ------------------------------------------- | ------- |
| **P0**   | JWT signature not verified                  | `workos-auth.service.ts:38-59`              | Small   |
| **P0**   | Add index on `api_keys.key_hash`            | Schema / migration                          | Trivial |
| **P1**   | Fix untyped WorkOS SDK casts                | `auth.controller.ts`, `admin-auth.guard.ts` | Small   |
| **P1**   | Add missing DB indexes (5 tables)           | Schema / migration                          | Small   |
| **P1**   | CORS wildcard fallback                      | `main.ts:21`                                | Trivial |
| **P1**   | Retype `TenantScopedRepository`             | `tenant-scoped.repository.ts`               | Medium  |
| **P2**   | Fix `TenantCreatedEvent` empty orgId        | `auth.controller.ts:59`                     | Trivial |
| **P2**   | Change `order_timeline.metadata` to `jsonb` | `order-timeline.schema.ts`                  | Trivial |
| **P2**   | Add refresh token endpoint                  | New controller method                       | Small   |
| **P2**   | Extract DTOs from controller                | `auth.controller.ts`                        | Small   |
| **P3**   | Document tax rate units                     | `tax-rates.schema.ts`                       | Trivial |
| **P3**   | Per-route throttle configuration            | `app.module.ts`                             | Small   |
