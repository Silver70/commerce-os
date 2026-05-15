# Headless Commerce Engine — MVP Product Requirements Document

**Project:** Headless Commerce Engine + Admin Dashboard + API Layer
**Architecture:** Multi-tenant modular monolith → GraphQL (storefront) + REST (admin/webhooks) → Multiple storefronts
**Auth Provider:** WorkOS AuthKit (multi-tenant)
**Status:** Draft — MVP v1 Scope
**Author:** Silver
**Date:** May 2026

---

## 1. Vision & Problem Statement

### Vision

Build a multi-tenant headless commerce engine that serves as a single source of truth for product catalog, pricing, inventory, orders, customers, and payments — consumed by any number of storefronts (Next.js web app, mobile app, POS terminal) through a GraphQL storefront API. Each tenant (merchant/store) operates in complete isolation with their own products, orders, customers, and configuration, managed through a role-based admin dashboard.

### Problem

Existing solutions are either too opinionated (Shopify locks you into their frontend), too complex for a solo/small-team build (Medusa, Saleor), or too simplistic (basic CRUD tutorials that fall apart at real-world discount logic, inventory consistency, and order lifecycle management). This engine sits in the middle: production-grade commerce logic with proper multi-tenant isolation and auth from day one, without enterprise bloat.

### What This Is NOT

- Not a Shopify clone. No built-in storefront theme system.
- Not a marketplace. Multi-tenant, single-merchant-per-tenant.
- Not microservices. Modular monolith that can be decomposed later.

### Lessons From Previous Attempt

Auth and tenancy are the skeleton, not the skin. The previous attempt failed because auth was bolted on after hundreds of endpoints existed. This time:

- Every table has `organization_id` from day one.
- Every query is tenant-scoped by default through base repository patterns.
- Auth middleware runs before any business logic.
- RBAC is enforced at the route level, not sprinkled into controllers.

---

## 2. MVP Scope Definition

### In Scope (MVP v1)

| Module | What Ships |
|--------|-----------|
| **Auth + Multi-Tenancy** | WorkOS AuthKit integration, Organization-based tenancy, role-based access (super admin, product manager, support agent), API key auth for storefronts, tenant-scoped data isolation |
| **Products + Variants** | Base products, variant system (size/color/etc.), categories (tree), media (multi-image per product/variant), SKU-level control |
| **Inventory** | Stock tracking per SKU, stock reservation during checkout, low-stock threshold alerts |
| **Pricing** | Base price per SKU, simple percentage and fixed-amount discounts, coupon codes, time-based promotions |
| **Cart + Checkout** | Cart CRUD, guest + authenticated checkout, address collection, shipping method selection, tax calculation, payment initiation |
| **Orders** | Full lifecycle (pending → paid → processing → shipped → delivered → cancelled), line item snapshots, pricing/tax/discount snapshots, basic refund support |
| **Shipping** | Flat-rate shipping, shipping zones (region-based), multiple addresses per customer (billing/shipping) |
| **Payments** | Stripe integration behind a provider abstraction layer, webhook handling, payment state machine |
| **Customers** | Account creation, guest checkout, order history, account status |
| **Admin Dashboard** | Product CRUD + variant editor, order management + timeline, customer profiles, inventory levels, basic discount management, audit log viewer, tenant settings |
| **Audit Logging** | Track all mutations with actor, timestamp, and before/after values |
| **API Layer** | GraphQL for storefront operations, REST for admin + webhooks |

### Out of Scope (Post-MVP)

- Rule engine for complex discount logic (buy X get Y, bulk tiers, conditional stacking)
- Multi-currency / region-based pricing
- Customer segmentation and group pricing (wholesale, VIP)
- Multi-warehouse inventory
- Carrier API integrations (DHL, FedEx — real-time rate calculation)
- Returns / RMA / exchanges
- Partial fulfillment and pick/pack/ship workflow
- Subscription / recurring billing
- Multi-store per tenant (one storefront config per org for MVP)
- CMS integration / landing page builder
- Personalization / recommendation engine
- Analytics engine (cohort, LTV, funnel)
- OAuth / SSO for enterprise tenant admin access (WorkOS supports this, but MVP uses email/password + social)
- Directory Sync / SCIM (post-MVP, when enterprise tenants need it)

---

## 3. Auth & Multi-Tenancy Architecture

This is the foundation of the entire system. Everything else depends on this being correct.

### 3.1 WorkOS Integration Model

WorkOS provides three primitives that map directly to this system:

| WorkOS Concept | Commerce Engine Concept | Description |
|---------------|------------------------|-------------|
| **User** | Admin user or Customer | A person with an identity (email, password, social login) |
| **Organization** | Tenant / Store | An isolated commerce instance with its own products, orders, etc. |
| **Organization Membership** | Role assignment | Links a user to an org with a role (super_admin, product_manager, support_agent) |

**Key architectural decisions:**

1. **WorkOS handles all authentication.** No password hashing, no session management, no token generation in our code. WorkOS issues JWTs, we verify them.

2. **WorkOS Organizations = our tenants.** When a new merchant signs up, we create a WorkOS Organization and a corresponding tenant record in our database.

3. **One user can belong to multiple organizations.** A freelance store manager running three shops logs in once, picks which org to enter, and gets a tenant-scoped session.

4. **Roles are managed through WorkOS Organization Memberships.** We define three roles (super_admin, product_manager, support_agent) and assign them via WorkOS. Our middleware reads the role from the JWT.

5. **Customer auth is separate from admin auth.** Storefront customers authenticate via a lightweight JWT system managed by the commerce engine itself (not WorkOS). WorkOS is for the admin/back-office side. Customers don't need org membership, SSO, or role management — they just need email/password and order history.

### 3.2 Auth Flows

#### Admin Authentication Flow

```
Admin navigates to admin dashboard
        │
        ▼
Redirected to WorkOS AuthKit hosted login
        │
        ├─ Email/password
        ├─ Google OAuth
        ├─ Microsoft OAuth
        └─ (Future: Enterprise SSO via SAML/OIDC)
        │
        ▼
WorkOS authenticates → returns auth code to callback URL
        │
        ▼
Backend exchanges auth code for WorkOS session
        │
        ├─ Receives: user_id, email, organization_id, role
        │
        ▼
Backend issues session (httpOnly cookie with WorkOS session token)
        │
        ▼
If user belongs to multiple orgs → org picker UI
        │
        ▼
Active org selected → tenant context established
        │
        ▼
All subsequent requests carry: user_id + organization_id + role
```

#### Customer Authentication Flow (Storefront)

```
Customer visits storefront
        │
        ├─ Guest browsing (no auth needed for products, cart)
        │
        ├─ Registration: POST /graphql → createAccount mutation
        │   └─ Email + password → hashed + stored in customers table
        │       └─ Scoped to the tenant (org_id from API key)
        │
        ├─ Login: POST /graphql → login mutation
        │   └─ Returns JWT (short-lived access + refresh token)
        │       └─ JWT payload: { customer_id, organization_id }
        │
        └─ Guest checkout: no account needed
            └─ Email captured at checkout, order linked by email
```

#### Storefront API Authentication

```
Storefront app makes request
        │
        ▼
X-API-Key header (identifies the tenant/storefront)
        │
        ├─ API key lookup → resolves organization_id
        │
        ├─ Optional: Authorization: Bearer <customer_jwt>
        │   └─ If present → customer-authenticated request
        │   └─ If absent → anonymous/guest request
        │
        ▼
Tenant context set → all queries scoped to organization_id
```

### 3.3 Request Lifecycle (Every Single Request)

```
HTTP Request arrives
        │
        ▼
┌─────────────────────────────────────┐
│  1. IDENTIFY: Who is this?          │
│     ├─ Admin: WorkOS JWT → verify   │
│     ├─ Storefront: API Key → lookup │
│     └─ Webhook: Signature → verify  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. TENANT: What org is this?       │
│     ├─ Admin: org_id from JWT       │
│     ├─ Storefront: org_id from key  │
│     └─ Set on request context       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. AUTHORIZE: Can they do this?    │
│     ├─ Admin: role from JWT →       │
│     │   check against permission    │
│     │   matrix for this route       │
│     ├─ Storefront: public or        │
│     │   customer-auth required?     │
│     └─ Reject with 403 if denied    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. SCOPE: Enforce tenant boundary  │
│     All repository methods auto-    │
│     inject WHERE org_id = ?         │
│     No cross-tenant data possible   │
└──────────────┬──────────────────────┘
               │
               ▼
         Business Logic
```

