/**
 * Demo seed script — populates an existing store with 5 customers, 2 categories,
 * 10 products (2 variants each, linked to categories), a shipping zone + method,
 * a tax rate, and 5 orders (one per customer, covering all status states).
 *
 * Usage:
 *   npx tsx src/shared/database/seeds/seed.ts
 *
 * Requires DATABASE_URL (or DIRECT_DATABASE_URL) in environment / .env
 * Optionally set SEED_STORE_ID to target a specific store (falls back to the
 * hardcoded dev store ID below).
 *
 * Re-running is safe — existing seed data for the target store is wiped first.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import {
  stores,
  customers,
  categories,
  products,
  productCategories,
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

// ─── Seed data ────────────────────────────────────────────────────────────────

const DEV_STORE_ID = '42feaeb2-ca56-41dd-bd68-adcb4fa1f8fb';

const APPAREL_PRODUCTS = [
  'Classic T-Shirt',
  'Slim Fit Jeans',
  'Running Shoes',
  'Wool Beanie',
  'Canvas Backpack',
];

const ACCESSORIES_PRODUCTS = [
  'Leather Wallet',
  'Sunglasses',
  'Ceramic Mug',
  'Bamboo Cutting Board',
  'Desk Lamp',
];

const ALL_PRODUCTS = [...APPAREL_PRODUCTS, ...ACCESSORIES_PRODUCTS];

const DEMO_CUSTOMERS = [
  { firstName: 'Alice', lastName: 'Martin' },
  { firstName: 'Bob', lastName: 'Chen' },
  { firstName: 'Carol', lastName: 'Davis' },
  { firstName: 'Dan', lastName: 'Lee' },
  { firstName: 'Eva', lastName: 'Patel' },
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), '.env') });

  const dbUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const storeId = process.env.SEED_STORE_ID ?? DEV_STORE_ID;

  const pool = new Pool({
    connectionString: dbUrl,
    options: '-c timezone=UTC',
  });
  const db = drizzle(pool);

  // Resolve the store and its org
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId));

  if (!store) {
    console.error(`Store not found: ${storeId}`);
    process.exit(1);
  }

  const orgId = store.organizationId;
  console.log(`🌱 Seeding store "${store.name}" (${storeId})...`);

  // ── Cleanup previous seed data for this store ────────────────────────────────
  // Delete in dependency order; cascade handles children.
  await db.delete(orders).where(eq(orders.storeId, storeId));
  await db.delete(products).where(eq(products.storeId, storeId));
  await db.delete(categories).where(eq(categories.storeId, storeId));
  await db.delete(shippingZones).where(eq(shippingZones.storeId, storeId));
  await db.delete(taxRates).where(eq(taxRates.storeId, storeId));
  // Customers are org-scoped — delete only the demo emails.
  for (const c of DEMO_CUSTOMERS) {
    const email = `${c.firstName.toLowerCase()}.${c.lastName.toLowerCase()}@example.com`;
    await db.delete(customers).where(eq(customers.email, email));
  }
  console.log('✓ Cleared previous seed data');

  // ── Tax Rate ─────────────────────────────────────────────────────────────────
  await db.insert(taxRates).values({
    organizationId: orgId,
    storeId,
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
      storeId,
      name: 'Domestic',
      countries: ['US', 'CA'],
      isDefault: true,
    })
    .returning();

  const [shippingMethod] = await db
    .insert(shippingMethods)
    .values({
      organizationId: orgId,
      storeId,
      zoneId: zone.id,
      name: 'Standard Shipping',
      rateType: 'flat_rate',
      price: 599,
      estimatedDaysMin: 5,
      estimatedDaysMax: 7,
      isActive: true,
    })
    .returning();

  console.log('✓ Shipping zone + method created');

  // ── Categories ───────────────────────────────────────────────────────────────
  const [catApparel] = await db
    .insert(categories)
    .values({
      organizationId: orgId,
      storeId,
      name: 'Apparel',
      slug: 'apparel',
      description: 'Clothing and accessories',
      position: 0,
    })
    .returning();

  const [catAccessories] = await db
    .insert(categories)
    .values({
      organizationId: orgId,
      storeId,
      name: 'Accessories',
      slug: 'accessories',
      description: 'Bags, wallets, and accessories',
      position: 1,
    })
    .returning();

  console.log('✓ 2 categories created');

  // ── Products + Variants + Inventory ─────────────────────────────────────────
  const variantIds: string[] = [];

  for (let i = 0; i < ALL_PRODUCTS.length; i++) {
    const name = ALL_PRODUCTS[i];
    const basePrice = 1999 + i * 500;
    const isApparel = i < APPAREL_PRODUCTS.length;

    const [product] = await db
      .insert(products)
      .values({
        organizationId: orgId,
        storeId,
        name,
        slug: slugify(name),
        description: `High-quality ${name.toLowerCase()} for everyday use.`,
        status: 'active',
        vendor: 'Demo Brand',
      })
      .returning();

    await db.insert(productCategories).values({
      productId: product.id,
      categoryId: isApparel ? catApparel.id : catAccessories.id,
    });

    const variantData = [
      { name: 'Small', sku: `${slugify(name)}-sm`, price: basePrice },
      { name: 'Large', sku: `${slugify(name)}-lg`, price: basePrice + 200 },
    ];

    for (let j = 0; j < variantData.length; j++) {
      const vd = variantData[j];
      const [variant] = await db
        .insert(productVariants)
        .values({
          organizationId: orgId,
          storeId,
          productId: product.id,
          sku: vd.sku,
          name: vd.name,
          price: vd.price,
          isActive: true,
          position: j,
        })
        .returning();

      await db.insert(inventoryItems).values({
        organizationId: orgId,
        storeId,
        variantId: variant.id,
        quantity: 50 + i * 5,
        reserved: 0,
        allowBackorder: false,
        lowStockThreshold: 5,
      });

      variantIds.push(variant.id);
    }
  }

  console.log(
    '✓ 10 products with 2 variants each created (+ inventory + category links)',
  );

  // ── Customers ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password1!', 10);
  const customerIds: string[] = [];

  for (const c of DEMO_CUSTOMERS) {
    const email = `${c.firstName.toLowerCase()}.${c.lastName.toLowerCase()}@example.com`;
    const [customer] = await db
      .insert(customers)
      .values({
        organizationId: orgId,
        email,
        passwordHash,
        firstName: c.firstName,
        lastName: c.lastName,
        status: 'active',
        emailVerified: true,
        marketingOptIn: false,
      })
      .returning();
    customerIds.push(customer.id);
  }

  console.log('✓ 5 customers created (password: Password1!)');

  // ── Orders in Various States ─────────────────────────────────────────────────
  const orderStates: Array<{
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered';
    fulfillmentStatus: 'unfulfilled' | 'fulfilled';
    paymentStatus: 'pending' | 'captured';
    label: string;
  }> = [
    {
      status: 'pending',
      fulfillmentStatus: 'unfulfilled',
      paymentStatus: 'pending',
      label: 'Awaiting payment',
    },
    {
      status: 'paid',
      fulfillmentStatus: 'unfulfilled',
      paymentStatus: 'captured',
      label: 'Paid — not yet processing',
    },
    {
      status: 'processing',
      fulfillmentStatus: 'unfulfilled',
      paymentStatus: 'captured',
      label: 'In fulfillment',
    },
    {
      status: 'shipped',
      fulfillmentStatus: 'fulfilled',
      paymentStatus: 'captured',
      label: 'Out for delivery',
    },
    {
      status: 'delivered',
      fulfillmentStatus: 'fulfilled',
      paymentStatus: 'captured',
      label: 'Delivered',
    },
  ];

  for (let i = 0; i < orderStates.length; i++) {
    const { status, fulfillmentStatus, paymentStatus, label } = orderStates[i];
    const variantId = variantIds[i * 2] ?? variantIds[0];
    const unitPrice = 2999;
    const quantity = 1;
    const taxAmount = Math.round(unitPrice * 0.0875);
    const c = DEMO_CUSTOMERS[i];
    const customerEmail = `${c.firstName.toLowerCase()}.${c.lastName.toLowerCase()}@example.com`;
    const customerName = `${c.firstName} ${c.lastName}`;

    const [order] = await db
      .insert(orders)
      .values({
        organizationId: orgId,
        storeId,
        orderNumber: `ORD-000${i + 1}`,
        customerId: customerIds[i],
        customerEmail,
        customerName,
        status,
        fulfillmentStatus,
        subtotal: unitPrice * quantity,
        discountAmount: 0,
        taxAmount,
        shippingAmount: 599,
        total: unitPrice * quantity + taxAmount + 599,
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
      storeId,
      orderId: order.id,
      variantId,
      productName: ALL_PRODUCTS[i],
      variantName: 'Small',
      sku: `${slugify(ALL_PRODUCTS[i])}-sm`,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      discountAmount: 0,
      imageUrl: null,
    });

    await db.insert(orderTimeline).values({
      organizationId: orgId,
      storeId,
      orderId: order.id,
      eventType: 'manually_created',
      message: `Order created — ${label}`,
      actorType: 'system',
    });

    await db.insert(payments).values({
      organizationId: orgId,
      storeId,
      orderId: order.id,
      provider: 'manual',
      status: paymentStatus,
      amount: order.total,
      currency: 'USD',
    });
  }

  console.log('✓ 5 orders seeded (pending → delivered)');
  console.log('\n✅ Seed complete!');
  console.log(`\nOrganization ID : ${orgId}`);
  console.log(`Store ID        : ${storeId}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
