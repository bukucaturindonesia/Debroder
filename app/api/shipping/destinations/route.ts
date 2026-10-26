import { api, destinations } from "@/lib/fast-checkout/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(() => destinations(request));
}