### 3.4 Tenant Data Isolation Strategy

**Row-Level Isolation (shared database, shared schema):**

Every tenant-specific table has an `organization_id` column. This is the right tradeoff for MVP: simple to implement, easy to query, and WorkOS Organizations handle the identity boundary.

```typescript
// Base repository — ALL tenant-aware repositories extend this
abstract class TenantScopedRepository<T> {
  constructor(
    private db: Database,
    private tableName: string,
    private tenantContext: TenantContext  // injected per-request
  ) {}

  // Every query automatically scoped
  async findMany(filters: Partial<T>): Promise<T[]> {
    return this.db
      .select()
      .from(this.tableName)
      .where({
        ...filters,
        organization_id: this.tenantContext.organizationId  // ALWAYS applied
      });
  }

  async create(data: Omit<T, 'organization_id'>): Promise<T> {
    return this.db
      .insert(this.tableName)
      .values({
        ...data,
        organization_id: this.tenantContext.organizationId  // ALWAYS injected
      });
  }

  // findById also checks org_id — prevents tenant A accessing tenant B's data by guessing UUID
  async findById(id: string): Promise<T | null> {
    return this.db
      .select()
      .from(this.tableName)
      .where({
        id,
        organization_id: this.tenantContext.organizationId
      })
      .first();
  }
}
```

**Database-level safety net (belt + suspenders):**

```sql
-- Row-Level Security policy on PostgreSQL as a second layer of defense
-- Even if application code has a bug, the database itself blocks cross-tenant access

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_products ON products
  USING (organization_id = current_setting('app.current_org_id')::uuid);

-- Set at the start of every database transaction:
SET LOCAL app.current_org_id = '<org-uuid>';
```

This means cross-tenant data leaks require bugs in BOTH the application layer AND the database layer simultaneously.

### 3.5 RBAC Permission Matrix

Roles are stored in WorkOS as Organization Membership roles. Permission checks happen in application middleware.

| Resource | super_admin | product_manager | support_agent |
|----------|------------|----------------|--------------|
| Products | CRUD | CRUD | Read |
| Inventory | CRUD | Update | Read |
| Orders | CRUD + Refund | Read | Read + Update Status |
| Customers | CRUD | Read | Read + Update |
| Discounts | CRUD | CRUD | Read |
| Shipping Config | CRUD | Read | Read |
| Admin Users (invite/manage) | CRUD | — | — |
| API Keys | CRUD | — | — |
| Audit Logs | Read (all) | Read (own actions) | Read (own actions) |
| Tenant Settings | CRUD | — | — |

```typescript
// Permission middleware
const PERMISSIONS = {
  'products.create': ['super_admin', 'product_manager'],
  'products.read':   ['super_admin', 'product_manager', 'support_agent'],
  'products.update': ['super_admin', 'product_manager'],
  'products.delete': ['super_admin', 'product_manager'],
  'orders.refund':   ['super_admin'],
  'orders.update':   ['super_admin', 'support_agent'],
  // ... etc
} as const;

function requirePermission(permission: keyof typeof PERMISSIONS) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.tenantContext.role;
    if (!PERMISSIONS[permission].includes(userRole)) {
      throw new ForbiddenError(`Role '${userRole}' cannot perform '${permission}'`);
    }
    next();
  };
}
```

### 3.6 Tenant Provisioning Flow

When a new merchant signs up:

```
New merchant signs up via onboarding UI
        │
        ▼
1. Create WorkOS Organization
   └─ Returns: workos_org_id
        │
        ▼
2. Create Organization Membership (user → org, role: super_admin)
        │
        ▼
3. Create tenant record in our database
   └─ organizations table: { id, workos_org_id, name, slug, settings }
        │
        ▼
4. Seed default data for new tenant
   ├─ Default shipping zone (domestic, flat rate)
   ├─ Default tax rate (0% — merchant configures)
   └─ Generate first API key for storefront
        │
        ▼
5. Redirect to admin dashboard → tenant is live
```

---

## 4. Architecture Overview

### 4.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      STOREFRONTS                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │ Next.js  │    │ Mobile   │    │   POS    │    ...         │
│  │   Web    │    │   App    │    │ Terminal │               │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘               │
│       │               │               │                      │
│       └───────────────┼───────────────┘                      │
│                       │                                      │
│            ┌──────────▼──────────┐                           │
│            │   GraphQL API       │  ◄── API Key + optional   │
│            │   (Storefront)      │      customer JWT         │
│            └──────────┬──────────┘                           │
└───────────────────────┼──────────────────────────────────────┘

┌───────────────────────┼──────────────────────────────────────┐
│            COMMERCE ENGINE (Multi-Tenant Modular Monolith)   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────┐        │
│  │              Request Pipeline                     │        │
│  │  Auth → Tenant Resolution → RBAC → Rate Limit    │        │
│  └──┬───────┬───────┬───────┬───────┬───────┬───────┘        │
│     │       │       │       │       │       │                │
│  ┌──▼───┐┌──▼───┐┌──▼───┐┌──▼───┐┌──▼───┐┌──▼───┐          │
│  │Prod- ││Order ││Pric- ││Inve- ││Cust- ││Pay-  │          │
│  │uct   ││      ││ing   ││ntory ││omer  ││ment  │          │
│  │Svc   ││ Svc  ││Eng.  ││ Svc  ││ Svc  ││ Svc  │          │
│  └──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘          │
│     │       │       │       │       │       │                │
│  ┌──▼───────▼───────▼───────▼───────▼───────▼───────┐        │
│  │             Event Bus (Internal)                  │        │
│  └──────────────────┬───────────────────────────────┘        │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────┐        │
│  │   PostgreSQL (shared schema, row-level isolation) │        │
│  │   + RLS policies as safety net                    │        │
│  └──────────────────────────────────────────────────┘        │
│                                                              │
│  ┌──────────────────────────────────────────────────┐        │
│  │  REST API (Admin)    ◄── WorkOS JWT + RBAC       │        │
│  │  REST API (Webhooks) ◄── Stripe signature        │        │
│  └──────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                           │
│              (React / Next.js — separate app)                │
│                                                              │
│  ┌─────────┐ ┌──────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │
│  │Products │ │Orders│ │Customers │ │Settings │ │Org     │  │
│  │         │ │      │ │          │ │         │ │Picker  │  │
│  └─────────┘ └──────┘ └──────────┘ └─────────┘ └────────┘  │
│                       │                                      │
│         WorkOS AuthKit (hosted login + org management)       │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Why GraphQL for Storefront, REST for Admin

| Concern | Storefront (GraphQL) | Admin (REST) |
|---------|---------------------|-------------|
| Data shape | Highly variable — mobile wants slim payloads, web wants nested product → variants → images → inventory in one call | Predictable CRUD — always the same shape |
| Consumers | Multiple unknown frontends with different needs | One known admin dashboard |
| Nested data | Product → variants → options → images → pricing → stock status | Flat resources with occasional includes |
| Real-time | Subscriptions for order status, stock updates (future) | Polling is fine |
| Caching | CDN-friendly with persisted queries | Standard HTTP caching |
| Auth complexity | Simple: API key + optional customer JWT | Complex: WorkOS JWT + RBAC per mutation |

**Storefront GraphQL schema preview:**

