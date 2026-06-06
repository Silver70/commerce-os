// Placeholder catalog data for the manual create-order UI. Swap these out for
// real product / customer / discount / shipping APIs when the backend create-
// order endpoint is wired up.

import type { CatalogCustomer, CatalogProduct, DiscountCode } from "./types";

export const PRODUCT_CATALOG: CatalogProduct[] = [
  {
    id: "p1",
    product: "Wave Board Pro",
    variant: "S / Red",
    sku: "WAVE-S-RED",
    price: 149.99,
    stock: 12,
    gradient: "from-blue-400 via-blue-500 to-indigo-700",
  },
  {
    id: "p2",
    product: "Wave Board Pro",
    variant: "M / Blue",
    sku: "WAVE-M-BLUE",
    price: 149.99,
    stock: 20,
    gradient: "from-blue-400 via-blue-500 to-indigo-700",
  },
  {
    id: "p3",
    product: "Wave Board Pro",
    variant: "L / Red",
    sku: "WAVE-L-RED",
    price: 159.99,
    stock: 6,
    gradient: "from-blue-400 via-blue-500 to-indigo-700",
  },
  {
    id: "p4",
    product: "Blue Rashguard",
    variant: "S / Blue",
    sku: "RASH-S-BLUE",
    price: 49.99,
    stock: 14,
    gradient: "from-cyan-400 via-teal-500 to-cyan-700",
  },
  {
    id: "p5",
    product: "Blue Rashguard",
    variant: "M / Blue",
    sku: "RASH-M-BLUE",
    price: 49.99,
    stock: 3,
    gradient: "from-cyan-400 via-teal-500 to-cyan-700",
  },
  {
    id: "p6",
    product: "Merino Wool Crewneck",
    variant: "M / Slate",
    sku: "APP-0231-M",
    price: 89.0,
    stock: 87,
    gradient: "from-violet-400 via-violet-500 to-violet-700",
  },
  {
    id: "p7",
    product: "Merino Wool Crewneck",
    variant: "L / Slate",
    sku: "APP-0231-L",
    price: 89.0,
    stock: 62,
    gradient: "from-violet-400 via-violet-500 to-violet-700",
  },
  {
    id: "p8",
    product: "Canvas Tote Bag",
    variant: "Natural",
    sku: "ACC-0045-N",
    price: 24.0,
    stock: 385,
    gradient: "from-rose-400 via-rose-500 to-rose-700",
  },
  {
    id: "p9",
    product: "USB-C Hub 7-in-1",
    variant: "",
    sku: "ELC-0312",
    price: 59.99,
    stock: 180,
    gradient: "from-slate-500 via-slate-600 to-slate-800",
  },
  {
    id: "p10",
    product: "Minimalist Desk Lamp",
    variant: "Black",
    sku: "HOM-0076-BK",
    price: 79.0,
    stock: 29,
    gradient: "from-amber-400 via-amber-500 to-orange-600",
  },
  {
    id: "p11",
    product: "Classic White Sneakers",
    variant: "EU 42",
    sku: "FTW-0203-42",
    price: 89.0,
    stock: 18,
    gradient: "from-gray-200 via-gray-300 to-gray-400",
  },
  {
    id: "p12",
    product: "Organic Face Serum",
    variant: "30 ml",
    sku: "BTY-0033-30",
    price: 54.0,
    stock: 98,
    gradient: "from-pink-400 via-pink-500 to-rose-600",
  },
];

export const CUSTOMER_CATALOG: CatalogCustomer[] = [
  {
    id: "c1",
    name: "John Smith",
    email: "john@email.com",
    phone: "+960 773-1234",
    address: {
      line1: "123 Beach Road",
      city: "Malé",
      region: "Kaafu Atoll",
      zip: "20001",
      country: "Maldives",
    },
  },
  {
    id: "c2",
    name: "Sara Johnson",
    email: "sara@email.com",
    phone: "+1 555-0100",
    address: {
      line1: "45 Ocean Drive",
      city: "Miami",
      region: "FL",
      zip: "33101",
      country: "United States",
    },
  },
  {
    id: "c3",
    name: "Ali Hassan",
    email: "ali@surf.com",
    phone: "+960 773-9876",
    address: {
      line1: "8 Coral Street",
      city: "Malé",
      region: "Kaafu Atoll",
      zip: "20002",
      country: "Maldives",
    },
  },
  {
    id: "c4",
    name: "Nina Park",
    email: "nina@waves.com",
    phone: "+82 10-1234",
    address: {
      line1: "12 Hangang Rd",
      city: "Seoul",
      region: "Seoul",
      zip: "04524",
      country: "South Korea",
    },
  },
  {
    id: "c5",
    name: "Mike Torres",
    email: "mike@example.com",
    phone: "+1 555-0199",
    address: {
      line1: "78 Sunset Blvd",
      city: "LA",
      region: "CA",
      zip: "90028",
      country: "United States",
    },
  },
];

export const DISCOUNT_CODES: Record<string, DiscountCode> = {
  SUMMER20: { type: "percent", value: 20, label: "Summer Sale — 20% off" },
  WAVE10: { type: "fixed", value: 10, label: "WAVE10 — $10 off" },
  VIP2026: { type: "percent", value: 15, label: "VIP Member — 15% off" },
};

export const SHIPPING_METHODS = [
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
