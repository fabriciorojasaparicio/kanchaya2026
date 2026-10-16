import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RegisterAccountDto } from './register-account.dto';
import { RegistrationService } from './registration.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class RegisterController {
  constructor(private readonly registration: RegistrationService) {}

  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  register(@Body() input: RegisterAccountDto) {
    return this.registration.register(input);
  }
}
