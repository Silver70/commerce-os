import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PERMISSIONS, Permission } from '../constants/permissions';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permission) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const role = request.tenantContext?.role;

    if (!role) {
      throw new ForbiddenException('No role assigned');
    }

    const allowedRoles = PERMISSIONS[permission] as readonly string[];
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException(
        `Role '${role}' is not allowed to perform '${permission}'`,
      );
    }

    return true;
  }
}
