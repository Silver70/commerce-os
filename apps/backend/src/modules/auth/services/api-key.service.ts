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
import type { ApiKey } from '../../../shared/database/schema';

export interface ApiKeyLookupResult {
  organizationId: string;
  storeId: string;
}

export interface GeneratedApiKey extends ApiKey {
  rawKey: string;
}

@Injectable()
export class ApiKeyService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async generate(
    orgId: string,
    storeId: string,
    name: string,
    createdBy?: string,
  ): Promise<GeneratedApiKey> {
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);

    const [record] = await this.db
      .insert(apiKeys)
      .values({
        organizationId: orgId,
        storeId,
        name,
        keyHash,
        keyPrefix,
        createdBy,
      })
      .returning();

    return { ...record, rawKey };
  }

  async lookup(rawKey: string): Promise<ApiKeyLookupResult> {
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

    return {
      organizationId: record.organizationId,
      storeId: record.storeId,
    };
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
        storeId: apiKeys.storeId,
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

  async listByStore(storeId: string) {
    return this.db
      .select({
        id: apiKeys.id,
        storeId: apiKeys.storeId,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        isActive: apiKeys.isActive,
        createdBy: apiKeys.createdBy,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.storeId, storeId));
  }
}
