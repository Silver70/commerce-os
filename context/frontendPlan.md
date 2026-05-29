# Frontend ↔ Backend Integration Plan

## Context

The admin dashboard frontend was built with hardcoded mock data while the backend was scaffolded. Both are now complete. This plan covers replacing all mock data with real API calls, establishing a typed API client layer, wiring up all forms and mutations, and adding route-level authentication — so the frontend and backend behave as a unified product.

---

## Identified Misalignments (Fix Before Implementing)

| #   | Location                | Issue                                                                                                                                                   |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `auth/signup.tsx`       | Collects "Name" (single field) + confirm-password. Backend `SignupDto` requires `firstName`, `lastName`, `organizationName`. Missing org name entirely. |
| 2   | `onboarding/step2.tsx`  | Country multi-select stores full names ("United States"). Backend shipping zones expect ISO 3166-1 alpha-2 codes ("US").                                |
| 3   | `onboarding/step3.tsx`  | API key is a hardcoded constant `MOCK_API_KEY`. Must be generated from `POST /api/admin/stores/:storeId/api-keys` (keys are store-scoped).              |
| 4   | `src/utils/users.tsx`   | Backend URL hardcoded as `http://localhost:3000` (the frontend port). Backend runs on **port 4000**.                                                    |
| 5   | All admin routes        | No authentication guard. Any unauthenticated user can access `/admin/*`.                                                                                |
| 6   | No email-verify route   | Backend sends a verification email after signup and requires `POST /api/auth/verify-email`. No matching frontend route exists.                          |
| 7   | Inline types everywhere | Route files define local `Product`, `Order`, etc. interfaces that diverge from backend response shapes. Must be centralized.                            |
| 8   | No pagination wiring    | Backend returns `{ items, nextCursor, totalCount }`. Frontend DataTable has no cursor-pagination logic.                                                 |

> **Multi-store addenda to the table above:** (9) the admin shell has no active-store switcher; (10) `src/lib/api-client.ts` sends only the session cookie and must also forward an `X-Store-Id` header; (11) `onboarding/step1.tsx` writes `currency`/`timezone` to the organization, but those are now store-level.

---

## Architecture

### Multi-Store Model (read first)

The backend now lets one organization run **multiple stores** (see [`context/RefactorPlan.md`](./RefactorPlan.md)). Customers are shared org-wide, but catalog, inventory, orders, pricing, shipping, and API keys are **per store**. For the admin dashboard:

- The admin works against **one active store at a time**, chosen via a store switcher in the shell.
- Every admin API call carries the active `store_id` as an `X-Store-Id` header, sourced from a `wos-active-store` cookie so `createServerFn` (SSR server) can read it the same way it reads `wos-session`. It's injected centrally in the API client, so individual module screens don't change.
- `currency`/`timezone` are **store** settings, not organization settings.
- Storefront keys are issued per store and already identify their store to the backend.

### Data Fetching Pattern (strict)

```
Route loader
  └─ ensureQueryData(queryOptions)     ← server-side initial fetch
       └─ queryFn calls createServerFn ← backend HTTP call (has cookie access)

Component
  └─ useSuspenseQuery(queryOptions)    ← reads hydrated cache, stays reactive

Mutation
  └─ createServerFn (POST/PATCH/DELETE) → called from useMutation → invalidate queries
```

- All HTTP calls to the backend go through `createServerFn` — never `fetch`/`axios` directly from client components.
- Server functions have access to the `wos-session` cookie automatically (they run on the SSR server).
- Zod validates **all** form inputs before mutation server functions are called.

### File Layout to Create

```
apps/frontend/src/
  types/
    api.ts               ← all backend types (1 source of truth, no `any`)
  lib/
    api-client.ts        ← configured redaxios instance (baseURL from env, credentials: include)
    active-store.ts      ← reads wos-active-store cookie → X-Store-Id header (server-side)
    money.ts             ← formatMoney(cents, currency) utility
    errors.ts            ← typed API error parsing
  server/                ← createServerFn grouped by domain
    auth.ts
    products.ts
    orders.ts
    customers.ts
    inventory.ts
    pricing.ts
    shipping.ts
    dashboard.ts
    settings.ts
  queries/               ← TanStack Query queryOptions by domain
    auth.ts
    products.ts
    orders.ts
    customers.ts
    inventory.ts
    pricing.ts
    shipping.ts
    dashboard.ts
    settings.ts
```

