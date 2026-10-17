import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../authz/guards/permissions.guard';
import { DatabaseModule } from '../database/database.module';
import { CourtCharacteristicsController } from './court-characteristics.controller';
import { CourtManagementController } from './court-management.controller';
import { CourtManagementService } from './court-management.service';
import { CourtPhotoStorageService } from './court-photo-storage.service';
import { CourtPhotosController } from './court-photos.controller';
import { CourtPhotosService } from './court-photos.service';
import { SportsCenterTagsController } from './sports-center-tags.controller';
import { SportsCentersController } from './sports-centers.controller';
import { SportsCentersService } from './sports-centers.service';
import { VenueManagerScopeGuard } from './venue-manager-scope.guard';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [
    SportsCentersController,
    CourtManagementController,
    CourtCharacteristicsController,
    CourtPhotosController,
    SportsCenterTagsController,
  ],
  providers: [
    SportsCentersService,
    CourtManagementService,
    CourtPhotoStorageService,
    CourtPhotosService,
    VenueManagerScopeGuard,
    PermissionsGuard,
  ],
})
export class SportsCentersModule {}
