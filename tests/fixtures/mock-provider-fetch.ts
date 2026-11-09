/**
 * Deterministic provider HTTP fixture for isolated tests ONLY.
 * This module is never wired into runtime routes or production configuration.
 * Inject the returned fetch function into RajaOngkirClient / MidtransClient.
 */
export type MockPaymentOutcome = "pending" | "success" | "failed" | "expired";
export type MockProviderOptions = {
  payment?: MockPaymentOutcome;
  shipping?: "ok" | "unavailable" | "timeout";
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export function createMockProviderFetch(options: MockProviderOptions = {}): typeof fetch {
  const payment = options.payment ?? "pending";
  const shipping = options.shipping ?? "ok";
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    const shippingHost = url.hostname === "rajaongkir.komerce.id";
    const midtransHost = ["app.sandbox.midtrans.com", "api.sandbox.midtrans.com"].includes(url.hostname);
    if (!shippingHost && !midtransHost) throw new Error("MOCK_PROVIDER_HOST_DENIED");
    if (shippingHost) {
      if (shipping === "timeout") throw new Error("MOCK_SHIPPING_TIMEOUT");
      if (shipping === "unavailable") return json({ message: "Unavailable" }, 503);
      if (url.pathname.endsWith("/domestic-destination")) {
        return json({ meta: { code: 200 }, data: [{
          id: 1001, label: "Mamuju, Sulawesi Barat", province_name: "Sulawesi Barat",
          city_name: "Mamuju", district_name: "Mamuju", subdistrict_name: "Binanga", zip_code: "91511",
        }] });
      }
      if (url.pathname.endsWith("/domestic-cost") && init?.method === "POST") {
        return json({ meta: { code: 200 }, data: [
          { code: "jne", name: "JNE", service: "REG", description: "Simulated regular", cost: 18000, etd: "2-4" },
          { code: "jne", name: "JNE", service: "YES", description: "Simulated express", cost: 32000, etd: "1-2" },
        ] });
      }
    }
    if (url.hostname === "app.sandbox.midtrans.com" && url.pathname === "/snap/v1/transactions" && init?.method === "POST") {
      return json({ token: "fixture-token-not-valid-for-snap", redirect_url: "https://app.sandbox.midtrans.com/snap/v4/fixture" });
    }
    if (url.hostname === "api.sandbox.midtrans.com" && /^\/v2\/[^/]+\/status$/.test(url.pathname)) {
      const statuses = {
        pending: { status_code: "201", transaction_status: "pending" },
        success: { status_code: "200", transaction_status: "settlement" },
        failed: { status_code: "202", transaction_status: "deny" },
        expired: { status_code: "202", transaction_status: "expire" },
      } as const;
      return json({ currency: "IDR", ...statuses[payment] });
    }
    throw new Error("MOCK_PROVIDER_ROUTE_DENIED");
  };
}
