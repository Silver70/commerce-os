import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import {
  shippingZones,
  shippingMethods,
} from '../../../shared/database/schema';
import type {
  ShippingZone,
  ShippingMethod,
} from '../../../shared/database/schema';
import type {
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
} from '../dto/create-shipping-zone.dto';
import type {
  CreateShippingMethodDto,
  UpdateShippingMethodDto,
} from '../dto/create-shipping-method.dto';

export interface ShippingRate {
  methodId: string;
  name: string;
  price: number;
  rateType: string;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
}

@Injectable()
export class ShippingService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  // ─── Zone CRUD ────────────────────────────────────────────────────────────────

  async listZones(orgId: string, storeId: string): Promise<ShippingZone[]> {
    return this.db
      .select()
      .from(shippingZones)
      .where(
        and(
          eq(shippingZones.organizationId, orgId),
          eq(shippingZones.storeId, storeId),
        ),
      );
  }

  async getZone(
    zoneId: string,
    orgId: string,
    storeId: string,
  ): Promise<ShippingZone> {
    const [zone] = await this.db
      .select()
      .from(shippingZones)
      .where(
        and(
          eq(shippingZones.id, zoneId),
          eq(shippingZones.organizationId, orgId),
          eq(shippingZones.storeId, storeId),
        ),
      )
      .limit(1);
    if (!zone) throw new NotFoundException('Shipping zone not found');
    return zone;
  }

  async createZone(
    dto: CreateShippingZoneDto,
    orgId: string,
    storeId: string,
  ): Promise<ShippingZone> {
    const [zone] = await this.db
      .insert(shippingZones)
      .values({
        organizationId: orgId,
        storeId,
        name: dto.name,
        countries: dto.countries,
        isDefault: dto.isDefault ?? false,
      })
      .returning();
    return zone;
  }

  async updateZone(
    zoneId: string,
    dto: UpdateShippingZoneDto,
    orgId: string,
    storeId: string,
  ): Promise<ShippingZone> {
    await this.getZone(zoneId, orgId, storeId);
    const [updated] = await this.db
      .update(shippingZones)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.countries !== undefined && { countries: dto.countries }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shippingZones.id, zoneId),
          eq(shippingZones.organizationId, orgId),
          eq(shippingZones.storeId, storeId),
        ),
      )
      .returning();
    return updated;
  }

  async deleteZone(
    zoneId: string,
    orgId: string,
    storeId: string,
  ): Promise<void> {
    await this.getZone(zoneId, orgId, storeId);
    await this.db
      .delete(shippingZones)
      .where(
        and(
          eq(shippingZones.id, zoneId),
          eq(shippingZones.organizationId, orgId),
          eq(shippingZones.storeId, storeId),
        ),
      );
  }

  // ─── Method CRUD ──────────────────────────────────────────────────────────────

  async listMethods(
    orgId: string,
    storeId: string,
    zoneId?: string,
  ): Promise<ShippingMethod[]> {
    const conditions = [
      eq(shippingMethods.organizationId, orgId),
      eq(shippingMethods.storeId, storeId),
    ];
    if (zoneId) conditions.push(eq(shippingMethods.zoneId, zoneId));
    return this.db
      .select()
      .from(shippingMethods)
      .where(and(...conditions));
  }

  async getMethod(
    methodId: string,
    orgId: string,
    storeId: string,
  ): Promise<ShippingMethod> {
    const [method] = await this.db
      .select()
      .from(shippingMethods)
      .where(
        and(
          eq(shippingMethods.id, methodId),
          eq(shippingMethods.organizationId, orgId),
          eq(shippingMethods.storeId, storeId),
        ),
      )
      .limit(1);
    if (!method) throw new NotFoundException('Shipping method not found');
    return method;
  }

  async createMethod(
    dto: CreateShippingMethodDto,
    orgId: string,
    storeId: string,
  ): Promise<ShippingMethod> {
    await this.getZone(dto.zoneId, orgId, storeId);
    const [method] = await this.db
      .insert(shippingMethods)
      .values({
        organizationId: orgId,
        storeId,
        zoneId: dto.zoneId,
        name: dto.name,
        rateType: dto.rateType ?? 'flat_rate',
        price: dto.price,
        minOrderAmount: dto.minOrderAmount ?? null,
        estimatedDaysMin: dto.estimatedDaysMin ?? null,
        estimatedDaysMax: dto.estimatedDaysMax ?? null,
        isActive: dto.isActive ?? true,
      })
      .returning();
    return method;
  }

  async updateMethod(
    methodId: string,
    dto: UpdateShippingMethodDto,
    orgId: string,
    storeId: string,
  ): Promise<ShippingMethod> {
    await this.getMethod(methodId, orgId, storeId);
    const [updated] = await this.db
      .update(shippingMethods)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.rateType !== undefined && { rateType: dto.rateType }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.minOrderAmount !== undefined && {
          minOrderAmount: dto.minOrderAmount,
        }),
        ...(dto.estimatedDaysMin !== undefined && {
          estimatedDaysMin: dto.estimatedDaysMin,
        }),
        ...(dto.estimatedDaysMax !== undefined && {
          estimatedDaysMax: dto.estimatedDaysMax,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shippingMethods.id, methodId),
          eq(shippingMethods.organizationId, orgId),
          eq(shippingMethods.storeId, storeId),
        ),
      )
      .returning();
    return updated;
  }

  async deleteMethod(
    methodId: string,
    orgId: string,
    storeId: string,
  ): Promise<void> {
    await this.getMethod(methodId, orgId, storeId);
    await this.db
      .delete(shippingMethods)
      .where(
        and(
          eq(shippingMethods.id, methodId),
          eq(shippingMethods.organizationId, orgId),
          eq(shippingMethods.storeId, storeId),
        ),
      );
  }

  // ─── Rate calculation (storefront) ───────────────────────────────────────────

  async getShippingRates(
    countryCode: string,
    orderSubtotal: number,
    orgId: string,
    storeId: string,
  ): Promise<ShippingRate[]> {
    // Find zones that include the country code (or the default zone)
    const zones = await this.db
      .select()
      .from(shippingZones)
      .where(
        and(
          eq(shippingZones.organizationId, orgId),
          eq(shippingZones.storeId, storeId),
        ),
      );

    const matchingZone =
      zones.find((z) => z.countries.includes(countryCode)) ??
      zones.find((z) => z.isDefault) ??
      null;

    if (!matchingZone) return [];

    const methods = await this.db
      .select()
      .from(shippingMethods)
      .where(
        and(
          eq(shippingMethods.zoneId, matchingZone.id),
          eq(shippingMethods.organizationId, orgId),
          eq(shippingMethods.storeId, storeId),
          eq(shippingMethods.isActive, true),
        ),
      );

    return methods
      .filter(
        (m) => m.minOrderAmount === null || orderSubtotal >= m.minOrderAmount,
      )
      .map((m) => ({
        methodId: m.id,
        name: m.name,
        price: m.price,
        rateType: m.rateType,
        estimatedDaysMin: m.estimatedDaysMin,
        estimatedDaysMax: m.estimatedDaysMax,
      }));
  }

  async getMethodPrice(
    methodId: string,
    orgId: string,
    storeId: string,
  ): Promise<number> {
    const method = await this.getMethod(methodId, orgId, storeId);
    if (!method.isActive) {
      throw new BadRequestException('Shipping method is not active');
    }
    return method.price;
  }
}
