import { proxyAuthRequest } from '../auth/server';

export function GET(request: Request) {
  return proxyAuthRequest('/sports-centers', { method: 'GET' }, request);
}
