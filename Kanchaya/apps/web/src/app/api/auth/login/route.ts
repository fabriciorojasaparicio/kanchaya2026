import { NextResponse } from 'next/server';
import { API_URL, cookieOptions, isSameOriginRequest, safeError, SESSION_COOKIE, trustedClientIpHeader } from '../server';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ statusCode: 403, error: 'FORBIDDEN', message: 'Solicitud no permitida.' }, { status: 403 });
  }

  try {
    const upstream = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...trustedClientIpHeader(request) },
      body: await request.text(),
      cache: 'no-store',
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { statusCode: upstream.status, ...safeError(upstream.status) },
        {
          status: upstream.status,
          headers: {
            'Cache-Control': 'no-store',
            ...((upstream.headers.get('Retry-After-auth') ?? upstream.headers.get('Retry-After'))
              ? { 'Retry-After': upstream.headers.get('Retry-After-auth') ?? upstream.headers.get('Retry-After')! }
              : {}),
          },
        },
      );
    }

    const payload = await upstream.json() as {
      accessToken?: string;
      expiresIn?: number;
      tokenType?: string;
      user?: { id: string; email: string; role: string };
    };
    if (!payload.accessToken || typeof payload.expiresIn !== 'number' || !Number.isInteger(payload.expiresIn) || !payload.user) {
      return NextResponse.json(
        { statusCode: 502, error: 'UPSTREAM_ERROR', message: 'No pudimos completar el inicio de sesión.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const response = NextResponse.json(
      { tokenType: payload.tokenType ?? 'Bearer', expiresIn: payload.expiresIn, user: payload.user },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(SESSION_COOKIE, payload.accessToken, cookieOptions(payload.expiresIn));
    return response;
  } catch {
    return NextResponse.json(
      { statusCode: 503, error: 'API_UNAVAILABLE', message: 'No pudimos conectar con KanchaYA.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
