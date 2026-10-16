import { NextResponse } from 'next/server';
import { API_URL, authCookie, cookieOptions, isSameOriginRequest, safeError, SESSION_COOKIE, trustedClientIpHeader } from '../server';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ statusCode: 403, error: 'FORBIDDEN', message: 'Solicitud no permitida.' }, { status: 403 });
  }

  const token = await authCookie();
  const response = NextResponse.json({ loggedOut: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, '', cookieOptions(0));
  if (!token) return response;

  try {
    const upstream = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ...trustedClientIpHeader(request) },
      cache: 'no-store',
    });
    if (!upstream.ok && upstream.status !== 401) {
      return NextResponse.json(
        { statusCode: upstream.status, ...safeError(upstream.status) },
        {
          status: upstream.status,
          headers: {
            'Cache-Control': 'no-store',
            ...(upstream.headers.get('Retry-After')
              ? { 'Retry-After': upstream.headers.get('Retry-After')! }
              : {}),
          },
        },
      );
    }
    return response;
  } catch {
    return NextResponse.json(
      { statusCode: 503, error: 'API_UNAVAILABLE', message: 'No pudimos conectar con KanchaYA.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
