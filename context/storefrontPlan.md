# Storefront Implementation Plan

The build plan for `apps/storefront` — a headless commerce storefront that consumes the Commerce OS **GraphQL** API. It is designed to double as a **reusable template**: a new brand should be able to fork it, change a config file + theme tokens + env vars, and ship.

> Scope of v1: browse products (homepage sections + category filtering), product detail, add to cart, cart drawer/page with quantity edits, and a working Stripe checkout that produces a paid order. Customer accounts/order history are scaffolded but optional for v1.

---

## 1. Guiding principles

1. **Mirror the admin conventions** in [context/frontend-guideline.md](frontend-guideline.md) so anyone who knows the admin knows the storefront: thin routes → `features/` → `server.ts` + `queries.ts`, kebab-case files, `PascalCase` components, `getXServerFn` / `xQueryOptions` naming, integer-cents money, shared API types in `src/types/api.ts`, React Query for all server state, `useState` for local UI state.
2. **The browser never holds a secret.** All commerce API calls go through TanStack Start **server functions**. The `X-API-Key`, the backend URL, and the customer's JWT live only on the server (env + httpOnly cookies). The browser talks to *our* Start server, never to the commerce backend directly. (This is the same boundary the admin uses with `createServerFn` — we just swap REST+WorkOS for GraphQL+API-key.)
3. **Template-first.** Anything brand-specific (store name, currency, featured homepage sections, colors, fonts) lives in `src/config/` and CSS theme tokens — never hardcoded in components.
4. **Server-driven cart & pricing.** The backend is the source of truth for prices, discounts, tax, and totals. The client never computes money; it renders what the cart/checkout returns.

---

## 2. Architecture & security model

```
┌───────────┐    HTTPS (no secrets)     ┌──────────────────────┐   server-to-server    ┌──────────────────┐
│  Browser  │ ───────────────────────►  │  TanStack Start server│ ────────────────────► │ Commerce GraphQL │
│ (React)   │   server-fn RPC calls     │  (server functions)   │   POST /graphql       │  backend (Nest)  │
│           │ ◄───────────────────────  │  • holds X-API-Key    │   X-API-Key + Bearer  │                  │
└───────────┘                           │  • reads/sets cookies │                       └──────────────────┘
      │                                 └──────────────────────┘
      │ Stripe.js (publishable key + clientSecret only)
      ▼
┌───────────┐
│  Stripe   │
└───────────┘
```

**Secret handling**

| Secret | Where it lives | Never |
|---|---|---|
| `COMMERCE_API_KEY` (storefront X-API-Key) | server env, attached inside server fns | sent to browser |
| Customer access/refresh JWT | httpOnly, Secure, SameSite=Lax cookies set by server fns | localStorage / JS-readable |
| `cartId` | httpOnly cookie, server-managed | exposed/guessable in URLs |
| Stripe **publishable** key | `VITE_STRIPE_PUBLISHABLE_KEY` (browser, safe by design) | — |
| Stripe **client secret** | returned by `checkout` server fn → handed to Stripe Elements for that one payment | logged/persisted |

Because the browser never calls the backend directly, **no CORS exposure of the API key** and the commerce backend's `CORS_ORIGINS` does not even need the storefront origin. Rate limiting on the backend is keyed by API key (already implemented).

---

## 3. Backend prerequisites (close before building the cart UI)

The deep-dive fixes (line-item snapshots, active-only products, guest `orderStatus`, required checkout email) are already in. **One gap remains that blocks the cart UI:**

- **`CartItemType` has no display data.** It returns only `variantId`, `quantity`, `unitPrice`, `totalPrice` — no product name, variant name, image, or slug. The storefront cannot render a cart line from that. **Enrich `CartItemType`** (in `apps/backend/src/modules/cart/models/cart.model.ts` + `toCartItemType` in `cart.resolver.ts`, sourcing data via the existing `CartRepository.getProductSnapshots` + variant lookup):

  ```graphql
  type CartItemType {
    id: ID!
    variantId: ID!
    quantity: Int!
    unitPrice: Int!      # cents
    totalPrice: Int!     # cents
    # add:
    productName: String!
    productSlug: String! # for linking back to the PDP
    variantName: String
    sku: String!
    imageUrl: String
  }
  ```

- **Stripe publishable key per store.** Decide the source: simplest for the template is a build-time env (`VITE_STRIPE_PUBLISHABLE_KEY`). If keys must be per-tenant at runtime, expose a small public `storeConfig` query (publishable key + currency + store name) guarded by the API key. **Recommendation:** env var for v1; note the query as a future enhancement.

