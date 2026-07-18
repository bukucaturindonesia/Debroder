import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { automaticPaymentBlocker, deriveAutomaticPaymentToken } from "@/lib/automatic-payment-link";
import { resolveNotificationTarget, safeNotificationPath } from "@/lib/notification-routing";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("Custom Hub and general cart boundary", () => {
  it("renders CMS category media at 4:5 with the visible canonical CTA", () => {
    const source = read("components/custom/CustomHub.tsx");
    expect(source).toContain("aspect-[4/5]");
    expect(source).toContain("Mulai Custom");
    expect(source).toContain('category.entryType === "jersey_configurator"');
  });

  it("removes legacy production-service selection and pricing from the public cart", () => {
    const cart = read("components/CartProvider.tsx");
    const checkout = read("components/checkout/CheckoutClient.tsx");
    expect(cart).not.toContain("Pilihan Produksi");
    expect(cart).not.toContain("serviceOptions");
    expect(cart).not.toContain("pricePerPcs");
    expect(checkout).not.toContain("item.services");
    expect(cart).toContain("CustomProjectSummary");
    expect(cart).toContain("JerseyConfigSummary");
  });
});

describe("automatic payment eligibility", () => {
  const order = { id: "11111111-1111-1111-1111-111111111111", order_number: "ORD-1", status: "awaiting_payment", payment_status: "unpaid", pricing_status: "final", total_amount: 100_000, whatsapp_confirmed_at: "2026-07-18T00:00:00Z", archived_at: null };
  it("fails closed until customer verification and final positive pricing", () => {
    expect(automaticPaymentBlocker({ ...order, whatsapp_confirmed_at: null })).toContain("verifikasi");
    expect(automaticPaymentBlocker({ ...order, pricing_status: "estimated" })).toContain("harga final");
    expect(automaticPaymentBlocker({ ...order, total_amount: 0 })).toContain("harga final");
    expect(automaticPaymentBlocker(order)).toBeNull();
  });

  it("derives a stable link token scoped to both order and link IDs", () => {
    const first = deriveAutomaticPaymentToken(order.id, "22222222-2222-2222-2222-222222222222", "secret");
    expect(first).toBe(deriveAutomaticPaymentToken(order.id, "22222222-2222-2222-2222-222222222222", "secret"));
    expect(first).not.toBe(deriveAutomaticPaymentToken(order.id, "33333333-3333-3333-3333-333333333333", "secret"));
  });
});

describe("notification routing and database compatibility", () => {
  it("uses one safe canonical resolver and never accepts an arbitrary target", () => {
    const notification = { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", related_path: null };
    const event = { entity_type: "order_payment", entity_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", payload: { order_id: "cccccccc-cccc-cccc-cccc-cccccccccccc" } };
    expect(resolveNotificationTarget(notification, event)).toBe("/admin/orders/cccccccc-cccc-cccc-cccc-cccccccccccc#payment");
    expect(safeNotificationPath("https://example.com/admin/orders/x")).toBeNull();
    expect(safeNotificationPath("/admin/../secrets")).toBeNull();
  });

  it("ships a local 28-to-27 Phase 7 compatibility overload and atomic payment notification sync", () => {
    const sql = read("supabase/migrations/20260718150000_custom_admin_operational_hotfix.sql");
    expect(sql).toContain("p_legacy_reserved_id uuid");
    expect(sql).toContain("select public.record_pim_audit_event_v1(");
    expect(sql).toContain("sync_payment_notifications_v1");
    expect(sql).toContain("payment_submission_links_one_system_active_idx");
  });
});
