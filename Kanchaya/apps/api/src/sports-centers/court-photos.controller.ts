import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { VenueManagerScopeGuard } from './venue-manager-scope.guard';
import { CreateCourtPhotoUploadDto } from './create-court-photo-upload.dto';
import { CourtPhotosService } from './court-photos.service';

@Controller()
export class CourtPhotosController {
  constructor(private readonly photos: CourtPhotosService) {}

  @Get('sports-centers/:centerId/courts/:courtId/photos')
  listPublic(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
  ) {
    return this.photos.listPublic(centerId, courtId);
  }

  @Get('sports-centers/managed/:centerId/courts/:courtId/photos')
  @UseGuards(JwtAuthGuard, VenueManagerScopeGuard, PermissionsGuard)
  @RequirePermissions({
    permission: Permission.COURT_READ,
    scope: AuthorizationScope.OWN_VENUE,
  })
  listManaged(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
  ) {
    return this.photos.listManaged(request.user.id, centerId, courtId);
  }

  @Post('sports-centers/managed/:centerId/courts/:courtId/photos/upload-url')
  @UseGuards(JwtAuthGuard, VenueManagerScopeGuard, PermissionsGuard)
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
  createUploadUrl(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
    @Body() input: CreateCourtPhotoUploadDto,
  ) {
    return this.photos.createUploadUrl(
      request.user.id,
      centerId,
      courtId,
      input,
    );
  }

  @Post(
    'sports-centers/managed/:centerId/courts/:courtId/photos/:photoId/complete',
  )
  @UseGuards(JwtAuthGuard, VenueManagerScopeGuard, PermissionsGuard)
  @RequirePermissions({
    permission: Permission.COURT_UPDATE,
    scope: AuthorizationScope.OWN_VENUE,
  })
  completeUpload(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.photos.completeUpload(
      request.user.id,
      centerId,
      courtId,
      photoId,
    );
  }

  @Delete('sports-centers/managed/:centerId/courts/:courtId/photos/:photoId')
  @UseGuards(JwtAuthGuard, VenueManagerScopeGuard, PermissionsGuard)
  @RequirePermissions({
    permission: Permission.COURT_UPDATE,
    scope: AuthorizationScope.OWN_VENUE,
  })
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.photos.delete(request.user.id, centerId, courtId, photoId);
  }
}
