import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalCheckoutPayload } from "@/lib/checkout-abuse-protection";
import { parsePublicCheckoutRequest } from "@/lib/commerce-checkout";

const read = (path: string) => readFileSync(path, "utf8");

function shippingRequest(postalCode = "90111") {
  return {
    idempotencyKey: "checkout_key_1234567890",
    accessToken: "a".repeat(64),
    confirmationCode: "AB12CD34",
    customer: { name: "Pelanggan Test", phone: "081234567890" },
    fulfillment: {
      method: "shipping",
      paymentMethod: "bank_transfer",
      address: "Jl. Test No. 1, Mamuju",
      addressSnapshot: {
        recipientName: "Pelanggan Test",
        recipientPhone: "081234567890",
        provinceId: "76",
        regencyId: "7602",
        districtId: "760201",
        villageId: "7602011001",
        postalCode,
        addressDetail: "Jl. Test",
        houseNumber: "1",
        rt: "1",
        rw: "2",
        landmark: "Dekat kantor",
        courierNote: ""
      }
    },
    items: [{
      variantSizeId: "11111111-1111-4111-8111-111111111111",
      quantity: 2
    }],
    customProjects: []
  };
}

describe("B4-A3 Ready Stock checkout integrity", () => {
  it("binds the structured address to the canonical idempotency payload", () => {
    const first = parsePublicCheckoutRequest(shippingRequest("90111"))!;
    const second = parsePublicCheckoutRequest(shippingRequest("90112"))!;

    expect(first.fulfillment.addressSnapshot?.postalCode).toBe("90111");
    expect(canonicalCheckoutPayload(first)).not.toBe(canonicalCheckoutPayload(second));
  });

  it("rejects shipping without a structured address snapshot", () => {
    const input = shippingRequest();
    delete (input.fulfillment as Partial<typeof input.fulfillment>).addressSnapshot;
    expect(parsePublicCheckoutRequest(input)).toBeNull();
  });

  it("rejects mixed Ready Stock and Custom at the client and server boundaries", () => {
    const parser = read("lib/commerce-checkout.ts");
    const client = read("components/checkout/CheckoutClient.tsx");
    const route = read("app/api/checkout/route.ts");

    expect(parser).toContain("value.items.length > 0 && customProjects.length > 0");
    expect(client).toContain("const mixedCart");
    expect(client).toContain("Ready Stock dan pesanan Custom harus dipisahkan");
    expect(route).toContain("CHECKOUT_MIXED_CART");
  });

  it("keeps the same key after unknown failures and rotates only after safe recovery", () => {
    const client = read("components/checkout/CheckoutClient.tsx");

    expect(client).toContain("payloadHash");
    expect(client).toContain("recoverStoredCheckout(currentDraft)");
    expect(client).toContain('recovery.kind === "missing" || recovery.kind === "expired"');
    expect(client).toContain("Jaringan belum dapat memastikan checkout sebelumnya");
    expect(client).not.toContain("createdAt: new Date().toISOString() } satisfies");
  });

  it("surfaces operational codes and Retry-After instead of a generic-only failure", () => {
    const route = read("app/api/checkout/route.ts");
    const client = read("components/checkout/CheckoutClient.tsx");

    expect(route).toContain('"retry-after"');
    expect(route).toContain("CHECKOUT_RATE_LIMITED");
    expect(client).toContain("retryAfterFromResponse");
    expect(client).toContain("payload.code === \"CHECKOUT_IDEMPOTENCY_CONFLICT\"");
    expect(client).toContain("payload.reference");
  });

  it("uses one additive forward-only migration without deleting commerce data", () => {
    const sql = read("supabase/migrations/20260723061956_batch_4_a3_checkout_integrity_v1.sql");

    expect(sql.trim().toLowerCase().startsWith("begin;")).toBe(true);
    expect(sql.trim().toLowerCase().endsWith("commit;")).toBe(true);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(/drop\s+table/i);
    expect(sql).not.toMatch(/delete\s+from\s+public\.(orders|order_items|order_address_snapshots)/i);
  });
});