These two are the only backend changes required. Everything else the storefront needs already exists.

---

## 4. Storefront GraphQL contract (already available)

All operations require the `X-API-Key` header; customer-scoped ones also send `Authorization: Bearer <token>`. Prices are **integer cents** (`Int`), not the `Money` scalar.

**Catalog (public)**
- `products(first, after, filter: { categoryId, search, vendor })` → `ProductConnection` (active-only, enforced server-side)
- `product(id | slug)` → `ProductType` (returns null for non-active)
- `categories` → `[CategoryType]` (tree with `children`)
- `category(slug | id)` → `CategoryType`

**Cart (public, store-scoped)**
- `createCart` → `CartType`
- `cart(cartId)` → `CartType`
- `addToCart(cartId, variantId, quantity)` → `CartType`
- `updateCartItem(cartId, itemId, quantity)` → `CartType` (quantity `0` removes)
- `removeFromCart(cartId, itemId)` → `CartType`
- `applyCoupon(cartId, code)` / `removeCoupon(cartId)` → `CartType`

**Checkout & shipping**
- `shippingRates(countryCode, orderSubtotal)` → `[ShippingRateType]` (`methodId`, `name`, `price`, `estimatedDaysMin/Max`)
- `checkout(cartId, input: CheckoutInput)` → `CheckoutResultType` `{ orderId, orderNumber, paymentClientSecret, total, currency }`
  - `CheckoutInput`: `{ shippingAddress | shippingAddressId, shippingMethodId!, email!, idempotencyKey? }`
- `orderStatus(orderNumber, email)` → `OrderType?` (guest confirmation/status; null on mismatch)

**Customer (optional for v1)**
- `register`, `login`, `refreshToken`, `me`, `updateProfile`, `myOrders`, `myOrder(id)`, address CRUD.

---

## 5. Directory structure

Adapted from the admin guideline; `lib/` carries the GraphQL transport instead of the REST `api-client`.

```
apps/storefront/src/
├── config/                      # ◄ TEMPLATE KNOBS — edit these to rebrand
│   ├── store.config.ts          # store name, currency, nav links, social
│   └── home-sections.ts         # homepage section definitions (by category slug)
├── components/
│   ├── ui/                      # shadcn primitives (button, card, sheet, input…)
│   └── layout/                  # Header, Footer, CartButton, MobileNav, SectionHeading
├── features/
│   ├── catalog/                 # products + categories
│   │   ├── pages/               # home, product-list (category), product-detail
│   │   ├── components/          # ProductCard, ProductGrid, CategoryFilter, ProductGallery, VariantPicker, AddToCartButton
│   │   ├── server.ts            # getProducts/getProduct/getCategories/getCategoryBySlug ServerFns
│   │   ├── queries.ts           # productsQueryOptions, productQueryOptions, categoriesQueryOptions…
│   │   ├── types.ts
│   │   └── graphql.ts           # gql operation strings for this feature
│   ├── cart/
│   │   ├── components/          # CartDrawer, CartLineItem, CartSummary, QuantityStepper, CouponField
│   │   ├── pages/               # cart-page.tsx
│   │   ├── server.ts            # getCart/addToCart/updateItem/removeItem/applyCoupon ServerFns
│   │   ├── queries.ts           # cartQueryOptions
│   │   ├── hooks.ts             # useCart(), useCartMutations()
│   │   └── graphql.ts
│   ├── checkout/
│   │   ├── pages/               # checkout-page.tsx, order-confirmation-page.tsx
│   │   ├── components/          # ShippingAddressForm, ShippingRatePicker, StripePaymentForm, OrderSummary
│   │   ├── server.ts            # getShippingRates/createCheckout/getOrderStatus ServerFns
│   │   ├── queries.ts
│   │   └── graphql.ts
│   └── account/                 # (optional v1) login/register/orders
├── lib/
│   ├── gql-client.ts            # server-only gqlFetch(query, vars, { customer })
│   ├── session.ts               # cookie helpers: cartId, customer tokens (httpOnly)
│   ├── money.ts                 # formatMoney(cents, currency)
│   └── cn.ts                    # tailwind-merge classnames helper
├── routes/                      # thin TanStack Router files (loaders only)
├── types/
│   └── api.ts                   # shared GraphQL response types (hand-written; codegen optional later)
└── styles/
    └── app.css                  # Tailwind v4 + theme tokens (CSS variables)
```

