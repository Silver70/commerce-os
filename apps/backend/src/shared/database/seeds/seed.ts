/**
 * Demo seed script — populates a fresh DB with one org, 2 categories,
 * 10 products (2 variants each), 5 orders in various states, and one API key.
 *
 * Usage:
 *   npx tsx src/shared/database/seeds/seed.ts
 *
 * Requires DATABASE_URL (or DIRECT_DATABASE_URL) in environment / .env
 *
 * NOTE: WorkOS admin user creation requires real credentials and is skipped here.
 * The script prints the raw API key to stdout — copy it before the process exits.
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import {
  organizations,
  apiKeys,
  categories,
  products,
  productVariants,
  inventoryItems,
  orders,
  orderLineItems,
  orderTimeline,
  payments,
  taxRates,
  shippingZones,
  shippingMethods,
} from '../schema';

// ─── HTTPS fetch shim (mirrors migrate.ts) ───────────────────────────────────

function httpsFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === 'string'
      ? new URL(input)
      : input instanceof URL
        ? input
        : new URL(input.url);
  const body = init?.body as string | undefined;

  return new Promise((res, rej) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: (init?.method ?? 'GET').toUpperCase(),
        headers: init?.headers as Record<string, string> | undefined,
        family: 4,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () =>
          res(
            new globalThis.Response(Buffer.concat(chunks), {
              status: response.statusCode,
              headers: response.headers as Record<string, string>,
            }),
          ),
        );
      },
    );
    req.on('error', rej);
    if (body) req.write(body);
    req.end();
  });
}

neonConfig.fetchFunction = httpsFetch;

// ─── Seed data ────────────────────────────────────────────────────────────────

const PRODUCT_NAMES = [
  'Classic T-Shirt',
  'Slim Fit Jeans',
  'Running Shoes',
  'Leather Wallet',
  'Canvas Backpack',
  'Wool Beanie',
  'Sunglasses',
  'Ceramic Mug',
  'Bamboo Cutting Board',
  'Desk Lamp',
];

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), '.env') });

  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql);

  console.log('🌱 Seeding database...');

  // ── Organization ────────────────────────────────────────────────────────────
  const [org] = await db
    .insert(organizations)
    .values({
      workosOrgId: `workos_demo_${crypto.randomBytes(8).toString('hex')}`,
      name: 'Demo Store',
      slug: 'demo-store',
      currency: 'USD',
      timezone: 'America/New_York',
    })
    .returning();

  const orgId = org.id;
  console.log(`✓ Organization created: ${org.name} (${orgId})`);

  // ── API Key ──────────────────────────────────────────────────────────────────
  const rawKey = crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 8);

  await db.insert(apiKeys).values({
    organizationId: orgId,
    name: 'Demo Key',
    keyHash,
    keyPrefix,
  });

  console.log(`\n🔑 API Key (copy this — shown once):`);
  console.log(`   ${rawKey}\n`);

  // ── Tax Rate ─────────────────────────────────────────────────────────────────
  await db.insert(taxRates).values({
    organizationId: orgId,
    name: 'US Standard',
    countryCode: 'US',
    rate: 875,
    isInclusive: false,
    isActive: true,
  });

  // ── Shipping Zone + Method ───────────────────────────────────────────────────
  const [zone] = await db
    .insert(shippingZones)
    .values({
      organizationId: orgId,
      name: 'Domestic',
      countries: ['US', 'CA'],
      isDefault: true,
    })
    .returning();

  const [shippingMethod] = await db
    .insert(shippingMethods)
    .values({
      organizationId: orgId,
      zoneId: zone.id,
      name: 'Standard Shipping',
      rateType: 'flat_rate',
      price: 599,
      estimatedDaysMin: 5,
      estimatedDaysMax: 7,
      isActive: true,
    })
    .returning();

  console.log(`✓ Shipping zone + method created`);

  // ── Categories ───────────────────────────────────────────────────────────────
  const [_catApparel] = await db
    .insert(categories)
    .values({
      organizationId: orgId,
      name: 'Apparel',
      slug: 'apparel',
      description: 'Clothing and accessories',
    })
    .returning();

  const [_catAccessories] = await db
    .insert(categories)
    .values({
      organizationId: orgId,
      name: 'Accessories',
      slug: 'accessories',
      description: 'Bags, wallets, and accessories',
    })
    .returning();

  console.log(`✓ 2 categories created`);

  // ── Products + Variants + Inventory ─────────────────────────────────────────
  const variantIds: string[] = [];

  for (let i = 0; i < PRODUCT_NAMES.length; i++) {
    const name = PRODUCT_NAMES[i];
    const basePrice = 1999 + i * 500;

    const [product] = await db
      .insert(products)
      .values({
        organizationId: orgId,
        name,
        slug: slug(name),
        description: `High-quality ${name.toLowerCase()} for everyday use.`,
        status: 'active',
        vendor: 'Demo Brand',
      })
      .returning();

    const variantData = [
      { name: 'Small', sku: `${slug(name)}-sm`, price: basePrice },
      { name: 'Large', sku: `${slug(name)}-lg`, price: basePrice + 200 },
    ];

    for (const vd of variantData) {
      const [variant] = await db
        .insert(productVariants)
        .values({
          organizationId: orgId,
          productId: product.id,
          sku: vd.sku,
          name: vd.name,
          price: vd.price,
          isActive: true,
        })
        .returning();

      await db.insert(inventoryItems).values({
        organizationId: orgId,
        variantId: variant.id,
        quantity: 50 + i * 5,
        reserved: 0,
        allowBackorder: false,
        lowStockThreshold: 5,
      });

      variantIds.push(variant.id);
    }
  }

  console.log(`✓ 10 products with 2 variants each created (+ inventory)`);

  // ── Orders in Various States ─────────────────────────────────────────────────
  const orderStates: Array<{
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered';
    paymentStatus: 'pending' | 'captured';
    label: string;
  }> = [
    { status: 'pending', paymentStatus: 'pending', label: 'Awaiting payment' },
    {
      status: 'paid',
      paymentStatus: 'captured',
      label: 'Paid — not yet processing',
    },
    {
      status: 'processing',
      paymentStatus: 'captured',
      label: 'In fulfillment',
    },
    { status: 'shipped', paymentStatus: 'captured', label: 'Out for delivery' },
    { status: 'delivered', paymentStatus: 'captured', label: 'Delivered' },
  ];

  for (let i = 0; i < orderStates.length; i++) {
    const { status, paymentStatus, label } = orderStates[i];
    const variantId = variantIds[i * 2] ?? variantIds[0];
    const unitPrice = 2999;
    const quantity = 1;

    const [order] = await db
      .insert(orders)
      .values({
        organizationId: orgId,
        orderNumber: `ORD-000${i + 1}`,
        customerEmail: `customer${i + 1}@example.com`,
        customerName: `Demo Customer ${i + 1}`,
        status,
        fulfillmentStatus:
          status === 'shipped' || status === 'delivered'
            ? 'fulfilled'
            : 'unfulfilled',
        subtotal: unitPrice * quantity,
        discountAmount: 0,
        taxAmount: Math.round(unitPrice * quantity * 0.0875),
        shippingAmount: 599,
        total:
          unitPrice * quantity +
          Math.round(unitPrice * quantity * 0.0875) +
          599,
        currency: 'USD',
        shippingAddress: {
          line1: `${100 + i} Demo Street`,
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        shippingMethodId: shippingMethod.id,
        source: 'storefront',
      })
      .returning();

    await db.insert(orderLineItems).values({
      organizationId: orgId,
      orderId: order.id,
      variantId,
      productName: PRODUCT_NAMES[i],
      variantName: 'Small',
      sku: `${slug(PRODUCT_NAMES[i])}-sm`,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      discountAmount: 0,
      imageUrl: null,
    });

    await db.insert(orderTimeline).values({
      organizationId: orgId,
      orderId: order.id,
      eventType: 'manually_created',
      message: `Order created — ${label}`,
      actorType: 'system',
    });

    await db.insert(payments).values({
      organizationId: orgId,
      orderId: order.id,
      provider: 'manual',
      status: paymentStatus,
      amount: order.total,
      currency: 'USD',
    });
  }

  console.log(`✓ 5 orders seeded (pending → delivered)`);
  console.log('\n✅ Seed complete!');
  console.log(`\nOrganization ID : ${orgId}`);
  console.log(
    `\nUse the API key above in the X-Api-Key header to authenticate storefront requests.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
