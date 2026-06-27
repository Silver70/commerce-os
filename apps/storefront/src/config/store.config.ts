/**
 * ◄ TEMPLATE KNOB — edit this file to rebrand the storefront.
 *
 * Brand-level configuration: store identity, currency/locale, navigation, and
 * feature toggles. Nothing brand-specific should be hardcoded in components —
 * it belongs here (or in the CSS theme tokens / `home-sections.ts`).
 */

export interface NavLink {
  label: string;
  /** Absolute path within the storefront (e.g. "/products"). */
  to: string;
}

export interface StoreConfig {
  /** Display name — used in the header, footer, and document titles. */
  name: string;
  /** One-line description for SEO meta + the footer tagline. */
  description: string;
  /** ISO 4217 currency code. Money is formatted with this by default. */
  currency: string;
  /** BCP 47 locale used for Intl money/number formatting. */
  locale: string;
  /** Primary navigation links rendered in the header. */
  nav: NavLink[];
  /** Footer / social links (optional). */
  social: NavLink[];
  /** Optional feature toggles. */
  features: {
    /** Storefront customer accounts (login / register / order history). */
    accounts: boolean;
  };
}

export const storeConfig: StoreConfig = {
  name: "Acme",
  description: "Thoughtfully made goods for everyday life.",
  currency: "USD",
  locale: "en-US",
  nav: [{ label: "Shop All", to: "/products" }],
  social: [],
  features: {
    accounts: false,
  },
};
