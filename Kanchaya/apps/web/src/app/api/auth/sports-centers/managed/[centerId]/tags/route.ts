import { proxySessionRequest } from "../../../../server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ centerId: string }> },
) {
  const { centerId } = await context.params;
  return proxySessionRequest(
    `/sports-centers/managed/${encodeURIComponent(centerId)}/tags`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
    request,
    true,
  );
}
