import { z } from "zod";
import { api, fastContext, limit } from "@/lib/fast-checkout/server";
import { deriveCheckoutTrackingToken } from "@/lib/order-tracking";
import { readCheckoutJsonBody } from "@/lib/checkout-abuse-protection";
import { FastCheckoutError } from "@/lib/fast-checkout/providers";
export async function POST(request: Request) {
  return api(async () => {
    await limit(request, "recovery", 20);
    const input = z
      .object({ key: z.string().regex(/^[a-zA-Z0-9_-]{16,100}$/) })
      .strict()
      .parse(await readCheckoutJsonBody(request));
    const { client } = fastContext();
    const s = await client
      .from("fast_checkout_sessions")
      .select("order_id")
      .eq("request_key", input.key)
      .maybeSingle();
    if (s.error) throw new FastCheckoutError("FAST_DATABASE_UNAVAILABLE");
    if (!s.data) return { found: false };
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) throw new FastCheckoutError("FAST_NOT_CONFIGURED");
    const trackingToken = deriveCheckoutTrackingToken(input.key, secret);
    const { authorizedOrder } = await import("@/lib/fast-checkout/server");
    const o = await authorizedOrder(s.data.order_id, trackingToken);
    return {
      found: true,
      session: {
        orderId: o.id,
        orderNumber: o.order_number,
        total: o.total_amount,
        trackingToken,
        confirmationUrl: `/order-confirmation/${encodeURIComponent(trackingToken)}`,
      },
    };
  });
}