---

## Phase 1 — Foundation (do this first, everything else depends on it)

### 1.1 Environment

Add `apps/frontend/.env`:

```
VITE_API_URL=http://localhost:4000
```

Update `apps/frontend/vite.config.ts` to expose the var (it already starts with `VITE_`; TanStack Start passes it through automatically).

### 1.2 Centralized Types — `src/types/api.ts`

Define TypeScript interfaces that **exactly** mirror backend response shapes. Key types:

```typescript
// Auth
type AdminUser = {
  userId: string;
  email: string;
  organizationId: string;
  role: AdminRole;
  memberships: WorkOsMembership[];
};
type AdminRole = "super_admin" | "product_manager" | "support_agent";

// Organizations — currency/timezone here are only *defaults* for new stores
type Organization = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  logoUrl: string | null;
};

// Stores — the active store scopes all catalog/order/inventory/pricing data.
// currency/timezone are authoritative here (not on Organization).
type Store = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  isActive: boolean;
};

// Products
type ProductStatus = "draft" | "active" | "archived";
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  vendor: string | null;
  tags: string[];
  variants: ProductVariant[];
  options: ProductOption[];
  media: ProductMedia[];
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
};

// Variants — price is always CENTS (integer)
type ProductVariant = {
  id: string;
  sku: string;
  name: string | null;
  price: number;
  compareAtPrice: number | null;
  isActive: boolean;
  position: number;
  optionValues: OptionValue[];
};

// Orders
type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "refunded"
  | "cancelled";
type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled";
type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  customerEmail: string;
  customerName: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  currency: string;
  lineItems: OrderLineItem[];
  timeline: OrderTimelineEvent[];
  createdAt: string;
};

// Pagination
type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
};

// ... all other domains
```

Money values: always `number` (cents). Never `string`. Never `any`.

### 1.3 API Client — `src/lib/api-client.ts`

```typescript
import axios from "redaxios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // sends wos-session cookie automatically
  headers: { "Content-Type": "application/json" },
});
```

Admin requests must also carry the **active store**. Because all calls run through `createServerFn` on the SSR server, add a small server-side helper that reads the `wos-active-store` cookie and forwards it as an `X-Store-Id` header:

```typescript
// src/lib/active-store.ts (server-side)
import { getCookie } from "@tanstack/react-start/server";

export function adminStoreHeader(): Record<string, string> {
  const storeId = getCookie("wos-active-store");
  return storeId ? { "X-Store-Id": storeId } : {};
}
```

Every admin server function spreads `adminStoreHeader()` into its request headers. Storefront calls are unaffected (the API key already identifies the store); org-level admin calls (store list/create, members) omit it.

### 1.4 Error Utility — `src/lib/errors.ts`

Parse backend 400/401/403/404/409 errors into typed `ApiError`:

```typescript
type ApiError = {
  statusCode: number;
  message: string | string[];
  field?: string;
};
```

### 1.5 Money Utility — `src/lib/money.ts`

```typescript
export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}
```

---

## Phase 2 — Authentication

### 2.1 Signup Flow Fix

The signup form must collect `firstName`, `lastName`, `email`, `password`, `organizationName`. Update `auth/signup.tsx`:

- Split "Name" into First Name + Last Name fields
- Add "Store / Organization name" field
- Remove confirm-password field (validate password match client-side with Zod before submit)
- Wire `onSubmit` to `signupServerFn` → `POST /api/auth/signup`
- On success: redirect to `/auth/verify-email?email=<email>`

### 2.2 Email Verification Route

Create `src/routes/auth/verify-email.tsx`:

- Accept `email` from search params (display only, for UX)
- Accept 6-digit code input
- On submit: call `verifyEmailServerFn` → `POST /api/auth/verify-email` with `{ userId, code }`
- On success: redirect to `/auth/login` with success toast

