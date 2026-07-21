import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveAdminOrderWorkspaceKind } from "@/lib/admin-order-detail";

const orderDetail = readFileSync("components/admin/OrderDetailAdmin.tsx", "utf8");
const operations = readFileSync("components/admin/OrderOperationalWorkspace.tsx", "utf8");
const commerce = readFileSync("components/admin/CommerceOrderOperations.tsx", "utf8");
const custom = readFileSync("components/admin/CustomOrderOperationalWorkspace.tsx", "utf8");
const fulfillment = readFileSync("components/admin/FulfillmentDetailAdmin.tsx", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260719140000_payment_verification_and_fulfillment.sql",
  "utf8"
).toLowerCase();
const automaticFulfillment = readFileSync(
  "supabase/migrations/20260720030000_human_centered_order_experience_p0.sql",
  "utf8"
).toLowerCase();

describe("Post-payment order routing", () => {
  it("keeps Ready Stock and Jersey Ready Stock out of forced production", () => {
    expect(resolveAdminOrderWorkspaceKind(null)).toBe("standard");
    expect(resolveAdminOrderWorkspaceKind([])).toBe("standard");
    expect(orderDetail).toContain('workspaceKind === "custom" && order.payment_production_eligible');
    expect(operations).toContain('order.checkout_source === "public_checkout"');
    expect(operations).toContain("READY_STOCK_STAGES");
    expect(operations).toContain("Persiapan & Pemeriksaan Barang");
    expect(operations).toContain("Pengemasan & Pemeriksaan Akhir");
    expect(commerce).not.toContain('rpc("create_ready_stock_fulfillment"');
    expect(automaticFulfillment).toContain("public._ensure_ready_stock_fulfillment_v2");
    expect(automaticFulfillment).toContain("ensure_ready_stock_fulfillment_order_update");
  });

  it("keeps Custom and Jersey Custom on Job Order, production, QC, then fulfillment", () => {
    expect(resolveAdminOrderWorkspaceKind([{ projectId: "custom-1" }])).toBe("custom");
    expect(custom).toContain("Surat Perintah Kerja");
    expect(custom).toContain("Pemeriksaan Kualitas");
    expect(custom).toContain("Pengiriman / Ambil di Toko");
    expect(orderDetail).toContain("[OrderOperationalWorkspace, CustomOrderOperationalWorkspace].forEach");
    expect(orderDetail).toContain("<AdminGuidedOrderFlow");
  });

  it("preserves Commerce P0 reservation and stock-consumption guards", () => {
    expect(migration).toContain("valid stock reservation is required before payment completion");
    expect(migration).toContain("consume_paid_order_stock");
    expect(migration).toContain("checkout_source='public_checkout'");
  });

  it("requires a server-side final check for Ready Stock and Custom fulfillment", () => {
    expect(migration).toContain("complete_fulfillment_final_verification");
    expect(migration).toContain("pengecekan akhir wajib diselesaikan sebelum pengiriman atau pickup");
    expect(migration).toContain("guard_fulfillment_final_verification");
    expect(fulfillment).toContain('rpc("complete_fulfillment_final_verification"');
    expect(fulfillment).toContain("READY STOCK");
    expect(fulfillment).toContain("PESANAN CUSTOM");
  });

  it("keeps historical and payment-less orders readable without inventing a payment", () => {
    expect(orderDetail).toContain("compatibilityWarning");
    expect(orderDetail).toContain("canOpenPayment");
    expect(operations).toContain("Menunggu pembayaran");
    expect(operations).toContain('order.payment_method === "pay_at_store"');
    expect(operations).toContain("Pembayaran diterima saat pickup");
  });
});
