# Frontend Guidelines — Commerce OS Admin

This document captures the patterns, conventions, and architecture decisions used in `apps/frontend`. New features should follow these conventions to stay consistent with existing code.

---

## Directory Structure

```
src/
├── components/          # Shared UI components
│   ├── ui/              # shadcn/ui primitive components
│   └── *.tsx            # App-level components (sidebar, data-table, etc.)
├── features/            # Feature modules — the core of the admin app
│   ├── products/
│   ├── orders/
│   ├── customers/
│   ├── discounts/
│   ├── inventory/
│   ├── price-lists/
│   ├── shipping/
│   ├── settings/
│   ├── dashboard/
│   └── customer-groups/
├── routes/              # TanStack Router file-based routes
│   ├── __root.tsx       # Root layout + providers
│   ├── admin/           # Admin section (layout at admin/route.tsx)
│   └── auth/ / onboarding/
├── lib/                 # Core utilities: api-client, money, active-store
├── hooks/               # Shared custom hooks
├── server/              # Top-level server functions (auth, store selection)
├── types/               # Global type definitions (api.ts)
└── utils/               # Shared pure utilities
```

---

## Feature Folder Pattern

Each admin feature lives in `src/features/<feature>/` and is self-contained:

```
features/products/
├── pages/
│   ├── product-list-page.tsx      # List view
│   ├── product-detail-page.tsx    # Detail view
│   └── product-new-page.tsx       # Create form
├── components/
│   ├── product-edit-form.tsx      # Forms, modals, section cards
│   ├── product-status-badge.tsx   # Display-only reusable pieces
│   └── variant-builder.tsx        # Complex composed widgets
├── server.ts                      # Server functions (createServerFn)
├── queries.ts                     # React Query option helpers
├── types.ts                       # Feature-specific types
├── utils.ts                       # Feature-specific pure utilities
└── constants.ts                   # Enums, labels, static config
```

**Naming:**
- Components: `PascalCase` (e.g., `ProductEditForm`)
- Server functions: `camelCase` + `ServerFn` suffix (e.g., `getProductsServerFn`)
- Query helpers: `camelCase` + `QueryOptions` suffix (e.g., `productsQueryOptions`)
- Files: `kebab-case` throughout

---

## Routing (TanStack Router)

Routes live in `src/routes/` and use file-based routing. The route tree is auto-generated into `routeTree.gen.ts` — do not hand-edit it.

**Route file pattern — always thin:**

```tsx
// routes/admin/products_/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { productsQueryOptions } from "~/features/products/queries";
import { ProductListPage } from "~/features/products/pages/product-list-page";

export const Route = createFileRoute("/admin/products_/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(productsQueryOptions()),
  component: ProductListPage,
});
```

- Routes only wire up the loader and point to a page component. No UI lives in route files.
- Use `loader` to prefetch data via `context.queryClient.ensureQueryData`.
- Use `beforeLoad` for auth guards and context setup.
- All admin routes share the layout defined in `routes/admin/route.tsx`.

---

## Data Fetching

### Server Functions (`server.ts`)

Every API call goes through a `createServerFn`. Input is always validated with Zod.

```tsx
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiClient, storeHeaders } from "~/lib/api-client";

export const getProductsServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    status: z.enum(["draft", "active", "archived"]).optional(),
    cursor: z.string().optional(),
  }))
  .handler(async ({ data }): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    if (data.status) params.set("status", data.status);
    const res = await apiClient.get<PaginatedResponse<Product>>(
      `/api/admin/products?${params.toString()}`,
      { headers: await storeHeaders() },
    );
    return res.data;
  });
```

### Query Helpers (`queries.ts`)

Wrap server functions in `queryOptions` so the same key/fn can be reused in loaders and hooks:

```tsx
import { queryOptions } from "@tanstack/react-query";

export const productsQueryOptions = (
  params: { status?: ProductStatus; cursor?: string } = {}
) =>
  queryOptions({
    queryKey: ["products", params],
    queryFn: () => getProductsServerFn({ data: params }),
    staleTime: 30 * 1000,
  });
```

### In Components

- Primary data (page-critical): `useSuspenseQuery`
- Secondary data (shown in sections below the fold): `useQuery` with fallback to `[]`
- Never call server functions directly from components — always go through query options

