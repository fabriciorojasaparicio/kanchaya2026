import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Put,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RequirePermissions } from '../authz/decorators/require-permissions.decorator';
import { Permission } from '../authz/permissions';
import { PermissionsGuard } from '../authz/guards/permissions.guard';
import { AuthorizationScope } from '../authz/scopes';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedRequest } from './auth-session.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ProfileSelfScopeGuard } from './profile-self-scope.guard';
import { UpdateProfileDto } from './update-profile.dto';

interface ProfileRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  city: string | null;
  createdAt: Date;
}

@Controller('auth')
@UseGuards(JwtAuthGuard, ProfileSelfScopeGuard, PermissionsGuard)
export class ProfileController {
  constructor(private readonly database: DatabaseService) {}

  @Get('profile')
  @RequirePermissions({
    permission: Permission.PROFILE_READ_SELF,
    scope: AuthorizationScope.SELF,
  })
  async profile(@Req() request: AuthenticatedRequest) {
    const result = await this.database.query<ProfileRecord>(
      `SELECT u."id", u."email", u."status", u."createdAt",
              r."name" AS "role", p."firstName", p."lastName",
              p."displayName", p."city"
       FROM "user" u
       JOIN "userRole" ur ON ur."userId" = u."id"
       JOIN "role" r ON r."id" = ur."roleId"
       JOIN "profile" p ON p."userId" = u."id"
       WHERE u."id" = $1 AND r."name" = $2
       LIMIT 1`,
      [request.user.id, request.user.role],
    );
    const profile = result.rows[0];
    if (!profile) throw new NotFoundException('No encontramos tu perfil.');

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      name: profile.displayName || `${profile.firstName} ${profile.lastName}`.trim(),
      city: profile.city,
      createdAt: profile.createdAt,
    };
  }

  @Put('profile')
  @RequirePermissions({
    permission: Permission.PROFILE_UPDATE_SELF,
    scope: AuthorizationScope.SELF,
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateProfileDto,
  ) {
    const name = input.name.trim().replace(/\s+/g, ' ');
    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const lastName = lastNameParts.join(' ');
    const city = input.city?.trim().replace(/\s+/g, ' ') || null;

    await this.database.transaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `UPDATE "profile"
         SET "firstName" = $2, "lastName" = $3, "displayName" = $4,
             "city" = $5, "updatedAt" = NOW()
         WHERE "userId" = $1
         RETURNING "id"`,
        [request.user.id, firstName, lastName, name, city],
      );
      const profileId = result.rows[0]?.id;
      if (!profileId) throw new NotFoundException('No encontramos tu perfil.');

      await client.query(
        `INSERT INTO "auditLog"
           ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
         VALUES ($1, $2, 'PROFILE_UPDATED', 'PROFILE', $3, $4::json, NOW())`,
        [
          randomUUID(),
          request.user.id,
          profileId,
          JSON.stringify({ fields: ['name', 'city'] }),
        ],
      );
    });

    return this.profile(request);
  }
}
