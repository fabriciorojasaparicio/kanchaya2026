import { proxySessionRequest } from "../server";

export async function GET(request: Request) {
  return proxySessionRequest("/sports-center-tags", { method: "GET" }, request);
}

export async function POST(request: Request) {
  return proxySessionRequest(
    "/sports-center-tags",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
    request,
    true,
  );
}
