import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { apiKeys } from '../../../shared/database/schema';

@Injectable()
export class ApiKeyService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async generate(orgId: string, name: string, createdBy?: string) {
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);

    const [record] = await this.db
      .insert(apiKeys)
      .values({
        organizationId: orgId,
        name,
        keyHash,
        keyPrefix,
        createdBy,
      })
      .returning();

    return { ...record, rawKey };
  }

  async lookup(rawKey: string): Promise<string> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const [record] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
      .limit(1);

    if (!record) {
      throw new UnauthorizedException('Invalid API key');
    }

    await this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, record.id));

    return record.organizationId;
  }

  async revoke(id: string, orgId: string): Promise<void> {
    const [record] = await this.db
      .update(apiKeys)
      .set({ isActive: false })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, orgId)))
      .returning();

    if (!record) {
      throw new NotFoundException('API key not found');
    }
  }

  async listByOrg(orgId: string) {
    return this.db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        isActive: apiKeys.isActive,
        createdBy: apiKeys.createdBy,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, orgId));
  }
}