**Note**: The backend sends a WorkOS verification email containing a numeric code. Build `src/routes/auth/verify-email.tsx` with a code input (6 digits). The `/api/auth/verify-email` endpoint expects `{ userId, code }`. The `userId` is returned from the signup response — pass it via search params (e.g., `/auth/verify-email?userId=<id>&email=<email>` for display).

### 2.3 Login Flow

Wire `auth/login.tsx`:

- Zod schema: `{ email: z.string().email(), password: z.string().min(8) }`
- On submit: call `loginServerFn` → `POST /api/auth/login`
- On success: sets `wos-session` cookie (httpOnly, handled by browser), then sets the `wos-active-store` cookie to the user's default store (from `GET /api/auth/me` or the first entry in `GET /api/admin/stores`), then redirect to `/admin/dashboard`
- On 401: show "Invalid credentials" inline error
- Wire Google SSO button to WorkOS OAuth redirect (WorkOS handles the OAuth flow; backend will need a `/api/auth/google` or WorkOS-hosted login URL). For now, the button should navigate to the WorkOS-hosted login page. Confirm the exact WorkOS redirect URL with backend before implementing.

### 2.4 Route Protection

In `src/routes/admin.tsx` (the admin layout wrapper), add a loader:

```typescript
export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions());
    if (!user) throw redirect({ to: "/auth/login" });
  },
});
```

`meQueryOptions()` calls `GET /api/auth/me`. If the cookie is invalid or expired, returns 401 → redirect to login.

### 2.5 Logout

Add logout action to admin sidebar:

- Calls `logoutServerFn` → `POST /api/auth/logout`
- Clears cookie, redirect to `/auth/login`

---

## Phase 3 — Onboarding

The full onboarding flow requires an **authenticated session** (the user must sign up + verify + log in first, then land on `/onboarding/step1`). Signup provisioning already created a **default store**; onboarding configures that store (its details, shipping, and storefront key).

### State Sharing Across Steps

Use TanStack Router's `search` params to carry forward accumulated state (step1 data → step2 → step3). Each step receives the previous step's values via search params and validates them before proceeding.

Alternatively use `sessionStorage` with a key `onboarding_state`. Either approach is fine — sessionStorage is simpler.

### 3.1 Step 1 — Store Details

Data collected: `name`, `currency`, `timezone` — these configure the **default store** created during signup provisioning (not the organization). **Remove the slug input** — store slug is derived server-side.

On continue:

1. Validate with Zod
2. Read the default store from `GET /api/admin/stores`, then call `updateStoreServerFn` → `PATCH /api/admin/stores/:storeId` with `{ name, currency, timezone }`. Ensure the `wos-active-store` cookie points at this store.
3. Navigate to step2

### 3.2 Step 2 — Shipping Setup

Shipping zones are now **store-scoped**; they're created under the active store automatically via the `X-Store-Id` header (§1.3) — no endpoint change beyond that.

Fix country names → ISO codes mapping. Example:

```typescript
const COUNTRY_CODE_MAP: Record<string, string> = {
  'United States': 'US', 'Canada': 'CA', 'United Kingdom': 'GB', ...
}
```

On continue:

1. Call `createShippingZoneServerFn` → `POST /api/admin/shipping/zones` with `{ name: 'Default Zone', countries: selectedISoCodes, isDefault: true }`
2. If flat rate > 0: call `createShippingMethodServerFn` → `POST /api/admin/shipping/methods` with `{ zoneId, name: 'Standard Shipping', rateType: 'flat_rate', price: flatRateCents, isActive: true }`
3. If free shipping threshold > 0: create a second method with `rateType: 'free', minOrderAmount: thresholdCents`
4. Store `zoneId` in sessionStorage, navigate to step3

### 3.3 Step 3 — API Key Generation

Replace `MOCK_API_KEY` constant with a real call on mount:

