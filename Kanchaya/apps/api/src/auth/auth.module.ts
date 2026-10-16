import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { PermissionsGuard } from '../authz/guards/permissions.guard';
import { AuthSessionService } from './auth-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginController } from './login.controller';
import { LoginService } from './login.service';
import { LogoutController } from './logout.controller';
import { ProfileController } from './profile.controller';
import { ProfileSelfScopeGuard } from './profile-self-scope.guard';
import { RegisterController } from './register.controller';
import { RegistrationService } from './registration.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [RegisterController, LoginController, LogoutController, ProfileController],
  providers: [
    RegistrationService,
    LoginService,
    AuthSessionService,
    JwtAuthGuard,
    PermissionsGuard,
    ProfileSelfScopeGuard,
  ],
  exports: [AuthSessionService, JwtAuthGuard],
})
export class AuthModule {}
