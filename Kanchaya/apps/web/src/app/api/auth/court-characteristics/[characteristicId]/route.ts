import { proxySessionRequest } from '../../server';

export async function PUT(
  request: Request,
  context: { params: Promise<{ characteristicId: string }> },
) {
  const { characteristicId } = await context.params;
  return proxySessionRequest(
    `/court-characteristics/${encodeURIComponent(characteristicId)}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: await request.text() },
    request,
    true,
  );
}
