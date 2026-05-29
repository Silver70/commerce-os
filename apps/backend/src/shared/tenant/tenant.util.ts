import { BadRequestException } from '@nestjs/common';
import type { TenantContext } from './tenant-context';

/**
 * Extracts a guaranteed `storeId` from a TenantContext. Use in services that
 * operate on store-scoped data; admin org-level endpoints should not call this.
 */
export function requireStoreContext(ctx: TenantContext): {
  organizationId: string;
  storeId: string;
} {
  if (!ctx.storeId) {
    throw new BadRequestException(
      'Active store required for this operation. Provide X-Store-Id header.',
    );
  }
  return { organizationId: ctx.organizationId, storeId: ctx.storeId };
}
