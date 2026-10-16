import { NextResponse } from 'next/server';
import { authCookie, cookieOptions, isSameOriginRequest, proxyAuthRequest, safeError, SESSION_COOKIE } from '../server';

export async function GET(request: Request) {
  const token = await authCookie();
  if (!token) {
    return NextResponse.json({ statusCode: 401, ...safeError(401) }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const response = await proxyAuthRequest('/auth/profile', {
    headers: { Authorization: `Bearer ${token}` },
  }, request);
  if (response.status === 401) response.cookies.set(SESSION_COOKIE, '', cookieOptions(0));
  return response;
}

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ statusCode: 403, error: 'FORBIDDEN', message: 'Solicitud no permitida.' }, { status: 403 });
  }
  const token = await authCookie();
  if (!token) {
    return NextResponse.json({ statusCode: 401, ...safeError(401) }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const response = await proxyAuthRequest('/auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: await request.text(),
  }, request);
  if (response.status === 401) response.cookies.set(SESSION_COOKIE, '', cookieOptions(0));
  return response;
}
