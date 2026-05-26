import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { organizations } from '../../../shared/database/schema';
import { generateSlug } from '../../../shared/utils/slug.util';

@Injectable()
export class TenantService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async findById(id: string) {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    return org ?? null;
  }

  async findByWorkosId(workosOrgId: string) {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.workosOrgId, workosOrgId))
      .limit(1);
    return org ?? null;
  }

  async create(data: { workosOrgId: string; name: string }) {
    const slug = generateSlug(data.name);
    const [org] = await this.db
      .insert(organizations)
      .values({ ...data, slug })
      .returning();
    return org;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      currency: string;
      timezone: string;
      logoUrl: string;
    }>,
  ) {
    const [org] = await this.db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
