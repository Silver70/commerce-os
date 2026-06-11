import { Inject, Injectable } from '@nestjs/common';
import { eq, and, ne, desc } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { customerGroups } from '../../../shared/database/schema';
import type {
  CustomerGroup,
  NewCustomerGroup,
} from '../../../shared/database/schema';

@Injectable()
export class CustomerGroupRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async findAll(orgId: string): Promise<CustomerGroup[]> {
    return this.db
      .select()
      .from(customerGroups)
      .where(eq(customerGroups.organizationId, orgId))
      .orderBy(desc(customerGroups.createdAt));
  }

  async findById(id: string, orgId: string): Promise<CustomerGroup | null> {
    const [row] = await this.db
      .select()
      .from(customerGroups)
      .where(
        and(
          eq(customerGroups.id, id),
          eq(customerGroups.organizationId, orgId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async nameExists(
    name: string,
    orgId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: customerGroups.id })
      .from(customerGroups)
      .where(
        and(
          eq(customerGroups.organizationId, orgId),
          eq(customerGroups.name, name),
          ...(excludeId ? [ne(customerGroups.id, excludeId)] : []),
        ),
      )
      .limit(1);
    return !!row;
  }

  async create(data: NewCustomerGroup): Promise<CustomerGroup> {
    const [row] = await this.db.insert(customerGroups).values(data).returning();
    return row;
  }

  async update(
    id: string,
    orgId: string,
    data: Partial<Pick<CustomerGroup, 'name' | 'description'>>,
  ): Promise<CustomerGroup | null> {
    const [row] = await this.db
      .update(customerGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(customerGroups.id, id),
          eq(customerGroups.organizationId, orgId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(customerGroups)
      .where(
        and(
          eq(customerGroups.id, id),
          eq(customerGroups.organizationId, orgId),
        ),
      );
  }
}
