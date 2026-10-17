import {
  Body,
  Controller,
  Get,
  Patch,
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
import { Permission } from '../authz/permissions';
import { PermissionsGuard } from '../authz/guards/permissions.guard';
import { AuthorizationScope } from '../authz/scopes';
import type { AuthenticatedRequest } from '../auth/auth-session.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CourtManagementService } from './court-management.service';
import { VenueManagerScopeGuard } from './venue-manager-scope.guard';
import { SaveCourtDto } from './save-court.dto';
import { UpdateCourtPriceDto } from './update-court-price.dto';
import { UpdateCenterOpeningHoursDto } from './update-center-opening-hours.dto';
import { UpdateSportsCenterTagsDto } from './update-sports-center-tags.dto';

@Controller('sports-centers/managed')
@UseGuards(JwtAuthGuard, VenueManagerScopeGuard, PermissionsGuard)
export class CourtManagementController {
  constructor(private readonly courts: CourtManagementService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.COURT_READ,
    scope: AuthorizationScope.OWN_VENUE,
  })
  listManagedCenters(@Req() request: AuthenticatedRequest) {
    return this.courts.listManagedCenters(request.user.id);
  }

  @Patch(':centerId/opening-hours')
  @RequirePermissions({
    permission: Permission.COURT_UPDATE,
    scope: AuthorizationScope.OWN_VENUE,
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  updateCenterOpeningHours(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Body() input: UpdateCenterOpeningHoursDto,
  ) {
    return this.courts.updateCenterOpeningHours(
      request.user.id,
      centerId,
      input.hours,
    );
  }

  @Patch(':centerId/tags')
  @RequirePermissions({
    permission: Permission.COURT_UPDATE,
    scope: AuthorizationScope.OWN_VENUE,
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  updateCenterTags(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Body() input: UpdateSportsCenterTagsDto,
  ) {
    return this.courts.updateCenterTags(
      request.user.id,
      centerId,
      input.tagIds,
    );
  }

  @Post(':centerId/courts/:courtId/publish')
  @RequirePermissions({
    permission: Permission.COURT_UPDATE,
    scope: AuthorizationScope.OWN_VENUE,
  })
  publishCourt(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
  ) {
    return this.courts.publishCourt(request.user.id, centerId, courtId);
  }

  @Post(':centerId/courts/:courtId/withdraw')
  @RequirePermissions({
    permission: Permission.COURT_UPDATE,
    scope: AuthorizationScope.OWN_VENUE,
  })
  withdrawCourt(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
  ) {
    return this.courts.withdrawCourt(request.user.id, centerId, courtId);
  }

  @Post(':centerId/courts')
  @RequirePermissions({
    permission: Permission.COURT_CREATE,
    scope: AuthorizationScope.OWN_VENUE,
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  createCourt(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Body() input: SaveCourtDto,
  ) {
    return this.courts.createCourt(request.user.id, centerId, input);
  }

  @Put(':centerId/courts/:courtId')
  @RequirePermissions({
    permission: Permission.COURT_UPDATE,
    scope: AuthorizationScope.OWN_VENUE,
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  updateCourt(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
    @Body() input: SaveCourtDto,
  ) {
    return this.courts.updateCourt(request.user.id, centerId, courtId, input);
  }

  @Patch(':centerId/courts/:courtId/price')
  @RequirePermissions({
    permission: Permission.PRICE_MANAGE,
    scope: AuthorizationScope.OWN_VENUE,
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  updateCourtPrice(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
    @Body() input: UpdateCourtPriceDto,
  ) {
    return this.courts.updateCourtPrice(
      request.user.id,
      centerId,
      courtId,
      input.hourlyPriceCentimos,
    );
  }
}
