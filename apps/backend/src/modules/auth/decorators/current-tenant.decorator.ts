import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { TenantContext } from '../../../shared/tenant/tenant-context';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.tenantContext as TenantContext;
  },
);
