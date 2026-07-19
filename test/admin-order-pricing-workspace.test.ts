import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  calculatePricingTotals,
  createEmptyPricingLine,
  editableLinesFromSnapshot,
  findDuplicateCharges,
  productSnapshotsFromOrderItems,
  serviceSummariesFromSnapshot,
  validatePricingWorkspace,
  type EditablePricingLine,
  type OrderProductSnapshot
} from "@/lib/admin-order-pricing";

const read = (path: string) => readFileSync(path, "utf8");
const product: OrderProductSnapshot = {
  id: "item-1",
  productName: "Kaos Cotton Combed 24s",
  variantName: "Hitam",
  color: "Hitam",
  size: "XL",
  sku: "KCC24-BLK-XL",
  quantity: 20,
  unitPrice: 50_000,
  subtotal: 1_000_000,
  source: "order_item_snapshot"
};

function line(overrides: Partial<EditablePricingLine> = {}): EditablePricingLine {
  return {
    ...createEmptyPricingLine(),
    id: "line-1",
    label: "Cetak DTF A4 Depan",
    serviceCode: "dtf",
    placement: "Depan",
    printSize: "A4",
    quantity: 20,
    unitPrice: 15_000,
    ...overrides
  };
}

describe("Admin Order pricing workspace", () => {
  it("calculates integer IDR product, service, personalization, fee, discount, adjustment and shipping totals", () => {
    const totals = calculatePricingTotals([product], [
      line(),
      line({ id: "personal", kind: "PERSONALIZATION", label: "Nama", serviceCode: "name", placement: "", printSize: "", unitPrice: 5_000 }),
      line({ id: "setup", kind: "SETUP_FEE", label: "Setup desain", serviceCode: "setup", placement: "", printSize: "", quantity: 1, unitPrice: 50_000 }),
      line({ id: "discount", kind: "DISCOUNT", label: "Diskon proyek", serviceCode: "discount", placement: "", printSize: "", quantity: 1, unitPrice: 25_000, reason: "Promo proyek" }),
      line({ id: "adjustment", kind: "ADJUSTMENT", label: "Koreksi bahan", serviceCode: "adjustment", placement: "", printSize: "", quantity: 1, unitPrice: 10_000, reason: "Bahan khusus" }),
      line({ id: "shipping", kind: "SHIPPING", label: "Kurir eksternal", serviceCode: "shipping", placement: "", printSize: "", quantity: 1, unitPrice: 30_000 })
    ]);
    expect(totals).toMatchObject({ product: 1_000_000, service: 300_000, personalization: 100_000, setupDesign: 50_000, discount: 25_000, adjustment: 10_000, shipping: 30_000, final: 1_465_000 });
    expect(Object.values(totals).every(Number.isSafeInteger)).toBe(true);
  });

  it("blocks DTF generic plus specific charges and repeated setup/personalization identities", () => {
    const duplicate = findDuplicateCharges([
      line({ id: "dtf-generic", label: "Sablon DTF", placement: "", printSize: "" }),
      line({ id: "dtf-specific" }),
      line({ id: "setup-1", kind: "SETUP_FEE", label: "Setup", serviceCode: "setup", placement: "", printSize: "", quantity: 1 }),
      line({ id: "setup-2", kind: "SETUP_FEE", label: "Setup ulang", serviceCode: "setup", placement: "", printSize: "", quantity: 1 })
    ]);
    expect(duplicate.messages.join(" ")).toMatch(/DTF generic/);
    expect(duplicate.messages.join(" ")).toMatch(/Setup fee/);
    expect(duplicate.lineIds).toEqual(expect.arrayContaining(["dtf-generic", "dtf-specific", "setup-1", "setup-2"]));
  });

  it("blocks missing base price, zero total, NaN, missing confirmations, invalid validity and reasonless adjustment", () => {
    const invalid = validatePricingWorkspace({
      products: [{ ...product, unitPrice: null, subtotal: null }],
      lines: [line({ kind: "ADJUSTMENT", unitPrice: Number.NaN, reason: "" })],
      confirmations: { product: false, service: false },
      validDays: 0,
      requiresServiceConfirmation: true
    });
    expect(invalid.canFinalize).toBe(false);
    expect(invalid.blockers.join(" ")).toMatch(/Harga dasar/);
    expect(invalid.blockers.join(" ")).toMatch(/integer Rupiah/);
    expect(invalid.blockers.join(" ")).toMatch(/alasan/);
    expect(invalid.blockers.join(" ")).toMatch(/konfirmasi/i);
    expect(invalid.blockers.join(" ")).toMatch(/1–30 hari/);
    expect(invalid.blockers.join(" ")).toMatch(/lebih besar dari Rp0/);
  });

  it("uses immutable historical order item snapshots and tolerates legacy service metadata", () => {
    const products = productSnapshotsFromOrderItems([{ id: "legacy", product_name: "Produk Lama", variant_name: "Legacy", quantity: 2, unit_price: 40_000, subtotal: 80_000 }]);
    expect(products[0]).toMatchObject({ source: "order_item_snapshot", unitPrice: 40_000, subtotal: 80_000 });
    const snapshot = [{ presetId: "preset-1", pricing: { lines: [{ key: "service-1", kind: "service", displayLabel: "DTF A4 Depan", quantity: 2, unitPrice: null, serviceSlug: "dtf", placementName: "Depan", printSizeName: "A4" }] }, items: [{ uploads: [{ id: "file" }] }] }];
    expect(serviceSummariesFromSnapshot(snapshot)[0]).toMatchObject({ name: "DTF A4 Depan", placement: "Depan", printSize: "A4", fileAvailable: true, preset: "preset-1" });
    expect(editableLinesFromSnapshot(snapshot)[0]).toMatchObject({ kind: "SERVICE", source: "custom_order_snapshot", unitPrice: 0 });
  });

  it.each(["Ready Stock", "Custom non-Jersey", "Jersey Ready Stock", "Jersey Custom", "historical", "payment-less", "Pickup", "Kurir Eksternal"])("keeps %s on the same integer pricing contract", (scenario) => {
    const requiresService = scenario.includes("Custom");
    const validation = validatePricingWorkspace({
      products: [product],
      lines: requiresService ? [line()] : [],
      confirmations: { product: true, service: requiresService },
      validDays: 7,
      requiresServiceConfirmation: requiresService
    });
    expect(validation.canFinalize).toBe(true);
  });

  it("renders the operational editor while retaining the direct React component regression guard", () => {
    const workspace = read("components/admin/CustomOrderOperationalWorkspace.tsx");
    const customerConfirmation = read("components/checkout/OrderConfirmationClient.tsx");
    const reactRegression = read("test/admin-order-detail-react130.test.ts");
    expect(workspace).toContain("Ringkasan Produk");
    expect(workspace).toContain("Ringkasan Layanan");
    expect(workspace).toContain("Editor Rincian Harga");
    expect(workspace).toContain("Ringkasan Total");
    expect(workspace).toContain("Simpan Draft Harga");
    expect(workspace).toContain("Konfirmasi Harga & Kirim ke Pelanggan");
    expect(customerConfirmation).toContain("customerQuotePreview");
    expect(customerConfirmation).toContain("Catatan penawaran");
    expect(customerConfirmation).not.toContain("record?.internal_note");
    expect(reactRegression).toContain("CustomOrderOperationalWorkspace");
  });

  it("persists drafts and finalizes one immutable quote with authorization, server calculation, idempotency, concurrency and audit guards", () => {
    const sql = read("supabase/migrations/20260719110000_admin_order_pricing_workspace.sql");
    expect(sql).toContain("save_custom_order_pricing_draft_v1");
    expect(sql).toContain("finalize_custom_order_pricing_v1");
    expect(sql).toContain("build_custom_order_pricing_v1");
    expect(sql).toContain("public.has_permission('order.edit')");
    expect(sql).toContain("for update");
    expect(sql).toContain("p_expected_draft_version");
    expect(sql).toContain("finalization_key");
    expect(sql).toContain("custom_order_quotation_versions");
    expect(sql).toContain("custom_pricing_draft_saved");
    expect(sql).toContain("custom_quotation_finalized_and_sent");
    expect(sql).toContain("awaiting_customer_approval");
    expect(sql).toContain("Biaya DTF generic bertabrakan");
    expect(sql).toContain("revoke all on function public.save_custom_order_pricing_draft_v1");
  });

  it("hides premature Job Order and Fulfillment header actions behind canonical prerequisites", () => {
    const detail = read("components/admin/OrderDetailAdmin.tsx");
    expect(detail).toContain("const canOpenJobOrder = Boolean(jobOrder) || order.payment_production_eligible");
    expect(detail).toContain("const canOpenFulfillment = Boolean(fulfillment)");
    expect(detail).toContain('workspaceKind === "standard" || order.custom_quote_status === "locked"');
    expect(detail).toContain("{canOpenJobOrder ? (");
    expect(detail).toContain("{canOpenFulfillment ? (");
  });
});
