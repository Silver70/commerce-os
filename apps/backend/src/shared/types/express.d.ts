import type { TenantContext } from '../tenant/tenant-context';

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}
