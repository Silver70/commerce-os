import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../services/audit.service';

export function AuditInterceptor(entityType: string, action: string) {
  @Injectable()
  class Interceptor implements NestInterceptor {
    constructor(public readonly auditService: AuditService) {}

    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<unknown> {
      const request = context.switchToHttp().getRequest<Request>();
      const tenant = request.tenantContext;

      return next.handle().pipe(
        tap((responseData: Record<string, unknown> | null | undefined) => {
          if (!tenant?.organizationId) return;

          const id = responseData?.['id'];
          const paramId = request.params['id'];
          const entityId: string =
            (typeof id === 'string' ? id : undefined) ??
            (typeof paramId === 'string' ? paramId : undefined) ??
            'unknown';

          this.auditService
            .log({
              entityType,
              entityId,
              action,
              actorType: tenant.userId ? 'admin' : 'customer',
              actorId: tenant.userId ?? tenant.customerId,
              organizationId: tenant.organizationId,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            })
            .catch(() => {});
        }),
      );
    }
  }

  return Interceptor;
}
