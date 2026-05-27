import { Inject, Injectable } from '@nestjs/common';
import { eq, and, or, isNull, lte, gte, inArray, sql } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { discounts, coupons } from '../../../shared/database/schema';
import type {
  Discount,
  NewDiscount,
  Coupon,
  NewCoupon,
} from '../../../shared/database/schema';

@Injectable()
export class DiscountRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  // ─── Discounts ───────────────────────────────────────────────────────────────

  async findManyDiscounts(orgId: string): Promise<Discount[]> {
    return this.db
      .select()
      .from(discounts)
      .where(eq(discounts.organizationId, orgId))
      .orderBy(discounts.createdAt);
  }

  async findDiscountById(id: string, orgId: string): Promise<Discount | null> {
    const [row] = await this.db
      .select()
      .from(discounts)
      .where(and(eq(discounts.id, id), eq(discounts.organizationId, orgId)))
      .limit(1);
    return row ?? null;
  }

  async createDiscount(
    data: Omit<NewDiscount, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Discount> {
    const [row] = await this.db.insert(discounts).values(data).returning();
    return row;
  }

  async updateDiscount(
    id: string,
    orgId: string,
    data: Partial<Omit<NewDiscount, 'id' | 'organizationId' | 'createdAt'>>,
  ): Promise<Discount | null> {
    const [row] = await this.db
      .update(discounts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(discounts.id, id), eq(discounts.organizationId, orgId)))
      .returning();
    return row ?? null;
  }

  async deleteDiscount(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(discounts)
      .where(and(eq(discounts.id, id), eq(discounts.organizationId, orgId)));
  }

  async findActiveProductDiscounts(
    orgId: string,
    productIds: string[],
  ): Promise<Discount[]> {
    if (productIds.length === 0) return [];
    const now = new Date();
    return this.db
      .select()
      .from(discounts)
      .where(
        and(
          eq(discounts.organizationId, orgId),
          eq(discounts.isActive, true),
          eq(discounts.scope, 'product'),
          inArray(discounts.scopeId, productIds),
          or(isNull(discounts.startsAt), lte(discounts.startsAt, now)),
          or(isNull(discounts.endsAt), gte(discounts.endsAt, now)),
        ),
      );
  }

  async findActiveCategoryDiscounts(
    orgId: string,
    categoryIds: string[],
  ): Promise<Discount[]> {
    if (categoryIds.length === 0) return [];
    const now = new Date();
    return this.db
      .select()
      .from(discounts)
      .where(
        and(
          eq(discounts.organizationId, orgId),
          eq(discounts.isActive, true),
          eq(discounts.scope, 'category'),
          inArray(discounts.scopeId, categoryIds),
          or(isNull(discounts.startsAt), lte(discounts.startsAt, now)),
          or(isNull(discounts.endsAt), gte(discounts.endsAt, now)),
        ),
      );
  }

  async findActiveOrderDiscounts(orgId: string): Promise<Discount[]> {
    const now = new Date();
    return this.db
      .select()
      .from(discounts)
      .where(
        and(
          eq(discounts.organizationId, orgId),
          eq(discounts.isActive, true),
          eq(discounts.scope, 'order'),
          or(isNull(discounts.startsAt), lte(discounts.startsAt, now)),
          or(isNull(discounts.endsAt), gte(discounts.endsAt, now)),
        ),
      );
  }

  // ─── Coupons ─────────────────────────────────────────────────────────────────

  async findManyCoupons(orgId: string): Promise<Coupon[]> {
    return this.db
      .select()
      .from(coupons)
      .where(eq(coupons.organizationId, orgId))
      .orderBy(coupons.createdAt);
  }

  async findCouponById(id: string, orgId: string): Promise<Coupon | null> {
    const [row] = await this.db
      .select()
      .from(coupons)
      .where(and(eq(coupons.id, id), eq(coupons.organizationId, orgId)))
      .limit(1);
    return row ?? null;
  }

  async findCouponByCode(code: string, orgId: string): Promise<Coupon | null> {
    const [row] = await this.db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.organizationId, orgId),
          eq(sql`UPPER(${coupons.code})`, code.toUpperCase()),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async createCoupon(
    data: Omit<NewCoupon, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>,
  ): Promise<Coupon> {
    const [row] = await this.db
      .insert(coupons)
      .values({ ...data, code: data.code.toUpperCase(), usageCount: 0 })
      .returning();
    return row;
  }

  async updateCoupon(
    id: string,
    orgId: string,
    data: Partial<
      Omit<NewCoupon, 'id' | 'organizationId' | 'createdAt' | 'usageCount'>
    >,
  ): Promise<Coupon | null> {
    const patch =
      data.code !== undefined
        ? { ...data, code: data.code.toUpperCase(), updatedAt: new Date() }
        : { ...data, updatedAt: new Date() };
    const [row] = await this.db
      .update(coupons)
      .set(patch)
      .where(and(eq(coupons.id, id), eq(coupons.organizationId, orgId)))
      .returning();
    return row ?? null;
  }

  async deleteCoupon(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(coupons)
      .where(and(eq(coupons.id, id), eq(coupons.organizationId, orgId)));
  }

  async incrementCouponUsage(id: string): Promise<void> {
    await this.db
      .update(coupons)
      .set({
        usageCount: sql`${coupons.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, id));
  }
}