- Call `createApiKeyServerFn` → `POST /api/admin/stores/:storeId/api-keys` with `{ name: 'Default Storefront Key' }` (the key belongs to the active store)
- Response: `{ id, name, key, lastUsedAt }` — `key` is the raw key shown once
- Display the real key, keep reveal/copy/warn UI as-is

---

## Phase 4 — Admin Module Integration

### 4.0 Store Switcher (admin shell)

Add an active-store selector to the admin shell (sidebar/header):

- Populate from `GET /api/admin/stores` (org-level call — needs no `X-Store-Id`).
- On select: set the `wos-active-store` cookie via a `setActiveStoreServerFn`, then `queryClient.invalidateQueries()` so all store-scoped data refetches for the newly active store.
- The cookie persists the choice across reloads.

Every screen below is otherwise unchanged — it rides the `X-Store-Id` header injected in §1.3, so switching stores transparently re-scopes it.

### 4.1 Dashboard

**Route**: `/admin/dashboard`

Replace `REVENUE_TREND` and `KPI_DATA` mock objects with real data from `GET /api/admin/dashboard/stats?period=<period>`.

Pattern:

```typescript
export const Route = createFileRoute("/admin/dashboard")({
  loaderDeps: ({ search }) => ({ period: search.period ?? "7d" }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      dashboardStatsQueryOptions(deps.period),
    ),
  component: DashboardPage,
});

function DashboardPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const { data } = useSuspenseQuery(dashboardStatsQueryOptions(period));
  // ...
}
```

The period tab switch should invalidate + refetch (via `queryClient.invalidateQueries`).

### 4.2 Products

**List** (`/admin/products`): Replace mock array with `GET /api/admin/products` (paginated). Support cursor-based "Load More" or page controls using `nextCursor`.

**Create** (`/admin/products/new`): Form submits via `createProductServerFn` → `POST /api/admin/products`. After success, invalidate product list query and redirect to `/admin/products/$productId`.

**Detail** (`/admin/products/$productId`): Load via `GET /api/admin/products/:id`. Includes variants, options, media.

**Update** (`/admin/products/$productId` edit mode): `PATCH /api/admin/products/:id`.

**Delete**: `DELETE /api/admin/products/:id` → confirm dialog → invalidate list.

**Variant CRUD**: `POST /api/admin/products/:id/variants`, `PATCH /api/admin/products/:id/variants/:vid`, `DELETE`.

**Media Upload**: `POST /api/admin/products/:id/media` as `multipart/form-data`. Note: this is a file upload — `redaxios` handles it, just pass `FormData` as the body.

**Categories**: `GET /api/admin/categories` returns tree. Use for category assignment on product form.

### 4.3 Orders

**List** (`/admin/orders`): `GET /api/admin/orders` with `OrderFilterDto` query params (status filter, cursor pagination).

**Detail** (`/admin/orders/$orderId`): `GET /api/admin/orders/:id` — includes line items, timeline, payment info.

**Status update**: Sheet/dialog → `PATCH /api/admin/orders/:id/status` with `{ status }`. Validate transition (frontend can mirror the state machine: `pending → paid → processing → shipped → delivered`; any post-pending → `refunded`).

**Add note**: `POST /api/admin/orders/:id/notes` with `{ note: string }`.

**Refund**: Sheet → `POST /api/admin/orders/:id/refund` with `{ amount, reason }`. Amount is cents.

**Create shipment**: `POST /api/admin/orders/:id/shipment` with `{ carrier, trackingNumber, trackingUrl }`.

**Manual order create** (`/admin/orders/new`): `POST /api/admin/orders`. Complex form — uses `CreateOrderDto`.

### 4.4 Customers

**List** (`/admin/customers`): `GET /api/admin/customers`.

**Detail** (`/admin/customers/$customerId`): `GET /api/admin/customers/:id`.

**Status toggle**: `PATCH /api/admin/customers/:id/status` with `{ status: 'active' | 'disabled' }`.

### 4.5 Inventory

**List** (`/admin/inventory`): `GET /api/admin/inventory`. For low-stock filter: `GET /api/admin/inventory/low-stock`.

**Stock adjustment sheet**: `PATCH /api/admin/inventory/:variantId` with `AdjustInventoryDto`. The adjustment can be an absolute set or a delta — check DTO shape in backend.