```graphql
type Query {
  # Products
  products(
    first: Int
    after: String
    filter: ProductFilterInput
    sort: ProductSortInput
  ): ProductConnection!
  product(slug: String, id: ID): Product
  categories: [Category!]!
  category(slug: String!): Category

  # Cart
  cart(id: ID!): Cart

  # Customer (auth required)
  me: Customer
  myOrders(first: Int, after: String): OrderConnection!
  myOrder(id: ID!): Order

  # Shipping
  shippingRates(input: ShippingRateInput!): [ShippingRate!]!
}

type Mutation {
  # Cart
  createCart: Cart!
  addToCart(input: AddToCartInput!): Cart!
  updateCartItem(input: UpdateCartItemInput!): Cart!
  removeFromCart(cartId: ID!, itemId: ID!): Cart!
  applyCoupon(cartId: ID!, code: String!): Cart!
  removeCoupon(cartId: ID!): Cart!

  # Checkout
  checkout(input: CheckoutInput!): CheckoutResult!

  # Customer auth
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  refreshToken(token: String!): AuthPayload!
  updateProfile(input: UpdateProfileInput!): Customer!

  # Addresses
  addAddress(input: AddressInput!): Address!
  updateAddress(id: ID!, input: AddressInput!): Address!
  deleteAddress(id: ID!): Boolean!
}

type Product {
  id: ID!
  name: String!
  slug: String!
  description: String
  shortDescription: String
  status: ProductStatus!
  variants: [ProductVariant!]!
  options: [ProductOption!]!
  images: [ProductMedia!]!
  primaryImage: ProductMedia
  categories: [Category!]!
  priceRange: PriceRange!          # computed: min/max across variants
  inStock: Boolean!                # computed: any variant in stock?
  createdAt: DateTime!
}

type ProductVariant {
  id: ID!
  sku: String!
  name: String!                    # "Large / Red"
  price: Money!
  compareAtPrice: Money
  selectedOptions: [SelectedOption!]!
  images: [ProductMedia!]!
  inventory: InventoryStatus!      # in_stock, low_stock, out_of_stock
  availableQuantity: Int           # only if store config allows showing quantity
}

type Cart {
  id: ID!
  items: [CartItem!]!
  subtotal: Money!
  discountTotal: Money!
  taxTotal: Money!
  shippingTotal: Money!
  total: Money!
  couponCode: String
  itemCount: Int!
}

type CheckoutResult {
  order: Order!
  paymentClientSecret: String!     # Stripe client secret for frontend
}

type Money {
  amount: Int!                     # cents
  currency: String!                # ISO 4217
  formatted: String!               # "$29.99"
}

# Relay-style pagination
type ProductConnection {
  edges: [ProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

### 4.3 Module Structure

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── services/
│   │   │   ├── WorkOsAuthService.ts       # WorkOS SDK integration
│   │   │   ├── CustomerAuthService.ts     # Customer JWT (storefront)
│   │   │   └── ApiKeyService.ts           # Storefront API key management
│   │   ├── middleware/
│   │   │   ├── AdminAuthMiddleware.ts     # WorkOS JWT verification
│   │   │   ├── StorefrontAuthMiddleware.ts # API key + optional customer JWT
│   │   │   ├── TenantContextMiddleware.ts # Sets org_id on request
│   │   │   └── RbacMiddleware.ts          # Permission checks
│   │   ├── guards/
│   │   │   └── PermissionGuard.ts         # Decorator-based for resolvers/controllers
│   │   └── entities/
│   │       ├── Organization.ts            # Tenant record (mirrors WorkOS org)
│   │       └── ApiKey.ts
│   │
│   ├── product/
│   │   ├── product.module.ts
│   │   ├── entities/
│   │   │   ├── Product.ts
│   │   │   ├── ProductVariant.ts
│   │   │   ├── ProductOption.ts
│   │   │   ├── ProductOptionValue.ts
│   │   │   ├── Category.ts
│   │   │   └── ProductMedia.ts
│   │   ├── services/
│   │   │   ├── ProductService.ts
│   │   │   └── CategoryService.ts
│   │   ├── repositories/                  # extends TenantScopedRepository
│   │   │   ├── ProductRepository.ts
│   │   │   └── CategoryRepository.ts
│   │   ├── resolvers/                     # GraphQL (storefront)
│   │   │   └── ProductResolver.ts
│   │   ├── controllers/                   # REST (admin)
│   │   │   └── AdminProductController.ts
│   │   └── dto/
│   │       ├── CreateProductDto.ts
│   │       └── UpdateVariantDto.ts
│   │
│   ├── inventory/
│   │   ├── entities/
│   │   │   ├── InventoryItem.ts
│   │   │   └── StockReservation.ts
│   │   ├── services/
│   │   │   └── InventoryService.ts        # reserve, release, adjust, check
│   │   └── repositories/
│   │       └── InventoryRepository.ts
│   │
│   ├── pricing/
│   │   ├── entities/
│   │   │   ├── Discount.ts
│   │   │   └── Coupon.ts
│   │   ├── services/
│   │   │   └── PricingEngine.ts           # apply discounts, validate coupons
│   │   └── repositories/
│   │       └── DiscountRepository.ts
│   │
│   ├── cart/
│   │   ├── entities/
│   │   │   ├── Cart.ts
│   │   │   └── CartItem.ts
│   │   ├── services/
│   │   │   ├── CartService.ts
│   │   │   └── CheckoutService.ts         # the big one
│   │   ├── resolvers/
│   │   │   └── CartResolver.ts
│   │   └── repositories/
│   │       └── CartRepository.ts
│   │
│   ├── order/
│   │   ├── entities/
│   │   │   ├── Order.ts
│   │   │   ├── OrderLineItem.ts
│   │   │   └── OrderTimeline.ts
│   │   ├── services/
│   │   │   ├── OrderService.ts
│   │   │   └── RefundService.ts
│   │   ├── resolvers/
│   │   │   └── OrderResolver.ts           # customer order history
│   │   └── controllers/
│   │       └── AdminOrderController.ts
│   │
│   ├── customer/
│   │   ├── entities/
│   │   │   ├── Customer.ts
│   │   │   └── Address.ts
│   │   ├── services/
│   │   │   └── CustomerService.ts
│   │   └── resolvers/
│   │       └── CustomerResolver.ts
│   │
│   ├── payment/
│   │   ├── entities/
│   │   │   ├── Payment.ts
│   │   │   └── Refund.ts
│   │   ├── services/
│   │   │   ├── PaymentService.ts
│   │   │   └── StripeAdapter.ts           # implements PaymentProvider interface
│   │   ├── interfaces/
│   │   │   └── PaymentProvider.ts         # abstraction layer
│   │   └── webhooks/
│   │       └── StripeWebhookController.ts
│   │
│   ├── shipping/
│   │   ├── entities/
│   │   │   ├── ShippingZone.ts
│   │   │   ├── ShippingMethod.ts
│   │   │   └── Shipment.ts
│   │   ├── services/
│   │   │   └── ShippingService.ts
│   │   └── controllers/
│   │       └── AdminShippingController.ts
│   │
│   └── audit/
│       ├── entities/
│       │   └── AuditLog.ts
│       ├── services/
│       │   └── AuditService.ts
│       └── controllers/
│           └── AdminAuditController.ts
│
├── shared/
│   ├── tenant/
│   │   ├── TenantContext.ts               # request-scoped tenant info
│   │   ├── TenantScopedRepository.ts      # base class for all repos
│   │   └── RlsPolicySetup.ts             # PostgreSQL RLS configuration
│   ├── events/
│   │   ├── EventBus.ts
│   │   └── events.ts                      # typed event definitions
│   ├── graphql/
│   │   ├── schema.ts                      # merged schema
│   │   ├── scalars/                       # DateTime, Money, etc.
│   │   └── directives/                    # @auth, @requireCustomer
│   ├── database/
│   │   ├── connection.ts
│   │   ├── migrations/
│   │   └── seeds/
│   └── utils/
│       ├── money.ts                       # integer cent arithmetic
│       ├── slug.ts
│       └── pagination.ts                  # cursor encoding/decoding
│
└── api/
    ├── graphql/                           # Storefront GraphQL endpoint
    │   └── server.ts
    ├── admin/                             # Admin REST routes
    │   └── router.ts
    └── webhooks/                          # Stripe, etc.
        └── router.ts
```

### 4.4 Event System (MVP Scope)

In-process event emitter. Events fire after the primary operation completes and trigger side effects asynchronously.

| Event | Emitted By | Consumed By | Side Effect |
|-------|-----------|-------------|-------------|
| `tenant.created` | AuthService | SeedService | Create default shipping/tax/API key |
| `order.created` | OrderService | InventoryService, AuditService | Reserve stock, log event |
| `order.cancelled` | OrderService | InventoryService, PaymentService | Release reservation, initiate refund |
| `payment.success` | PaymentService (webhook) | OrderService | Transition order to `paid` |
| `payment.failed` | PaymentService (webhook) | OrderService, InventoryService | Mark order failed, release stock |
| `inventory.low_stock` | InventoryService | NotificationService | Flag for dashboard alert |
| `product.updated` | ProductService | AuditService | Log change |
| `refund.processed` | PaymentService | OrderService, AuditService | Update order, log |

