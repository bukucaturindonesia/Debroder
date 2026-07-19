import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { automaticPaymentBlocker } from "@/lib/automatic-payment-link";
import { parseStructuredIndonesiaAddress } from "@/lib/indonesia-address";

const read = (path: string) => readFileSync(path, "utf8");

describe("Custom Order end-to-end revision", () => {
  it("requires an approved and locked Custom quotation before automatic payment", () => {
    const order = { id:"o",order_number:"ORD",status:"awaiting_payment",payment_status:"unpaid",pricing_status:"final",total_amount:210000,whatsapp_confirmed_at:"2026-07-18T00:00:00Z",custom_project_snapshot:[{id:"p"}],custom_quote_status:"sent",custom_quote_locked_at:null,custom_quote_locked_total:null };
    expect(automaticPaymentBlocker(order)).toContain("persetujuan penawaran Custom");
    expect(automaticPaymentBlocker({ ...order, custom_quote_status:"locked", custom_quote_locked_at:"2026-07-18T01:00:00Z", custom_quote_locked_total:210000 })).toBeNull();
    expect(automaticPaymentBlocker({ ...order, custom_quote_status:"locked", custom_quote_locked_at:"2026-07-18T01:00:00Z", custom_quote_locked_total:200000 })).toContain("penguncian harga");
  });

  it("validates the complete structured Indonesian address input without trusting display names", () => {
    expect(parseStructuredIndonesiaAddress({ recipientName:"Budi",recipientPhone:"081234567890",provinceId:"51",regencyId:"51.71",districtId:"51.71.01",villageId:"51.71.01.1001",postalCode:"80111",addressDetail:"Jalan Contoh 1",houseNumber:"1",rt:"1",rw:"2",landmark:"Dekat toko",courierNote:"Hubungi penerima" })).toMatchObject({ recipientPhone:"6281234567890",villageId:"51.71.01.1001",postalCode:"80111" });
    expect(parseStructuredIndonesiaAddress({ recipientName:"Budi",recipientPhone:"081234567890",provinceId:"51",regencyId:"51.71",districtId:"51.71.01",villageId:"51.71.01.1001",postalCode:"8011",addressDetail:"Jalan Contoh 1" })).toBeNull();
  });

  it("ships immutable quote versions, approval proof, design versions, final verification, and concurrency guards", () => {
    const sql=read("supabase/migrations/20260718180000_custom_order_end_to_end_revision.sql");
    expect(sql).toContain("custom_order_quotation_versions");
    expect(sql).toContain("custom_order_customer_approvals");
    expect(sql).toContain("send_custom_order_quotation_v1");
    expect(sql).toContain("decide_public_custom_order_quotation_v1");
    expect(sql).toContain("p_expected_updated_at");
    expect(sql).toContain("register_customer_design_upload_v1");
    expect(sql).toContain("complete_custom_fulfillment_final_verification");
    expect(sql).toContain("guard_custom_fulfillment_final_verification_v1");
    expect(sql).not.toMatch(/insert into public\.indonesia_regions/i);
  });

  it("renders one canonical active stage and customer quote decisions", () => {
    const workspace=read("components/admin/CustomOrderOperationalWorkspace.tsx");
    const confirmation=read("components/checkout/OrderConfirmationClient.tsx");
    expect(workspace).toContain("Pengecekan Akhir");
    expect(workspace).toContain("stage.index");
    expect(workspace).toContain("Konfirmasi Harga & Kirim ke Pelanggan");
    expect(confirmation).toContain("Setujui Penawaran");
    expect(confirmation).toContain("request_custom_revision");
  });
});
