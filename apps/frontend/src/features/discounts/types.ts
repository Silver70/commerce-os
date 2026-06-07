// UI-only types for the discount create/edit flow.

export type AppliesTo = "order" | "category" | "product";

/** A draft coupon code held in form state before the discount is created. */
export type CouponCode = {
  code: string;
  maxUses: number | null;
  perCustomer: number;
  used: number;
};
