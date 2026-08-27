import { faker } from '@faker-js/faker';
import { orders, orderLineItems, orderTimeline, payments } from '../../schema';
import {
  ORDER_STATUS_MIX,
  VOLUME,
  dayVolumeFactor,
  weighted,
  type SeedDb,
} from './config';
import type { SeededVariant } from './catalog';
import type { SeededCustomer } from './customers';

const TAX_RATE = 0.0875;
const SHIPPING_CENTS = 599;

/**
 * Backdated orders spread across the history window, with line items, a payment
 * and a timeline entry each.
 *
 * Every timestamp is written explicitly rather than relying on `DEFAULT now()`,
 * so the whole window is populated. This is also why the seed pins TZ=UTC: the
 * pg driver serialises JS Dates using the *process* timezone, and these columns
 * are `timestamp without time zone`, so a non-UTC process would shift every row.
 */
export async function seedOrders(
  db: SeedDb,
  orgId: string,
  storeId: string,
  variants: SeededVariant[],
  customerRows: SeededCustomer[],
  shippingMethodId: string | null,
  dayStarts: Date[],
): Promise<{ ordersPerDay: number[]; total: number }> {
  const now = Date.now();

  // Normalise the per-day volume curve so the run totals roughly targetOrders.
  const factors = dayStarts.map((_, i) => dayVolumeFactor(i, dayStarts.length));
  const factorSum = factors.reduce((a, b) => a + b, 0);
  const perDayTarget = VOLUME.targetOrders / factorSum;

  const ordersPerDay: number[] = [];
  let counter = 0;

  for (let d = 0; d < dayStarts.length; d++) {
    const exact = factors[d] * perDayTarget;
    // Probabilistic rounding keeps the daily counts integral without
    // systematically biasing the total up or down.
    const count = Math.floor(exact) + (Math.random() < exact % 1 ? 1 : 0);
    let placed = 0;

    for (let n = 0; n < count; n++) {
      const placedAt = new Date(
        dayStarts[d].getTime() +
          faker.number.int({ min: 8, max: 22 }) * 3_600_000 +
          faker.number.int({ min: 0, max: 59 }) * 60_000,
      );
      // The final day is partial — never stamp an order in the future, or the
      // dashboard's `created_at < now` bound will hide it.
      if (placedAt.getTime() > now) continue;

      const mix = weighted(ORDER_STATUS_MIX);
      const customer = faker.helpers.arrayElement(customerRows);
      const lineCount = faker.helpers.weightedArrayElement([
        { value: 1, weight: 58 },
        { value: 2, weight: 27 },
        { value: 3, weight: 15 },
      ]);
      const picked = faker.helpers.arrayElements(variants, lineCount);

      const subtotal = picked.reduce((sum, v) => sum + v.price, 0);
      const taxAmount = Math.round(subtotal * TAX_RATE);
      const total = subtotal + taxAmount + SHIPPING_CENTS;
      counter += 1;

      const [order] = await db
        .insert(orders)
        .values({
          organizationId: orgId,
          storeId,
          orderNumber: `ORD-${String(counter).padStart(5, '0')}`,
          customerId: customer.id,
          customerEmail: customer.email,
          customerName: customer.name,
          status: mix.status,
          fulfillmentStatus: mix.fulfillment,
          subtotal,
          discountAmount: 0,
          taxAmount,
          shippingAmount: SHIPPING_CENTS,
          total,
          currency: 'USD',
          shippingAddress: {
            line1: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state({ abbreviated: true }),
            postalCode: faker.location.zipCode(),
            country: 'US',
          },
          shippingMethodId,
          source: 'storefront',
          createdAt: placedAt,
          updatedAt: placedAt,
        })
        .returning();

      await db.insert(orderLineItems).values(
        picked.map((v) => ({
          organizationId: orgId,
          storeId,
          orderId: order.id,
          variantId: v.id,
          productName: v.productName,
          variantName: v.variantName,
          sku: v.sku,
          quantity: 1,
          unitPrice: v.price,
          totalPrice: v.price,
          discountAmount: 0,
          imageUrl: null,
          createdAt: placedAt,
        })),
      );

      await db.insert(payments).values({
        organizationId: orgId,
        storeId,
        orderId: order.id,
        provider: 'manual',
        status: mix.payment,
        amount: total,
        currency: 'USD',
        capturedAt: mix.payment === 'captured' ? placedAt : null,
        createdAt: placedAt,
        updatedAt: placedAt,
      });

      await db.insert(orderTimeline).values({
        organizationId: orgId,
        storeId,
        orderId: order.id,
        eventType: 'status_changed',
        message: `Order ${order.orderNumber} — ${mix.status}`,
        actorType: 'system',
        createdAt: placedAt,
      });

      placed += 1;
    }

    ordersPerDay.push(placed);
  }

  console.log(`  ✓ ${counter} orders across ${dayStarts.length} days`);
  return { ordersPerDay, total: counter };
}
