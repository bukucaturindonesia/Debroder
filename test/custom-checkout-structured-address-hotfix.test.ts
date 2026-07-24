import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Custom checkout structured-address hotfix", () => {
  it("wires the active checkout route directly to the canonical structured component", () => {
    const route = read("app/checkout/page.tsx");
    const checkout = read("components/checkout/CheckoutClient.tsx");
    const tsconfig = read("tsconfig.json");

    expect(route).toContain('from "@/components/checkout/CheckoutClient"');
    expect(checkout).toContain("StructuredIndonesiaAddress");
    expect(checkout).toContain("cart.items.filter(isCustomProjectCartItem)");
    expect(checkout).toContain("customProjects: customItems");
    expect(checkout).toContain("project: item.customProject");
    expect(checkout).toContain("addressSnapshot");
    expect(checkout).toContain("!addressConfirmed");
    expect(tsconfig).not.toContain("CheckoutClientV2");
    expect(route).not.toContain("CheckoutClientV2");
  });

  it("keeps pickup address-free and retains structured state while fulfillment changes", () => {
    const checkout = read("components/checkout/CheckoutClient.tsx");

    expect(checkout).toContain('fulfillment === "pickup"');
    expect(checkout).toContain("Lokasi pengambilan");
    expect(checkout).toContain("setStructuredAddress");
    expect(checkout).not.toMatch(/setStructuredAddress\(EMPTY_STRUCTURED_ADDRESS\)/);
  });

  it("contains the audited village hierarchy and postal-code coverage", () => {
    const migration = read(
      "supabase/migrations/20260718182000_indonesia_regions_village_postal_seed.sql",
    );
    const rows = [
      ...migration.matchAll(
        /\('([^']+)', 'village', '([^']+)', '(?:[^']|'')+', array\['(\d{5})'\]::text\[\], true\)/g,
      ),
    ].map((match) => ({ code: match[1], parentCode: match[2], postalCode: match[3] }));

    expect(rows).toHaveLength(83762);
    expect(new Set(rows.map((row) => row.code)).size).toBe(rows.length);
    expect(rows.every((row) => row.code.slice(0, 8) === row.parentCode)).toBe(true);
    expect(rows.every((row) => /^\d{5}$/.test(row.postalCode))).toBe(true);
  });

  it("preserves the canonical database security boundary", () => {
    const migration = read(
      "supabase/migrations/20260718182000_indonesia_regions_village_postal_seed.sql",
    );

    expect(migration).toContain("insert into public.indonesia_regions");
    expect(migration).not.toMatch(
      /create table if not exists public\.(provinces|regencies|districts|villages)/i,
    );
    expect(migration).not.toMatch(/grant\s+select.*\b(anon|authenticated|public)\b/i);
    expect(migration).not.toMatch(/\b(delete|truncate)\s+from\b/i);
  });

  it("stores and exposes the immutable shipping method with the address snapshot", () => {
    const snapshotMigration = read(
      "supabase/migrations/20260718182500_custom_checkout_address_snapshot_method.sql",
    );
    const admin = read("components/admin/FulfillmentDetailAdmin.tsx");

    expect(snapshotMigration).toContain("add column if not exists fulfillment_method");
    expect(snapshotMigration).toContain("check (fulfillment_method = 'shipping')");
    expect(admin).toContain('from("order_address_snapshots")');
    expect(admin).toContain("Alamat Pengiriman Custom");
    expect(admin).toContain("addressSnapshot.formatted_address");
  });
});
