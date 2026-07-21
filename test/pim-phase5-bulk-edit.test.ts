import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PIM_BULK_EDIT_LIMITS,
  calculatePimBulkPrice,
  calculatePimBulkStock,
  normalizePimBulkAction,
  normalizePimBulkSelection,
  pimBulkTargetLimit
} from "@/lib/pim-bulk-edit";
import { isPimBulkCommitRole } from "@/lib/pim-bulk-edit-server";

const productId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";

describe("PIM Phase 5 action and arithmetic contracts", () => {
  it("accepts only the documented action allowlist", () => {
    expect(normalizePimBulkAction({ type: "PRODUCT_SET_CATEGORY", categoryId })).toEqual({ type: "PRODUCT_SET_CATEGORY", targetType: "product", categoryId });
    expect(normalizePimBulkAction({ type: "PRODUCT_SET_STATUS", status: "active" })).toMatchObject({ targetType: "product", status: "active" });
    expect(normalizePimBulkAction({ type: "VARIANT_SET_STATUS", status: "inactive" })).toMatchObject({ targetType: "variant", status: "inactive" });
    expect(normalizePimBulkAction({ type: "SELLABLE_STOCK", mode: "INCREASE", value: 5 })).toMatchObject({ targetType: "sellable", value: 5 });
    expect(normalizePimBulkAction({ type: "BULK_SKU", value: "NEW-SKU" })).toBeNull();
    expect(normalizePimBulkAction({ type: "PERMANENT_DELETE" })).toBeNull();
    expect(normalizePimBulkAction({ type: "PRODUCT_SET_STATUS", status: "deleted" })).toBeNull();
  });

  it("uses bounded target limits for each canonical level", () => {
    expect(pimBulkTargetLimit("product")).toBe(250);
    expect(pimBulkTargetLimit("variant")).toBe(500);
    expect(pimBulkTargetLimit("sellable")).toBe(1000);
    expect(PIM_BULK_EDIT_LIMITS.totalMutations).toBe(1000);
  });

  it("blocks fractional Rupiah instead of rounding percentage results", () => {
    expect(calculatePimBulkPrice(101, "INCREASE_PERCENT", 10)).toEqual({ value: null, code: "PRICE_ROUNDING_RULE_MISSING" });
    expect(calculatePimBulkPrice(100, "INCREASE_PERCENT", 10)).toEqual({ value: 110, code: null });
    expect(calculatePimBulkPrice(100, "DECREASE_FIXED", 101).code).toBe("NEGATIVE_PRICE_RESULT");
  });

  it("blocks unsafe or insufficient stock changes", () => {
    expect(calculatePimBulkStock(10, "DECREASE", 4)).toEqual({ value: 6, code: null });
    expect(calculatePimBulkStock(3, "DECREASE", 4).code).toBe("INSUFFICIENT_STOCK_FOR_BULK_DECREASE");
    expect(calculatePimBulkStock(-1, "SET", 2).code).toBe("INVALID_STOCK");
  });
});

describe("PIM Phase 5 selection and permission contracts", () => {
  it("normalizes explicit and all-matching selection with exclusions", () => {
    expect(normalizePimBulkSelection({ mode: "explicit", targetType: "product", ids: [productId], filters: {} })).toMatchObject({ mode: "explicit", ids: [productId] });
    expect(normalizePimBulkSelection({ mode: "all_matching", targetType: "product", ids: [], excludedIds: [productId], filters: { status: "draft", categoryId } })).toMatchObject({ mode: "all_matching", excludedIds: [productId], filters: { status: "draft", categoryId } });
    expect(normalizePimBulkSelection({ mode: "explicit", targetType: "product", ids: [], filters: {} })).toBeNull();
  });

  it("permits final commit only to canonical PIM dependency roles", () => {
    expect(isPimBulkCommitRole("owner")).toBe(true);
    expect(isPimBulkCommitRole("superadmin")).toBe(true);
    expect(isPimBulkCommitRole("super_admin")).toBe(true);
    expect(isPimBulkCommitRole("admin")).toBe(false);
    expect(isPimBulkCommitRole("admin_guest")).toBe(false);
  });
});

describe("PIM Phase 5 server authority, UX, and atomicity", () => {
  it("keeps preview write-free and revalidates exact current state before RPC", () => {
    const route = source("app/api/admin/products/bulk-edit/route.ts");
    const server = source("lib/pim-bulk-edit-server.ts");
    expect(route).toContain('action === "preview"');
    expect(route).toContain('method: "GET"');
    expect(route).toContain("validatePimBulkEdit");
    expect(route).toContain("commitPimBulkEdit");
    expect(server).toContain("verifyPreviewToken");
    expect(server).toContain("preview.previewHash !== claims.previewHash");
    expect(server).toContain("DATA CHANGED — RUN PREVIEW AGAIN");
    expect(server).toContain('.rpc("pim_bulk_edit_apply_v1"');
  });

  it("supports cross-page and all-matching selection while resetting stale filters", () => {
    const ui = source("components/admin/BulkEditProductsAdmin.tsx");
    expect(ui).toContain("Pilihan tersimpan lintas halaman");
    expect(ui).toContain("Pilih seluruh");
    expect(ui).toContain("excludedIds");
    expect(ui).toContain("resetSelection");
    expect(ui).toContain("Selection direset karena target atau filter berubah");
    expect(ui).toContain("showModal");
    expect(ui).toContain("Penerapan perubahan dinonaktifkan dalam mode pratinjau");
    expect(ui).toContain("data sebelum dan sesudah");
  });

  it("implements service-role-only atomic RPC, concurrency, idempotency, audit, and rollback", () => {
    const migration = source("supabase/migrations/20260717093000_pim_phase_5_bulk_edit_atomic.sql");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("idempotency_key text not null unique");
    expect(migration).toContain("CONCURRENT_MODIFICATION");
    expect(migration).toContain("PRICE_ROUNDING_RULE_MISSING");
    expect(migration).toContain("VARIANT_INACTIVE_CONFLICT");
    expect(migration).toContain("PUBLISH_VALIDATION_FAILED");
    expect(migration).toContain("CATEGORY_COMPATIBILITY_ERROR");
    expect(migration).toContain("stock_quantity =");
    expect(migration).toContain("insert into public.system_audit_log");
    expect(migration).toContain("revoke all on function public.pim_bulk_edit_apply_v1");
    expect(migration).toContain("to service_role");
  });

  it("does not add forbidden mutation paths or touch frozen commerce tables", () => {
    const migration = source("supabase/migrations/20260717093000_pim_phase_5_bulk_edit_atomic.sql");
    const server = source("lib/pim-bulk-edit-server.ts");
    expect(migration).not.toMatch(/delete\s+from/i);
    expect(migration).not.toMatch(/update\s+public\.(orders|payments|stock_reservations|inventory_ledger)/i);
    expect(server).not.toContain('type === "PERMANENT_DELETE"');
    expect(server).not.toContain('type: "BULK_SKU"');
    expect(server).not.toContain('type: "BULK_SLUG"');
  });
});

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}
