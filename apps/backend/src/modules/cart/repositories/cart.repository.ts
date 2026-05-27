import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import {
  carts,
  cartItems,
  productVariants,
  productCategories,
} from '../../../shared/database/schema';
import type { Cart, CartItem } from '../../../shared/database/schema';
import type { CartItemWithVariant } from '../../pricing/services/pricing-engine.service';

export interface CartWithItems extends Cart {
  items: CartItemWithVariant[];
}

@Injectable()
export class CartRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async findById(cartId: string, orgId: string): Promise<Cart | null> {
    const [row] = await this.db
      .select()
      .from(carts)
      .where(and(eq(carts.id, cartId), eq(carts.organizationId, orgId)))
      .limit(1);
    return row ?? null;
  }

  async findWithItems(
    cartId: string,
    orgId: string,
  ): Promise<CartWithItems | null> {
    const cart = await this.findById(cartId, orgId);
    if (!cart) return null;

    const items = await this.loadItemsWithVariants(cartId, orgId);
    return { ...cart, items };
  }

  async findByCustomer(
    customerId: string,
    orgId: string,
  ): Promise<Cart | null> {
    const [row] = await this.db
      .select()
      .from(carts)
      .where(
        and(
          eq(carts.organizationId, orgId),
          eq(carts.customerId, customerId),
          eq(carts.status, 'active'),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async create(orgId: string, customerId?: string): Promise<Cart> {
    const [cart] = await this.db
      .insert(carts)
      .values({
        organizationId: orgId,
        customerId: customerId ?? null,
        status: 'active',
      })
      .returning();
    return cart;
  }

  async updateTotals(
    cartId: string,
    orgId: string,
    totals: {
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      shippingAmount: number;
      total: number;
      couponId?: string | null;
      couponCode?: string | null;
    },
  ): Promise<Cart | null> {
    const [row] = await this.db
      .update(carts)
      .set({
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        shippingAmount: totals.shippingAmount,
        total: totals.total,
        couponId:
          totals.couponId !== undefined ? totals.couponId : sql`coupon_id`,
        couponCode:
          totals.couponCode !== undefined
            ? totals.couponCode
            : sql`coupon_code`,
        updatedAt: new Date(),
      })
      .where(and(eq(carts.id, cartId), eq(carts.organizationId, orgId)))
      .returning();
    return row ?? null;
  }

  async setCoupon(
    cartId: string,
    orgId: string,
    couponId: string | null,
    couponCode: string | null,
  ): Promise<Cart | null> {
    const [row] = await this.db
      .update(carts)
      .set({ couponId, couponCode, updatedAt: new Date() })
      .where(and(eq(carts.id, cartId), eq(carts.organizationId, orgId)))
      .returning();
    return row ?? null;
  }

  async markConverted(cartId: string, orgId: string): Promise<Cart | null> {
    const [row] = await this.db
      .update(carts)
      .set({ status: 'converted', updatedAt: new Date() })
      .where(and(eq(carts.id, cartId), eq(carts.organizationId, orgId)))
      .returning();
    return row ?? null;
  }

  // ─── Cart Items ─────────────────────────────────────────────────────────────

  async findItem(
    cartId: string,
    itemId: string,
    orgId: string,
  ): Promise<CartItem | null> {
    const [row] = await this.db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.id, itemId),
          eq(cartItems.cartId, cartId),
          eq(cartItems.organizationId, orgId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findItemByVariant(
    cartId: string,
    variantId: string,
    orgId: string,
  ): Promise<CartItem | null> {
    const [row] = await this.db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.variantId, variantId),
          eq(cartItems.organizationId, orgId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async upsertItem(
    cartId: string,
    variantId: string,
    quantity: number,
    unitPrice: number,
    orgId: string,
  ): Promise<CartItem> {
    const existing = await this.findItemByVariant(cartId, variantId, orgId);

    if (existing) {
      const newQty = existing.quantity + quantity;
      const [row] = await this.db
        .update(cartItems)
        .set({
          quantity: newQty,
          totalPrice: newQty * unitPrice,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await this.db
      .insert(cartItems)
      .values({
        organizationId: orgId,
        cartId,
        variantId,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
      })
      .returning();
    return row;
  }

  async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number,
    orgId: string,
  ): Promise<CartItem | null> {
    const item = await this.findItem(cartId, itemId, orgId);
    if (!item) return null;

    const [row] = await this.db
      .update(cartItems)
      .set({
        quantity,
        totalPrice: quantity * item.unitPrice,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, itemId))
      .returning();
    return row ?? null;
  }

  async removeItem(
    cartId: string,
    itemId: string,
    orgId: string,
  ): Promise<void> {
    await this.db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.id, itemId),
          eq(cartItems.cartId, cartId),
          eq(cartItems.organizationId, orgId),
        ),
      );
  }

  // ─── Variant lookup (avoids importing ProductModule) ────────────────────────

  async findVariant(
    variantId: string,
    orgId: string,
  ): Promise<{
    id: string;
    productId: string;
    price: number;
    isActive: boolean;
    sku: string;
    name: string | null;
  } | null> {
    const [row] = await this.db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        price: productVariants.price,
        isActive: productVariants.isActive,
        sku: productVariants.sku,
        name: productVariants.name,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.organizationId, orgId),
          eq(productVariants.isActive, true),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getProductCategoryIds(productId: string): Promise<string[]> {
    const rows = await this.db
      .select({ categoryId: productCategories.categoryId })
      .from(productCategories)
      .where(eq(productCategories.productId, productId));
    return rows.map((r) => r.categoryId);
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async loadItemsWithVariants(
    cartId: string,
    orgId: string,
  ): Promise<CartItemWithVariant[]> {
    const rawItems = await this.db
      .select()
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.organizationId, orgId)),
      );

    if (rawItems.length === 0) return [];

    const results: CartItemWithVariant[] = [];

    for (const item of rawItems) {
      const variant = await this.findVariant(item.variantId, orgId);
      if (!variant) continue;

      const productCategoryIds = await this.getProductCategoryIds(
        variant.productId,
      );

      results.push({
        id: item.id,
        cartId: item.cartId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        organizationId: item.organizationId,
        variant,
        productCategoryIds,
      });
    }

    return results;
  }
}
