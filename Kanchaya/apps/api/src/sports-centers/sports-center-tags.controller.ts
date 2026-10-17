import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RequirePermissions } from '../authz/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../authz/guards/permissions.guard';
import { Permission } from '../authz/permissions';
import { AuthorizationScope } from '../authz/scopes';
import type { AuthenticatedRequest } from '../auth/auth-session.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CourtManagementService } from './court-management.service';
import { CreateSportsCenterTagDto } from './create-sports-center-tag.dto';
import { UpdateSportsCenterTagDto } from './update-sports-center-tag.dto';

@Controller('sports-center-tags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SportsCenterTagsController {
  constructor(private readonly courts: CourtManagementService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.SPORTS_CENTER_TAG_READ,
    scope: AuthorizationScope.ANY,
  })
  list() {
    return this.courts.listSportsCenterTags();
  }

  @Post()
  @RequirePermissions({
    permission: Permission.SPORTS_CENTER_TAG_MANAGE,
    scope: AuthorizationScope.ANY,
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateSportsCenterTagDto,
  ) {
    return this.courts.createSportsCenterTag(request.user.id, input.name);
  }

  @Put(':tagId')
  @RequirePermissions({
    permission: Permission.SPORTS_CENTER_TAG_MANAGE,
    scope: AuthorizationScope.ANY,
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  update(
    @Req() request: AuthenticatedRequest,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @Body() input: UpdateSportsCenterTagDto,
  ) {
    return this.courts.updateSportsCenterTag(
      request.user.id,
      tagId,
      input.name,
      input.isActive,
    );
  }
}