**Init inventory** (when creating a variant with `initialStock`): handled automatically by `CreateVariantDto.initialStock` during product creation.

### 4.6 Discounts & Coupons

**Discounts list**: `GET /api/admin/discounts`.
**Create**: `POST /api/admin/discounts`.
**Update**: `PATCH /api/admin/discounts/:id`.
**Delete**: `DELETE /api/admin/discounts/:id`.

Same pattern for **coupons** (`/api/admin/coupons`).

### 4.7 Tax Rates

**In settings page** (`/admin/settings` → Tax Rates tab):

- List: `GET /api/admin/tax-rates`
- Create: `POST /api/admin/tax-rates`
- Update: `PATCH /api/admin/tax-rates/:id`
- Delete: `DELETE /api/admin/tax-rates/:id`
- Rate is stored in **basis points** (600 = 6%). Convert: `userPercent * 100 = basisPoints`.

### 4.8 Shipping Zones & Methods

**Zones list + methods**: `GET /api/admin/shipping/zones` and `GET /api/admin/shipping/methods?zoneId=<id>`.
**Create/update/delete** zones and methods via their respective endpoints.

### 4.9 Settings

**Organization settings**: `GET /api/admin/organization` → display. `PATCH /api/admin/organization` on save (name only — `currency`/`timezone` moved to the store).

**Stores**: `GET /api/admin/stores` → list all stores in the org. `POST /api/admin/stores` → create a store. `GET/PATCH /api/admin/stores/:id` → view/edit a store's `name`, `currency`, `timezone`, `isActive`. This is the per-store settings surface and feeds the §4.0 switcher.

**API Keys** (per active store): `GET /api/admin/stores/:storeId/api-keys` → list. `POST /api/admin/stores/:storeId/api-keys` → create (shows raw key once). `DELETE /api/admin/stores/:storeId/api-keys/:id` → revoke.

**Audit log**: `GET /api/admin/audit-logs` with `AuditLogQueryDto` params. Replace mock entries.

**Team members**: Team management via WorkOS is out of scope for this integration pass. The Team tab in settings remains non-functional (mock UI only) until a dedicated endpoint is added.

---

---

### Shared rules for Phases 5–10

These apply to every phase below:

- Every form gets a Zod schema that mirrors the backend DTO exactly. Define it at the top of the route file.
- Price/money inputs: user types dollars (`"9.99"`), send cents: `Math.round(parseFloat(raw) * 100)`. Use `z.coerce.number()`.
- Tax/rate inputs: user types `"6"` for 6%, send basis points: `value * 100`.
- Every `useMutation` calls `queryClient.invalidateQueries(...)` on success and sets local error state on failure.
- No `any`. No `as unknown`. TypeScript must verify the call shape.

---

## Phase 5 — Products (Create + Edit)

**Files touched:** `src/server/products.ts`, `src/queries/products.ts`, `routes/admin/products_/new.tsx`, `routes/admin/products_/$productId.tsx`

### Missing server functions to add

```
getProductByIdServerFn(id) → GET /api/admin/products/:id
createProductServerFn(body) → POST /api/admin/products
updateProductServerFn(id, body) → PATCH /api/admin/products/:id
createVariantServerFn(productId, body) → POST /api/admin/products/:id/variants
updateVariantServerFn(productId, variantId, body) → PATCH /api/admin/products/:id/variants/:vid
deleteVariantServerFn(productId, variantId) → DELETE /api/admin/products/:id/variants/:vid
uploadMediaServerFn(productId, formData) → POST /api/admin/products/:id/media (multipart)
deleteMediaServerFn(productId, mediaId) → DELETE /api/admin/products/:id/media/:mid
getCategoriesServerFn() → GET /api/admin/categories
```

Add `productQueryOptions(id)` and `categoriesQueryOptions()` to `src/queries/products.ts`.

### `routes/admin/products_/new.tsx`

Remove `SEED_VARIANTS`, `ALL_CATEGORIES`, `FAKE_IMAGES`. Load real categories via `useQuery(categoriesQueryOptions())`.

