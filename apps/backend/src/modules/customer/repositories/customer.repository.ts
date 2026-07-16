import { Inject, Injectable } from '@nestjs/common';
import { eq, and, or, ilike, desc, count, type SQL } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { customers, addresses } from '../../../shared/database/schema';
import type { Customer, Address } from '../../../shared/database/schema';
import {
  offsetFor,
  DEFAULT_PAGE_SIZE,
} from '../../../shared/utils/pagination.util';
import { likePattern } from '../../../shared/utils/search.util';

export interface ListCustomersOptions {
  status?: Customer['status'];
  groupId?: string;
  search?: string;
  limit?: number;
  /** 1-based. Customers are admin-only, so there is no cursor mode here. */
  page?: number;
}

export interface PaginatedCustomers {
  items: Customer[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CustomerRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async findById(customerId: string, orgId: string): Promise<Customer | null> {
    const [row] = await this.db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.organizationId, orgId)),
      )
      .limit(1);
    return row ?? null;
  }

  async findByEmail(email: string, orgId: string): Promise<Customer | null> {
    const [row] = await this.db
      .select()
      .from(customers)
      .where(
        and(eq(customers.email, email), eq(customers.organizationId, orgId)),
      )
      .limit(1);
    return row ?? null;
  }

  async findAll(
    orgId: string,
    opts: ListCustomersOptions = {},
  ): Promise<PaginatedCustomers> {
    const limit = opts.limit ?? DEFAULT_PAGE_SIZE;
    const page = opts.page ?? 1;
    const conditions: SQL[] = [eq(customers.organizationId, orgId)];
    if (opts.status) conditions.push(eq(customers.status, opts.status));
    if (opts.groupId) conditions.push(eq(customers.groupId, opts.groupId));
    if (opts.search) {
      const pattern = likePattern(opts.search);
      const match = or(
        ilike(customers.email, pattern),
        ilike(customers.firstName, pattern),
        ilike(customers.lastName, pattern),
      );
      if (match) conditions.push(match);
    }

    const where = and(...conditions);

    // Count runs alongside the page query — no extra database round trip.
    const [items, [{ value: totalCount }]] = await Promise.all([
      this.db
        .select()
        .from(customers)
        .where(where)
        .orderBy(desc(customers.createdAt), desc(customers.id))
        .limit(limit)
        .offset(offsetFor(page, limit)),
      this.db.select({ value: count() }).from(customers).where(where),
    ]);

    return {
      items,
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  }

  async update(
    customerId: string,
    orgId: string,
    data: Partial<
      Pick<
        Customer,
        | 'firstName'
        | 'lastName'
        | 'phone'
        | 'marketingOptIn'
        | 'status'
        | 'lastLoginAt'
        | 'groupId'
      >
    >,
  ): Promise<Customer | null> {
    const [row] = await this.db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(customers.id, customerId), eq(customers.organizationId, orgId)),
      )
      .returning();
    return row ?? null;
  }

  // ─── Addresses ────────────────────────────────────────────────────────────────

  async findAddresses(customerId: string, orgId: string): Promise<Address[]> {
    return this.db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.customerId, customerId),
          eq(addresses.organizationId, orgId),
        ),
      );
  }

  async findAddressById(
    addressId: string,
    customerId: string,
    orgId: string,
  ): Promise<Address | null> {
    const [row] = await this.db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.id, addressId),
          eq(addresses.customerId, customerId),
          eq(addresses.organizationId, orgId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async createAddress(
    customerId: string,
    orgId: string,
    data: {
      firstName: string;
      lastName: string;
      company?: string;
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode: string;
      countryCode: string;
      phone?: string;
      isDefault?: boolean;
    },
  ): Promise<Address> {
    if (data.isDefault) {
      await this.clearDefaultAddress(customerId, orgId);
    }
    const [address] = await this.db
      .insert(addresses)
      .values({
        organizationId: orgId,
        customerId,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company ?? null,
        line1: data.line1,
        line2: data.line2 ?? null,
        city: data.city,
        state: data.state ?? null,
        postalCode: data.postalCode,
        countryCode: data.countryCode,
        phone: data.phone ?? null,
        isDefault: data.isDefault ?? false,
      })
      .returning();
    return address;
  }

  async updateAddress(
    addressId: string,
    customerId: string,
    orgId: string,
    data: Partial<
      Omit<
        Address,
        'id' | 'customerId' | 'organizationId' | 'createdAt' | 'updatedAt'
      >
    >,
  ): Promise<Address | null> {
    if (data.isDefault) {
      await this.clearDefaultAddress(customerId, orgId);
    }
    const [row] = await this.db
      .update(addresses)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(addresses.id, addressId),
          eq(addresses.customerId, customerId),
          eq(addresses.organizationId, orgId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async deleteAddress(
    addressId: string,
    customerId: string,
    orgId: string,
  ): Promise<void> {
    await this.db
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, addressId),
          eq(addresses.customerId, customerId),
          eq(addresses.organizationId, orgId),
        ),
      );
  }

  private async clearDefaultAddress(
    customerId: string,
    orgId: string,
  ): Promise<void> {
    await this.db
      .update(addresses)
      .set({ isDefault: false })
      .where(
        and(
          eq(addresses.customerId, customerId),
          eq(addresses.organizationId, orgId),
          eq(addresses.isDefault, true),
        ),
      );
  }
}
