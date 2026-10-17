import { proxySessionRequest } from '../../../../server';

export async function POST(request: Request, context: { params: Promise<{ centerId: string }> }) {
  const { centerId } = await context.params;
  return proxySessionRequest(
    `/sports-centers/managed/${encodeURIComponent(centerId)}/courts`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await request.text() },
    request,
    true,
  );
}
