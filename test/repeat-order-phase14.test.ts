import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  REPEAT_ORDER_CREATE_ROLES,
  REPEAT_ORDER_ELIGIBLE_STATUSES,
  canCreateRepeatOrder,
  validateCreateRepeatOrderInput
} from "@/lib/repeat-orders";

const apiSource = readFileSync("app/api/admin/repeat-orders/route.ts", "utf8");
const authSource = readFileSync("lib/repeat-order-auth.ts", "utf8");
const dialogSource = readFileSync("components/admin/RepeatOrderDialog.tsx", "utf8");
const repeatOrdersSource = readFileSync("lib/repeat-orders.ts", "utf8");
const orderDetailSource = readFileSync("components/admin/OrderDetailAdmin.tsx", "utf8");
const quotationDetailSource = readFileSync("components/admin/QuotationDetailAdmin.tsx", "utf8");
const navSource = readFileSync("components/admin/layout/admin-navigation.ts", "utf8");

const sourceOrderId = "11111111-1111-4111-8111-111111111111";

describe("Phase 14 Repeat Order contracts", () => {
  it("uses only fulfilled/ready source statuses from the remote foundation", () => {
    expect(REPEAT_ORDER_ELIGIBLE_STATUSES).toEqual([
      "siap_diambil",
      "siap_dikirim",
      "selesai"
    ]);
  });

  it("allows only the official order-management roles to create repeat orders", () => {
    expect(REPEAT_ORDER_CREATE_ROLES).toEqual([
      "owner",
      "superadmin",
      "super_admin",
      "admin",
      "sales_admin"
    ]);
    expect(canCreateRepeatOrder("superadmin")).toBe(true);
    expect(canCreateRepeatOrder("sales_admin")).toBe(true);
    expect(canCreateRepeatOrder("finance")).toBe(false);
    expect(canCreateRepeatOrder("operator")).toBe(false);
    expect(authSource).toContain('"quotation.write"');
    expect(authSource).toContain("Role ini tidak diizinkan membuat Repeat Order");
  });

  it("validates UUID, reason, and idempotency key", () => {
    const valid = validateCreateRepeatOrderInput({
      sourceOrderId,
      reason: "Pelanggan memesan batch tambahan.",
      idempotencyKey: `repeat-order:${sourceOrderId}:stable-key`
    });
    expect(valid.errors).toEqual([]);
    expect(valid.input?.sourceOrderId).toBe(sourceOrderId);

    const invalid = validateCreateRepeatOrderInput({
      sourceOrderId: "bad",
      reason: "x",
      idempotencyKey: "short"
    });
    expect(invalid.input).toBeNull();
    expect(invalid.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("uses the existing atomic RPC and never replays the Phase 14 migration", () => {
    expect(apiSource).toContain('rpc("create_repeat_order_quotation"');
    expect(apiSource).not.toContain("apply_migration");
    expect(apiSource).not.toContain("phase14_repeat_order");
  });

  it("prevents duplicate creation with a stable key and disabled working state", () => {
    expect(dialogSource).toContain("createIdempotencyKey");
    expect(dialogSource).toContain("idempotencyKey");
    expect(dialogSource).toContain("if (!preview || !canCreate || working");
    expect(dialogSource).toContain("disabled={working");
  });

  it("does not mutate the source order in the application route", () => {
    expect(apiSource).not.toContain('.from("orders").update');
    expect(apiSource).not.toContain('.from("order_items").update');
    expect(apiSource).toContain("getRepeatOrderPreview");
  });

  it("integrates repeat order and customer history into order detail", () => {
    expect(orderDetailSource).toContain("RepeatOrderDialog");
    expect(orderDetailSource).toContain("CustomerOrderHistory");
    expect(navSource).toContain('href: "/admin/repeat-orders"');
    expect(quotationDetailSource).toContain("repeated_from_order_id");
    expect(quotationDetailSource).toContain("Buka order sumber");
  });

  it("keeps active pricing explicit and routes manual cases to quotation review", () => {
    expect(apiSource).toContain("applyActiveProductPricingToRepeatQuotation");
    expect(dialogSource).toContain("Harga layanan dibuat pending");
    expect(repeatOrdersSource).toContain("approval baru tetap mengikuti lifecycle quotation");
  });

  it("preserves Phase 12 and Phase 13 integrations by using quotation lifecycle and authenticated role checks", () => {
    expect(apiSource).toContain("requireRepeatOrderActor");
    expect(apiSource.includes("refresh_quotation_totals")).toBe(false);
    expect(apiSource).toContain("warnings: preview.warnings");
    expect(authSource).toContain('client.rpc("has_permission"');
  });
});
