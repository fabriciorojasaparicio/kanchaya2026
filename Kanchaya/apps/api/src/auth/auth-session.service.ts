import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { Role } from '../authz/roles';
import { UserStatus } from '../authz/user-status';
import { DatabaseService } from '../database/database.service';
import { AuthenticatedSession, SessionClaims } from './auth-session.types';

interface CurrentUser {
  status: UserStatus;
  role: Role | null;
}

const TOKEN_ISSUER = 'kanchaya-api';
const TOKEN_AUDIENCE = 'kanchaya-clients';
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 3600;

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  /** Called by the login module to issue a token compatible with logout. */
  issueAccessToken(userId: string, role: Role): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, jti: randomUUID(), role },
      {
        secret: this.jwtSecret(),
        expiresIn: this.getAccessTokenLifetimeSeconds(),
        algorithm: 'HS256',
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
      },
    );
  }

  async authenticate(token: string): Promise<AuthenticatedSession> {
    const secret = this.jwtSecret();
    let claims: SessionClaims;

    try {
      claims = await this.jwt.verifyAsync<SessionClaims>(token, {
        secret,
        algorithms: ['HS256'],
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException('La sesión no es válida.');
    }

    if (
      !claims.sub ||
      !claims.jti ||
      !isRole(claims.role) ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException('La sesión no es válida.');
    }

    const revoked = await this.database.query(
      `SELECT 1 FROM "auditLog"
       WHERE "action" = 'SESSION_REVOKED'
         AND "entityType" = 'AUTH_SESSION'
         AND "entityId" = $1
       LIMIT 1`,
      [claims.jti],
    );
    if (revoked.rowCount) {
      throw new UnauthorizedException('La sesión ya fue cerrada.');
    }

    const userResult = await this.database.query<CurrentUser>(
      `SELECT u."status", r."name" AS "role"
       FROM "user" u
       LEFT JOIN "userRole" ur ON ur."userId" = u."id"
       LEFT JOIN "role" r ON r."id" = ur."roleId"
       WHERE u."id" = $1 AND r."name" = $2
       LIMIT 1`,
      [claims.sub, claims.role],
    );
    const user = userResult.rows[0];
    if (!user || user.status !== UserStatus.ACTIVE || user.role !== claims.role) {
      throw new UnauthorizedException('La sesión no es válida.');
    }

    return { ...claims, id: claims.sub, role: user.role, status: user.status };
  }

  async logout(session: AuthenticatedSession): Promise<{ loggedOut: true }> {
    await this.database.query(
      `INSERT INTO "auditLog"
         ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
       VALUES ($1, $2, 'SESSION_REVOKED', 'AUTH_SESSION', $3, $4::json, NOW())`,
      [
        randomUUID(),
        session.id,
        session.jti,
        JSON.stringify({ expiresAt: new Date(session.exp * 1000).toISOString() }),
      ],
    );

    return { loggedOut: true };
  }

  private jwtSecret(): string {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
      throw new InternalServerErrorException(
        'JWT_SECRET debe tener al menos 32 bytes aleatorios.',
      );
    }
    return secret;
  }

  getAccessTokenLifetimeSeconds(): number {
    const configured = this.config.get<string>('ACCESS_TOKEN_TTL_SECONDS');
    if (configured === undefined || configured.trim() === '') {
      return DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
    }

    const lifetime = Number(configured);
    if (!Number.isInteger(lifetime) || lifetime < 300 || lifetime > 86_400) {
      throw new InternalServerErrorException(
        'ACCESS_TOKEN_TTL_SECONDS debe ser un entero entre 300 y 86400.',
      );
    }
    return lifetime;
  }
}

function isRole(value: Role | null): value is Role {
  return value !== null && Object.values(Role).includes(value);
}
