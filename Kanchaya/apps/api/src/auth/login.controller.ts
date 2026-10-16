import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { LoginDto } from './login.dto';
import { LoginService } from './login.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  login(@Body() input: LoginDto) {
    return this.loginService.login(input);
  }
}
