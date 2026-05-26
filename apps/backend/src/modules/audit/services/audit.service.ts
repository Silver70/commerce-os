import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { auditLogs } from '../../../shared/database/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export interface AuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  actorType: string;
  actorId?: string;
  changes?: Record<string, any>;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.db.insert(auditLogs).values({
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorType: input.actorType,
      actorId: input.actorId,
      changes: input.changes ?? null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }

  async query(params: {
    organizationId: string;
    entityType?: string;
    actorId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const conditions: SQL[] = [
      eq(auditLogs.organizationId, params.organizationId),
    ];

    if (params.entityType) {
      conditions.push(eq(auditLogs.entityType, params.entityType));
    }
    if (params.actorId) {
      conditions.push(eq(auditLogs.actorId, params.actorId));
    }
    if (params.from) {
      conditions.push(gte(auditLogs.createdAt, params.from));
    }
    if (params.to) {
      conditions.push(lte(auditLogs.createdAt, params.to));
    }

    return this.db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(params.limit ?? 50)
      .offset(params.offset ?? 0);
  }
}
