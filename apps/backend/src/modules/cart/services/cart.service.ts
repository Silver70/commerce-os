import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CartRepository } from '../repositories/cart.repository';
import { PricingEngineService } from '../../pricing/services/pricing-engine.service';
import { DiscountRepository } from '../../pricing/repositories/discount.repository';
import { add, subtract } from '../../../shared/utils/money.util';
import type { CartWithItems } from '../repositories/cart.repository';
import type { Cart } from '../../../shared/database/schema';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepo: CartRepository,
    private readonly pricingEngine: PricingEngineService,
    private readonly discountRepo: DiscountRepository,
  ) {}

  async createCart(orgId: string, customerId?: string): Promise<CartWithItems> {
    const cart = await this.cartRepo.create(orgId, customerId);
    return { ...cart, items: [] };
  }

  async getCart(cartId: string, orgId: string): Promise<CartWithItems> {
    const cart = await this.cartRepo.findWithItems(cartId, orgId);
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  async addItem(
    cartId: string,
    variantId: string,
    quantity: number,
    orgId: string,
  ): Promise<CartWithItems> {
    const cart = await this.cartRepo.findById(cartId, orgId);
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'active') {
      throw new UnprocessableEntityException('Cart is no longer active');
    }

    const variant = await this.cartRepo.findVariant(variantId, orgId);
    if (!variant) {
      throw new NotFoundException('Variant not found or not active');
    }

    await this.cartRepo.upsertItem(
      cartId,
      variantId,
      quantity,
      variant.price,
      orgId,
    );

    return this.recalculate(cartId, orgId);
  }

  async updateItem(
    cartId: string,
    itemId: string,
    quantity: number,
    orgId: string,
  ): Promise<CartWithItems> {
    const cart = await this.cartRepo.findById(cartId, orgId);
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'active') {
      throw new UnprocessableEntityException('Cart is no longer active');
    }

    const item = await this.cartRepo.findItem(cartId, itemId, orgId);
    if (!item) throw new NotFoundException('Cart item not found');

    if (quantity === 0) {
      await this.cartRepo.removeItem(cartId, itemId, orgId);
    } else {
      await this.cartRepo.updateItemQuantity(cartId, itemId, quantity, orgId);
    }

    return this.recalculate(cartId, orgId);
  }

  async removeItem(
    cartId: string,
    itemId: string,
    orgId: string,
  ): Promise<CartWithItems> {
    const cart = await this.cartRepo.findById(cartId, orgId);
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'active') {
      throw new UnprocessableEntityException('Cart is no longer active');
    }

    const item = await this.cartRepo.findItem(cartId, itemId, orgId);
    if (!item) throw new NotFoundException('Cart item not found');

    await this.cartRepo.removeItem(cartId, itemId, orgId);
    return this.recalculate(cartId, orgId);
  }

  async applyCoupon(
    cartId: string,
    code: string,
    orgId: string,
  ): Promise<CartWithItems> {
    const cart = await this.cartRepo.findById(cartId, orgId);
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'active') {
      throw new UnprocessableEntityException('Cart is no longer active');
    }

    // Validate coupon exists before applying — full validation happens in recalculate
    const coupon = await this.discountRepo.findCouponByCode(code, orgId);
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException(`Coupon code "${code}" is not valid`);
    }

    await this.cartRepo.setCoupon(cartId, orgId, coupon.id, coupon.code);
    return this.recalculate(cartId, orgId);
  }

  async removeCoupon(cartId: string, orgId: string): Promise<CartWithItems> {
    const cart = await this.cartRepo.findById(cartId, orgId);
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'active') {
      throw new UnprocessableEntityException('Cart is no longer active');
    }

    await this.cartRepo.setCoupon(cartId, orgId, null, null);
    return this.recalculate(cartId, orgId);
  }

  async recalculate(cartId: string, orgId: string): Promise<CartWithItems> {
    const cartWithItems = await this.cartRepo.findWithItems(cartId, orgId);
    if (!cartWithItems) throw new NotFoundException('Cart not found');

    const { items, couponCode } = cartWithItems;

    // Subtotal = sum of all item line totals at current unit prices
    const subtotal = items.reduce(
      (sum, item) => add(sum, item.quantity * item.unitPrice),
      0,
    );

    if (items.length === 0) {
      await this.cartRepo.updateTotals(cartId, orgId, {
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        total: 0,
      });
      return {
        ...cartWithItems,
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        total: 0,
      };
    }

    // Apply discounts (tax and shipping calculated at checkout)
    const discountResult = await this.pricingEngine.applyDiscounts(
      items,
      couponCode ?? null,
      orgId,
    );

    const discountAmount = discountResult.totalDiscountAmount;
    const total = Math.max(0, subtract(subtotal, discountAmount));

    const updated = await this.cartRepo.updateTotals(cartId, orgId, {
      subtotal,
      discountAmount,
      taxAmount: 0,
      shippingAmount: 0,
      total,
      couponId: discountResult.couponId ?? cartWithItems.couponId,
    });

    if (!updated) throw new NotFoundException('Cart not found after update');

    return { ...updated, items };
  }

  async getOrCreateActiveCart(
    orgId: string,
    customerId?: string,
  ): Promise<CartWithItems> {
    if (customerId) {
      const existing = await this.cartRepo.findByCustomer(customerId, orgId);
      if (existing) {
        const withItems = await this.cartRepo.findWithItems(existing.id, orgId);
        if (withItems) return withItems;
      }
    }
    return this.createCart(orgId, customerId);
  }

  async markConverted(cartId: string, orgId: string): Promise<Cart> {
    const updated = await this.cartRepo.markConverted(cartId, orgId);
    if (!updated) throw new NotFoundException('Cart not found');
    return updated;
  }
}