---

## 6. Core infrastructure (build first)

### 6.1 GraphQL transport — `lib/gql-client.ts` (server-only)
A tiny typed fetch wrapper. No Apollo/urql in the browser (it would force the API key client-side). It runs only inside server functions.

```ts
// Throws on network/GraphQL errors; returns typed data.
export async function gqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  opts?: { customerToken?: string; idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": process.env.COMMERCE_API_KEY!,
  };
  if (opts?.customerToken) headers.authorization = `Bearer ${opts.customerToken}`;
  if (opts?.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;

  const res = await fetch(`${process.env.COMMERCE_API_URL}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}
```

### 6.2 Session/cookies — `lib/session.ts`
- `getOrCreateCartId()`: read `cartId` from httpOnly cookie; if absent, call `createCart`, set the cookie, return it. Used by every cart server fn.
- `getCustomerToken()` / `setCustomerSession(tokens)` / `clearCustomerSession()`: httpOnly, Secure, SameSite=Lax. (Account feature.)
- Use TanStack Start's request/response cookie helpers inside server fns.

### 6.3 Money — `lib/money.ts`
`formatMoney(cents: number, currency = store.config.currency)` via `Intl.NumberFormat`. Never do money math client-side.

### 6.4 Types — `types/api.ts`
Hand-write the response shapes (`Product`, `ProductVariant`, `Category`, `Cart`, `CartItem`, `ShippingRate`, `CheckoutResult`, `OrderStatus`). Mirror the admin's single-source-of-types approach. *(Optional future: `graphql-codegen` against an emitted `schema.gql`; out of scope for v1 to keep the template lean.)*

### 6.5 Config — `config/store.config.ts` & `config/home-sections.ts`
```ts
// store.config.ts
export const storeConfig = {
  name: "Acme",
  currency: "USD",
  nav: [{ label: "Shop All", to: "/products" }],
};
// home-sections.ts — homepage merchandising, by category slug
export const homeSections = [
  { title: "New Arrivals", categorySlug: "new", limit: 8 },
  { title: "Apparel", categorySlug: "apparel", limit: 4 },
];
```

---

## 7. Data layer conventions (querying best practices)

Follow the guideline exactly:

- **Components never call server fns directly** — only through `queryOptions`.
- **Route loaders prefetch** with `context.queryClient.ensureQueryData(...)` for page-critical data (SSR + instant nav).
- **`useSuspenseQuery`** for page-critical data; **`useQuery` with `?? []`** for below-the-fold sections.
- **Query keys** are structured + param-scoped: `["products", filter]`, `["product", slug]`, `["categories"]`, `["cart"]`.
- **`staleTime`**: catalog data is fairly static → `60_000`+; cart → small/0 (always fresh after mutations).
- **Mutations invalidate the specific key** (`["cart"]`) on success — never blanket-invalidate.
- **Pagination**: cursor-based "Load more" (the `products` connection returns `pageInfo.endCursor`/`hasNextPage`), accumulated in component state — identical to the admin list pattern.

Example (catalog):
```ts
// features/catalog/queries.ts
export const productsQueryOptions = (filter: ProductFilter = {}) =>
  queryOptions({
    queryKey: ["products", filter],
    queryFn: () => getProductsServerFn({ data: filter }),
    staleTime: 60_000,
  });
