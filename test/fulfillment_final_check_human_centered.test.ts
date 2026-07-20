import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync("components/admin/FulfillmentDetailAdmin.tsx", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260720035945_fix_pay_at_store_final_verification.sql",
  "utf8"
).toLowerCase();

describe("Human-centered fulfillment final check", () => {
  it("shows actual customer order values beside every checklist item", () => {
    expect(component).toContain('.from("order_items")');
    expect(component).toContain("finalCheckValues");
    expect(component).toContain("order_number: order?.order_number");
    expect(component).toContain("product: orderItemSummary.product");
    expect(component).toContain("variant: orderItemSummary.variant");
    expect(component).toContain("color: orderItemSummary.color");
    expect(component).toContain("size: orderItemSummary.size");
    expect(component).toContain("package_content: orderItemSummary.packageContent");
  });

  it("renders real Ready Stock item details instead of an empty work-item fallback", () => {
    expect(component).toContain("orderItem?.product_name");
    expect(component).toContain("orderItem?.variant_name");
    expect(component).toContain("orderItem?.sku");
    expect(component).not.toContain('workItem?.title || "Data pekerjaan tidak ditemukan"');
  });

  it("only surfaces evidence upload during the handover stages", () => {
    expect(component).toContain("proofUploadActive");
    expect(component).toContain('record.status === "ready_for_pickup"');
    expect(component).toContain('["ready_to_ship", "shipped", "in_transit"]');
    expect(component).toContain('kind: "proof"');
    expect(component).toContain('document.getElementById("handover-proof")');
  });

  it("allows pickup pay-at-store to finish final verification without fabricating payment", () => {
    expect(migration).toContain("order_row.payment_method = 'pay_at_store'");
    expect(migration).toContain("result_row.method = 'pickup'");
    expect(migration).toContain("syarat pembayaran belum terpenuhi");
    expect(migration).not.toContain("payment_status = 'paid'");
  });
});
