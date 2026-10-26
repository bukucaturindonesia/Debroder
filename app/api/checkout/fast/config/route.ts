import { api, fastContext, settings } from "@/lib/fast-checkout/server";
import { midtransConfig } from "@/lib/fast-checkout/providers";
export const dynamic = "force-dynamic";
export async function GET() {
  return api(async () => {
    fastContext();
    const cfg = await settings();
    let paymentConfigured = false;
    try {
      midtransConfig();
      paymentConfigured = true;
    } catch {
      /* no secrets */
    }
    return {
      enabled: cfg.payment_enabled && paymentConfigured,
      pickupEnabled: cfg.pickup_enabled,
      pickupLocationIds: cfg.pickup_location_ids,
      shippingConfigured: Boolean(
        process.env.RAJAONGKIR_API_KEY && cfg.origin_id && cfg.couriers.length,
      ),
    };
  });
}