```
```ts
// routes/products/index.tsx (thin)
export const Route = createFileRoute("/products/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions()),
  component: ProductListPage,
});
```

Every `server.ts` handler validates input with **Zod** (`.inputValidator(...)`) before touching `gqlFetch` — same rule as the admin.

---

## 8. Feature modules

### 8.1 Catalog
**Pages**
- `HomePage` — renders `homeSections`: a hero + one `ProductGrid` per configured category section. Loader prefetches `categoriesQueryOptions()` + each section's `productsQueryOptions({ categoryId, first })`. Since `products` filters by `categoryId` (UUID) but config uses **slugs**, resolve slug→id via `getCategoryBySlug` (or map from the categories tree) inside a `homeSectionsQueryOptions`/loader helper.
- `ProductListPage` — `/products` and `/products?category=<slug>`. Left/top `CategoryFilter` (from `categories` tree) + `ProductGrid` + "Load more". Category selection updates a search param; the query key includes the category id.
- `ProductDetailPage` — `/products/$slug`. `useSuspenseQuery(productQueryOptions(slug))`. `ProductGallery` (media, primary first), `VariantPicker` (from `options`/`variants`; resolves the selected `variantId`), price (incl. `compareAtPrice` strikethrough), `AddToCartButton`.

**Components**: `ProductCard` (image, name, price range `minPrice`–`maxPrice`, quick "Add"), `ProductGrid`, `SectionHeading`, `CategoryFilter`, `ProductGallery`, `VariantPicker`, `AddToCartButton`.

**Server fns**: `getProductsServerFn`, `getProductServerFn` (by slug), `getCategoriesServerFn`, `getCategoryBySlugServerFn`.

### 8.2 Cart
**State strategy** — the cart is **server state**, cached by React Query under `["cart"]`:
- `cartQueryOptions()` → `getCartServerFn` which `getOrCreateCartId()` then `cart(cartId)`. Returns `null`/empty when the cart has no items.
- `useCart()` hook = `useQuery(cartQueryOptions())`; powers the header badge and the drawer.
- `useCartMutations()` wraps add/update/remove/coupon mutations; each `onSuccess` → `invalidateQueries({ queryKey: ["cart"] })`. Use **optimistic updates** for the `QuantityStepper` (snapshot → patch → rollback on error) for snappy UX.

**Components**: `CartDrawer` (shadcn `Sheet`, opened from header), `CartLineItem` (image, name → links to PDP via `productSlug`, `QuantityStepper`, line total, remove), `CartSummary` (subtotal, discount, "taxes & shipping at checkout"), `CouponField`, `CartPage` (full-page version of the drawer for `/cart`).

**Server fns**: `getCartServerFn`, `addToCartServerFn`, `updateCartItemServerFn`, `removeFromCartServerFn`, `applyCouponServerFn`, `removeCouponServerFn` — all derive `cartId` from the cookie server-side (never trust a client-supplied cart id).

### 8.3 Checkout
**Flow** (`/checkout`):
1. `ShippingAddressForm` (Zod-validated, `useState` fields per guideline) + `email`.
2. On address country/subtotal known → `getShippingRatesServerFn(countryCode, subtotal)` → `ShippingRatePicker` (sets `shippingMethodId`).
3. Submit → `createCheckoutServerFn({ cartId(from cookie), shippingAddress, shippingMethodId, email, idempotencyKey })`. Generate a stable `idempotencyKey` (e.g. `crypto.randomUUID()` held in component state) so retries are safe.
4. Receive `paymentClientSecret` → mount **Stripe Payment Element** (`@stripe/react-stripe-js`) with `VITE_STRIPE_PUBLISHABLE_KEY`. `stripe.confirmPayment({ clientSecret, confirmParams: { return_url: /order/confirmation?orderNumber=... } })`.
5. **Confirmation** (`/order/confirmation`): poll `getOrderStatusServerFn(orderNumber, email)` (React Query `refetchInterval` until `status === "paid"`, with a timeout fallback). The Stripe webhook flips the order `pending → paid` server-side; the page reflects it. Show order number, line items (now with real names + images), totals.

**Components**: `ShippingAddressForm`, `ShippingRatePicker`, `StripePaymentForm`, `OrderSummary`, `OrderConfirmation`.

**Server fns**: `getShippingRatesServerFn`, `createCheckoutServerFn`, `getOrderStatusServerFn`.

### 8.4 Account (optional v1, scaffold the folder)
Login/register server fns set the httpOnly customer cookie from `AuthPayloadType.accessToken/refreshToken`; `me`, `myOrders`, `myOrder` for order history; addresses for faster checkout. Defer behind a feature flag in `store.config.ts`.

---

## 9. Routes (thin, file-based)

```
routes/
├── __root.tsx                 # (exists) add Header + Footer + CartDrawer providers
├── index.tsx                  # HomePage  (loader: categories + section products)
├── products/
│   ├── index.tsx              # ProductListPage (?category=slug)
│   └── $slug.tsx              # ProductDetailPage
├── cart.tsx                   # CartPage
├── checkout.tsx               # CheckoutPage  (beforeLoad: redirect to /cart if empty)
└── order/
    └── confirmation.tsx       # OrderConfirmationPage (?orderNumber=)
