import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeWhatsapp, parsePublicCheckoutRequest } from "@/lib/commerce-checkout";

const migration = readFileSync("supabase/migrations/20260714090000_commerce_foundation_v1_p0.sql", "utf8").toLowerCase();
const correction = readFileSync("supabase/migrations/20260714100000_commerce_foundation_v1_p0_checkout_variable_correction.sql", "utf8").toLowerCase();
const normalization = readFileSync("supabase/migrations/20260714101500_commerce_foundation_v1_p0_checkout_variable_normalization.sql", "utf8").toLowerCase();
const digestCorrection = readFileSync("supabase/migrations/20260714103000_commerce_foundation_v1_p0_whatsapp_digest_schema.sql", "utf8").toLowerCase();
const sequenceLock = readFileSync("supabase/migrations/20260714104500_commerce_foundation_v1_p0_sequence_rls_lock.sql", "utf8").toLowerCase();
const fulfillmentBridge = readFileSync("supabase/migrations/20260714110000_commerce_foundation_v1_p0_ready_stock_fulfillment_bridge.sql", "utf8").toLowerCase();
const notificationResilience = readFileSync("supabase/migrations/20260714111500_commerce_foundation_v1_p0_notification_render_resilience.sql", "utf8").toLowerCase();

function request(items = [{ variantSizeId: "11111111-1111-4111-8111-111111111111", quantity: 2 }]) {
  return {
    idempotencyKey: "checkout_key_1234567890",
    accessToken: "a".repeat(64),
    confirmationCode: "AB12CD34",
    customer: { name: "Pelanggan Test", phone: "0812-3456-7890" },
    fulfillment: { method: "pickup", pickupLocationId: "22222222-2222-4222-8222-222222222222", paymentMethod: "pay_at_store" },
    items
  };
}

describe("Commerce Foundation V1 P0", () => {
  it("normalizes Indonesian WhatsApp numbers and validates minimal guest checkout", () => {
    expect(normalizeWhatsapp("0812-3456-7890")).toBe("6281234567890");
    const parsed = parsePublicCheckoutRequest(request());
    expect(parsed?.customer.phone).toBe("6281234567890");
    expect(parsed?.items[0]?.quantity).toBe(2);
    expect(parsePublicCheckoutRequest(request([{ variantSizeId: "33333333-3333-4333-8333-333333333333", quantity: 101 }]))).toBeNull();
  });

  it("rejects duplicate variants and shipping without a complete address", () => {
    const item = { variantSizeId: "11111111-1111-4111-8111-111111111111", quantity: 1 };
    expect(parsePublicCheckoutRequest(request([item, item]))).toBeNull();
    const invalid = request();
    invalid.fulfillment = { ...invalid.fulfillment, method: "shipping", paymentMethod: "bank_transfer" };
    expect(parsePublicCheckoutRequest(invalid)).toBeNull();
  });

  it("keeps checkout server-priced, idempotent, transactional, and token-protected", () => {
    expect(migration).toContain("create or replace function public.create_public_checkout_order");
    expect(migration).toContain("public_idempotency_key");
    expect(migration).toContain("public_access_token_hash");
    expect(migration).toContain("whatsapp_confirmation_hash");
    expect(migration).toContain("jsonb_array_elements(p_items)");
    expect(migration).toContain("public.next_order_number()");
    expect(migration).toContain("grant execute on function public.create_public_checkout_order");
    expect(correction).toContain("requested_variant_size_id");
    expect(correction).toContain("pg_get_functiondef");
    expect(normalization).toContain("requested_requested_variant_size_id");
    expect(digestCorrection).toContain("extensions.digest");
    expect(sequenceLock).toContain("order_number_sequences enable row level security");
    expect(sequenceLock).toContain("payment_number_sequences enable row level security");
    expect(fulfillmentBridge).toContain("create_ready_stock_fulfillment");
    expect(fulfillmentBridge).toContain("complete_ready_stock_pickup_at_store");
    expect(fulfillmentBridge).toContain("ready stock tidak boleh dikirim atau diserahkan sebelum lunas");
    expect(notificationResilience).toContain("rendered_title:=coalesce");
  });

  it("enforces reservation, quote history, private proof limits, and expiry", () => {
    expect(migration).toContain("create table if not exists public.stock_reservations");
    expect(migration).toContain("create table if not exists public.order_shipping_quotes");
    expect(migration).toContain("for update");
    expect(migration).toContain("interval '12 hours'");
    expect(migration).toContain("interval '24 hours'");
    expect(migration).toContain("expire_public_commerce_orders");
    expect(migration).toContain("file_size_limit=excluded.file_size_limit");
    expect(migration).toContain("5242880");
    expect(migration).toContain("public=false");
  });

  it("routes cart and buy-now through internal checkout navigation", () => {
    const cart = readFileSync("components/CartProvider.tsx", "utf8");
    const purchase = readFileSync("components/TieredProductPurchasePanel.tsx", "utf8");
    expect(cart).toContain('href="/checkout"');
    expect(purchase).toContain('router.push("/checkout")');
    expect(cart).not.toContain("window.location");
  });
});
