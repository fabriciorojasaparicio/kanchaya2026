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
import { Permission } from '../authz/permissions';
import { PermissionsGuard } from '../authz/guards/permissions.guard';
import { AuthorizationScope } from '../authz/scopes';
import type { AuthenticatedRequest } from '../auth/auth-session.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CourtManagementService } from './court-management.service';
import { CreateCourtCharacteristicDto } from './create-court-characteristic.dto';
import { UpdateCourtCharacteristicDto } from './update-court-characteristic.dto';

@Controller('court-characteristics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CourtCharacteristicsController {
  constructor(private readonly courts: CourtManagementService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.COURT_CHARACTERISTIC_READ,
    scope: AuthorizationScope.ANY,
  })
  list() {
    return this.courts.listCharacteristics();
  }

  @Post()
  @RequirePermissions({
    permission: Permission.COURT_CHARACTERISTIC_MANAGE,
    scope: AuthorizationScope.ANY,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateCourtCharacteristicDto) {
    return this.courts.createCharacteristic(request.user.id, input.name);
  }

  @Put(':characteristicId')
  @RequirePermissions({
    permission: Permission.COURT_CHARACTERISTIC_MANAGE,
    scope: AuthorizationScope.ANY,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  update(
    @Req() request: AuthenticatedRequest,
    @Param('characteristicId', ParseUUIDPipe) characteristicId: string,
    @Body() input: UpdateCourtCharacteristicDto,
  ) {
    return this.courts.updateCharacteristic(request.user.id, characteristicId, input.name, input.isActive);
  }
}
