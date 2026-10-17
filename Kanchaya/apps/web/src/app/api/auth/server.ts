import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isIP } from 'node:net';

export const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003';
export const SESSION_COOKIE = 'kanchaya_session';

const ERROR_MESSAGES: Record<number, { error: string; message: string }> = {
  400: { error: 'BAD_REQUEST', message: 'Revisa los datos e inténtalo de nuevo.' },
  401: { error: 'UNAUTHORIZED', message: 'Tu sesión expiró. Inicia sesión nuevamente.' },
  403: { error: 'FORBIDDEN', message: 'No tienes permiso para realizar esta acción.' },
  404: { error: 'NOT_FOUND', message: 'No se encontró el recurso solicitado.' },
  409: { error: 'CONFLICT', message: 'Ese dato ya existe. Revisa el formulario e inténtalo de nuevo.' },
  429: { error: 'RATE_LIMITED', message: 'Demasiados intentos. Espera un momento antes de volver a intentarlo.' },
  503: { error: 'SERVICE_UNAVAILABLE', message: 'La carga de fotos no está configurada en este entorno. Contacta al administrador de KanchaYA.' },
};

export function isSameOriginRequest(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}

export function safeError(status: number) {
  return ERROR_MESSAGES[status] ?? {
    error: 'UPSTREAM_ERROR',
    message: 'No pudimos completar la solicitud. Inténtalo de nuevo más tarde.',
  };
}

export function trustedClientIpHeader(request: Request): Record<string, string> {
  const clientIp = request.headers.get('x-real-ip');
  return clientIp && isIP(clientIp) ? { 'X-Forwarded-For': clientIp } : {};
}

export async function authCookie(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge,
  };
}

export async function proxyAuthRequest(path: string, init: RequestInit, request?: Request): Promise<NextResponse> {
  try {
    const headers = new Headers(init.headers);
    if (request) {
      for (const [name, value] of Object.entries(trustedClientIpHeader(request))) {
        headers.set(name, value);
      }
    }
    const upstream = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });
    if (upstream.ok) {
      const body = await upstream.json();
      return NextResponse.json(body, {
        status: upstream.status,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const safe = safeError(upstream.status);
    const retryAfter = upstream.headers.get('Retry-After-auth') ?? upstream.headers.get('Retry-After');
    return NextResponse.json(
      { statusCode: upstream.status, ...safe },
      {
        status: upstream.status,
        headers: {
          'Cache-Control': 'no-store',
          ...(retryAfter ? { 'Retry-After': retryAfter } : {}),
        },
      },
    );
  } catch {
    return NextResponse.json(
      { statusCode: 503, error: 'API_UNAVAILABLE', message: 'No pudimos conectar con KanchaYA.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function proxySessionRequest(
  path: string,
  init: RequestInit,
  request: Request,
  requireSameOrigin = false,
): Promise<NextResponse> {
  if (requireSameOrigin && !isSameOriginRequest(request)) {
    return NextResponse.json(
      { statusCode: 403, error: 'FORBIDDEN', message: 'Solicitud no permitida.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const token = await authCookie();
  if (!token) {
    return NextResponse.json(
      { statusCode: 401, ...safeError(401) },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await proxyAuthRequest(path, { ...init, headers }, request);
  if (response.status === 401) response.cookies.set(SESSION_COOKIE, '', cookieOptions(0));
  return response;
}
