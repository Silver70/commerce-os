import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { stores } from '../../../shared/database/schema';
import type { Store, NewStore } from '../../../shared/database/schema';
import { generateSlug } from '../../../shared/utils/slug.util';
import type { CreateStoreDto, UpdateStoreDto } from '../dto/create-store.dto';

@Injectable()
export class StoreService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async list(orgId: string): Promise<Store[]> {
    return this.db
      .select()
      .from(stores)
      .where(and(eq(stores.organizationId, orgId), isNull(stores.deletedAt)))
      .orderBy(asc(stores.createdAt));
  }

  async findById(id: string, orgId: string): Promise<Store | null> {
    const [row] = await this.db
      .select()
      .from(stores)
      .where(and(eq(stores.id, id), eq(stores.organizationId, orgId)))
      .limit(1);
    return row ?? null;
  }

  async findBySlug(slug: string, orgId: string): Promise<Store | null> {
    const [row] = await this.db
      .select()
      .from(stores)
      .where(and(eq(stores.slug, slug), eq(stores.organizationId, orgId)))
      .limit(1);
    return row ?? null;
  }

  async findFirstActive(orgId: string): Promise<Store | null> {
    const [row] = await this.db
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.organizationId, orgId),
          eq(stores.isActive, true),
          isNull(stores.deletedAt),
        ),
      )
      .orderBy(asc(stores.createdAt))
      .limit(1);
    return row ?? null;
  }

  async create(orgId: string, dto: CreateStoreDto): Promise<Store> {
    const slug = await this.resolveUniqueSlug(orgId, dto.slug ?? dto.name);

    const values: NewStore = {
      organizationId: orgId,
      name: dto.name,
      slug,
      currency: dto.currency ?? 'USD',
      timezone: dto.timezone ?? 'UTC',
      isActive: dto.isActive ?? true,
    };

    const [row] = await this.db.insert(stores).values(values).returning();
    return row;
  }

  async update(id: string, orgId: string, dto: UpdateStoreDto): Promise<Store> {
    const existing = await this.findById(id, orgId);
    if (!existing) throw new NotFoundException('Store not found');

    const patch: Partial<NewStore> = { updatedAt: new Date() };

    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      patch.slug = await this.resolveUniqueSlug(orgId, dto.slug, id);
    }
    if (dto.currency !== undefined) patch.currency = dto.currency;
    if (dto.timezone !== undefined) patch.timezone = dto.timezone;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    const [row] = await this.db
      .update(stores)
      .set(patch)
      .where(and(eq(stores.id, id), eq(stores.organizationId, orgId)))
      .returning();
    if (!row) throw new NotFoundException('Store not found after update');
    return row;
  }

  async softDelete(id: string, orgId: string): Promise<void> {
    const existing = await this.findById(id, orgId);
    if (!existing) throw new NotFoundException('Store not found');
    await this.db
      .update(stores)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(and(eq(stores.id, id), eq(stores.organizationId, orgId)));
  }

  /**
   * Generates a slug from `input` and increments a numeric suffix until it's
   * unique within the org. `excludeId` lets `update` skip its own row when
   * the requested slug already belongs to the store being edited.
   */
  private async resolveUniqueSlug(
    orgId: string,
    input: string,
    excludeId?: string,
  ): Promise<string> {
    const base = generateSlug(input);
    let candidate = base;
    let suffix = 1;

    while (await this.slugTaken(orgId, candidate, excludeId)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }

  private async slugTaken(
    orgId: string,
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const row = await this.findBySlug(slug, orgId);
    if (!row) return false;
    if (excludeId && row.id === excludeId) return false;
    return true;
  }

  async assertExists(id: string, orgId: string): Promise<Store> {
    const store = await this.findById(id, orgId);
    if (!store) throw new ConflictException('Store not found');
    return store;
  }
}
