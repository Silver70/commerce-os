import type { AdminRole } from "~/types/api";

export const CURRENCIES: { value: string; label: string }[] = [
  { value: "USD", label: "USD – US Dollar" },
  { value: "EUR", label: "EUR – Euro" },
  { value: "GBP", label: "GBP – British Pound" },
  { value: "AUD", label: "AUD – Australian Dollar" },
  { value: "SGD", label: "SGD – Singapore Dollar" },
  { value: "AED", label: "AED – UAE Dirham" },
  { value: "JPY", label: "JPY – Japanese Yen" },
  { value: "INR", label: "INR – Indian Rupee" },
  { value: "MVR", label: "MVR – Maldivian Rufiyaa" },
];

export const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Los_Angeles", label: "UTC-8 – US Pacific" },
  { value: "America/New_York", label: "UTC-5 – US Eastern" },
  { value: "UTC", label: "UTC+0 – UTC / London" },
  { value: "Europe/Berlin", label: "UTC+1 – Central European" },
  { value: "Africa/Nairobi", label: "UTC+3 – East Africa / Arabian" },
  { value: "Indian/Maldives", label: "UTC+5 – Maldives" },
  { value: "Asia/Kolkata", label: "UTC+5:30 – India" },
  { value: "Asia/Singapore", label: "UTC+8 – Singapore / Malaysia / China" },
  { value: "Asia/Tokyo", label: "UTC+9 – Japan / Korea" },
  { value: "Australia/Sydney", label: "UTC+10 – Eastern Australia" },
  { value: "Pacific/Auckland", label: "UTC+12 – New Zealand" },
];

export const TAX_COUNTRIES = [
  { code: "MV", name: "Maldives" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "SG", name: "Singapore" },
  { code: "IN", name: "India" },
];

export const US_STATES = [
  "CA",
  "NY",
  "TX",
  "FL",
  "WA",
  "IL",
  "PA",
  "OH",
  "GA",
  "NC",
];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  product_manager: "Product Manager",
  support_agent: "Support Agent",
};
