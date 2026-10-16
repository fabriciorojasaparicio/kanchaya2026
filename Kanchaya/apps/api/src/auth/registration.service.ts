import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Role } from '../authz/roles';
import { DatabaseService } from '../database/database.service';
import { RegisterAccountDto } from './register-account.dto';
import { hashPassword } from './password-hash';

interface CreatedAccount {
  id: string;
  createdAt: Date;
}

@Injectable()
export class RegistrationService {
  constructor(private readonly database: DatabaseService) {}

  async register(input: RegisterAccountDto) {
    const name = input.name.trim();
    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const lastName = lastNameParts.join(' ');
    const email = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);
    const userId = randomUUID();

    try {
      const account = await this.database.transaction(async (client) => {
        const roleResult = await client.query<{ id: string }>(
          'SELECT "id" FROM "role" WHERE "name" = $1',
          [Role.PLAYER],
        );
        const roleId = roleResult.rows[0]?.id;
        if (!roleId) {
          throw new InternalServerErrorException(
            'Los roles iniciales no están cargados',
          );
        }

        const userResult = await client.query<CreatedAccount>(
          `INSERT INTO "user"
             ("id", "email", "passwordHash", "status", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
           RETURNING "id", "createdAt"`,
          [userId, email, passwordHash],
        );

        await client.query(
          `INSERT INTO "profile"
             ("id", "userId", "firstName", "lastName", "displayName", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [randomUUID(), userId, firstName, lastName, name],
        );

        await client.query(
          `INSERT INTO "userRole" ("id", "userId", "roleId", "createdAt")
           VALUES ($1, $2, $3, NOW())`,
          [randomUUID(), userId, roleId],
        );

        await client.query(
          `INSERT INTO "auditLog"
             ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
           VALUES ($1, $2, 'ACCOUNT_CREATED', 'USER', $2, $3::json, NOW())`,
          [randomUUID(), userId, JSON.stringify({ role: Role.PLAYER })],
        );

        return userResult.rows[0];
      });

      return {
        id: account.id,
        name,
        email,
        role: Role.PLAYER,
        status: 'ACTIVE',
        createdAt: account.createdAt,
      };
    } catch (error) {
      if (isDuplicateEmail(error)) {
        throw new ConflictException('Ese correo ya está registrado.');
      }
      throw error;
    }
  }
}

function isDuplicateEmail(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const databaseError = error as { code?: string; constraint?: string };
  return (
    databaseError.code === '23505' &&
    databaseError.constraint === 'user_email_key'
  );
}
