import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthSessionService } from './auth-session.service';
import type { AuthenticatedRequest } from './auth-session.types';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class LogoutController {
  constructor(private readonly sessions: AuthSessionService) {}

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() request: AuthenticatedRequest) {
    return this.sessions.logout(request.user);
  }
}
