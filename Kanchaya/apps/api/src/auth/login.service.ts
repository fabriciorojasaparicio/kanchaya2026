import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Role } from '../authz/roles';
import { UserStatus } from '../authz/user-status';
import { DatabaseService } from '../database/database.service';
import { AuthSessionService } from './auth-session.service';
import { LoginDto } from './login.dto';
import { createDummyPasswordHash, verifyPassword } from './password-hash';

interface LoginCandidate {
  id: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  role: Role;
}

@Injectable()
export class LoginService {
  private readonly dummyPasswordHash = createDummyPasswordHash(randomUUID());

  constructor(
    private readonly database: DatabaseService,
    private readonly sessions: AuthSessionService,
  ) {}

  async login(input: LoginDto) {
    const candidateResult = await this.database.query<LoginCandidate>(
      `SELECT u."id", u."email", u."passwordHash", u."status", r."name" AS "role"
       FROM "user" u
       JOIN "userRole" ur ON ur."userId" = u."id"
       JOIN "role" r ON r."id" = ur."roleId"
       WHERE LOWER(u."email") = $1
       ORDER BY ur."createdAt", r."name"
       LIMIT 1`,
      [input.email],
    );
    const candidate = candidateResult.rows[0];
    let passwordMatches = false;
    try {
      passwordMatches = await verifyPassword(
        candidate?.passwordHash ?? (await this.dummyPasswordHash),
        input.password,
      );
    } catch {
      passwordMatches = false;
    }

    if (
      !candidate ||
      !passwordMatches ||
      candidate.status !== UserStatus.ACTIVE ||
      !isRole(candidate.role)
    ) {
      await this.recordFailedLogin();
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const accessToken = await this.sessions.issueAccessToken(
      candidate.id,
      candidate.role,
    );
    const loggedIn = await this.database.transaction(async (client) => {
      const activeUser = await client.query(
        `UPDATE "user" u
         SET "lastLoginAt" = NOW(), "updatedAt" = NOW()
         WHERE u."id" = $1
           AND u."status" = 'ACTIVE'
           AND EXISTS (
             SELECT 1 FROM "userRole" ur
             JOIN "role" r ON r."id" = ur."roleId"
             WHERE ur."userId" = u."id" AND r."name" = $2
           )
         RETURNING u."id"`,
        [candidate.id, candidate.role],
      );
      if (!activeUser.rowCount) return false;

      await client.query(
        `INSERT INTO "auditLog"
           ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
         VALUES ($1, $2, 'LOGIN_SUCCEEDED', 'USER', $2, $3::json, NOW())`,
        [randomUUID(), candidate.id, JSON.stringify({ role: candidate.role })],
      );
      return true;
    });

    if (!loggedIn) {
      await this.recordFailedLogin();
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.sessions.getAccessTokenLifetimeSeconds(),
      user: {
        id: candidate.id,
        email: candidate.email,
        role: candidate.role,
      },
    };
  }

  private async recordFailedLogin(): Promise<void> {
    await this.database.query(
      `INSERT INTO "auditLog"
         ("id", "action", "entityType", "metadata", "createdAt")
       VALUES ($1, 'LOGIN_FAILED', 'AUTHENTICATION', $2::json, NOW())`,
      [randomUUID(), JSON.stringify({ reason: 'INVALID_CREDENTIALS' })],
    );
  }
}

function isRole(value: Role): value is Role {
  return Object.values(Role).includes(value);
}
