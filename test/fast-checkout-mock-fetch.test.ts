import { describe, expect, it } from "vitest";
import { createMockProviderFetch } from "../tests/fixtures/mock-provider-fetch";

describe("isolated provider HTTP fixtures", () => {
  it("returns deterministic destination and courier rates", async () => {
    const fetcher = createMockProviderFetch();
    const destination = await fetcher("https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=mamuju");
    expect((await destination.json()).data[0].id).toBe(1001);
    const quote = await fetcher("https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost", { method: "POST" });
    expect((await quote.json()).data).toHaveLength(2);
  });
  it.each(["pending", "success", "failed", "expired"] as const)("simulates %s payment status", async (payment) => {
    const response = await createMockProviderFetch({ payment })("https://api.sandbox.midtrans.com/v2/test-order/status");
    const body = await response.json();
    expect(body.currency).toBe("IDR");
    expect(body.transaction_status).toBe(({ pending: "pending", success: "settlement", failed: "deny", expired: "expire" })[payment]);
  });
  it("simulates provider failure and timeout", async () => {
    const unavailable = await createMockProviderFetch({ shipping: "unavailable" })("https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost");
    expect(unavailable.status).toBe(503);
    await expect(createMockProviderFetch({ shipping: "timeout" })("https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost")).rejects.toThrow("MOCK_SHIPPING_TIMEOUT");
  });
  it("rejects all unexpected hosts and routes", async () => {
    const fetcher = createMockProviderFetch();
    await expect(fetcher("https://example.com/")).rejects.toThrow("MOCK_PROVIDER_HOST_DENIED");
    await expect(fetcher("https://api.sandbox.midtrans.com/unexpected")).rejects.toThrow("MOCK_PROVIDER_ROUTE_DENIED");
  });
});
