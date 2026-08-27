import { faker } from '@faker-js/faker';
import { analyticsEvents } from '../../schema';
import type { NewAnalyticsEvent } from '../../schema/analytics-events.schema';
import {
  DEVICES,
  GEOS,
  LANDING_PATHS,
  TRAFFIC_SOURCES,
  VOLUME,
  weighted,
  type SeedDb,
} from './config';
import type { SeededVariant } from './catalog';

/** Rows per INSERT. Keeps parameter counts well inside Postgres' 65535 limit. */
const BATCH = 500;

/**
 * Funnel depth for a session that does NOT convert. 0 = bounced on the landing
 * page; 3 = reached checkout but abandoned. Converting sessions are handled
 * separately so the seeded purchase count matches the seeded order count.
 */
const ABANDON_DEPTH = [
  { value: 0, weight: 44 },
  { value: 1, weight: 31 },
  { value: 2, weight: 16 },
  { value: 3, weight: 9 },
];

/**
 * Storefront behavioural events — the only thing AnalyticsService reads. Without
 * these the analytics screens stay empty no matter how many orders exist,
 * because orders never emit analytics rows (order.created goes to the in-process
 * event bus, not this table).
 *
 * Sessions are generated per day at a fixed multiple of that day's order count,
 * and exactly `ordersPerDay[d]` of them run the full funnel through `purchase`,
 * so the funnel's conversion rate lines up with real revenue.
 */
export async function seedAnalyticsEvents(
  db: SeedDb,
  orgId: string,
  storeId: string,
  variants: SeededVariant[],
  dayStarts: Date[],
  ordersPerDay: number[],
): Promise<number> {
  const now = Date.now();
  let buffer: NewAnalyticsEvent[] = [];
  let written = 0;

  const flush = async (force = false): Promise<void> => {
    if (buffer.length >= BATCH || (force && buffer.length > 0)) {
      await db.insert(analyticsEvents).values(buffer);
      written += buffer.length;
      buffer = [];
    }
  };

  // A visitor pool smaller than the session count produces returning visitors,
  // which is what the returning-vs-new metric measures.
  const visitorPool = Array.from(
    {
      length: Math.max(
        1,
        Math.round(VOLUME.targetOrders * VOLUME.sessionsPerOrder * 0.7),
      ),
    },
    () => faker.string.uuid(),
  );

  for (let d = 0; d < dayStarts.length; d++) {
    const conversions = ordersPerDay[d];
    const sessions = conversions * VOLUME.sessionsPerOrder;

    for (let s = 0; s < sessions; s++) {
      const source = weighted(TRAFFIC_SOURCES);
      const device = weighted(DEVICES);
      const geo = weighted(GEOS);
      const sessionId = faker.string.uuid();
      const visitorId = faker.helpers.arrayElement(visitorPool);

      const started = new Date(
        dayStarts[d].getTime() +
          faker.number.int({ min: 0, max: 23 }) * 3_600_000 +
          faker.number.int({ min: 0, max: 59 }) * 60_000,
      );
      if (started.getTime() > now) continue;

      // The first `conversions` sessions of the day complete a purchase.
      const depth =
        s < conversions ? 4 : faker.helpers.weightedArrayElement(ABANDON_DEPTH);

      const variant = faker.helpers.arrayElement(variants);
      const base = {
        organizationId: orgId,
        storeId,
        sessionId,
        visitorId,
        referrer: source.referrer || null,
        utmSource: source.utmSource,
        utmMedium: source.utmMedium,
        utmCampaign: source.utmMedium === 'email' ? 'august-newsletter' : null,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        countryCode: geo.countryCode,
        region: geo.region,
      };

      // Each funnel stage lands a few minutes after the previous one.
      const at = (step: number): Date =>
        new Date(
          started.getTime() +
            step * faker.number.int({ min: 40_000, max: 220_000 }),
        );

      const stages: Array<{ eventType: string; path: string }> = [
        {
          eventType: 'page_view',
          path: faker.helpers.arrayElement(LANDING_PATHS),
        },
        { eventType: 'product_view', path: `/products/${variant.productId}` },
        { eventType: 'add_to_cart', path: `/products/${variant.productId}` },
        { eventType: 'checkout_start', path: '/checkout' },
        { eventType: 'purchase', path: '/checkout/confirmation' },
      ];

      for (let step = 0; step <= depth; step++) {
        const occurredAt = at(step);
        if (occurredAt.getTime() > now) break;
        buffer.push({
          ...base,
          eventType: stages[step].eventType,
          path: stages[step].path,
          productId: step >= 1 && step <= 2 ? variant.productId : null,
          variantId: step >= 1 && step <= 2 ? variant.id : null,
          occurredAt,
          createdAt: occurredAt,
        });
        await flush();
      }

      // A slice of engaged sessions also fires a click or form submit, which is
      // what the behavioural (Phase 3) views read.
      if (depth >= 1 && Math.random() < 0.22) {
        const isForm = Math.random() < 0.35;
        const occurredAt = at(depth + 1);
        if (occurredAt.getTime() <= now) {
          buffer.push({
            ...base,
            eventType: isForm ? 'form_submit' : 'click',
            eventName: isForm ? 'newsletter_signup' : 'Add to cart button',
            path: stages[Math.min(depth, 2)].path,
            occurredAt,
            createdAt: occurredAt,
            properties: isForm
              ? { formId: 'newsletter', fields: ['email'] }
              : { tag: 'button', text: 'Add to cart' },
          });
          await flush();
        }
      }
    }
  }

  await flush(true);
  console.log(`  ✓ ${written} analytics events`);
  return written;
}
