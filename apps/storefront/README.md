# Storefront

A headless commerce storefront for **Commerce OS**, built with TanStack Start
(Vite + TanStack Router + TanStack Query + Tailwind v4). It consumes the
Commerce OS **GraphQL** API and is designed to double as a **reusable template**:
fork it, edit a config file + theme tokens + env vars, and ship a new brand.

Build plan: [`context/storefrontPlan.md`](../../context/storefrontPlan.md).

## Architecture (security model)

The browser **never** holds a secret and **never** talks to the commerce backend
directly. All commerce calls go through TanStack Start **server functions**,
which hold the `X-API-Key`, the backend URL, and the customer's JWT (server env +
httpOnly cookies). The browser only ever talks to _our_ Start server.

```
Browser ──server-fn RPC──► Start server ──POST /graphql (X-API-Key)──► Commerce backend
   └── Stripe.js (publishable key + per-payment clientSecret only)
```

## Getting started

```sh
cp .env.example .env        # fill in COMMERCE_API_URL, COMMERCE_API_KEY, VITE_STRIPE_PUBLISHABLE_KEY
npm install                 # from the monorepo root (npm workspaces)
npx turbo dev --filter=storefront   # http://localhost:5173
```

Create the storefront API key in the admin (**Settings → API Keys**); the raw
key is shown once. Seed a populated catalog with the backend `db:seed` script.

## Environment variables

| Var                           | Scope       | Notes                                   |
| ----------------------------- | ----------- | --------------------------------------- |
| `COMMERCE_API_URL`            | server-only | Backend base URL, no `/graphql` suffix  |
| `COMMERCE_API_KEY`            | server-only | Storefront `X-API-Key` for this store   |
| `VITE_STRIPE_PUBLISHABLE_KEY` | browser     | Stripe publishable key (safe by design) |

## Project layout

```
src/
├── config/        ◄ TEMPLATE KNOBS — store.config.ts, home-sections.ts
├── lib/           gql-client (server-only transport), session (cookies), money, utils (cn)
├── types/api.ts   hand-written GraphQL response shapes
├── components/
│   ├── ui/        shadcn primitives
│   └── layout/    Header, Footer, CartButton, SectionHeading
├── features/      catalog / cart / checkout / account (per-feature server.ts + queries.ts)
├── routes/        thin TanStack Router files (loaders only)
└── styles/app.css Tailwind v4 + theme tokens (◄ TEMPLATE KNOB)
```

## Forking checklist (rebrand a new store)

1. Set env vars (`.env`): `COMMERCE_API_URL`, `COMMERCE_API_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`.
2. Edit [`src/config/store.config.ts`](src/config/store.config.ts) — name, currency, locale, nav, features.
3. Edit [`src/config/home-sections.ts`](src/config/home-sections.ts) — homepage sections by category slug.
4. Adjust theme tokens in [`src/styles/app.css`](src/styles/app.css) — `--primary`, `--radius`, `--font-sans`.
5. Swap `public/` favicons + logo.
6. Deploy.
