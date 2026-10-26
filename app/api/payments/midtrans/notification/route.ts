import { api, notification } from "@/lib/fast-checkout/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return api(() => notification(request));
}
