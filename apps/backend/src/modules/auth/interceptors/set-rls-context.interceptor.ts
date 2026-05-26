import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { setRlsContext } from '../../../shared/tenant/rls.setup';

@Injectable()
export class SetRlsContextInterceptor implements NestInterceptor {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const orgId = request.tenantContext?.organizationId;

    if (orgId) {
      try {
        await setRlsContext(this.db, orgId);
      } catch {
        // RLS context setting is best-effort for non-transactional queries
      }
    }

    return next.handle();
  }
}
