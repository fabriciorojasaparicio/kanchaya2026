import { proxySessionRequest } from '../../../../../server';

export async function PUT(
  request: Request,
  context: { params: Promise<{ centerId: string; courtId: string }> },
) {
  const { centerId, courtId } = await context.params;
  return proxySessionRequest(
    `/sports-centers/managed/${encodeURIComponent(centerId)}/courts/${encodeURIComponent(courtId)}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: await request.text() },
    request,
    true,
  );
}
