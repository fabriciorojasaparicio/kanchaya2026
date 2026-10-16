import type { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

const INCREMENT_SCRIPT = `
local activeBlock = redis.call('PTTL', KEYS[2])
if activeBlock > 0 then
  local hits = tonumber(redis.call('GET', KEYS[2]) or ARGV[3])
  return { hits, redis.call('PTTL', KEYS[1]), 1, activeBlock }
end

local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local remaining = redis.call('PTTL', KEYS[1])
if hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], hits, 'PX', ARGV[3])
  return { hits, remaining, 1, tonumber(ARGV[3]) }
end
return { hits, remaining, 0, 0 }
`;

export class RedisRateLimitStorage implements ThrottlerStorage {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      connectTimeout: 3_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (attempt) => (attempt <= 3 ? attempt * 100 : null),
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const storageKey = `kanchaya:rate-limit:${throttlerName}:${key}`;
    const [totalHits, remainingTtl, isBlocked, blockTtl] = (await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      storageKey,
      `${storageKey}:block`,
      String(ttl),
      String(limit),
      String(blockDuration),
    )) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: Math.max(0, Math.ceil(remainingTtl / 1000)),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.max(0, Math.ceil(blockTtl / 1000)),
    };
  }

  close(): void {
    this.redis.disconnect();
  }
}
