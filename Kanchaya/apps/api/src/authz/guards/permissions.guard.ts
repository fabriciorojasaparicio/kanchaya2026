import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  AUTHORIZATION_KEY,
  RequiredPermission,
} from "../decorators/require-permissions.decorator";
import { authorize } from "../authorization";
import type { AuthorizationContext, ResourceOwnership } from "../authorization.types";
import { Role } from "../roles";
import { UserStatus } from "../user-status";

interface AuthenticatedRequest {
  user?: {
    id?: string;
    role?: Role;
    status?: UserStatus;
  };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<RequiredPermission[]>(
        AUTHORIZATION_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user?.id || !user.role) {
      throw new UnauthorizedException();
    }
    if (!user.status) {
      throw new UnauthorizedException();
    }

    const ownership = this.getOwnership(request);

    const authorized = requiredPermissions.some(
      ({ permission, scope }) => {
        const authorizationContext: AuthorizationContext = {
          userId: user.id!,
          role: user.role!,
          status: user.status!,
          permission,
          scope,
        };

        return authorize(authorizationContext, ownership);
      },
    );

    if (!authorized) {
      throw new ForbiddenException(
        "Insufficient permissions",
      );
    }

    return true;
  }

  private getOwnership(
    request: AuthenticatedRequest,
  ): ResourceOwnership {
    const resource = (request as AuthenticatedRequest & {
      resource?: ResourceOwnership;
    }).resource;

    return resource ?? {};
  }
}
