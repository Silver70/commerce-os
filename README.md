# Commerce OS

A multi-tenant headless commerce engine. It acts as the single source of truth for product catalog, inventory, orders, payments and analytics — consumed by storefronts over GraphQL and managed through a REST-backed admin dashboard.

Built as a Turborepo monorepo with NestJS, PostgreSQL, Drizzle ORM and TanStack Start.

---

## What's inside

### Apps

| App                   | Stack                                | Dev URL               | Purpose                                                                                                                |
| --------------------- | ------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **`apps/backend`**    | NestJS · Drizzle · PostgreSQL        | http://localhost:4000 | The commerce engine. GraphQL at `POST /graphql` for storefronts, REST at `/api/admin/*` for the dashboard and webhooks |
| **`apps/frontend`**   | TanStack Start · React · Tailwind v4 | http://localhost:3000 | Admin dashboard — catalog, orders, customers, discounts, analytics                                                     |
| **`apps/storefront`** | TanStack Start · React · Tailwind v4 | http://localhost:5173 | Customer-facing shop, talks to the engine over GraphQL                                                                 |

### Packages

| Package                       | Purpose                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| **`@repo/analytics-js`**      | Drop-in storefront analytics tracker (`ca.js`) that feeds the event ingest API |
| **`@repo/ui`**                | Shared React components                                                        |
| **`@repo/eslint-config`**     | Shared ESLint configs                                                          |
| **`@repo/typescript-config`** | Shared `tsconfig.json` bases                                                   |

---

## 1. Prerequisites

|                | Version     | Notes                                                |
| -------------- | ----------- | ---------------------------------------------------- |
| **Node.js**    | 18 or newer | 22 LTS recommended                                   |
| **npm**        | 10 or newer | The repo pins `npm@11.12.1` via `packageManager`     |
| **PostgreSQL** | 13 or newer | 13+ is required for the built-in `gen_random_uuid()` |

No Docker required. You need a PostgreSQL server you can connect to and create a database on.

> **A note on your Postgres timezone.** The schema uses `timestamp without time zone` columns and the app sends query bounds in UTC. Each connection is pinned to UTC so this works regardless of your server's timezone — but if you query the database by hand, run `SET TIME ZONE 'UTC'` first or timestamps will look shifted.

---

## 2. Install

```sh
git clone <your-repo-url> commerce-os
cd commerce-os
npm install
```

This is an npm-workspaces monorepo — one install at the root covers every app and package.

---

## 3. Create the database

```sh
createdb commerce_os
# or, if createdb isn't on your PATH:
psql -U postgres -c "CREATE DATABASE commerce_os;"
```

---

## 4. Configure environment variables

Each app has its own `.env.example`. Copy all three and fill them in — the files carry per-variable guidance, so read them as you go.

```sh
cp apps/backend/.env.example    apps/backend/.env
cp apps/frontend/.env.example   apps/frontend/.env
cp apps/storefront/.env.example apps/storefront/.env
```

`.env` files are gitignored. Never commit one.

### The values you must set to boot

**`DATABASE_URL`** (`apps/backend/.env`) — point it at the database you just created:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/commerce_os
```

Do not append `?sslmode=require` — a local Postgres has no TLS and the connection will fail.

**`ADMIN_JWT_SECRET` and `CUSTOMER_JWT_SECRET`** — each needs 64+ random characters. Generate two distinct values:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Startup validation (`apps/backend/src/config/configuration.ts`) rejects anything shorter, so the app refuses to boot rather than run with a weak secret.

**`VITE_API_URL`** (`apps/frontend/.env`) — `http://localhost:4000`. Must be absolute; the dashboard's server functions run in Node, where `fetch()` rejects relative URLs.

### Bring your own keys: Stripe and Cloudflare R2

**Everything in this project works** — catalog, orders, customers, discounts, dashboards, analytics — **except payments and image uploads**, which call third-party services. Those need your own accounts.

The `.env.example` files ship placeholder values for both, so the app boots and you can explore immediately. Startup validation only checks that the variables are _present_, not that they are valid.

