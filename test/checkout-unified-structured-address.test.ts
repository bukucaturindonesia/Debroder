import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Unified checkout structured address", () => {
  it("uses one structured shipping form for Ready Stock and Custom carts", () => {
    const checkout = read("components/checkout/CheckoutClient.tsx");

    expect(checkout).toContain("<StructuredIndonesiaAddress");
    expect(checkout).toContain("onFormattedAddressChange={setFormattedStructuredAddress}");
    expect(checkout).not.toContain('Field label="Alamat pengiriman lengkap"');
    expect(checkout).toContain('addressSnapshot: fulfillment === "shipping" ? structuredAddress : undefined');
  });

  it("requires the canonical structured snapshot for every shipping checkout", () => {
    const parser = read("lib/commerce-checkout.ts");
    const route = read("app/api/checkout/route.ts");

    expect(parser).toContain('method === "shipping" && !addressSnapshot');
    expect(parser).toContain('addressSnapshot: method === "shipping"');
    expect(route).toContain("p_shipping_address_snapshot: body.fulfillment.addressSnapshot ?? null");
  });

  it("stores Ready Stock shipping in the existing immutable snapshot table", () => {
    const migration = read("supabase/migrations/20260723061956_batch_4_a3_checkout_integrity_v1.sql");

    expect(migration).toContain("create or replace function public.create_public_checkout_order");
    expect(migration).toContain("p_shipping_address_snapshot jsonb");
    expect(migration).toContain("insert into public.order_address_snapshots");
    expect(migration).toContain("on conflict(order_id, version) do nothing");
    expect(migration).not.toMatch(/create table/i);
  });

  it("exposes the formatted selector summary to the checkout payload", () => {
    const address = read("components/checkout/StructuredIndonesiaAddress.tsx");

    expect(address).toContain("onFormattedAddressChange?:");
    expect(address).toContain("onFormattedAddressChange?.(summary)");
    expect(address).toContain("Provinsi");
    expect(address).toContain("Kelurahan / desa");
  });
});
