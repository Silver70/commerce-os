# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A multi-tenant headless commerce engine built as a Turborepo monorepo. The system serves as a single source of truth for product catalog, inventory, orders, and payments, consumed by storefronts via a GraphQL API and managed via a REST-based admin dashboard. Full product requirements and data models are in [context/headless-commerce-mvp-prd.md](context/headless-commerce-mvp-prd.md). Admin UI screens are spec'd in [context/admin-dashboard-ui-screens.md](context/admin-dashboard-ui-screens.md).

## Apps

- **`apps/frontend`** — The storefront (Next.js-like Remix v3 beta app). Uses `remix/fetch-router` with file-based controllers. Runs on port 44100. The `server.ts` bootstraps with `remix/node-serve`.
- **`apps/backend`** — The commerce engine API (not yet scaffolded). Will expose GraphQL for storefronts and REST for admin + webhooks.

## Packages

- **`packages/ui`** — Shared React component stubs (`button.tsx`, `card.tsx`, `code.tsx`).
- **`packages/eslint-config`** — Shared ESLint configs (Next.js + Prettier).
- **`packages/typescript-config`** — Shared `tsconfig.json` bases (`base`, `nextjs`, `react-library`).

## Commands

Run from the monorepo root:

```sh
npm run dev          # Start all apps in watch mode (turbo)
npm run build        # Build all apps
npm run lint         # Lint all packages
npm run check-types  # Type-check all packages
npm run format       # Prettier format all TS/MD files
```

Target a specific app with turbo filter:

```sh
npx turbo dev --filter=frontend
npx turbo build --filter=frontend
```

Frontend only (from `apps/frontend/`):

```sh
npm run dev          # tsx watch server.ts (port 44100)
npm run test         # tsx --test (Node built-in test runner)
npm run typecheck    # tsc --noEmit
```

## Architecture

### Multi-Tenancy (Critical)

Every tenant-scoped table has `organization_id UUID NOT NULL` as its second column. **This is enforced everywhere without exception.** The `TenantScopedRepository` base class auto-injects `organization_id` on all queries. PostgreSQL Row-Level Security acts as a second line of defense (see PRD §3.4 and Appendix C).

Auth resolves `organization_id` from three sources depending on caller:
- **Admin dashboard** → WorkOS JWT (httpOnly cookie) → `organization_id` from JWT claims
- **Storefront** → `X-API-Key` header → API key lookup → `organization_id`
- **Stripe webhooks** → payment intent ID → internal payment record → `organization_id`

### API Split

- **GraphQL** (`POST /graphql`): storefront-only. No admin mutations in GraphQL.
- **REST** (`/api/admin/*`): admin dashboard + webhooks. Protected by WorkOS JWT + RBAC.

### Auth Split

- **Admin users** → WorkOS AuthKit (hosted login, org memberships, three roles: `super_admin`, `product_manager`, `support_agent`).
- **Storefront customers** → lightweight JWT issued by the commerce engine itself (not WorkOS). Separate auth stack.

### Money

All monetary values are stored as integers (cents / smallest currency unit). **Never floats.** Never format money server-side except in the GraphQL `Money.formatted` field.

### Frontend Router Pattern

The `apps/frontend` app uses Remix v3's `fetch-router` pattern: define routes in `app/routes.ts` using typed `route()` helper, create controller handlers in `app/controllers/`, and register them in `app/router.ts`.

### Planned Backend Module Structure

```
src/modules/
  auth/          WorkOS integration, customer JWT, API key service, RBAC middleware
  product/       Products, variants, options, categories, media
  inventory/     Stock items, reservations, threshold alerts
  pricing/       Discounts, coupons, pricing engine
  cart/          Cart CRUD, checkout service
  order/         Order state machine, timeline, refunds
  customer/      Storefront customer accounts, addresses
  payment/       Stripe adapter behind PaymentProvider interface, webhooks
  shipping/      Zones, methods, shipments
  audit/         Audit log service + viewer

src/shared/
  tenant/        TenantContext, TenantScopedRepository, RLS setup
  events/        In-process event bus + typed event definitions
  graphql/       Merged schema, scalars (Money, DateTime), directives
  database/      Connection, migrations, seeds
  utils/         money.ts (integer arithmetic), slug.ts, pagination.ts (cursor codec)
```

### Key Business Logic Rules

- **Inventory mutations are atomic**: all stock changes use `SELECT FOR UPDATE` in a single transaction. Never allow `quantity - reserved` to go negative unless `allow_backorder` is true.
- **Order line items are immutable snapshots**: product name, SKU, price, image URL are captured at order creation. Repricing or deleting a product does not change existing orders.
- **Order state machine**: `pending → paid → processing → shipped → delivered`. Any post-`pending` state can transition to `refunded`. Invalid transitions throw errors.
- **Stock reservation TTL**: 15 minutes (configurable). A background job expires stale reservations.
- **Checkout is idempotent**: use `Idempotency-Key` header on checkout and payment mutations.
- **`findById` always includes `org_id` check**: never trust a UUID belongs to the current tenant without checking.

## Environment Variables

See Appendix B of the PRD for the full list. Key ones:

```
DATABASE_URL              PostgreSQL connection string
WORKOS_API_KEY            WorkOS secret key
WORKOS_CLIENT_ID          WorkOS client ID
WORKOS_REDIRECT_URI       OAuth callback URL
CUSTOMER_JWT_SECRET       64-char secret for storefront customer JWTs
STRIPE_SECRET_KEY         Stripe secret
STRIPE_WEBHOOK_SECRET     Stripe webhook signing secret
```
