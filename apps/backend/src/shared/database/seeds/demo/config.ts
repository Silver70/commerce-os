import { drizzle } from 'drizzle-orm/node-postgres';

/** Drizzle handle used across the demo seed modules. */
export type SeedDb = ReturnType<typeof drizzle>;

/**
 * Volume knobs for the demo seed. Tuned for "populated but fast" — every admin
 * screen has enough rows to exercise pagination, charts and filters while the
 * whole seed still runs in well under a minute.
 */
export const VOLUME = {
  /** Days of history to backdate across. 90 matches the longest dashboard period. */
  days: 90,
  products: 40,
  customers: 200,
  /** Approximate order count across the whole window (actual varies with jitter). */
  targetOrders: 400,
  /** Sessions generated per order — the inverse of the purchase conversion rate. */
  sessionsPerOrder: 30,
} as const;

export const CATEGORIES = [
  { name: 'Laptops', description: 'Portable workstations and ultrabooks' },
  { name: 'Monitors', description: 'Displays and panels' },
  { name: 'Motherboards', description: 'Mainboards and chipsets' },
  { name: 'Graphics Cards', description: 'Discrete GPUs' },
  { name: 'Peripherals', description: 'Keyboards, mice and headsets' },
  { name: 'Networking', description: 'Routers, mesh and adapters' },
  { name: 'Storage', description: 'SSDs, drives and enclosures' },
  { name: 'Accessories', description: 'Cables, docks and stands' },
] as const;

/**
 * Order status mix. Weighted toward completed states so revenue charts have
 * substance, with a realistic tail of in-flight and failed orders. `pending`
 * and `cancelled` are excluded from revenue by the dashboard's status filter,
 * which is exactly what makes them useful test data.
 */
export const ORDER_STATUS_MIX = [
  { status: 'delivered', fulfillment: 'fulfilled', payment: 'captured', w: 46 },
  { status: 'shipped', fulfillment: 'fulfilled', payment: 'captured', w: 16 },
  {
    status: 'processing',
    fulfillment: 'unfulfilled',
    payment: 'captured',
    w: 12,
  },
  { status: 'paid', fulfillment: 'unfulfilled', payment: 'captured', w: 10 },
  { status: 'pending', fulfillment: 'unfulfilled', payment: 'pending', w: 8 },
  { status: 'refunded', fulfillment: 'fulfilled', payment: 'refunded', w: 5 },
  {
    status: 'cancelled',
    fulfillment: 'unfulfilled',
    payment: 'cancelled',
    w: 3,
  },
] as const;

/**
 * Traffic sources chosen to land in every branch of the channel CASE in
 * AnalyticsService.trafficSources — Paid, AI Assistant, Campaign, Direct,
 * Organic Search, Social and Referral all get populated.
 */
export const TRAFFIC_SOURCES = [
  { referrer: '', utmSource: null, utmMedium: null, w: 26 }, // Direct
  {
    referrer: 'https://www.google.com/',
    utmSource: null,
    utmMedium: null,
    w: 24,
  }, // Organic Search
  { referrer: 'https://www.bing.com/', utmSource: null, utmMedium: null, w: 5 }, // Organic Search
  {
    referrer: 'https://www.google.com/',
    utmSource: 'google',
    utmMedium: 'cpc',
    w: 11,
  }, // Paid
  {
    referrer: 'https://www.facebook.com/',
    utmSource: 'facebook',
    utmMedium: 'paid_social',
    w: 6,
  }, // Paid
  {
    referrer: 'https://www.facebook.com/',
    utmSource: null,
    utmMedium: null,
    w: 6,
  }, // Social
  {
    referrer: 'https://www.reddit.com/',
    utmSource: null,
    utmMedium: null,
    w: 4,
  }, // Social
  { referrer: 'https://chatgpt.com/', utmSource: null, utmMedium: null, w: 5 }, // AI Assistant
  {
    referrer: 'https://www.perplexity.ai/',
    utmSource: null,
    utmMedium: null,
    w: 3,
  }, // AI Assistant
  {
    referrer: '',
    utmSource: 'newsletter',
    utmMedium: 'email',
    w: 6,
  }, // Campaign
  {
    referrer: 'https://news.ycombinator.com/',
    utmSource: null,
    utmMedium: null,
    w: 4,
  }, // Referral
] as const;

export const DEVICES = [
  { deviceType: 'desktop', browser: 'Chrome', os: 'Windows', w: 34 },
  { deviceType: 'desktop', browser: 'Chrome', os: 'macOS', w: 10 },
  { deviceType: 'desktop', browser: 'Firefox', os: 'Windows', w: 6 },
  { deviceType: 'mobile', browser: 'Safari', os: 'iOS', w: 22 },
  { deviceType: 'mobile', browser: 'Chrome', os: 'Android', w: 18 },
  { deviceType: 'tablet', browser: 'Safari', os: 'iPadOS', w: 6 },
  // Bot traffic exists in real logs and every human-facing query filters it out
  // via NOT_BOT — seeding some proves that filter actually works.
  { deviceType: 'bot', browser: 'Googlebot', os: 'Linux', w: 4 },
] as const;

export const GEOS = [
  { countryCode: 'US', region: 'California', w: 24 },
  { countryCode: 'US', region: 'New York', w: 14 },
  { countryCode: 'GB', region: 'England', w: 11 },
  { countryCode: 'DE', region: 'Bavaria', w: 9 },
  { countryCode: 'PK', region: 'Sindh', w: 9 },
  { countryCode: 'IN', region: 'Maharashtra', w: 8 },
  { countryCode: 'CA', region: 'Ontario', w: 7 },
  { countryCode: 'AU', region: 'New South Wales', w: 6 },
  { countryCode: 'JP', region: 'Tokyo', w: 6 },
  { countryCode: 'BR', region: 'Sao Paulo', w: 6 },
] as const;

export const LANDING_PATHS = [
  '/',
  '/products',
  '/products/laptops',
  '/products/monitors',
  '/collections/new',
  '/sale',
  '/about',
] as const;

/** Pick one entry from a `{ w: number }`-weighted list. */
export function weighted<T extends { w: number }>(items: readonly T[]): T {
  const total = items.reduce((sum, i) => sum + i.w, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.w;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Relative order volume for a given day index (0 = oldest). Combines a mild
 * upward trend with a weekend dip and random jitter so sparklines and
 * period-over-period deltas show believable movement instead of a flat line.
 */
export function dayVolumeFactor(dayIndex: number, totalDays: number): number {
  const trend = 0.65 + (dayIndex / totalDays) * 0.7; // ~0.65x -> ~1.35x
  const dow = new Date(Date.UTC(2024, 0, 7 + dayIndex)).getUTCDay();
  const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
  const jitter = 0.7 + Math.random() * 0.6;
  return trend * weekend * jitter;
}
