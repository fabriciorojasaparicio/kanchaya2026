import { proxySessionRequest } from '../../server';

export async function GET(request: Request) {
  return proxySessionRequest('/sports-centers/managed', { method: 'GET' }, request);
}
