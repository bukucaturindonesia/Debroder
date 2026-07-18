import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Unified checkout structured address", () => {
  it("uses one structured shipping form for ready-stock and Custom carts", () => {
    const checkout = read("components/checkout/CheckoutClient.tsx");

    expect(checkout).toContain("<StructuredIndonesiaAddress");
    expect(checkout).toContain("onFormattedAddressChange={setFormattedStructuredAddress}");
    expect(checkout).not.toContain('Field label="Alamat pengiriman lengkap"');
    expect(checkout).not.toContain("customItems.length > 0 ? (");
  });

  it("keeps the existing ready-stock server address contract", () => {
    const checkout = read("components/checkout/CheckoutClient.tsx");

    expect(checkout).toContain("address: fulfillment === \"shipping\" && customItems.length === 0 ? formattedStructuredAddress : undefined");
    expect(checkout).toContain("addressSnapshot: fulfillment === \"shipping\" && customItems.length > 0 ? structuredAddress : undefined");
    expect(checkout).toContain("fulfillment === \"shipping\" && !addressConfirmed");
  });

  it("exposes the formatted selector summary to the checkout payload", () => {
    const address = read("components/checkout/StructuredIndonesiaAddress.tsx");

    expect(address).toContain("onFormattedAddressChange?:");
    expect(address).toContain("onFormattedAddressChange?.(summary)");
    expect(address).toContain("Provinsi");
    expect(address).toContain("Kelurahan / desa");
  });
});
