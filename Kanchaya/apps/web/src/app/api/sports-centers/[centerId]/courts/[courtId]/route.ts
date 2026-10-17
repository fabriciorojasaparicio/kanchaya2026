import { proxyAuthRequest } from "../../../../auth/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ centerId: string; courtId: string }> },
) {
  const { centerId, courtId } = await context.params;
  return proxyAuthRequest(
    `/sports-centers/${encodeURIComponent(centerId)}/courts/${encodeURIComponent(courtId)}`,
    { method: "GET" },
    request,
  );
}
