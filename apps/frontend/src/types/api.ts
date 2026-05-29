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

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
};

export type ApiKeyWithSecret = ApiKey & {
  key: string;
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
  position: number;
};

export type Product = {
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
  sku: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};

export type OrderTimelineEvent = {
  id: string;
  type: string;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
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
  lineItems: OrderLineItem[];
  timeline: OrderTimelineEvent[];
  createdAt: string;
};

// ─── Customers ────────────────────────────────────────────────────────────────

export type CustomerStatus = "active" | "suspended" | "banned";

export type CustomerAddress = {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string | null;
  country: string;
  zip: string;
  isDefault: boolean;
};

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: CustomerStatus;
  ordersCount: number;
  totalSpent: number;
  addresses: CustomerAddress[];
  createdAt: string;
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export type StockStatus = "ok" | "low" | "out";

export type InventoryItem = {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  available: number;
  reserved: number;
  onHand: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
};

// ─── Discounts & Coupons ──────────────────────────────────────────────────────

export type DiscountType = "percentage" | "fixed_amount";
export type DiscountStatus = "active" | "scheduled" | "expired";
export type DiscountScope = "order" | "category" | "product";

export type CouponCode = {
  code: string;
  maxUses: number | null;
  perCustomer: number;
  used: number;
};

export type Discount = {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  scopeLabel: string;
  coupons: CouponCode[];
  usedCount: number;
  usageLimit: number | null;
  status: DiscountStatus;
  startDate: string;
  endDate: string | null;
};

export type Coupon = {
  id: string;
  code: string;
  discountId: string;
  maxUses: number | null;
  perCustomer: number;
  used: number;
};

// ─── Shipping ─────────────────────────────────────────────────────────────────

export type RateType = "flat_rate" | "free" | "calculated";

export type ShippingMethod = {
  id: string;
  zoneId: string;
  name: string;
  description: string | null;
  rateType: RateType;
  price: number;
  minOrderAmount: number | null;
  minDays: number | null;
  maxDays: number | null;
  isActive: boolean;
};

export type ShippingZone = {
  id: string;
  name: string;
  countries: string[];
  isDefault: boolean;
  methods: ShippingMethod[];
};

// ─── Tax Rates ────────────────────────────────────────────────────────────────

export type TaxRate = {
  id: string;
  name: string;
  rate: number;
  country: string;
  state: string | null;
  isInclusive: boolean;
  isActive: boolean;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type Period = "today" | "7d" | "30d" | "90d";

export type DashboardKpi = {
  revenue: number;
  orders: number;
  customers: number;
  avgOrderValue: number;
  revenueDelta: number;
  ordersDelta: number;
  customersDelta: number;
  avgOrderValueDelta: number;
};

export type RevenueTrendPoint = {
  date: string;
  revenue: number;
};

export type DashboardStats = {
  kpi: DashboardKpi;
  revenueTrend: RevenueTrendPoint[];
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
