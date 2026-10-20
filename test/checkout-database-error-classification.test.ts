import { beforeEach, describe, expect, it, vi } from "vitest";
import { isCheckoutDomainException } from "../lib/commerce-checkout";
import { POST } from "../app/api/checkout/route";

const database = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabaseClient: () => ({
    rpc: database.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: database.maybeSingle }) }) })
  })
}));
vi.mock("@/lib/server-env", () => ({
  getAdminSupabaseEnv: () => ({ url: "https://test.invalid", serviceRoleKey: "isolated-unit-test-secret" })
}));
vi.mock("@/lib/customer-auth/server", () => ({ optionalVerifiedCustomer: async () => null }));

function checkoutRequest() {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: "checkout_error_regression_123",
      accessToken: "a".repeat(64),
      customer: { name: "Checkout Test", phone: "628000000001", email: "test@example.invalid" },
      fulfillment: { method: "pickup", pickupLocationId: "11111111-1111-4111-8111-111111111111", paymentMethod: "bank_transfer" },
      items: [{ variantSizeId: "22222222-2222-4222-8222-222222222222", quantity: 1, services: [] }]
    })
  });
}

describe("checkout database error classification", () => {
  beforeEach(() => {
    database.rpc.mockReset();
    database.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it.each(["PGRST202", "PGRST203", "42703", "23502", "42501", "23505", undefined])(
    "does not treat infrastructure error %s as an invalid service",
    (code) => {
      const error = {
        code,
        message: "Could not find public.create_public_checkout_order(p_shipping_address_snapshot, p_customer_user_id)"
      };
      expect(isCheckoutDomainException(error)).toBe(false);
    }
  );

  it("retains deliberate SQL business validation for stock and service errors", () => {
    expect(isCheckoutDomainException({ code: "P0001" })).toBe(true);
  });

  it.each([
    ["PGRST202", "Could not find public.create_public_checkout_order(p_shipping_address_snapshot, p_customer_user_id)", 503, "CHECKOUT_UNAVAILABLE"],
    ["42703", "column order_items.snapshot does not exist", 503, "CHECKOUT_UNAVAILABLE"],
    ["P0001", "Historical Ready Stock pricing snapshot bersifat immutable", 503, "CHECKOUT_UNAVAILABLE"],
    ["P0001", "Stok tidak mencukupi", 409, "CHECKOUT_STOCK_UNAVAILABLE"],
    ["P0001", "Snapshot layanan order tidak lengkap", 409, "CHECKOUT_SERVICE_INVALID"]
  ])("maps %s to the correct HTTP response", async (code, message, status, expectedCode) => {
    database.rpc.mockImplementation(async (name: string) => name === "enforce_public_checkout_abuse_guard"
      ? { data: { allowed: true }, error: null }
      : { data: null, error: { code, message } });
    const response = await POST(checkoutRequest());
    const payload = await response.json();
    expect(response.status).toBe(status);
    expect(payload.code).toBe(expectedCode);
    expect(payload.error).not.toContain("p_shipping_address_snapshot");
    expect(database.rpc).toHaveBeenCalledWith("create_public_checkout_order", expect.objectContaining({
      p_items: [expect.objectContaining({ services: [] })]
    }));
    expect(database.rpc).not.toHaveBeenCalledWith("activate_public_checkout_order_v2", expect.anything());
  });
});
