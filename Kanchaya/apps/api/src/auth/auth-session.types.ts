import { Role } from '../authz/roles';
import { UserStatus } from '../authz/user-status';
import type { Request } from 'express';

export interface SessionClaims {
  sub: string;
  jti: string;
  role: Role;
  exp: number;
}

export interface AuthenticatedSession extends SessionClaims {
  id: string;
  status: UserStatus;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedSession;
}
