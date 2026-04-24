import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  return proxyToBackend(request);
}

export async function PATCH(request: Request) {
  return proxyToBackend(request);
}
