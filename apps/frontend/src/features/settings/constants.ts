import type { AdminRole } from "~/types/api";

// Currency & timezone lists moved to ~/lib/currencies and ~/lib/timezones
// (full ISO-4217 / IANA sets), consumed via the shared CurrencyCombobox /
// TimezoneCombobox.

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
