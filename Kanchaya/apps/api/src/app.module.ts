import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AuthzModule } from './authz/authz.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from "./audit/audit.module";
import { RateLimitStorageFactory, SecurityModule } from './security/security.module';
import { SafeExceptionFilter } from './security/safe-exception.filter';

export const { ObserveModule, ObserveInstrument } = createObserveModule({
  // Do not transmit application source fragments with captured exceptions.
  sourceContext: false,
});

@Module({
  imports: [
    AuthModule,
    AuthzModule,
    AuditModule,
    SecurityModule,
    ThrottlerModule.forRootAsync({
      imports: [SecurityModule],
      inject: [RateLimitStorageFactory],
      useFactory: (rateLimitStorage: RateLimitStorageFactory) => ({
        throttlers: [
          { name: 'default', limit: 120, ttl: 60_000 },
          { name: 'auth', limit: 5, ttl: 60_000 },
        ],
        storage: rateLimitStorage.storage,
        errorMessage: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
      }),
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        appKey: config.get<string>('OBSERVE_APP_KEY') ?? '',
        appSecret: config.get<string>('OBSERVE_APP_SECRET') ?? '',
        serviceId: 'kanchaya-api',
        redaction: {
          enabled: true,
          keys: [
            'authorization',
            'cookie',
            'set-cookie',
            'password',
            'token',
            'refreshToken',
            'accessToken',
            'email',
            'phone',
          ],
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: SafeExceptionFilter },
  ],
})
export class AppModule {}