| Feature            | Variables                                                                   | Without real keys                                                  |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Payments**       | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY` | Everything works; checkout fails when it calls Stripe              |
| **Product images** | `STORAGE_*` (5 vars)                                                        | Everything works; uploading media fails with a TLS handshake error |

<details>
<summary><b>Getting Stripe test keys</b></summary>

1. Sign up at [stripe.com](https://stripe.com) and stay in **Test mode**.
2. Go to [Developers → API keys](https://dashboard.stripe.com/test/apikeys).
3. Copy the **Secret key** (`sk_test_…`) into `STRIPE_SECRET_KEY` in `apps/backend/.env`.
4. Copy the **Publishable key** (`pk_test_…`) into `VITE_STRIPE_PUBLISHABLE_KEY` in `apps/storefront/.env`.
5. For webhooks, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

   ```sh
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   ```

   It prints a signing secret (`whsec_…`) — put that in `STRIPE_WEBHOOK_SECRET`.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

</details>

<details>
<summary><b>Getting Cloudflare R2 credentials</b></summary>

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), open **R2** and create a bucket.
2. `STORAGE_BUCKET` — the bucket name.
3. `STORAGE_ACCOUNT_ID` — your **Account ID**, shown in the sidebar of the R2 page. This one matters: the endpoint is built as `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`, so a wrong value produces a confusing TLS handshake failure rather than a 403.
4. Create an **R2 API token** with object read/write on that bucket, then copy its **Access Key ID** and **Secret Access Key** into `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY`.
5. Enable public access on the bucket (or attach a custom domain) and put that URL in `STORAGE_PUBLIC_URL`.

R2's free tier is generous and needs no card for light use. Any other S3-compatible provider (MinIO, AWS S3, Backblaze) would require making the endpoint configurable in `apps/backend/src/shared/storage/r2-storage.service.ts`, which currently hardcodes the R2 hostname.

</details>

---

## 5. Run the migrations

```sh
cd apps/backend
npm run db:migrate
```

This applies every migration in `src/shared/database/migrations` and creates the full schema. It needs no extensions beyond what stock PostgreSQL 13+ provides.

---

## 6. Start everything

From the repo root:

```sh
npm run dev
```

Turborepo starts all three apps together. To run just one:

```sh
npx turbo dev --filter=backend
```

API documentation (Swagger) is served at http://localhost:4000/api/docs.

---

## 7. Create your admin account and store

There is no default login — you create the first account yourself, and doing so bootstraps the organization.

1. Open **http://localhost:3000/auth/signup**.
2. Register with an email, a password (8+ characters), and an organization name — for example `Acme Inc`.
   This single step creates your admin user, the organization, and your `super_admin` membership.
3. You land in **onboarding**. Step 1 creates your first store — name it whatever you like (`Acme Store`).
4. Finish onboarding and you arrive at the dashboard. It will be empty — that is expected.

> Prefer the API? `POST /api/auth/admin/register` with `{ "email", "password", "orgName" }` does the same thing, then `POST /api/admin/stores` with your access token creates the store.

---

## 8. Seed demo data

Now fill that empty dashboard:

```sh
cd apps/backend
npm run db:seed-demo
```

This generates roughly **90 days of backdated history** for your store:

- 8 categories, 40 products, ~84 variants, with inventory (including deliberate low-stock rows so the dashboard widget has content)
- 200 customers
- ~400 orders across all seven order states, each with line items, a payment and a timeline entry
- ~25,000 storefront analytics events — sessions, funnel stages, traffic sources, devices and countries

Order volume trends upward with weekend dips, so sparklines and period-over-period comparisons show realistic movement instead of a flat line.

It targets the first store it finds. To pick a specific one:

```sh
SEED_STORE_ID=<store-uuid> npm run db:seed-demo
```

**Re-running is safe.** It wipes catalog, orders, customers and analytics for that store first, then regenerates. Your admin user, organization, store, API keys, shipping zones and price lists are never touched.

To change the volume, edit `VOLUME` in `apps/backend/src/shared/database/seeds/demo/config.ts` and run it again.

Refresh the dashboard and every screen will be populated.

### Logging in as a seeded customer

All seeded storefront customers share the password **`Password1!`**. Their emails follow `firstname.lastnameN@example.com` — pick any one from **Customers** in the admin dashboard to log into the storefront with.

### Other seed scripts

| Command                 | Purpose                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:seed-demo`  | The full demo dataset described above                                                                                                                                                                          |
| `npm run db:seed`       | A small fixed dataset for smoke tests. Requires an existing store — pass `SEED_STORE_ID`                                                                                                                       |
| `npm run db:seed-admin` | Creates or resets an admin user in an existing org. Needs `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Use this to reset a forgotten password — it does **not** bootstrap a new org, so run it after signup, not before |

---

## 9. Connecting the storefront

The storefront authenticates with a store API key rather than a user session.

1. In the admin dashboard, go to **Settings → API Keys** and generate a key for your store.
   (Or `POST /api/admin/stores/{storeId}/api-keys` with an admin token.)
2. The raw key is shown **once** — only a hash is stored. Copy it immediately.
3. Put it in `apps/storefront/.env` as `COMMERCE_API_KEY`.
4. Restart the storefront dev server.

---

## Commands

From the repo root, these run across every workspace via Turborepo:

```sh
npm run dev            # start all apps in watch mode
npm run build          # build all apps
npm run lint           # lint all packages
npm run check-types    # type-check all packages
npm run format         # prettier across all TS/MD files
```

Backend-specific, from `apps/backend`:

```sh
npm run db:generate    # generate a migration from schema changes
npm run db:migrate     # apply pending migrations
npm run db:push        # push schema directly (dev only — skips migration files)
npm run db:seed-demo   # full demo dataset
npm run db:seed        # small smoke-test dataset
npm run db:seed-admin  # create/reset an admin user
npm run test           # unit tests
npm run test:e2e       # end-to-end tests
```

---

## Architecture notes

**Multi-tenancy.** Every tenant-scoped table carries `organization_id` as its second column, without exception. `TenantScopedRepository` injects it into all queries, and `findById` always verifies it — a UUID is never assumed to belong to the current tenant.

**API split.** GraphQL is storefront-only; there are no admin mutations in GraphQL. Admin operations are REST under `/api/admin/*`, protected by the admin JWT plus role-based permissions.

**Auth split.** Admin users authenticate with a self-issued JWT (HS256, 1h access token, 7d rotating refresh token). Storefront customers have a separate JWT stack. Both are first-party — there is no third-party identity provider.

**Money.** All monetary values are integers in the smallest currency unit (cents). Never floats. Formatting happens only in the GraphQL `Money.formatted` field.

**Order line items are immutable snapshots.** Product name, SKU, price and image are captured at order creation, so repricing or deleting a product never alters historical orders.

**Order state machine.** `pending → paid → processing → shipped → delivered`, with any post-`pending` state able to transition to `refunded`. Invalid transitions throw.

**Analytics events are storefront-driven.** `analytics_events` is written only by the ingest endpoint, fed by the `@repo/analytics-js` tracker. Creating an order through the admin dashboard emits a domain event on the in-process bus but writes no analytics row — which is why the analytics screens stay empty without either real storefront traffic or the demo seed.

---

## Troubleshooting

**`Failed to parse URL from /api/auth/admin/register`**
`VITE_API_URL` is unset in `apps/frontend/.env`. The dashboard's server functions run in Node, where `fetch()` requires an absolute URL. Set it and restart the dev server — Vite only reads env vars at startup.

**`password authentication failed for user "postgres"` (`28P01`)**
The credentials in `DATABASE_URL` are wrong. The error means the driver reached Postgres successfully, so only the username or password is at fault.

**`EPROTO … SSL alert number 40` when uploading an image**
`STORAGE_ACCOUNT_ID` is a placeholder or wrong, so the endpoint resolves to a Cloudflare hostname that does not exist. Alert 40 is `handshake_failure` — the request never reached authentication. See §4.

**`Cannot find module './config/configuration'`**
You ran `npm run build` while `npm run dev` was live. `apps/backend/nest-cli.json` sets `deleteOutDir: true`, so the build wipes the `dist/` the dev server is executing from. Restart the dev server. To type-check without disturbing it, use `npx tsc --noEmit` instead of a full build.

**Recent orders don't appear on the dashboard**
Timestamps were written under a non-UTC session. The app pins connections to UTC, so this only affects rows inserted before that fix or by an external tool. Re-run `npm run db:seed-demo` to regenerate cleanly.

**`Store not found` when seeding**
`db:seed` targets a hardcoded store id. Use `db:seed-demo`, which picks the first store automatically, or pass `SEED_STORE_ID`.
