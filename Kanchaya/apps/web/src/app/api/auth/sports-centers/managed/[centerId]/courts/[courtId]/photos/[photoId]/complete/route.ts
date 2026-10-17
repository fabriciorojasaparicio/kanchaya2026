import { proxySessionRequest } from "../../../../../../../../server";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ centerId: string; courtId: string; photoId: string }>;
  },
) {
  const { centerId, courtId, photoId } = await context.params;
  return proxySessionRequest(
    `/sports-centers/managed/${encodeURIComponent(centerId)}/courts/${encodeURIComponent(courtId)}/photos/${encodeURIComponent(photoId)}/complete`,
    { method: "POST" },
    request,
    true,
  );
}
