import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { taxRates } from '../../../shared/database/schema';
import type {
  CreateTaxRateDto,
  UpdateTaxRateDto,
} from '../dto/create-tax-rate.dto';

@Injectable()
export class TaxRateService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  list(orgId: string) {
    return this.db
      .select()
      .from(taxRates)
      .where(eq(taxRates.organizationId, orgId));
  }

  async create(orgId: string, dto: CreateTaxRateDto) {
    const [record] = await this.db
      .insert(taxRates)
      .values({
        organizationId: orgId,
        name: dto.name,
        countryCode: dto.countryCode,
        stateCode: dto.stateCode ?? null,
        rate: dto.rate,
        isInclusive: dto.isInclusive ?? false,
        isActive: dto.isActive ?? true,
      })
      .returning();
    return record;
  }

  async findById(id: string, orgId: string) {
    const [record] = await this.db
      .select()
      .from(taxRates)
      .where(and(eq(taxRates.id, id), eq(taxRates.organizationId, orgId)))
      .limit(1);
    return record ?? null;
  }

  async update(id: string, orgId: string, dto: UpdateTaxRateDto) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.countryCode !== undefined) patch.countryCode = dto.countryCode;
    if (dto.stateCode !== undefined) patch.stateCode = dto.stateCode;
    if (dto.rate !== undefined) patch.rate = dto.rate;
    if (dto.isInclusive !== undefined) patch.isInclusive = dto.isInclusive;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    const [record] = await this.db
      .update(taxRates)
      .set(patch)
      .where(and(eq(taxRates.id, id), eq(taxRates.organizationId, orgId)))
      .returning();

    if (!record) throw new NotFoundException('Tax rate not found');
    return record;
  }

  async remove(id: string, orgId: string): Promise<void> {
    const existing = await this.findById(id, orgId);
    if (!existing) throw new NotFoundException('Tax rate not found');
    await this.db
      .delete(taxRates)
      .where(and(eq(taxRates.id, id), eq(taxRates.organizationId, orgId)));
  }
}