Zod schema:

```typescript
const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]),
  vendor: z.string().optional(),
  tags: z.array(z.string()),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  categoryIds: z.array(z.string()),
  options: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
  variants: z.array(
    z.object({
      sku: z.string().min(1),
      name: z.string().optional(),
      price: z.number().int().min(0), // already cents from variant editor
      compareAtPrice: z.number().int().min(0).optional(),
      isActive: z.boolean(),
      optionValueIds: z.array(z.string()),
    }),
  ),
});
```

On "Publish" / "Save draft":

1. `createProductSchema.parse(formState)` → show inline validation errors on failure.
2. `createProductMutation.mutate(payload)`.
3. On success: upload any queued media files via `uploadMediaServerFn` (chain after product `id` is returned), then navigate to `/admin/products/$productId` + invalidate `productsQueryOptions`.

### `routes/admin/products_/$productId.tsx`

Remove `SEED_PRODUCT`. Add loader:

```typescript
loader: ({ context, params }) =>
  context.queryClient.ensureQueryData(productQueryOptions(params.productId));
```

Add an `isEditing` toggle (single boolean state). View mode = current read-only UI. Edit mode = inputs in-place. "Edit" button → `isEditing = true`. "Cancel" → `isEditing = false`. "Save changes" → `updateProductMutation`.

`updateProductMutation` → `updateProductServerFn(id, diff)` → invalidate `productQueryOptions(id)` + `productsQueryOptions()`.

Variant mutations within the page: create/edit/delete variants using the three new server functions above. Delete product: confirm dialog → `deleteProductServerFn(id)` (exists) → navigate to `/admin/products`.

Media: upload via file input → `uploadMediaServerFn`, delete via `deleteMediaServerFn`, both invalidate `productQueryOptions(id)`.

---

## Phase 6 — Order Detail Mutations

**Files touched:** `src/queries/orders.ts`, `routes/admin/orders_/$orderId.tsx`

### Changes to `src/queries/orders.ts`

Add `orderQueryOptions(id)` wrapping `getOrderByIdServerFn` (already in `src/server/orders.ts`).

### `routes/admin/orders_/$orderId.tsx`

Remove `SEED_ORDER`. Add loader using `orderQueryOptions(params.orderId)`.

All four server functions already exist. Wire them to `useMutation`:

**Status update** — only expose valid next statuses per the state machine (`pending → paid → processing → shipped → delivered`; any post-`pending` → `refunded`):

```typescript
const statusMutation = useMutation({
  mutationFn: (status: OrderStatus) =>
    updateOrderStatusServerFn({ orderId, status }),
  onSuccess: () => queryClient.invalidateQueries(orderQueryOptions(orderId)),
});
```

**Add note** — textarea + submit in timeline section:

```typescript
const noteMutation = useMutation({
  mutationFn: (note: string) => addOrderNoteServerFn({ orderId, note }),
  onSuccess: () => queryClient.invalidateQueries(orderQueryOptions(orderId)),
});
```

**Refund** — sheet form, dollars → cents:

```typescript
const refundSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().optional(),
});
// convert: Math.round(amount * 100) before passing to refundOrderServerFn
```

**Shipment** — sheet form:

```typescript
const shipmentSchema = z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional().or(z.literal("")),
});
```

Each mutation's `onError` surfaces the backend message inline.

---

## Phase 7 — Customer Detail Page

**Files touched:** `src/server/customers.ts`, `src/queries/customers.ts`, new file `routes/admin/customers_/$customerId.tsx`

### Missing server function

```
getCustomerByIdServerFn(id) → GET /api/admin/customers/:id
```

Add `customerQueryOptions(id)` to `src/queries/customers.ts`.

### New route: `routes/admin/customers_/$customerId.tsx`

```typescript
export const Route = createFileRoute("/admin/customers_/$customerId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      customerQueryOptions(params.customerId),
    ),
  component: CustomerDetailPage,
});
```

Page sections (mirror original mock design):

