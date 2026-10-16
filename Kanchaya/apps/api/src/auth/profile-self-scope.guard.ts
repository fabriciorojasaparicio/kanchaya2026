import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { ResourceOwnership } from '../authz/authorization.types';
import type { AuthenticatedRequest } from './auth-session.types';

type ProfileRequest = AuthenticatedRequest & { resource?: ResourceOwnership };

@Injectable()
export class ProfileSelfScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ProfileRequest>();
    request.resource = { ownerUserId: request.user.id };
    return true;
  }
}
