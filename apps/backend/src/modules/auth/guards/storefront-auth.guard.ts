import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ApiKeyService } from '../services/api-key.service';
import { CustomerAuthService } from '../services/customer-auth.service';

@Injectable()
export class StorefrontAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly customerAuthService: CustomerAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.getType<string>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext<{ req: Request }>().req
        : context.switchToHttp().getRequest<Request>();

    const rawHeader = request.headers['x-api-key'];
    const rawKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!rawKey) {
      throw new UnauthorizedException('X-API-Key header required');
    }

    const { organizationId, storeId } = await this.apiKeyService.lookup(rawKey);
    request.tenantContext = { organizationId, storeId };

    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const payload = this.customerAuthService.verifyToken(token);
        if (payload.organizationId === organizationId) {
          request.tenantContext.customerId = payload.customerId;
        }
      } catch {
        // customer token is optional — ignore invalid tokens
      }
    }

    return true;
  }
}