---

## 5. Data Model

**Critical rule:** Every tenant-scoped table has `organization_id UUID NOT NULL` as its second column (after `id`), with a foreign key to `organizations.id`. Tables marked with 🔒 have PostgreSQL RLS policies as a safety net.

### 5.1 Tenant Module

#### `organizations`
The core tenant table. Mirrors WorkOS Organization.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | Internal ID |
| workos_org_id | VARCHAR(255) | UNIQUE, NOT NULL | WorkOS Organization ID |
| name | VARCHAR(255) | NOT NULL | Store/merchant name |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | URL-safe identifier |
| settings | JSONB | DEFAULT '{}' | Store config (currency, timezone, etc.) |
| stripe_account_id | VARCHAR(255) | | Connected Stripe account (for tenant's payments) |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Note:** This is the ONLY table without `organization_id` — it IS the organization.

#### `api_keys`
For storefront authentication. Each key is bound to one organization.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| name | VARCHAR(100) | NOT NULL | e.g. "Next.js Storefront", "Mobile App" |
| key_hash | VARCHAR(255) | NOT NULL | SHA-256 hash of the actual key |
| key_prefix | VARCHAR(8) | NOT NULL | First 8 chars for identification in UI |
| permissions | VARCHAR[] | | Scopes: products.read, cart.write, etc. |
| last_used_at | TIMESTAMP | | |
| expires_at | TIMESTAMP | | |
| is_active | BOOLEAN | DEFAULT true | |
| created_by_workos_user_id | VARCHAR(255) | NOT NULL | WorkOS user who generated it |
| created_at | TIMESTAMP | NOT NULL | |

### 5.2 Product Module 🔒

#### `products`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | **Tenant scope** |
| name | VARCHAR(255) | NOT NULL | |
| slug | VARCHAR(255) | NOT NULL | UNIQUE within org (composite unique) |
| description | TEXT | | Rich text / markdown |
| short_description | VARCHAR(500) | | For cards/listing pages |
| status | ENUM | NOT NULL, DEFAULT 'draft' | draft, active, archived |
| is_featured | BOOLEAN | DEFAULT false | |
| metadata | JSONB | | Extensible key-value |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| deleted_at | TIMESTAMP | | Soft delete |

**Unique constraint:** `UNIQUE(organization_id, slug)` — slugs are unique per tenant, not globally.

#### `product_variants`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | **Tenant scope** |
| product_id | UUID | FK → products.id, NOT NULL | |
| sku | VARCHAR(100) | NOT NULL | UNIQUE within org |
| name | VARCHAR(255) | NOT NULL | e.g. "Large / Red" |
| price | INTEGER | NOT NULL | Price in cents (smallest currency unit) |
| compare_at_price | INTEGER | | "Was" price for display, in cents |
| cost_price | INTEGER | | For margin calculations, in cents |
| weight | DECIMAL(8,2) | | In grams |
| barcode | VARCHAR(100) | | UPC/EAN/ISBN |
| position | INTEGER | DEFAULT 0 | Sort order |
| is_active | BOOLEAN | DEFAULT true | |
| metadata | JSONB | | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Unique constraint:** `UNIQUE(organization_id, sku)`

**Money representation:** All prices stored as integers in the smallest currency unit (cents for USD/EUR, fils for MVR, etc.). This eliminates floating-point issues entirely. The GraphQL `Money` type handles formatting.

#### `product_options`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| product_id | UUID | FK → products.id | |
| name | VARCHAR(100) | NOT NULL | e.g. "Size", "Color" |
| position | INTEGER | DEFAULT 0 | |

#### `product_option_values`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| option_id | UUID | FK → product_options.id | |
| value | VARCHAR(100) | NOT NULL | e.g. "XL", "Red" |
| position | INTEGER | DEFAULT 0 | |

#### `variant_option_values`
Pivot table linking variants to their option value combination.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| variant_id | UUID | FK → product_variants.id | Composite PK |
| option_value_id | UUID | FK → product_option_values.id | Composite PK |

**Note:** No `organization_id` needed — both FKs point to tenant-scoped tables.

#### `categories`
Self-referencing tree structure.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| parent_id | UUID | FK → categories.id, NULLABLE | NULL = root category |
| name | VARCHAR(255) | NOT NULL | |
| slug | VARCHAR(255) | NOT NULL | UNIQUE within org |
| description | TEXT | | |
| position | INTEGER | DEFAULT 0 | Sort within parent |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### `product_categories`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| product_id | UUID | FK → products.id | Composite PK |
| category_id | UUID | FK → categories.id | Composite PK |

#### `product_media`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| product_id | UUID | FK → products.id, NOT NULL | |
| variant_id | UUID | FK → product_variants.id, NULLABLE | NULL = product-level image |
| url | VARCHAR(2048) | NOT NULL | CDN URL |
| alt_text | VARCHAR(255) | | Accessibility |
| media_type | ENUM | NOT NULL | image, video |
| position | INTEGER | DEFAULT 0 | 0 = primary |
| created_at | TIMESTAMP | NOT NULL | |

### 5.3 Inventory Module 🔒

#### `inventory_items`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| variant_id | UUID | FK → product_variants.id, UNIQUE per org | |
| quantity | INTEGER | NOT NULL, DEFAULT 0 | Available stock |
| reserved | INTEGER | NOT NULL, DEFAULT 0 | Reserved during checkout |
| low_stock_threshold | INTEGER | DEFAULT 10 | Trigger alert below this |
| allow_backorder | BOOLEAN | DEFAULT false | |
| updated_at | TIMESTAMP | NOT NULL | |

**Business rules:**
- `available = quantity - reserved`
- Stock reservation created at checkout initiation, released after configurable TTL (default 15min)
- Reservation converted to stock decrement on `payment.success`

#### `stock_reservations`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| inventory_item_id | UUID | FK → inventory_items.id | |
| cart_id | UUID | FK → carts.id | |
| quantity | INTEGER | NOT NULL | |
| expires_at | TIMESTAMP | NOT NULL | TTL for reservation |
| status | ENUM | NOT NULL | active, converted, expired, released |
| created_at | TIMESTAMP | NOT NULL | |

### 5.4 Pricing Module 🔒

#### `discounts`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | Internal name |
| type | ENUM | NOT NULL | percentage, fixed_amount |
| value | INTEGER | NOT NULL | Percentage (0-10000 for 0-100.00%) or fixed amount in cents |
| scope | ENUM | NOT NULL | product, category, order |
| scope_id | UUID | NULLABLE | FK to product/category if scoped, NULL for order-level |
| min_purchase_amount | INTEGER | | Minimum cart total in cents |
| max_uses | INTEGER | | Total redemption cap |
| times_used | INTEGER | DEFAULT 0 | |
| starts_at | TIMESTAMP | NOT NULL | |
| ends_at | TIMESTAMP | | NULL = no expiry |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### `coupons`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| discount_id | UUID | FK → discounts.id, NOT NULL | |
| code | VARCHAR(50) | NOT NULL | UNIQUE within org |
| max_uses | INTEGER | | Per-coupon cap |
| max_uses_per_customer | INTEGER | DEFAULT 1 | |
| times_used | INTEGER | DEFAULT 0 | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |

**Unique constraint:** `UNIQUE(organization_id, code)` — coupon codes unique per tenant.

### 5.5 Cart Module 🔒

#### `carts`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| customer_id | UUID | FK → customers.id, NULLABLE | NULL for guest carts |
| session_token | VARCHAR(255) | UNIQUE | For guest identification |
| status | ENUM | NOT NULL, DEFAULT 'active' | active, abandoned, converted, merged |
| coupon_code | VARCHAR(50) | | Applied coupon |
| subtotal | INTEGER | DEFAULT 0 | In cents |
| discount_total | INTEGER | DEFAULT 0 | |
| tax_total | INTEGER | DEFAULT 0 | |
| shipping_total | INTEGER | DEFAULT 0 | |
| total | INTEGER | DEFAULT 0 | |
| currency | VARCHAR(3) | NOT NULL | From org settings |
| metadata | JSONB | | |
| expires_at | TIMESTAMP | | Auto-cleanup threshold |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### `cart_items`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| cart_id | UUID | FK → carts.id, NOT NULL | |
| variant_id | UUID | FK → product_variants.id, NOT NULL | |
| quantity | INTEGER | NOT NULL, CHECK > 0 | |
| unit_price | INTEGER | NOT NULL | Snapshot at time of add, in cents |
| line_total | INTEGER | NOT NULL | quantity × unit_price |
| metadata | JSONB | | Customizations, gift message, etc. |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

### 5.6 Order Module 🔒

#### `orders`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| order_number | VARCHAR(20) | NOT NULL | UNIQUE within org |
| customer_id | UUID | FK → customers.id, NULLABLE | NULL for guest orders |
| email | VARCHAR(255) | NOT NULL | Always captured |
| status | ENUM | NOT NULL | pending, paid, processing, shipped, delivered, cancelled |
| payment_status | ENUM | NOT NULL | pending, authorized, captured, failed, refunded, partially_refunded |
| fulfillment_status | ENUM | NOT NULL | unfulfilled, fulfilled, partially_fulfilled |
| subtotal | INTEGER | NOT NULL | In cents |
| discount_total | INTEGER | NOT NULL, DEFAULT 0 | |
| tax_total | INTEGER | NOT NULL, DEFAULT 0 | |
| shipping_total | INTEGER | NOT NULL, DEFAULT 0 | |
| total | INTEGER | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL | |
| billing_address | JSONB | NOT NULL | Snapshot |
| shipping_address | JSONB | NOT NULL | Snapshot |
| shipping_method | VARCHAR(100) | | |
| discount_breakdown | JSONB | | Snapshot of discounts applied |
| notes | TEXT | | Customer notes |
| metadata | JSONB | | |
| placed_at | TIMESTAMP | | When order was confirmed |
| cancelled_at | TIMESTAMP | | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Unique constraint:** `UNIQUE(organization_id, order_number)`

#### `order_line_items`
Immutable snapshots — never modified after order creation.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| order_id | UUID | FK → orders.id, NOT NULL | |
| variant_id | UUID | FK → product_variants.id | Reference (may be deleted later) |
| product_name | VARCHAR(255) | NOT NULL | Snapshot |
| variant_name | VARCHAR(255) | NOT NULL | Snapshot |
| sku | VARCHAR(100) | NOT NULL | Snapshot |
| quantity | INTEGER | NOT NULL | |
| unit_price | INTEGER | NOT NULL | Cents, at time of purchase |
| discount_amount | INTEGER | DEFAULT 0 | Per-item discount, cents |
| tax_amount | INTEGER | DEFAULT 0 | Per-item tax, cents |
| line_total | INTEGER | NOT NULL | (unit_price × quantity) - discount + tax |
| thumbnail_url | VARCHAR(2048) | | Product image snapshot |
| metadata | JSONB | | |

#### `order_timeline`
Human-readable event log displayed on the order detail page.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| order_id | UUID | FK → orders.id, NOT NULL | |
| event_type | VARCHAR(50) | NOT NULL | status_change, payment_received, note_added, refund_issued |
| title | VARCHAR(255) | NOT NULL | Display text |
| description | TEXT | | |
| actor_type | ENUM | NOT NULL | system, admin, customer |
| actor_id | VARCHAR(255) | NULLABLE | WorkOS user ID or customer ID |
| created_at | TIMESTAMP | NOT NULL | |

### 5.7 Customer Module 🔒

#### `customers`
Storefront customers — NOT admin users (those are in WorkOS).

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| email | VARCHAR(255) | NOT NULL | UNIQUE within org |
| password_hash | VARCHAR(255) | | NULL for guest-converted accounts |
| first_name | VARCHAR(100) | | |
| last_name | VARCHAR(100) | | |
| phone | VARCHAR(20) | | |
| status | ENUM | DEFAULT 'active' | active, suspended, banned |
| accepts_marketing | BOOLEAN | DEFAULT false | |
| order_count | INTEGER | DEFAULT 0 | Denormalized for perf |
| total_spent | INTEGER | DEFAULT 0 | Denormalized, in cents |
| metadata | JSONB | | |
| last_login_at | TIMESTAMP | | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

**Unique constraint:** `UNIQUE(organization_id, email)` — same email can exist across tenants.

#### `addresses`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| customer_id | UUID | FK → customers.id, NOT NULL | |
| label | VARCHAR(50) | | "Home", "Office", etc. |
| first_name | VARCHAR(100) | NOT NULL | |
| last_name | VARCHAR(100) | NOT NULL | |
| address_line_1 | VARCHAR(255) | NOT NULL | |
| address_line_2 | VARCHAR(255) | | |
| city | VARCHAR(100) | NOT NULL | |
| state | VARCHAR(100) | | |
| postal_code | VARCHAR(20) | | |
| country_code | VARCHAR(2) | NOT NULL | ISO 3166-1 alpha-2 |
| phone | VARCHAR(20) | | |
| is_default_billing | BOOLEAN | DEFAULT false | |
| is_default_shipping | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

### 5.8 Payment Module 🔒

#### `payments`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| order_id | UUID | FK → orders.id, NOT NULL | |
| provider | VARCHAR(50) | NOT NULL | stripe (extensible) |
| provider_payment_id | VARCHAR(255) | | Stripe PaymentIntent ID |
| provider_charge_id | VARCHAR(255) | | Stripe Charge ID |
| amount | INTEGER | NOT NULL | In cents |
| currency | VARCHAR(3) | NOT NULL | |
| status | ENUM | NOT NULL | pending, authorized, captured, failed, refunded, partially_refunded |
| error_message | TEXT | | On failure |
| metadata | JSONB | | Provider-specific data |
| captured_at | TIMESTAMP | | |
| refunded_at | TIMESTAMP | | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

#### `refunds`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| payment_id | UUID | FK → payments.id, NOT NULL | |
| order_id | UUID | FK → orders.id, NOT NULL | |
| provider_refund_id | VARCHAR(255) | | Stripe Refund ID |
| amount | INTEGER | NOT NULL | In cents |
| reason | VARCHAR(255) | | |
| status | ENUM | NOT NULL | pending, processed, failed |
| initiated_by | VARCHAR(255) | | WorkOS user ID of admin |
| created_at | TIMESTAMP | NOT NULL | |

### 5.9 Shipping Module 🔒

#### `shipping_zones`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| name | VARCHAR(100) | NOT NULL | e.g. "Domestic", "Europe" |
| countries | VARCHAR[] | NOT NULL | Array of ISO country codes |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |

#### `shipping_methods`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| zone_id | UUID | FK → shipping_zones.id, NOT NULL | |
| name | VARCHAR(100) | NOT NULL | "Standard", "Express" |
| description | VARCHAR(255) | | |
| type | ENUM | NOT NULL | flat_rate (MVP) |
| price | INTEGER | NOT NULL | In cents |
| min_order_amount | INTEGER | | Free shipping threshold, cents |
| estimated_days_min | INTEGER | | |
| estimated_days_max | INTEGER | | |
| is_active | BOOLEAN | DEFAULT true | |
| position | INTEGER | DEFAULT 0 | |
| created_at | TIMESTAMP | NOT NULL | |

#### `shipments`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| order_id | UUID | FK → orders.id, NOT NULL | |
| shipping_method_id | UUID | FK → shipping_methods.id | |
| tracking_number | VARCHAR(100) | | |
| carrier | VARCHAR(50) | | |
| status | ENUM | NOT NULL | pending, shipped, in_transit, delivered |
| shipped_at | TIMESTAMP | | |
| delivered_at | TIMESTAMP | | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

### 5.10 Tax (Simplified for MVP) 🔒

#### `tax_rates`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| name | VARCHAR(100) | NOT NULL | "US Sales Tax", "UK VAT" |
| rate | INTEGER | NOT NULL | Basis points: 725 = 7.25% |
| country_code | VARCHAR(2) | NOT NULL | |
| state_code | VARCHAR(10) | | For US state-level tax |
| is_inclusive | BOOLEAN | DEFAULT false | Tax-inclusive vs exclusive |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |

### 5.11 Audit Module

#### `audit_logs`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations.id, NOT NULL | |
| entity_type | VARCHAR(50) | NOT NULL | product, order, customer, etc. |
| entity_id | UUID | NOT NULL | |
| action | VARCHAR(50) | NOT NULL | created, updated, deleted, status_changed |
| actor_type | ENUM | NOT NULL | admin, system, webhook, customer |
| actor_id | VARCHAR(255) | NULLABLE | WorkOS user ID, customer ID, or null for system |
| changes | JSONB | | { field: { old: x, new: y } } |
| ip_address | VARCHAR(45) | | |
| user_agent | VARCHAR(255) | | |
| created_at | TIMESTAMP | NOT NULL | |

---

## 6. API Design

### 6.1 Authentication Strategy

| Consumer | Auth Method | Resolves Tenant | Notes |
|----------|-----------|----------------|-------|
| Admin dashboard | WorkOS JWT (cookie) | `organization_id` from JWT claims | Role checked per route |
| Storefront (public) | API Key (`X-API-Key` header) | API key lookup → `organization_id` | Read products, manage carts |
| Storefront (customer) | API Key + Customer JWT (`Authorization: Bearer`) | API key for tenant, JWT for customer identity | Order history, saved addresses |
| Webhooks (Stripe) | Stripe-Signature header | Payment record → `organization_id` | No tenant context in header |

### 6.2 Storefront GraphQL API

Single endpoint: `POST /graphql`

Requires `X-API-Key` header on every request. Optional `Authorization: Bearer <customer_jwt>` for authenticated customer operations.

The full schema is defined in Section 4.2 above. Key design decisions:

- **Relay-style pagination** (cursor-based) for all list queries — better for infinite scroll and mobile.
- **Money as a structured type** — `{ amount: Int!, currency: String!, formatted: String! }` everywhere. No raw numbers exposed.
- **Inventory as an enum** on variants — `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`. Exact quantity only if the tenant enables it in settings.
- **No admin mutations in GraphQL** — all admin operations go through REST. GraphQL is storefront-only.

### 6.3 Admin REST API

All routes prefixed with `/api/admin/`. Require WorkOS JWT (httpOnly cookie) + RBAC check.

**Tenant Management**
```
GET    /api/admin/organization              # Current org settings
PATCH  /api/admin/organization              # Update settings (name, currency, timezone)
POST   /api/admin/organization/members      # Invite admin user (creates WorkOS membership)
GET    /api/admin/organization/members      # List members + roles
PATCH  /api/admin/organization/members/:id  # Change role
DELETE /api/admin/organization/members/:id  # Remove member
```

**Products**
```
GET    /api/admin/products                         # List with advanced filters
POST   /api/admin/products                         # Create product
GET    /api/admin/products/:id                      # Detail
PATCH  /api/admin/products/:id                      # Update
DELETE /api/admin/products/:id                      # Soft delete
POST   /api/admin/products/:id/variants             # Add variant
PATCH  /api/admin/products/:id/variants/:vid        # Update variant
DELETE /api/admin/products/:id/variants/:vid        # Remove variant
POST   /api/admin/products/:id/media                # Upload media
DELETE /api/admin/products/:id/media/:mid           # Remove media
PATCH  /api/admin/products/:id/media/reorder        # Reorder media
```

**Categories**
```
GET    /api/admin/categories                       # Tree view
POST   /api/admin/categories
PATCH  /api/admin/categories/:id
DELETE /api/admin/categories/:id
```

**Orders**
```
GET    /api/admin/orders                           # List with filters
GET    /api/admin/orders/:id                        # Full detail with timeline
PATCH  /api/admin/orders/:id/status                 # Update status
POST   /api/admin/orders/:id/notes                  # Add internal note
POST   /api/admin/orders/:id/refund                 # Issue refund
POST   /api/admin/orders/:id/shipment               # Create shipment
```

**Inventory**
```
GET    /api/admin/inventory                        # Stock levels
PATCH  /api/admin/inventory/:variant_id             # Adjust stock
GET    /api/admin/inventory/low-stock               # Items below threshold
```

**Discounts + Coupons**
```
GET    /api/admin/discounts
POST   /api/admin/discounts
PATCH  /api/admin/discounts/:id
DELETE /api/admin/discounts/:id
POST   /api/admin/discounts/:id/coupons
```

**Customers**
```
GET    /api/admin/customers
GET    /api/admin/customers/:id
PATCH  /api/admin/customers/:id
```

**Shipping**
```
CRUD   /api/admin/shipping/zones
CRUD   /api/admin/shipping/zones/:zoneId/methods
```

**Settings**
```
GET    /api/admin/api-keys
POST   /api/admin/api-keys
DELETE /api/admin/api-keys/:id
GET    /api/admin/tax-rates
CRUD   /api/admin/tax-rates
GET    /api/admin/audit-logs                        # Query audit trail
```

### 6.4 Webhook Endpoints

```
POST   /api/webhooks/stripe                        # Stripe payment events
```

Webhook handler flow: verify signature → extract payment intent → look up payment record → resolve `organization_id` from payment → process event within tenant context.

### 6.5 API Conventions

| Concern | Convention |
|---------|-----------|
| GraphQL pagination | Relay cursor-based (`first`, `after`, `last`, `before`) |
| REST pagination | Cursor-based (`?cursor=xxx&limit=25`) |
| REST filtering | Query params: `?status=active&category=shoes` |
| REST sorting | `?sort=created_at&order=desc` |
| GraphQL errors | Standard GraphQL errors with `extensions.code` |
| REST errors | `{ error: { code: "INSUFFICIENT_STOCK", message: "...", details: {...} } }` |
| REST envelope | `{ data: [...], meta: { cursor, total, has_more } }` |
| Rate limiting | 100 req/min storefront, 300 req/min admin (per API key / per user) |
| Idempotency | `Idempotency-Key` header for checkout and payment mutations |
| Money | Always integers (cents). Never floats. Never formatted server-side except in GraphQL `Money.formatted`. |

---

## 7. Critical Business Logic

### 7.1 Checkout Flow

```
Customer adds items to cart
        │
        ▼
checkout mutation (GraphQL)
        │
        ├─ 1. Validate cart
        │     ├─ Items exist and belong to this tenant
        │     ├─ Variants are active
        │     ├─ Prices are current (if stale → recalculate, return warning)
        │     └─ Stock available
        │
        ├─ 2. Reserve inventory (SELECT FOR UPDATE, single transaction)
        │     ├─ Create stock_reservations with TTL
        │     ├─ Increment inventory_items.reserved
        │     └─ If insufficient → return error with specific items
        │
        ├─ 3. Calculate pricing
        │     ├─ Apply discount/coupon rules
        │     ├─ Calculate tax per line item (tenant's tax rates)
        │     └─ Calculate shipping (tenant's shipping zones/methods)
        │
        ├─ 4. Create order (status: pending, payment_status: pending)
        │     ├─ Snapshot all line items (price, name, SKU, image)
        │     ├─ Snapshot addresses
        │     ├─ Snapshot discount breakdown
        │     └─ Generate order_number (tenant-scoped sequence)
        │
        ├─ 5. Create payment via PaymentProvider abstraction
        │     ├─ Stripe: create PaymentIntent
        │     └─ Return client_secret to frontend
        │
        ├─ 6. Cart status → "converted"
        │
        └─ Return CheckoutResult { order, paymentClientSecret }

Stripe webhook → payment_intent.succeeded
        │
        ├─ Verify webhook signature
        ├─ Look up payment → resolve organization_id
        ├─ Payment status → captured
        ├─ Order status → paid
        ├─ Convert stock reservations → actual decrements
        ├─ Emit order.created event
        └─ Add timeline entry

If payment fails or times out:
        ├─ Payment status → failed
        ├─ Release stock reservations
        └─ Order remains pending (allow retry) or cancel after timeout
```

### 7.2 Inventory Consistency Rules

- All stock mutations must be atomic (database transaction with `SELECT FOR UPDATE`).
- Never allow `quantity - reserved` to go negative unless `allow_backorder` is true.
- Stock check + reservation = single transaction. No race conditions.
- Background job runs every 5 minutes to expire stale reservations past `expires_at`.
- Refunds restore stock atomically.

### 7.3 Price Snapshot Principle

Orders must never reference live product data for pricing. At order creation, snapshot:
- Product name and variant name
- SKU
- Unit price at time of purchase
- Discount amount applied and breakdown
- Tax amount
- Thumbnail URL

If a product is later deleted, renamed, or repriced, existing orders remain correct.

### 7.4 Order State Machine

```
                    ┌──────────┐
                    │  pending  │ (awaiting payment)
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼                     ▼
        ┌──────────┐          ┌──────────┐
        │   paid   │          │cancelled │
        └────┬─────┘          └──────────┘
             │
             ▼
        ┌──────────┐
        │processing│ (admin begins fulfillment)
        └────┬─────┘
             │
             ▼
        ┌──────────┐
        │ shipped  │ (tracking number added)
        └────┬─────┘
             │
             ▼
        ┌──────────┐
        │delivered │
        └──────────┘

Any state except pending can transition to:
        ┌──────────┐
        │ refunded │ (full refund issued)
        └──────────┘
```

Invalid transitions throw errors. OrderService validates every transition.

### 7.5 Payment Provider Abstraction

```typescript
interface PaymentProvider {
  createPaymentIntent(params: {
    amount: number;        // cents
    currency: string;
    metadata: Record<string, string>;
    tenantStripeAccountId?: string;  // for Stripe Connect
  }): Promise<PaymentIntentResult>;

  capturePayment(paymentIntentId: string): Promise<CaptureResult>;
  refundPayment(chargeId: string, amount: number): Promise<RefundResult>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

class StripeAdapter implements PaymentProvider { /* ... */ }
// Future: class PayPalAdapter implements PaymentProvider { /* ... */ }
```

### 7.6 Tenant Isolation Rules (Enforced Everywhere)

1. **No endpoint exists without tenant context.** If middleware can't resolve an `organization_id`, the request is rejected before it reaches any business logic.

2. **All repository queries include `organization_id`.** The base `TenantScopedRepository` makes this impossible to forget.

3. **PostgreSQL RLS as second line of defense.** Even if a code bug bypasses the repository, the database blocks cross-tenant reads/writes.

4. **UUIDs are not tenant boundaries.** Never trust that a UUID belongs to the current tenant just because the client sent it. Every `findById` includes an org_id check.

5. **Webhooks resolve tenant from internal data, not from request headers.** Stripe webhooks carry a payment intent ID → we look up the payment record → get `organization_id` from our database.

6. **Audit logs always capture `organization_id` + `actor_id`.** If something goes wrong, we can trace exactly who did what in which tenant.

---

## 8. Admin Dashboard Specifications

### 8.1 Pages + Features

**Org Picker (if user belongs to multiple orgs)**
- Shown after WorkOS login
- Lists organizations the user is a member of
- Selecting one sets active tenant for the session

**Dashboard Home**
- Today's orders count + revenue (for current tenant)
- Orders needing attention (pending, processing)
- Low-stock alerts
- Recent activity feed (from audit logs)

**Products**
- List: table with search, filter by status/category, bulk actions
- Create/Edit: variant generator, media uploader with drag-to-reorder, rich text editor, category assignment, SEO fields
- CSV bulk import/export

**Orders**
- List: filters (status, date range, customer, payment status), search by order number/email
- Detail: order summary, line items, addresses, timeline, payment info, actions (update status, add note, issue refund, create shipment)

**Inventory**
- All SKUs with stock levels, reserved, available, low-stock flag
- Inline stock adjustment with reason (logged to audit)
- Low-stock view

**Customers**
- Searchable, sortable by order count / total spent
- Detail: profile, order history, addresses, status toggle

**Discounts + Coupons**
- Active/expired/scheduled discounts
- Create/Edit: type, value, scope, date range, usage limits
- Coupon generator with per-customer limits

**Shipping**
- Zones: CRUD with country multiselect
- Methods: CRUD per zone, price, free-shipping threshold

**Settings**
- Organization: name, currency, timezone
- Team: invite members via email → WorkOS creates user + membership
- API Keys: generate, view prefix, revoke
- Tax rates: CRUD

**Audit Logs**
- Filterable by entity type, actor, date range
- Detail view: JSON diff of changes

### 8.2 Tech Stack (Admin)

- Next.js (App Router)
- shadcn/ui component library
- TanStack Table for data tables
- React Hook Form + Zod for forms
- TanStack Query for server state
- WorkOS AuthKit React SDK for login
- httpOnly cookie sessions (WorkOS session token)

---

## 9. Non-Functional Requirements

| Concern | Requirement |
|---------|------------|
| Database | PostgreSQL 15+ (JSONB, arrays, RLS, CTEs for category trees) |
| Performance | GraphQL product queries < 200ms (p95), checkout mutation < 500ms (p95) |
| Security | WorkOS for admin auth, bcrypt for customer passwords, API keys hashed (SHA-256), CORS whitelist per tenant, helmet headers, input sanitization, parameterized queries |
| Tenant isolation | Application-level repo scoping + PostgreSQL RLS policies |
| Idempotency | Checkout and payment mutations must be idempotent |
| Soft deletes | Products, customers, discounts. Orders are never deleted. |
| Money handling | All monetary values as integers (cents). Never floats. All calculations server-side. |
| Testing | Unit: pricing engine, inventory reservation, order state machine, tenant scoping. Integration: checkout flow, cross-tenant isolation verification. |
| Logging | Structured JSON logs with request_id, organization_id, actor_id, action. |
| Migrations | Versioned, reversible. All new tables include `organization_id` + RLS policy in same migration. |

---

## 10. Implementation Plan

### Phase 1: Foundation + Auth (Week 1–3)

This phase produces zero user-facing features but is the most critical. Everything else depends on it.

- Project scaffolding (framework, tooling, linting, testing setup)
- PostgreSQL setup + migration infrastructure
- **WorkOS integration**
  - AuthKit setup (hosted login for admin)
  - Organization CRUD (create org, invite members, manage roles)
  - JWT verification middleware
  - Session management (httpOnly cookies)
- **Tenant infrastructure**
  - `organizations` table + `TenantContext` request-scoped service
  - `TenantScopedRepository` base class
  - PostgreSQL RLS policy template + setup script
  - Tenant resolution middleware (WorkOS JWT → org_id, API key → org_id)
- **RBAC middleware** with permission matrix
- **API key system** (generate, hash, lookup, revoke)
- **Customer auth** (registration, login, JWT issuance — separate from WorkOS)
- **GraphQL server setup** (schema stitching, Money scalar, auth directives)
- **REST router setup** (admin routes, RBAC guards)
- **Audit log infrastructure** (service + middleware/decorator approach)
- Shared utilities (money arithmetic, slug generation, cursor pagination)
- **Tenant provisioning flow** (sign up → create WorkOS org → seed defaults)
- **Verification tests:** create two tenants, verify complete data isolation

### Phase 2: Catalog (Week 4–5)

- Product entity + CRUD (admin REST + storefront GraphQL)
- Product options and variant system with combination generator
- Category tree (self-referencing, nested queries)
- Product media (upload to S3/R2, ordering, CDN URL storage)
- Product ↔ category assignment
- Product listing with filters, search, cursor pagination
- Inventory items (stock per variant, threshold config)
- Admin dashboard: product management pages
- GraphQL: `products`, `product`, `categories` queries with all nested types

### Phase 3: Pricing + Cart (Week 6–7)

- Discount entity + CRUD (percentage, fixed, scoped to product/category/order)
- Coupon system (code generation, validation, usage tracking per tenant)
- Pricing engine (apply discounts to cart, validate rules)
- Cart module (GraphQL mutations: create, add/remove/update items, apply coupon)
- Cart total calculation (subtotal, discount, tax, shipping, total — all in cents)
- Tax rate system (region lookup, inclusive/exclusive calc per tenant config)
- Admin dashboard: discount + coupon management pages

### Phase 4: Checkout + Payments (Week 8–9)

- Shipping zones and methods (flat-rate MVP, per tenant)
- Shipping rate calculation (GraphQL query)
- Customer module (registration, login, profile, addresses)
- Stock reservation system (create, TTL, expire, convert)
- Checkout mutation (validation → reservation → order → payment intent)
- Stripe integration behind PaymentProvider abstraction
- Webhook handler (signature verification → tenant resolution → state transitions)
- Payment state machine
- Guest checkout support

### Phase 5: Order Management (Week 10–11)

- Order state machine with transition validation
- Order timeline (automatic + manual entries)
- Refund flow (initiate → Stripe refund → update order + inventory)
- Shipment creation + tracking number
- Customer order history (GraphQL queries)
- Admin dashboard: order list, detail, actions (status update, note, refund, ship)

### Phase 6: Admin Dashboard + Polish (Week 12–14)

- Dashboard home (stats, alerts, activity feed — scoped to tenant)
- Inventory management page (stock levels, adjustments, low-stock)
- Customer management pages
- Shipping zone/method management
- Settings pages (org config, team members via WorkOS, API keys, tax rates)
- Audit log viewer
- Org picker UI (for multi-org users)
- End-to-end testing: complete checkout flow across two separate tenants
- Cross-tenant isolation test suite
- API documentation (GraphQL schema docs + OpenAPI/Swagger for REST)
- Seed data script for development/demo (creates sample tenant with products/orders)

---

## 11. Open Questions

| # | Question | Impact | Decision Needed By |
|---|----------|--------|-------------------|
| 1 | Backend framework: NestJS (built-in GraphQL + guards + DI), Hono + GraphQL Yoga, or something else? | Architecture, DX | Phase 1 start |
| 2 | ORM/query builder: Drizzle, Prisma, or Kysely? | Schema management, type safety | Phase 1 start |
| 3 | Image storage: S3 + CloudFront, Cloudflare R2, or Uploadthing? | Media system | Phase 2 |
| 4 | Stripe Connect (tenants have own Stripe accounts) or single Stripe account with metadata? | Payment flow | Phase 4 |
| 5 | Should guest carts merge on login, or start fresh? | Cart UX | Phase 3 |
| 6 | Single currency per tenant, or multi-currency from MVP? | Pricing complexity | Phase 3 |
| 7 | Search: PostgreSQL full-text, or integrate Meilisearch/Typesense? | Product discovery | Phase 2 |
| 8 | Deploy target: Docker on VPS, Fly.io, Railway? | Infrastructure | Phase 6 |
| 9 | Tenant onboarding: self-service signup or admin-provisioned only for MVP? | Go-to-market | Phase 1 |

---

## Appendix A: Key Database Indexes

```sql
-- Organizations
CREATE UNIQUE INDEX idx_orgs_workos ON organizations(workos_org_id);
CREATE UNIQUE INDEX idx_orgs_slug ON organizations(slug);

-- Products (all queries filtered by org_id first)
CREATE INDEX idx_products_org_status ON products(organization_id, status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_products_org_slug ON products(organization_id, slug);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE UNIQUE INDEX idx_product_variants_org_sku ON product_variants(organization_id, sku);

-- Categories
CREATE INDEX idx_categories_org_parent ON categories(organization_id, parent_id);
CREATE UNIQUE INDEX idx_categories_org_slug ON categories(organization_id, slug);

-- Inventory
CREATE INDEX idx_inventory_org_variant ON inventory_items(organization_id, variant_id);
CREATE INDEX idx_reservations_active ON stock_reservations(organization_id, expires_at)
  WHERE status = 'active';

-- Orders
CREATE INDEX idx_orders_org_customer ON orders(organization_id, customer_id);
CREATE INDEX idx_orders_org_status ON orders(organization_id, status);
CREATE INDEX idx_orders_org_placed ON orders(organization_id, placed_at DESC);
CREATE UNIQUE INDEX idx_orders_org_number ON orders(organization_id, order_number);
CREATE INDEX idx_order_lines_order ON order_line_items(order_id);

-- Payments
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_provider_id ON payments(provider_payment_id);

-- Customers
CREATE UNIQUE INDEX idx_customers_org_email ON customers(organization_id, email);

-- Coupons
CREATE UNIQUE INDEX idx_coupons_org_code ON coupons(organization_id, code);

-- Audit
CREATE INDEX idx_audit_org_entity ON audit_logs(organization_id, entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_org_actor ON audit_logs(organization_id, actor_id, created_at DESC);

-- Carts
CREATE INDEX idx_carts_org_customer ON carts(organization_id, customer_id) WHERE status = 'active';
CREATE INDEX idx_carts_session ON carts(session_token) WHERE status = 'active';

-- API Keys
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
```

## Appendix B: Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/commerce_engine
DATABASE_POOL_SIZE=20

# WorkOS
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...
WORKOS_REDIRECT_URI=http://localhost:3001/api/auth/callback
WORKOS_WEBHOOK_SECRET=...

# Customer Auth (storefront)
CUSTOMER_JWT_SECRET=<random-64-char>
CUSTOMER_JWT_ACCESS_EXPIRY=15m
CUSTOMER_JWT_REFRESH_EXPIRY=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2024-12-18.acacia

# Storage (S3-compatible)
STORAGE_BUCKET=commerce-media
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_PUBLIC_URL=https://cdn.example.com

# App
APP_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_STOREFRONT=100    # per minute per API key
RATE_LIMIT_ADMIN=300          # per minute per user

# Inventory
STOCK_RESERVATION_TTL_MINUTES=15

# Tenant Defaults
DEFAULT_CURRENCY=USD
DEFAULT_TIMEZONE=UTC
```

## Appendix C: PostgreSQL RLS Setup Template

Applied to every tenant-scoped table via migration:

```sql
-- Template: apply to each new tenant-scoped table
-- Replace 'TABLE_NAME' with actual table name

ALTER TABLE TABLE_NAME ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (important for superuser safety)
ALTER TABLE TABLE_NAME FORCE ROW LEVEL SECURITY;

-- Policy: rows visible only when app.current_org_id matches
CREATE POLICY tenant_isolation_TABLE_NAME ON TABLE_NAME
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id')::uuid);

-- At the start of every request's database transaction:
-- SET LOCAL app.current_org_id = '<org-uuid-from-middleware>';
-- SET LOCAL expires at transaction end, so no cross-request leakage
```

## Appendix D: WorkOS SDK Integration Reference

```typescript
// --- Admin Auth Flow (server-side) ---

import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

// 1. Redirect to AuthKit login
app.get('/api/auth/login', (req, res) => {
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: 'authkit',
    redirectUri: process.env.WORKOS_REDIRECT_URI,
    clientId: process.env.WORKOS_CLIENT_ID,
  });
  res.redirect(authorizationUrl);
});

