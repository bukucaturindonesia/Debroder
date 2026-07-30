import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  productAllowsCustomOrder,
  productAllowsReadyStock
} from "@/lib/jersey-commerce";
import type { Product } from "@/lib/types";

const migration = readFileSync(
  "supabase/migrations/20260729013734_canonical_product_data_publication_readiness_v1.sql",
  "utf8"
);

function product(patch: Partial<Product>): Product {
  return {
    nama: "Produk Uji",
    kategori: "Kaos Polos",
    deskripsi: "",
    badge: "",
    gambar_url: "",
    whatsapp_link: "",
    urutan: 1,
    status_aktif: true,
    ...patch
  };
}

describe("canonical product public experience", () => {
  it("keeps CTA eligibility tied to the PIM sales mode", () => {
    expect(productAllowsReadyStock(product({ sales_mode: "ready_stock" }))).toBe(true);
    expect(productAllowsCustomOrder(product({ sales_mode: "ready_stock" }))).toBe(false);
    expect(productAllowsReadyStock(product({ sales_mode: "custom" }))).toBe(false);
    expect(productAllowsCustomOrder(product({ sales_mode: "custom" }))).toBe(true);
    expect(productAllowsReadyStock(product({ sales_mode: "both" }))).toBe(true);
    expect(productAllowsCustomOrder(product({ sales_mode: "both" }))).toBe(true);
  });

  it("contains every owner-locked canonical record and price", () => {
    const expected = [
      ["Kaos Cotton Combed 24s", 45000],
      ["Kaos Polos NSA", 45000],
      ["Polo Shirt Polos", 60000],
      ["Kaos Polos Anak Cotton Combed", 37000],
      ["Hoodie Fleece", 140000],
      ["Crewneck Fleece", 100000],
      ["Bomber Jacket Custom", 205000],
      ["Windbreaker Custom", 185000],
      ["Zip Hoodie Custom", 150000],
      ["Topi Custom", 30000],
      ["Jersey Futsal Custom", 100000],
      ["Jersey Sepak Bola Custom", 130000],
      ["Sablon DTF A4", 20000],
      ["Sablon DTF A3", 25000],
      ["Sablon DTF Meteran", 30000]
    ] as const;

    expected.forEach(([name, price]) => {
      expect(migration).toContain(name);
      expect(migration).toContain(String(price));
    });
  });

  it("uses the existing ledger idempotently for 100-unit opening stock", () => {
    expect(migration).toContain("public.inventory_balances");
    expect(migration).toContain("public.inventory_movements");
    expect(migration).toContain("'canonical-product-v1:' || adjustment.variant_size_id::text");
    expect(migration).toContain("aggregate_on_hand <> 100");
    expect(migration).toContain("on conflict(idempotency_key) do nothing");
    expect(migration).not.toMatch(/\b(delete|truncate)\s+(from\s+)?public\./i);
  });

  it("preserves security, numbering, history, and publication fail-closed behavior", () => {
    expect(migration).not.toMatch(/\b(alter\s+table|create\s+policy|drop\s+policy|create\s+function|replace\s+function)\b/i);
    expect(migration).not.toMatch(/\b(orders|order_number|payment_number|quotation_number)\b/i);
    expect(migration).not.toMatch(/set\s+status\s*=\s*'active'/i);
    expect(migration).toContain("'publication_state_changed', false");
  });
});
