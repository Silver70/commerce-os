import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { WorkosAuthService } from '../services/workos-auth.service';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly workosAuth: WorkosAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token =
      (request.cookies as Record<string, string> | undefined)?.[
        'wos-session'
      ] ?? request.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('No session token provided');
    }

    const session = await this.workosAuth.verifyToken(token);

    const organizationId = session.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException(
        'No organization associated with session',
      );
    }

    const membership = await this.workosAuth.getOrganizationMembership(
      session.userId,
      organizationId,
    );

    const roleSlug = (membership?.role as { slug: string } | null | undefined)
      ?.slug;
    const role = roleSlug as TenantContext['role'];

    request.tenantContext = {
      organizationId,
      userId: session.userId,
      email: session.user?.email,
      role,
    };

    return true;
  }
}
