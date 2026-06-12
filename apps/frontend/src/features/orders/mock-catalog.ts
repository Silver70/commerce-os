// UI-only constants for the manual create-order flow. Products and customers
// are now sourced from the real admin APIs; only shipping methods and discount
// codes remain hardcoded (the backend create-order endpoint takes the resolved
// shipping/discount amounts rather than a method/coupon catalog).

import type { DiscountCode } from "./types";

export const DISCOUNT_CODES: Record<string, DiscountCode> = {
  SUMMER20: { type: "percent", value: 20, label: "Summer Sale — 20% off" },
  WAVE10: { type: "fixed", value: 10, label: "WAVE10 — $10 off" },
  VIP2026: { type: "percent", value: 15, label: "VIP Member — 15% off" },
};

export type ShippingMethod = {
  id: string;
  label: string;
  sub: string;
  price: number; // whole-dollar amount
};

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "standard",
    label: "Standard Shipping",
    sub: "5–7 business days",
    price: 10.0,
  },
  {
    id: "express",
    label: "Express Shipping",
    sub: "1–2 business days",
    price: 25.0,
  },
  { id: "free", label: "Free Shipping", sub: "7–14 business days", price: 0.0 },
];
