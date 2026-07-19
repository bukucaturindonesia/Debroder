import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildOrderJourney } from "@/lib/order-journey";
import { resolveOrderActiveStage } from "@/lib/order-active-stage";

const read = (path: string) => readFileSync(path, "utf8");
const migrationPath = "supabase/migrations/20260720030000_human_centered_order_experience_p0.sql";

describe("DEBRODER Human-Centered Operational Experience P0", () => {
  it("shows the complete customer journey from checkout in exact order", () => {
    const stage = resolveOrderActiveStage({
      status: "processing",
      paymentStatus: "paid",
      fulfillmentStatus: "preparing",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer",
      paymentRequirementMet: true,
      paymentProductionEligible: true,
      paymentEffectiveTotal: 250_000,
      hasVerifiedPayment: true
    });
    const journey = buildOrderJourney({ stage, fulfillmentMethod: "shipping" });
    expect(journey.map((step) => step.label)).toEqual([
      "Pesanan Dibuat",
      "Pemeriksaan Pesanan",
      "Pembayaran",
      "Persiapan Barang",
      "Pemeriksaan Barang",
      "Pengemasan",
      "Pengecekan Akhir",
      "Pengiriman",
      "Selesai"
    ]);
    expect(journey.find((step) => step.state === "current")?.label).toBe("Persiapan Barang");
    expect(read("components/customer-order/CustomerOrderStatusCard.tsx")).toContain("Status sejak checkout");
  });

  it("keeps cancelled UAT orders understandable without pretending future stages will continue", () => {
    const stage = resolveOrderActiveStage({ status: "cancelled", paymentStatus: "pending_verification", fulfillmentMethod: "shipping" });
    const journey = buildOrderJourney({ stage, fulfillmentMethod: "shipping" });
    expect(journey[0]).toMatchObject({ label: "Pesanan Dibuat", state: "done" });
    expect(journey[1]).toMatchObject({ label: "Pesanan Dibatalkan", state: "stopped" });
    expect(journey.slice(2).every((step) => step.state === "skipped")).toBe(true);
    expect(read("components/customer-order/CustomerOrderStatusCard.tsx")).toContain("Tidak Dilanjutkan");
  });

  it("uses one canonical guided workflow instead of parallel admin cockpits", () => {
    const detail = read("components/admin/OrderDetailAdmin.tsx");
    expect(detail).toContain("<AdminGuidedOrderFlow");
    expect(detail).not.toContain("<OrderOperationalWorkspace");
    expect(detail).not.toContain("<CustomOrderOperationalWorkspace");
    expect(detail).toContain("module-integrity guard");
    expect(read("components/admin/AdminGuidedOrderFlow.tsx")).toContain("Semua tahap tetap terlihat dan tersusun");
    expect(read("components/admin/AdminGuidedOrderFlow.tsx")).toContain("Selesaikan Pemeriksaan Pembayaran");
  });

  it("never asks Admin to create an internal shipment document manually", () => {
    const commerce = read("components/admin/CommerceOrderOperations.tsx");
    expect(commerce).not.toContain("Buat Dokumen Pengiriman");
    expect(commerce).not.toContain('rpc("create_ready_stock_fulfillment"');
    expect(commerce).toContain("Dokumen internal dibuat otomatis");
    expect(commerce).toContain("Nomor Pengiriman DEBRODER");
  });

  it("presents one fulfillment action and moves exceptions behind a clearly labelled section", () => {
    const fulfillment = read("components/admin/FulfillmentDetailAdmin.tsx");
    expect(fulfillment).toContain('id="guided-action"');
    expect(fulfillment).toContain("Alur Penyerahan Terpandu");
    expect(fulfillment).toContain("Tindakan pengecualian");
    expect(fulfillment).not.toContain(">Aksi Status<");
    expect(fulfillment).toContain("Nomor Resi Kurir");
    expect(fulfillment).toContain("Terima Pembayaran & Serahkan Pesanan");
    expect(fulfillment).toContain("payment_method,payment_status");
  });

  it("takes Task Inbox users directly to the work instead of showing equal competing buttons", () => {
    const inbox = read("components/admin/OrderTaskInboxAdmin.tsx");
    expect(inbox).toContain("Kerjakan Sekarang");
    expect(inbox).toContain("#guided-workflow");
    expect(inbox).toContain("#guided-action");
    expect(inbox).toContain("Kelola status tugas");
  });

  it("uses active-stage links from operational lists", () => {
    const orders = read("components/admin/OrderListAdmin.tsx");
    const fulfillments = read("components/admin/FulfillmentAdmin.tsx");
    expect(orders).toContain("#guided-workflow");
    expect(fulfillments).toContain("#guided-action");
    expect(orders).toContain("Buka Tahap Aktif");
    expect(fulfillments).toContain("Buka Tahap Aktif");
  });

  it("opens payment verification reliably when guided navigation changes the hash", () => {
    const payment = read("components/admin/PaymentTrackingManager.tsx");
    expect(payment).toContain('window.addEventListener("hashchange", syncPaymentHash)');
    expect(payment).toContain('window.location.hash === "#payment"');
  });

  it("automatically and idempotently creates Ready Stock fulfillment after prerequisites", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("public._ensure_ready_stock_fulfillment_v2");
    expect(sql).toContain("'ready-stock:'||p_order_id::text");
    expect(sql).toContain("order_cancellation_requests");
    expect(sql).toContain("jsonb_array_length(coalesce(order_row.custom_project_snapshot");
    expect(sql).toContain("migration_backfill");
    expect(sql).toContain("ready_stock_fulfillment_auto_created");
    expect(sql).toContain("ensure_ready_stock_fulfillment_order_update");
    expect(sql).toContain("ensure_ready_stock_fulfillment_reservation_insert");
    expect(sql).toContain("Dokumen belum dapat dibuat karena syarat konfirmasi");
    expect(sql).toContain("status<>'cancelled'");
  });

  it("keeps courier tracking separate from the internal DEBRODER number", () => {
    const fulfillment = read("components/admin/FulfillmentDetailAdmin.tsx");
    expect(fulfillment).toContain("Nomor Pengiriman DEBRODER bukan nomor resi kurir");
    expect(fulfillment).toContain("Nomor resi resmi kurir");
    const migration = read(migrationPath);
    expect(migration).toContain("fulfillment_number");
    expect(migration).not.toContain("tracking_number:=number_value");
  });

  it("adds responsive safeguards so admin pages remain readable without zooming out", () => {
    const css = read("app/admin/admin-shell.css");
    const header = read("components/admin/layout/AdminPageHeader.tsx");
    expect(css).toContain("max-width: 1600px");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("overflow-x: auto");
    expect(header).toContain("xl:grid-cols-[minmax(0,1fr)_auto]");
    expect(header).toContain("[&>*]:w-full");
  });

  it("is forward-only and preserves core commerce data", () => {
    const sql = read(migrationPath);
    expect(sql.trim().toLowerCase().startsWith("begin;")).toBe(true);
    expect(sql.trim().toLowerCase().endsWith("commit;")).toBe(true);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(/drop\s+table/i);
    expect(sql).not.toMatch(/delete\s+from\s+public\.(orders|order_items|order_payments|fulfillments|job_orders|stock_reservations)/i);
  });
});
