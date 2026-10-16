import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (process.env.NODE_ENV === 'production') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000');
    }
    next();
  });
  const jwtSecret = app.get(ConfigService).get<string>('JWT_SECRET');
  if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET debe configurarse con al menos 32 bytes aleatorios.');
  }
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? process.env.WEB_ORIGIN ?? 'http://localhost:3002')
    .split(',')
    .map((origin) => normalizeOrigin(origin));
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
    throw new Error('TRUST_PROXY_HOPS debe ser un entero entre 0 y 10.');
  }
  expressApp.set('trust proxy', trustProxyHops);
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    exposedHeaders: [
      'Retry-After',
      'Retry-After-auth',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-RateLimit-Limit-auth',
      'X-RateLimit-Remaining-auth',
      'X-RateLimit-Reset-auth',
    ],
    maxAge: 600,
    credentials: false,
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3003);
}

function normalizeOrigin(value: string): string {
  const origin = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('CORS_ALLOWED_ORIGINS debe contener orígenes HTTP o HTTPS válidos.');
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.origin !== origin.replace(/\/$/, '') ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error('CORS_ALLOWED_ORIGINS debe contener orígenes HTTP o HTTPS sin rutas ni comodines.');
  }
  return parsed.origin;
}

void bootstrap();