// 2. Handle callback
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;

  const authResponse = await workos.userManagement.authenticateWithCode({
    code,
    clientId: process.env.WORKOS_CLIENT_ID,
  });

  // authResponse contains:
  // - user: { id, email, firstName, lastName }
  // - organizationId: the active org (if user has one)
  // - accessToken: JWT to verify on subsequent requests
  // - refreshToken: for token renewal

  // Set session cookie
  res.cookie('wos-session', authResponse.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });

  // If user has multiple orgs and none selected → redirect to org picker
  // If single org → redirect to dashboard
});

// 3. Verify on every request (middleware)
async function adminAuthMiddleware(req, res, next) {
  const token = req.cookies['wos-session'];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const session = await workos.userManagement.loadSealedSession({
      sessionData: token,
      cookiePassword: process.env.WORKOS_COOKIE_PASSWORD,
    });

    // session.user, session.organizationId, session.role
    req.tenantContext = {
      userId: session.user.id,
      organizationId: session.organizationId,
      role: session.role,  // super_admin | product_manager | support_agent
      email: session.user.email,
    };

    // Set PostgreSQL RLS context for this transaction
    await db.raw(`SET LOCAL app.current_org_id = '${session.organizationId}'`);

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid session' });
  }
}

// 4. Create organization (tenant provisioning)
const org = await workos.organizations.createOrganization({
  name: 'New Store',
});
// → org.id is the workos_org_id to store in our organizations table

// 5. Invite team member
await workos.userManagement.createOrganizationMembership({
  userId: invitedUser.id,
  organizationId: org.id,
  roleSlug: 'product_manager',
});
```
