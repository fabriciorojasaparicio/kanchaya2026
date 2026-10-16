import { Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisRateLimitStorage } from './redis-rate-limit.storage';

@Injectable()
export class RateLimitStorageFactory implements OnModuleDestroy {
  readonly storage?: RedisRateLimitStorage;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (!redisUrl && config.get<string>('NODE_ENV') === 'production') {
      throw new Error('REDIS_URL es obligatorio para limitar solicitudes en producción.');
    }
    if (redisUrl) this.storage = new RedisRateLimitStorage(redisUrl);
  }

  onModuleDestroy(): void {
    this.storage?.close();
  }
}

@Module({
  providers: [RateLimitStorageFactory],
  exports: [RateLimitStorageFactory],
})
export class SecurityModule {}