```tsx
const { data: product } = useSuspenseQuery(productQueryOptions(productId));
const { data: orders = [] } = useQuery(ordersQueryOptions({ customerId }));
```

### Mutations

```tsx
const mutation = useMutation({
  mutationFn: () => updateProductServerFn({ data: { productId, body } }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: productQueryOptions(productId).queryKey });
    onSaved();
  },
  onError: (err) => setError(err instanceof Error ? err.message : "Failed"),
});
```

- Invalidate the specific query key after success — don't invalidate everything.
- Surface errors to local state, not toast (unless action is async/background).

---

## API Client & Auth

**File:** `src/lib/api-client.ts`

All requests include auth (WorkOS JWT) and active-store headers:

```tsx
// Every store-scoped request uses storeHeaders(), not authHeader() alone
const res = await apiClient.get<T>(url, { headers: await storeHeaders() });
```

The `apiClient` wraps `redaxios` with typed methods: `.get`, `.post`, `.patch`, `.delete`.

---

## Forms

Forms use local `useState` for field values and Zod for validation inside the mutation:

```tsx
export function ProductEditForm({ product, onSaved }: Props) {
  const [name, setName] = useState(product.name);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const result = schema.safeParse({ name });
      if (!result.success) throw new Error(result.error.issues[0]?.message);
      return updateProductServerFn({ data: { productId: product.id, body: result.data } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryOptions(product.id).queryKey });
      onSaved();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed"),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Edit product</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- No form library (no react-hook-form). Plain `useState` + Zod.
- Validate inside `mutationFn`, not on every keystroke.
- Accept `onSaved` / `onCancel` callbacks from the parent.
- Disable the submit button while `isPending`.

---

## List Pages

```tsx
export function ProductListPage() {
  const { data: page } = useSuspenseQuery(productsQueryOptions());
  const [items, setItems] = useState(page.items);
  const [nextCursor, setNextCursor] = useState(page.nextCursor);

  async function loadMore() {
    const more = await getProductsServerFn({ data: { cursor: nextCursor } });
    setItems((prev) => [...prev, ...more.items]);
    setNextCursor(more.nextCursor);
  }

  return (
    <div className="space-y-4">
      <DataTable data={items} columns={COLUMNS} filters={FILTERS}
        action={<Button asChild><Link to="/admin/products/new">Add product</Link></Button>}
      />
      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore}>Load more</Button>
        </div>
      )}
    </div>
  );
}
```

- Cursor-based pagination via a "Load more" button (not offset, not infinite scroll).
- Items accumulated client-side in state after the initial suspense load.
- Primary action (create button) passed as `action` prop to `DataTable`.

---

## Data Table

Use the shared `DataTable` component for all list views:

```tsx
const COLUMNS: DataTableColumn<Product>[] = [
  {
    key: "product",
    header: "Product",
    render: (row) => (
      <Link to="/admin/products/$productId" params={{ productId: row.id }}>
        {row.name}
      </Link>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <ProductStatusBadge status={row.status} />,
    align: "center",
  },
  {
    key: "price",
    header: "Price",
    render: (row) => formatMoney(row.price),
    align: "right",
  },
];

const FILTERS: DataTableFilter[] = [
  {
    key: "status",
    placeholder: "All statuses",
    options: [
      { label: "Active", value: "active" },
      { label: "Draft", value: "draft" },
    ],
  },
];
```

- Define `COLUMNS` and `FILTERS` as module-level constants, not inside the component.
- `render` receives the full row object.
- `action` prop renders a button in the toolbar (top right).

---

## Detail Pages

Detail pages use multiple cards/sections stacked vertically:

```tsx
export function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const customer = useSuspenseQuery(customerQueryOptions(customerId)).data;
  const { data: addresses = [] } = useQuery(customerAddressesQueryOptions(customerId));
  const { data: orders } = useQuery(ordersQueryOptions({ customerId }));

  return (
    <div className="space-y-6">
      <CustomerHeader customer={customer} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <OrderHistoryCard orders={orders?.items ?? []} />
          <AddressCard addresses={addresses} customerId={customerId} />
        </div>
        <div className="space-y-6">
          <CustomerProfileCard customer={customer} />
        </div>
      </div>
    </div>
  );
}
```

- Primary data via `useSuspenseQuery`.
- Secondary related data (from other features) via `useQuery` with `?? []` fallback.
- Layout: `space-y-6` between sections; `grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]` for two-column.

---

## Settings Page with Side Nav

```tsx
type Section = "general" | "team" | "api-keys";

