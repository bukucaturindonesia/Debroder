import { describe, expect, it } from "vitest";
import {
  MidtransClient,
  paymentState,
  RajaOngkirClient,
} from "@/lib/fast-checkout/providers";
import { createMockProviderFetch } from "../tests/fixtures/mock-provider-fetch";

const dims = { length: 20, width: 15, height: 3 };
const config = {
  serverKey: "fixture-only-not-real",
  clientKey: "fixture-only-not-real",
  merchantId: "fixture-only",
};

describe("fast checkout provider adapter integration — isolated HTTP fixtures", () => {
  it("fetches destination and quotes via the real shipping adapter", async () => {
    const shipping = new RajaOngkirClient("fixture-only", createMockProviderFetch());
    const destinations = await shipping.destinations("mamuju");
    expect(destinations[0].id).toBe(1001);
    const rates = await shipping.rates(1, 1001, 500, ["jne"], dims);
    expect(rates.map((r) => r.service)).toEqual(["REG", "YES"]);
    expect(rates.map((r) => r.cost)).toEqual([18000, 32000]);
  });

  it.each(["pending", "success", "failed", "expired"] as const)(
    "creates a sandbox-shaped payment and resolves %s status without external requests",
    async (payment) => {
      const client = new MidtransClient(config, createMockProviderFetch({ payment }));
      const session = await client.create(
        "DBR-fixture-1",
        118000,
        [
          { id: "shirt", name: "Test shirt", price: 100000, quantity: 1 },
          { id: "shipping", name: "Test shipping", price: 18000, quantity: 1 },
        ],
        { name: "Test Buyer", email: "buyer@example.test", phone: "081234567890" },
        "https://example.test/checkout",
      );
      expect(session.token).toBe("fixture-token-not-valid-for-snap");
      const status = await client.status("DBR-fixture-1");
      expect(paymentState(status)).toBe(
        ({ pending: "pending", success: "paid", failed: "deny", expired: "expire" })[payment],
      );
    },
  );

  it("propagates simulated shipping outages as a failure, never free shipping", async () => {
    const shipping = new RajaOngkirClient("fixture-only", createMockProviderFetch({ shipping: "unavailable" }));
    await expect(shipping.rates(1, 1001, 500, ["jne"], dims)).rejects.toThrow("PROVIDER_UNAVAILABLE");
  });

  it("propagates simulated shipping timeouts", async () => {
    const shipping = new RajaOngkirClient("fixture-only", createMockProviderFetch({ shipping: "timeout" }));
    await expect(shipping.destinations("mamuju")).rejects.toThrow("PROVIDER_UNAVAILABLE");
  });
});
