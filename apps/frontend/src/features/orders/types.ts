// UI-only types for the manual create-order flow (draft state held in the form
// before submission). Server-shaped types live in ~/types/api.

export type CatalogProduct = {
  id: string;
  product: string;
  variant: string;
  sku: string;
  price: number;
  stock: number;
  gradient: string;
};

export type CatalogCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    city: string;
    region: string;
    zip: string;
    country: string;
  };
};

export type LineItem = {
  id: string;
  catalogId: string;
  product: string;
  variant: string;
  sku: string;
  gradient: string;
  qty: number;
  unitPrice: number;
};

export type DiscountCode = {
  type: "percent" | "fixed";
  value: number;
  label: string;
};
