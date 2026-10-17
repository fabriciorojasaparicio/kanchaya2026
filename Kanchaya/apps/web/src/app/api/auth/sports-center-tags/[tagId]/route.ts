import { proxySessionRequest } from "../../server";

export async function PUT(
  request: Request,
  context: { params: Promise<{ tagId: string }> },
) {
  const { tagId } = await context.params;
  return proxySessionRequest(
    `/sports-center-tags/${encodeURIComponent(tagId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
    request,
    true,
  );
}
