# Backend — Commerce OS engine

The commerce engine: a multi-tenant headless commerce API built with NestJS, Drizzle ORM and PostgreSQL. It is the single source of truth for catalog, inventory, orders, payments and analytics.

> **Setting the project up for the first time?** Follow the [root README](../../README.md) — it covers prerequisites, environment variables, migrations, creating your admin account and seeding demo data for the whole monorepo. This file covers the backend specifically.

## Surfaces

| Surface | Path | Auth | Consumer |
|---|---|---|---|
| **GraphQL** | `POST /graphql` | `x-api-key` header | Storefronts |
| **REST** | `/api/admin/*` | Admin JWT (Bearer) + RBAC | Admin dashboard |
| **Webhooks** | `/api/webhooks/stripe` | Stripe signature | Stripe |
| **Swagger** | `/api/docs` | — | Humans |

There are no admin mutations in GraphQL, and no storefront reads in REST. The split is deliberate.

## Layout

```
src/
  modules/
    analytics/   Event ingest, funnel/traffic queries, daily rollups, retention
    audit/       Audit log service + viewer
    auth/        Admin auth (JWT + sessions), customer JWT, API keys, RBAC guards
    cart/        Cart CRUD and checkout
    customer/    Storefront customer accounts, addresses, groups
    dashboard/   Aggregate metrics and sparklines for the admin home
    inventory/   Stock items, reservations, low-stock thresholds
    order/       Order state machine, timeline, refunds
    payment/     Stripe adapter behind a PaymentProvider interface, webhooks
    pricing/     Discounts, coupons, price lists, tax rates
    product/     Products, variants, options, categories, media
    shipping/    Zones, methods, shipments
    tenant/      Organizations, stores, API key management

  shared/
    database/    Connection, schema, migrations, seeds
    events/      In-process event bus + typed event definitions
    graphql/     Merged schema, scalars (Money, DateTime)
    storage/     Cloudflare R2 adapter for product media
    tenant/      TenantContext, TenantScopedRepository, RLS helpers
    utils/       Integer money arithmetic, slugs, cursor pagination
```

## Commands

```sh
npm run dev            # watch mode (port 4000)
npm run build          # compile to dist/
npm run start:prod     # run the compiled build
npm run lint           # eslint --fix
npm run test           # unit tests
npm run test:e2e       # end-to-end tests
npm run test:cov       # coverage

npm run db:generate    # generate a migration from schema changes
npm run db:migrate     # apply pending migrations
npm run db:push        # push schema directly (dev only — skips migration files)
npm run db:seed-demo   # ~90 days of demo catalog, orders and analytics
npm run db:seed        # small fixed dataset for smoke tests
npm run db:seed-admin  # create or reset an admin user in an existing org
```

> Do not run `npm run build` while `npm run dev` is live — `nest-cli.json` sets `deleteOutDir: true`, so the build wipes the `dist/` the dev server is executing from. Use `npx tsc --noEmit` to type-check instead.

## Conventions that are enforced, not suggested

**Every tenant-scoped table has `organization_id` as its second column.** `TenantScopedRepository` injects it into all queries, and `findById` always verifies it — never assume a UUID belongs to the current tenant.

**Money is always an integer** in the smallest currency unit. Never floats, and never format server-side except in the GraphQL `Money.formatted` field.

**Order line items are immutable snapshots.** Name, SKU, price and image are captured at order creation so repricing or deleting a product cannot rewrite history.

**Inventory mutations are atomic.** Stock changes take `SELECT FOR UPDATE` inside a transaction; `quantity - reserved` may not go negative unless `allow_backorder` is set.

**Timestamps are UTC.** Columns are `timestamp without time zone` and queries send UTC bounds, so every connection pins its session to UTC (`options: '-c timezone=UTC'` in `database.module.ts`). If you insert rows from an external tool, make sure it does the same or they will be shifted.

## Database

Drizzle ORM over `node-postgres`, with a connection pool created in `src/shared/database/database.module.ts` and drained on module destroy.

Schema lives in `src/shared/database/schema/`, one file per table, re-exported from `index.ts`. After changing it:

```sh
npm run db:generate   # writes a new SQL migration
npm run db:migrate    # applies it
```

Migrations need no PostgreSQL extensions — `gen_random_uuid()` is built in from 13 onward.
