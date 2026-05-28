# Frontend ↔ Backend Integration Plan

## Context

The admin dashboard frontend was built with hardcoded mock data while the backend was scaffolded. Both are now complete. This plan covers replacing all mock data with real API calls, establishing a typed API client layer, wiring up all forms and mutations, and adding route-level authentication — so the frontend and backend behave as a unified product.

---

## Identified Misalignments (Fix Before Implementing)

| #   | Location                | Issue                                                                                                                                                   |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `auth/signup.tsx`       | Collects "Name" (single field) + confirm-password. Backend `SignupDto` requires `firstName`, `lastName`, `organizationName`. Missing org name entirely. |
| 2   | `onboarding/step2.tsx`  | Country multi-select stores full names ("United States"). Backend shipping zones expect ISO 3166-1 alpha-2 codes ("US").                                |
| 3   | `onboarding/step3.tsx`  | API key is a hardcoded constant `MOCK_API_KEY`. Must be generated from `POST /api/auth/admin/api-keys`.                                                 |
| 4   | `src/utils/users.tsx`   | Backend URL hardcoded as `http://localhost:3000` (the frontend port). Backend runs on **port 4000**.                                                    |
| 5   | All admin routes        | No authentication guard. Any unauthenticated user can access `/admin/*`.                                                                                |
| 6   | No email-verify route   | Backend sends a verification email after signup and requires `POST /api/auth/verify-email`. No matching frontend route exists.                          |
| 7   | Inline types everywhere | Route files define local `Product`, `Order`, etc. interfaces that diverge from backend response shapes. Must be centralized.                            |
| 8   | No pagination wiring    | Backend returns `{ items, nextCursor, totalCount }`. Frontend DataTable has no cursor-pagination logic.                                                 |

---

## Architecture

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

// Organizations
type Organization = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  logoUrl: string | null;
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
- On success: sets `wos-session` cookie (httpOnly, handled by browser), then redirect to `/admin/dashboard`
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

The full onboarding flow requires an **authenticated session** (the user must sign up + verify + log in first, then land on `/onboarding/step1`).

### State Sharing Across Steps

Use TanStack Router's `search` params to carry forward accumulated state (step1 data → step2 → step3). Each step receives the previous step's values via search params and validates them before proceeding.

Alternatively use `sessionStorage` with a key `onboarding_state`. Either approach is fine — sessionStorage is simpler.

### 3.1 Step 1 — Store Details

Data collected: `name` (org name override), `currency`, `timezone`. **Remove the slug input** — slug is set at signup and is not editable via `PATCH /api/admin/organization`.

On continue:

1. Validate with Zod
2. Call `updateOrgServerFn` → `PATCH /api/admin/organization` with `{ name, currency, timezone }`
3. Navigate to step2

### 3.2 Step 2 — Shipping Setup

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

- Call `createApiKeyServerFn` → `POST /api/auth/admin/api-keys` with `{ name: 'Default Storefront Key' }`
- Response: `{ id, name, key, lastUsedAt }` — `key` is the raw key shown once
- Display the real key, keep reveal/copy/warn UI as-is

---

## Phase 4 — Admin Module Integration

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

**Organization settings**: `GET /api/admin/organization` → display. `PATCH /api/admin/organization` on save.

**API Keys**: `GET /api/auth/admin/api-keys` → list. `POST /api/auth/admin/api-keys` → create (shows raw key once). `DELETE /api/auth/admin/api-keys/:id` → revoke.

**Audit log**: `GET /api/admin/audit-logs` with `AuditLogQueryDto` params. Replace mock entries.

**Team members**: Team management via WorkOS is out of scope for this integration pass. The Team tab in settings remains non-functional (mock UI only) until a dedicated endpoint is added.

---

## Phase 5 — Zod Schemas

Every form that submits to the backend needs a Zod schema defined in the same file as the route (or in `src/lib/schemas/`). Rules:

- Mirror backend validation exactly (min lengths, required fields, enum values)
- Use `z.coerce.number()` for price inputs (user types `"9.99"`, we send `999` cents: `Math.round(parseFloat(input) * 100)`)
- Use `z.enum([...])` for all status/type fields

---

## Verification Checklist

After implementation, verify end-to-end:

1. **Auth**: Signup → email verify → login → admin dashboard visible → logout → login again
2. **Products**: Create product with variant (price in $, stored as cents) → visible in list → edit → delete
3. **Orders**: Create manual order → update status through state machine → add note → create shipment → refund
4. **Inventory**: Open inventory page → adjust stock → verify new quantity persists on refresh
5. **Settings**: Update org name → refresh → verify change persists. Generate API key → copy → revoke
6. **Dashboard**: Verify stats change with period selector
7. **Type safety**: `npm run check-types` in `apps/frontend` passes with 0 errors

---

## Resolved Design Decisions

| Question                     | Decision                                                   |
| ---------------------------- | ---------------------------------------------------------- |
| Org slug in onboarding step1 | Remove — slug is not editable after signup                 |
| Email verification UX        | Code-based — build `/auth/verify-email` with 6-digit input |
| Google SSO button            | Keep — wire to WorkOS OAuth redirect when ready            |
| Team management in settings  | Non-functional for this pass                               |