- **Header**: name, email, avatar, status badge, "Disable / Re-enable" button.
- **Stats bar**: total orders, total spent, account since, last login.
- **Order history table**: `ordersQueryOptions({ customerId })` — add `customerId` filter to `getOrdersServerFn` if not already present.
- **Addresses**: read-only list from the customer detail response.

Status toggle mutation:

```typescript
const statusMutation = useMutation({
  mutationFn: (status: "active" | "disabled") =>
    updateCustomerStatusServerFn({ customerId, status }),
  onSuccess: () => {
    queryClient.invalidateQueries(customerQueryOptions(customerId));
    queryClient.invalidateQueries(customersQueryOptions());
  },
});
```

---

## Phase 8 — Discounts & Coupons (Create + Edit)

**Files touched:** `src/server/discounts.ts`, `src/queries/discounts.ts`, `routes/admin/discounts_/new.tsx`, `routes/admin/discounts_/$discountId.tsx`

### Missing server functions

```
getDiscountByIdServerFn(id) → GET /api/admin/discounts/:id
createDiscountServerFn(body) → POST /api/admin/discounts
updateDiscountServerFn(id, body) → PATCH /api/admin/discounts/:id
getCouponsServerFn() → GET /api/admin/coupons
getCouponByIdServerFn(id) → GET /api/admin/coupons/:id
createCouponServerFn(body) → POST /api/admin/coupons
updateCouponServerFn(id, body) → PATCH /api/admin/coupons/:id
deleteCouponServerFn(id) → DELETE /api/admin/coupons/:id
```

Add `discountQueryOptions(id)`, `couponsQueryOptions()`, `couponQueryOptions(id)` to `src/queries/discounts.ts`.

### `routes/admin/discounts_/new.tsx`

Zod schema:

```typescript
const createDiscountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["percentage", "fixed_amount"]),
  value: z.coerce.number().positive(),
  scope: z.enum(["product", "category", "order"]),
  scopeId: z.string().optional(),
  minOrderAmount: z.coerce.number().min(0).optional(),
  isActive: z.boolean(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});
```

Value conversion before send: `fixed_amount` → `Math.round(dollars * 100)` cents. `percentage` → send as-is.

On submit: `createDiscountServerFn(payload)` → navigate to `/admin/discounts` + invalidate `discountsQueryOptions`.

### `routes/admin/discounts_/$discountId.tsx`

Load via `discountQueryOptions(params.discountId)`. Edit mode toggle (same view/edit pattern as products). `updateDiscountMutation` → invalidate `discountQueryOptions(id)` + `discountsQueryOptions()`. Delete → confirm dialog → `deleteDiscountServerFn(id)` → navigate to `/admin/discounts`.

If the page has a coupons sub-section, wire create/delete coupon mutations here using the coupon server functions above.

---

## Phase 9 — Shipping (Replace Mock + Full CRUD)

**Files touched:** `src/server/shipping.ts`, new `src/queries/shipping.ts`, `routes/admin/shipping.tsx`

### Missing server functions

```
getShippingZonesServerFn() → GET /api/admin/shipping/zones
getShippingMethodsServerFn(zoneId?) → GET /api/admin/shipping/methods?zoneId=
updateShippingZoneServerFn(id, body) → PATCH /api/admin/shipping/zones/:id
deleteShippingZoneServerFn(id) → DELETE /api/admin/shipping/zones/:id
updateShippingMethodServerFn(id, body) → PATCH /api/admin/shipping/methods/:id
deleteShippingMethodServerFn(id) → DELETE /api/admin/shipping/methods/:id
```

Create `src/queries/shipping.ts`:

```
shippingZonesQueryOptions()
shippingMethodsQueryOptions(zoneId?: string)
```

### `routes/admin/shipping.tsx`

Remove `SEED_ZONES` and `SEED_METHODS`. Add loader using `shippingZonesQueryOptions()`.

