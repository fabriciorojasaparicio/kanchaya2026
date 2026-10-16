import { isSameOriginRequest, proxyAuthRequest } from '../server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ statusCode: 403, error: 'FORBIDDEN', message: 'Solicitud no permitida.' }, { status: 403 });
  }
  return proxyAuthRequest('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text(),
  }, request);
}
