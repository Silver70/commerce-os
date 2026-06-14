// UI-only constants for the manual create-order flow. Products, customers, and
// shipping methods are now sourced from the real admin APIs; only discount codes
// remain hardcoded (the backend create-order endpoint takes the resolved
// shipping/discount amounts rather than a method/coupon catalog).

import type { DiscountCode } from "./types";

export const DISCOUNT_CODES: Record<string, DiscountCode> = {
  SUMMER20: { type: "percent", value: 20, label: "Summer Sale — 20% off" },
  WAVE10: { type: "fixed", value: 10, label: "WAVE10 — $10 off" },
  VIP2026: { type: "percent", value: 15, label: "VIP Member — 15% off" },
};
