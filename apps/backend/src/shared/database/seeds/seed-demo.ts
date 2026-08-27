/**
 * Demo seed — populates a store with ~90 days of backdated catalog, customer,
 * order and storefront-analytics data so every admin screen has realistic
 * content to render.
 *
 * Usage:
 *   npm run db:seed-demo
 *
 * Env:
 *   DATABASE_URL / DIRECT_DATABASE_URL  (required)
 *   SEED_STORE_ID                       (optional) target store; defaults to the first store
 *
 * Re-running is safe: catalog, orders, customers and analytics for the target
 * store are wiped first. Admin users, the organization, the store itself, API
 * keys, price lists and shipping config are left untouched.
 */

// MUST run before any Date is constructed. The pg driver serialises JS Dates
// using the *process* timezone, and every timestamp column here is `timestamp
// without time zone` — so a non-UTC process silently shifts every backdated row
// and the dashboard's UTC bounds then hide them. See database.module.ts.
process.env.TZ = 'UTC';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { eq } from 'drizzle-orm';
import {
  stores,
  orders,
  products,
  categories,
  customers,
  analyticsEvents,
  analyticsDailyMetrics,
  shippingMethods,
} from '../schema';
import { VOLUME } from './demo/config';
import { seedCatalog } from './demo/catalog';
import { seedCustomers } from './demo/customers';
import { seedOrders } from './demo/orders';
import { seedAnalyticsEvents } from './demo/analytics';

const DAY_MS = 86_400_000;

function buildDayStarts(days: number): Date[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Array.from(
    { length: days },
    (_, i) => new Date(today.getTime() - (days - 1 - i) * DAY_MS),
  );
}

async function main(): Promise<void> {
  dotenv.config({ path: resolve(process.cwd(), '.env') });

  if (new Date().getTimezoneOffset() !== 0) {
    console.error(
      'Process timezone is not UTC. Re-run as: TZ=UTC npm run db:seed-demo',
    );
    process.exit(1);
  }

  const dbUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    options: '-c timezone=UTC',
  });
  const db = drizzle(pool);

  const storeId = process.env.SEED_STORE_ID;
  const [store] = storeId
    ? await db.select().from(stores).where(eq(stores.id, storeId))
    : await db.select().from(stores).limit(1);

  if (!store) {
    console.error(
      storeId
        ? `Store not found: ${storeId}`
        : 'No stores exist yet — create one via POST /api/admin/stores first',
    );
    await pool.end();
    process.exit(1);
  }

  const orgId = store.organizationId;
  console.log(`\n🌱 Seeding demo data into "${store.name}" (${store.id})\n`);

  // ── Wipe previous demo data for this store ─────────────────────────────────
  // FK cascades handle line items, payments, timeline, variants, inventory and
  // category links. Org/store/admin/auth and store config are deliberately kept.
  await db.delete(analyticsEvents).where(eq(analyticsEvents.storeId, store.id));
  await db
    .delete(analyticsDailyMetrics)
    .where(eq(analyticsDailyMetrics.storeId, store.id));
  await db.delete(orders).where(eq(orders.storeId, store.id));
  await db.delete(products).where(eq(products.storeId, store.id));
  await db.delete(categories).where(eq(categories.storeId, store.id));
  await db.delete(customers).where(eq(customers.organizationId, orgId));
  console.log('  ✓ cleared previous demo data');

  const [method] = await db
    .select()
    .from(shippingMethods)
    .where(eq(shippingMethods.storeId, store.id))
    .limit(1);

  const dayStarts = buildDayStarts(VOLUME.days);
  const windowMs = VOLUME.days * DAY_MS;

  const { variants } = await seedCatalog(db, orgId, store.id);

  // Customers are registered across the window rather than all at once, so the
  // new-customers metric has a curve instead of a single spike.
  const customerRows = await seedCustomers(db, orgId, (i) => {
    const frac = (i + 1) / VOLUME.customers;
    return new Date(dayStarts[0].getTime() + frac * windowMs * 0.95);
  });

  const { ordersPerDay, total } = await seedOrders(
    db,
    orgId,
    store.id,
    variants,
    customerRows,
    method?.id ?? null,
    dayStarts,
  );

  const events = await seedAnalyticsEvents(
    db,
    orgId,
    store.id,
    variants,
    dayStarts,
    ordersPerDay,
  );

  console.log('\n✅ Demo seed complete\n');
  console.log(`  Organization : ${orgId}`);
  console.log(`  Store        : ${store.name} (${store.id})`);
  console.log(`  Window       : ${VOLUME.days} days`);
  console.log(`  Orders       : ${total}`);
  console.log(`  Events       : ${events}`);
  console.log(
    '\n  Daily rollups build on the 01:15 cron; the analytics screens read raw events directly.\n',
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
