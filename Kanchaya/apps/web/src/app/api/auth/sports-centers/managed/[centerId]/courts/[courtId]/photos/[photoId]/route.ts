import { proxySessionRequest } from "../../../../../../../server";

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ centerId: string; courtId: string; photoId: string }>;
  },
) {
  const { centerId, courtId, photoId } = await context.params;
  return proxySessionRequest(
    `/sports-centers/managed/${encodeURIComponent(centerId)}/courts/${encodeURIComponent(courtId)}/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" },
    request,
    true,
  );
}
