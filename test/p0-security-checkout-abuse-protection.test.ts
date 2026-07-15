import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAX_CHECKOUT_ITEMS,
  MAX_CHECKOUT_LINE_QUANTITY,
  MAX_CHECKOUT_TOTAL_QUANTITY,
  parsePublicCheckoutRequest,
  type PublicCheckoutRequest
} from "@/lib/commerce-checkout";
import {
  CheckoutBodyError,
  MAX_CHECKOUT_BODY_BYTES,
  canonicalCheckoutPayload,
  createCheckoutAbuseHashes,
  readCheckoutJsonBody
} from "@/lib/checkout-abuse-protection";

const migration = readFileSync(
  "supabase/migrations/20260715060557_p0_security_checkout_abuse_protection.sql",
  "utf8"
).toLowerCase();

function checkoutRequest(items: PublicCheckoutRequest["items"] = [{
  variantSizeId: "11111111-1111-4111-8111-111111111111",
  quantity: 2
}]) {
  return {
    idempotencyKey: "checkout_key_1234567890",
    accessToken: "a".repeat(64),
    confirmationCode: "AB12CD34",
    customer: { name: "Pelanggan Test", phone: "0812-3456-7890" },
    fulfillment: {
      method: "pickup",
      pickupLocationId: "22222222-2222-4222-8222-222222222222",
      paymentMethod: "pay_at_store"
    },
    items
  };
}

describe("P0 Security Stage 4 checkout abuse protection", () => {
  it("rejects abnormal line, total quantity, and item count", () => {
    expect(parsePublicCheckoutRequest(checkoutRequest([{
      variantSizeId: "11111111-1111-4111-8111-111111111111",
      quantity: MAX_CHECKOUT_LINE_QUANTITY + 1
    }]))).toBeNull();

    const tooManyItems = Array.from({ length: MAX_CHECKOUT_ITEMS + 1 }, (_, index) => ({
      variantSizeId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      quantity: 1
    }));
    expect(parsePublicCheckoutRequest(checkoutRequest(tooManyItems))).toBeNull();

    const excessiveTotal = Array.from({ length: 6 }, (_, index) => ({
      variantSizeId: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      quantity: 100
    }));
    expect(MAX_CHECKOUT_TOTAL_QUANTITY).toBe(500);
    expect(parsePublicCheckoutRequest(checkoutRequest(excessiveTotal))).toBeNull();
  });

  it("rejects a streamed body above 64 KiB", async () => {
    const request = new Request("https://example.test/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(MAX_CHECKOUT_BODY_BYTES) })
    });
    await expect(readCheckoutJsonBody(request)).rejects.toMatchObject({
      code: "CHECKOUT_PAYLOAD_TOO_LARGE",
      status: 413
    } satisfies Partial<CheckoutBodyError>);
  });

  it("binds idempotency to canonical business payload and hashes sensitive identity", () => {
    const parsed = parsePublicCheckoutRequest(checkoutRequest())!;
    const reordered = { ...parsed, items: [...parsed.items].reverse() };
    expect(canonicalCheckoutPayload(reordered)).toBe(canonicalCheckoutPayload(parsed));

    const request = new Request("https://example.test/api/checkout", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "Stage4 Test Browser",
        "accept-language": "id-ID"
      }
    });
    const hashes = createCheckoutAbuseHashes(request, parsed, "server-secret");
    for (const value of Object.values(hashes)) expect(value).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(hashes)).not.toContain("203.0.113.10");
    expect(JSON.stringify(hashes)).not.toContain(parsed.customer.phone);
    expect(JSON.stringify(hashes)).not.toContain(parsed.idempotencyKey);
  });

  it("keeps the database guard private, hash-only, and service-role-only", () => {
    expect(migration).toContain("private.checkout_request_ledger");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("enforce_public_checkout_abuse_guard");
    expect(migration).toContain("idempotency_payload_conflict");
    expect(migration).toContain("fingerprint_ten_minute_count >= 5");
    expect(migration).toContain("phone_thirty_minute_count >= 3");
    expect(migration).toContain("grant execute on function public.enforce_public_checkout_abuse_guard");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("revoke all on function public.create_public_checkout_order");
    expect(migration).not.toContain("raw_ip");
    expect(migration).not.toContain("ip_address");
  });
});
