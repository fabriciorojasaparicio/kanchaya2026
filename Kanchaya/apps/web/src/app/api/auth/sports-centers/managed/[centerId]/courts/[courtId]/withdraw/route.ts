import { proxySessionRequest } from "../../../../../../server";

export async function POST(
  request: Request,
  context: { params: Promise<{ centerId: string; courtId: string }> },
) {
  const { centerId, courtId } = await context.params;
  return proxySessionRequest(
    `/sports-centers/managed/${encodeURIComponent(centerId)}/courts/${encodeURIComponent(courtId)}/withdraw`,
    { method: "POST" },
    request,
    true,
  );
}