export function SettingsPage() {
  const [section, setSection] = useState<Section>("general");

  return (
    <div className="flex gap-8">
      <nav className="w-44 shrink-0 space-y-1">
        {SETTINGS_NAV.map((item) => (
          <button
            key={item.key}
            onClick={() => setSection(item.key as Section)}
            className={cn(
              "w-full rounded px-3 py-2 text-left text-sm",
              section === item.key ? "bg-muted font-medium" : "hover:bg-muted/50",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 min-w-0">
        {section === "general" && <GeneralSettings />}
        {section === "team" && <TeamSettings />}
        {section === "api-keys" && <ApiKeySettings />}
      </div>
    </div>
  );
}
```

- Section state is local — no URL params for settings panels.
- Each panel is its own component.

---

## Shared UI Components (shadcn)

All primitives come from `src/components/ui/` (shadcn). Import directly:

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
```

Non-primitive shared components in `src/components/`:
- `DataTable` — all list views
- `EntityCombobox` — searchable select for related records
- `AppSidebar` — main nav

---

## Styling Conventions

**Tailwind CSS v4** — no config file. CSS variables are defined in the global stylesheet.

```tsx
// Primary action button
<Button className="bg-orange-700 hover:bg-orange-800 text-white">Save</Button>

// Section spacing
<div className="space-y-6">...</div>

// Two-column detail layout
<div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">

// Muted secondary text
<p className="text-sm text-muted-foreground">Last updated 3 days ago</p>

// Inline error
<p className="text-sm text-destructive">Field is required</p>

// Subtle border
<div className="border border-border/50 rounded-lg p-4">

// Compact icon
<SomeIcon className="h-4 w-4" />
```

**Button sizes:** `h-9` default, `h-8` compact, `h-7` mini.  
**Icons:** `h-4 w-4` small, `h-5 w-5` medium.

---

## Money

All amounts are stored and passed as integers (cents). Format only for display:

```tsx
import { formatMoney, formatPrice, toCents } from "~/lib/money";

formatMoney(4999)          // "$49.99" (Intl.NumberFormat, currency-aware)
formatPrice(4999)          // "$49.99" (simple, USD assumed)
toCents("49.99")           // 4999
```

Never use floats for monetary math. Never format on the server except in the GraphQL `Money.formatted` field.

---

## Types

All shared API types live in `src/types/api.ts`. Import from there:

```tsx
import type { Product, Order, Customer, PaginatedResponse } from "~/types/api";
```

Feature-specific types (form state, local UI models) go in `features/<feature>/types.ts`. Shared API shapes never go in feature type files.

---

## State Management

- No Redux, no Zustand.
- Server state: React Query (`useQuery`, `useSuspenseQuery`, `useMutation`).
- Local UI state: `useState` (form fields, open/closed, active section).
- No global client-side store.

---

## Auth

WorkOS AuthKit handles admin auth. Use in server functions:

```tsx
import { getAuth } from "@workos/authkit-tanstack-react-start";

const auth = await getAuth();
if (!auth.user) throw redirect({ to: "/auth/login" });
```

Use in components:

```tsx
import { useAuth } from "@workos/authkit-tanstack-react-start";

const { user, signOut } = useAuth();
```

---

## Reference Files

| Pattern | File |
|---|---|
| Root layout | `src/routes/__root.tsx` |
| Admin layout | `src/routes/admin/route.tsx` |
| Route with loader | `src/routes/admin/products_/index.tsx` |
| Server functions | `src/features/products/server.ts` |
| Query helpers | `src/features/products/queries.ts` |
| List page | `src/features/products/pages/product-list-page.tsx` |
| Detail page | `src/features/customers/pages/customer-detail-page.tsx` |
| Create page | `src/features/discounts/pages/discount-new-page.tsx` |
| Form component | `src/features/products/components/product-edit-form.tsx` |
| Complex builder | `src/features/products/components/variant-builder.tsx` |
| Settings layout | `src/features/settings/pages/settings-page.tsx` |
| Data table | `src/components/data-table.tsx` |
| Money utils | `src/lib/money.ts` |
| API types | `src/types/api.ts` |
