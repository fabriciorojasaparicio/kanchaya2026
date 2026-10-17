import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-session.types';
import { Role } from '../authz/roles';
import type { ResourceOwnership } from '../authz/authorization.types';
import { DatabaseService } from '../database/database.service';

type ScopedRequest = AuthenticatedRequest & {
  params: Record<string, string | undefined>;
  resource?: ResourceOwnership;
};

@Injectable()
export class VenueManagerScopeGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ScopedRequest>();
    if (!request.user?.id) throw new UnauthorizedException();
    if (request.user.role !== Role.VENUE_MANAGER) throw new ForbiddenException();

    const result = await this.database.query(
      `SELECT 1 FROM "centerManager"
       WHERE "userId" = $1 AND "revokedAt" IS NULL
         AND ($2::text IS NULL OR "centerId" = $2)
       LIMIT 1`,
      [request.user.id, request.params.centerId ?? null],
    );
    if (!result.rowCount) throw new ForbiddenException('No tienes acceso a este centro deportivo.');

    request.resource = { venueOwnerUserId: request.user.id };
    return true;
  }
}