- Zone list: `useSuspenseQuery(shippingZonesQueryOptions())`.
- Method list per zone: `useQuery(shippingMethodsQueryOptions(selectedZoneId))`.
- Zone create sheet (exists): `createShippingZoneServerFn` (already exists) → invalidate zones.
- Zone edit: `updateShippingZoneServerFn`.
- Zone delete: confirm popover → `deleteShippingZoneServerFn`.
- Method create sheet (exists): `createShippingMethodServerFn` (already exists), price dollars → cents → invalidate methods.
- Method edit: `updateShippingMethodServerFn`.
- Method delete: `deleteShippingMethodServerFn`.

Zod for method form:

```typescript
const shippingMethodSchema = z.object({
  name: z.string().min(1),
  rateType: z.enum(["flat_rate", "free", "calculated"]),
  price: z.coerce.number().min(0), // dollars → cents
  minOrderAmount: z.coerce.number().min(0).optional(),
  estimatedDaysMin: z.coerce.number().int().min(0).optional(),
  estimatedDaysMax: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean(),
});
```

---

## Phase 10 — Settings (Complete Remaining Mutations)

**Files touched:** `routes/admin/settings.tsx`

All server functions already exist. Verify and complete `onSubmit` / `onClick` handlers for:

**Organization name** (General tab):

- `updateOrgMutation` → `updateOrgServerFn({ name })` → invalidate `organizationQueryOptions`.
- Zod: `z.object({ name: z.string().min(1) })`.

**API Keys** (API Keys tab):

- Create: input for key name → `createApiKeyFromSettingsServerFn({ name })` → show the raw `key` in a one-time reveal dialog (never shown again) → invalidate `apiKeysQueryOptions`.
- Delete: confirm popover per row → `deleteApiKeyServerFn(keyId)` → invalidate.

**Tax Rates** (Tax tab):

- Create/edit sheet → `createTaxRateServerFn` / `updateTaxRateServerFn`. Convert user-entered percent to basis points (`rate * 100`) before sending.
- Delete: confirm → `deleteTaxRateServerFn`.

Zod for tax rate:

```typescript
const taxRateSchema = z.object({
  name: z.string().min(1),
  countryCode: z.string().length(2),
  stateCode: z.string().optional(),
  rate: z.coerce.number().min(0).max(100), // user enters %, sent as rate * 100
  isInclusive: z.boolean(),
  isActive: z.boolean(),
});
```

**Store settings** tab (if present): `updateStoreServerFn(storeId, { name, currency, timezone })` → invalidate `storesQueryOptions`.

---

## Verification Checklist

Complete after all phases:

1. **Auth**: Signup → email verify → login → dashboard visible → logout → login again
2. **Products (Phase 5)**: Create product with variant → visible in list → edit name/price → add media → delete product
3. **Orders (Phase 6)**: View order detail → update status → add note → create shipment → issue refund → confirm timeline updates
4. **Customers (Phase 7)**: Open customer detail → toggle status to disabled → re-enable → order history visible
5. **Discounts (Phase 8)**: Create discount → appears in list → edit value → delete. Create coupon → delete.
6. **Shipping (Phase 9)**: Create zone → add method → edit method price → delete method → delete zone
7. **Settings (Phase 10)**: Update org name → refresh → persists. Create tax rate 6% (sends 600 basis points) → edit → delete. Generate API key → copy → revoke.
8. **Inventory**: Adjust stock → verify persists on refresh (already done in Phase 4)
9. **Dashboard**: Stats change with period selector (already done in Phase 4)
10. **Type safety**: `npm run check-types` passes with 0 errors

---

## Resolved Design Decisions

| Question                     | Decision                                                                   |
| ---------------------------- | -------------------------------------------------------------------------- |
| Org slug in onboarding step1 | Remove — slug is not editable after signup                                 |
| Email verification UX        | Code-based — build `/auth/verify-email` with 6-digit input                 |
| Google SSO button            | Keep — wire to WorkOS OAuth redirect when ready                            |
| Team management in settings  | Non-functional for this pass                                               |
| Multi-store scope            | Shared customers; catalog/orders/inventory/pricing/shipping are per store  |
| Active-store transport       | `wos-active-store` cookie → `X-Store-Id` header, injected centrally        |
| Onboarding step 1 target     | Configures the default **store** (currency/timezone), not the organization |