```
Routes only wire `loader`/`beforeLoad` + point to a page component (no UI in route files). Update `__root.tsx` to render the storefront shell (header/footer/cart drawer) around `<Outlet/>`, and replace the default TanStack SEO/meta with `storeConfig`-driven values.

---

## 10. Theming & "make it a template"

- **CSS theme tokens** in `styles/app.css` (Tailwind v4 `@theme`): brand color, radius, font family as CSS variables. Rebranding = edit tokens, not components.
- **Config-driven content**: nav, currency, homepage sections all in `config/`. No category names/IDs hardcoded in JSX.
- **Component isolation**: `ProductCard`, `Header`, `Footer` read from `store.config` + props only.
- **Forking checklist** (document in storefront `README.md`): set env vars → edit `store.config.ts` + `home-sections.ts` → adjust theme tokens → swap `/public` favicons/logo → deploy.
- **shadcn** for primitives (`button`, `card`, `sheet`, `input`, `badge`, `dialog`, `skeleton`) installed into `components/ui/` for consistency with the admin and easy restyling via tokens.

---

## 11. Security checklist

- [ ] `COMMERCE_API_KEY` only read in server fns; grep the client bundle to confirm it never ships.
- [ ] Customer JWT + `cartId` in httpOnly/Secure/SameSite cookies; never localStorage; never in query keys/URLs.
- [ ] Every server fn validates input with Zod; never forward raw client objects to GraphQL.
- [ ] `cartId` always derived from the cookie server-side (a client cannot operate on someone else's cart).
- [ ] `checkout` sends a client-generated `Idempotency-Key`; retries don't double-charge.
- [ ] Guest order lookup always requires `orderNumber` **+** `email` (backend enforces; never expose an order by number alone).
- [ ] Only Stripe's **publishable** key and the per-payment `clientSecret` reach the browser.
- [ ] Storefront only ever sees `active` products (backend-enforced) — no draft leakage.
- [ ] No PII or tokens logged in server fns.

---

## 12. Implementation phases

Each phase is independently runnable/testable.

1. **Foundation** — add deps (`zod`, `@stripe/stripe-js`, `@stripe/react-stripe-js`, shadcn + `clsx`/`tailwind-merge`); build `lib/gql-client.ts`, `lib/session.ts`, `lib/money.ts`, `config/*`, `types/api.ts`; theme tokens; Header/Footer shell in `__root.tsx`. **Backend prereq: enrich `CartItemType`.**
2. **Catalog read path** — categories + products server fns/queries; `HomePage` sections; `ProductListPage` with category filter + load-more; `ProductDetailPage` with variant picker. *(No cart yet — verify browsing + SSR + prefetch.)*
3. **Cart** — cart server fns + cookie; `useCart`; `AddToCartButton`; `CartDrawer` + `CartPage`; quantity edits (optimistic); coupon field. *(Verify totals/discounts come from server.)*
4. **Checkout** — shipping address form + rate picker; `createCheckout`; Stripe Payment Element; confirmation page polling `orderStatus`. *(End-to-end: real Stripe test card → order flips to paid.)*
5. **Polish & template-ize** — loading/skeleton states, empty states, error boundaries, SEO meta from product/store config, mobile nav, README forking guide.
6. **(Optional) Accounts** — login/register/order history behind a config flag.

---

## 13. Environment variables

```
COMMERCE_API_URL              # e.g. http://localhost:4000  (server-only)
COMMERCE_API_KEY              # storefront X-API-Key for this store (server-only)
VITE_STRIPE_PUBLISHABLE_KEY   # Stripe publishable key (browser)
```
Create the API key in the admin: **Settings → API Keys** (POST `/admin/stores/:id/api-keys`); the raw key is shown once. Seed demo data with the backend `db:seed` script for a populated catalog.

---

## 14. Decisions

**Settled**
1. **Stripe publishable key → env var** (`VITE_STRIPE_PUBLISHABLE_KEY`). One storefront deploy = one store for v1. A public `storeConfig` query for per-tenant runtime config is a future option, not built now.
2. **GraphQL types → hand-written `types/api.ts`**, mirroring the admin's single-source-of-types approach. Keeps the template lean and tooling-free. `graphql-codegen` (needs the backend to emit `schema.gql`) stays a future option if drift becomes a problem.

**Still open**
3. **Cart merge on login**: if accounts ship, decide whether a guest cart merges into the customer's cart on login (backend `getOrCreateActiveCart` already keys carts by customer — a merge step would be needed).
4. **Tax/shipping preview**: cart shows `0` for tax/shipping until checkout (backend computes them at checkout). Confirm the UX copy ("calculated at checkout").
```
