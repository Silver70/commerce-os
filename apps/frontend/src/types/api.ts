// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AdminRole = "super_admin" | "product_manager" | "support_agent";

export type WorkOsMembership = {
  organizationId: string;
  role: AdminRole;
};

export type AdminUser = {
  userId: string;
  email: string;
  organizationId: string;
  role: AdminRole;
  memberships: WorkOsMembership[];
};

// Returned by listByStore / listByOrg — rawKey is omitted (hash only stored)
export type ApiKey = {
  id: string;
  storeId: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdBy: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

// Returned only on key generation (rawKey shown once and never persisted)
export type ApiKeyWithSecret = ApiKey & {
  rawKey: string;
};

// ─── Organizations ────────────────────────────────────────────────────────────

// currency/timezone here are only defaults for new stores; authoritative values live on Store
export type Organization = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  logoUrl: string | null;
};

// ─── Stores ───────────────────────────────────────────────────────────────────

// The active store scopes all catalog / orders / inventory / pricing / shipping data.
// currency and timezone are authoritative here, not on Organization.
export type Store = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  isActive: boolean;
};

// ─── Products ─────────────────────────────────────────────────────────────────

export type ProductStatus = "draft" | "active" | "archived";

export type OptionValue = {
  id: string;
  value: string;
  position: number;
};

export type ProductOption = {
  id: string;
  name: string;
  position: number;
  values: OptionValue[];
};

export type ProductVariant = {
  id: string;
  sku: string;
  name: string | null;
  price: number;
  compareAtPrice: number | null;
  isActive: boolean;
  position: number;
  optionValues: OptionValue[];
};

export type ProductMedia = {
  id: string;
  url: string;
  altText: string | null;
  mediaType: string;
  position: number;
  isPrimary: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  vendor: string | null;
  tags: string[] | null;
  variants: ProductVariant[];
  options: ProductOption[];
  media: ProductMedia[];
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: Category[];
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "refunded"
  | "cancelled";

export type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled";

export type OrderLineItem = {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  unitPrice: number;
  totalPrice: number;
  discountAmount: number;
  quantity: number;
  imageUrl: string | null;
};

export type OrderTimelineEvent = {
  id: string;
  eventType: string;
  message: string;
  actorType: string | null;
  actorId: string | null;
  createdAt: string;
};

export type Order = {
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
  couponCode: string | null;
  // only present on detail endpoint responses
  lineItems?: OrderLineItem[];
  timeline?: OrderTimelineEvent[];
  createdAt: string;
};

// ─── Customers ────────────────────────────────────────────────────────────────

// Backend enum: only "active" | "disabled"
export type CustomerStatus = "active" | "disabled";

// Matches the backend Address schema exactly
export type CustomerAddress = {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  company: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  countryCode: string;
  phone: string | null;
  isDefault: boolean;
};

// SafeCustomer — raw DB row minus passwordHash. No computed ordersCount / totalSpent.
export type Customer = {
  id: string;
  organizationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: CustomerStatus;
  emailVerified: boolean;
  marketingOptIn: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined / computed — not returned by the admin list or detail endpoint.
  // Available only when fetched separately or enriched server-side.
  ordersCount?: number;
  totalSpent?: number;
  addresses?: CustomerAddress[];
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export type StockStatus = "ok" | "low" | "out";

// Matches the inventory_items DB schema exactly. No joined sku / product name.
export type InventoryItem = {
  id: string;
  organizationId: string;
  storeId: string;
  variantId: string;
  quantity: number;
  reserved: number;
  allowBackorder: boolean;
  lowStockThreshold: number;
  updatedAt: string;
};

// ─── Discounts & Coupons ──────────────────────────────────────────────────────

export type DiscountType = "percentage" | "fixed_amount";
// Computed client-side from isActive + startsAt + endsAt — not a backend field
export type DiscountStatus = "active" | "scheduled" | "expired";
export type DiscountScope = "order" | "category" | "product";

// Raw Discount row from backend (no coupons array, no computed status/usage)
export type Discount = {
  id: string;
  organizationId: string;
  storeId: string;
  name: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  scopeId: string | null;
  minOrderAmount: number | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CouponType = "percentage" | "fixed_amount" | "free_shipping";

// Raw Coupon row from backend
export type Coupon = {
  id: string;
  organizationId: string;
  storeId: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number | null;
  maxUsageCount: number | null;
  usageCount: number;
  maxUsagePerCustomer: number | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Shipping ─────────────────────────────────────────────────────────────────

export type RateType = "flat_rate" | "free" | "calculated";

// Raw ShippingMethod row — no description field; days use estimatedDays* naming
export type ShippingMethod = {
  id: string;
  organizationId: string;
  storeId: string;
  zoneId: string;
  name: string;
  rateType: RateType;
  price: number;
  minOrderAmount: number | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Raw ShippingZone row — methods are fetched separately via GET /shipping/methods?zoneId=
export type ShippingZone = {
  id: string;
  organizationId: string;
  storeId: string;
  name: string;
  countries: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─── Tax Rates ────────────────────────────────────────────────────────────────

// Field names match the tax_rates DB schema (countryCode / stateCode)
export type TaxRate = {
  id: string;
  organizationId: string;
  storeId: string;
  name: string;
  countryCode: string;
  stateCode: string | null;
  rate: number;
  isInclusive: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type Period = "today" | "7d" | "30d" | "90d";

export type MetricWithSparkline = {
  current: number;
  prior: number;
  delta: number;
  sparkline: number[];
};

export type DashboardStats = {
  period: Period;
  revenue: MetricWithSparkline;
  orders: MetricWithSparkline;
  aov: MetricWithSparkline;
  conversion: MetricWithSparkline;
  returning: MetricWithSparkline;
  pendingOrders: number;
  processingOrders: number;
  lowStockItems: number;
};

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditEntry = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  actorEmail: string;
  ipAddress: string | null;
  createdAt: string;
};

// ─── Team ─────────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AdminRole;
};

export type Invitation = {
  id: string;
  email: string;
  role: AdminRole;
  sentDate: string;
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
};

// Orders list uses a different envelope key — matches backend ListOrdersResult
export type OrdersResponse = {
  orders: Order[];
  nextCursor: string | null;
};
