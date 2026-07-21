import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PIM_AUDIT_CATEGORIES,
  PIM_AUDIT_EVENT_REGISTRY,
  PIM_AUDIT_EVENT_VERSION,
  PIM_AUDIT_STATUSES,
  assertPimAuditEvent,
  auditValueState,
  diffPimAuditFields,
  sanitizePimAuditMetadata
} from "@/lib/pim-audit";
import { PimAuditServerError, parsePimAuditFilters } from "@/lib/pim-audit-server";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/20260718100000_pim_phase_7_audit_operations_history.sql");

describe("PIM Phase 7 central event registry", () => {
  it("has one versioned registry with valid categories, modules, and statuses", () => {
    expect(PIM_AUDIT_EVENT_VERSION).toBe(1);
    const codes = Object.keys(PIM_AUDIT_EVENT_REGISTRY);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBeGreaterThan(40);
    for (const [code, definition] of Object.entries(PIM_AUDIT_EVENT_REGISTRY)) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]+$/);
      expect(PIM_AUDIT_CATEGORIES).toContain(definition.category);
      expect(definition.sourceModule).toBeTruthy();
      expect(definition.statuses.length).toBeGreaterThan(0);
      for (const status of definition.statuses) expect(PIM_AUDIT_STATUSES).toContain(status);
    }
  });

  it("rejects unknown or disallowed event status combinations", () => {
    expect(() => assertPimAuditEvent("PRODUCT_CREATED", "COMPLETED")).not.toThrow();
    expect(() => assertPimAuditEvent("PRODUCT_CREATED", "EXPIRED")).toThrow();
    expect(() => assertPimAuditEvent("UNKNOWN_EVENT" as "PRODUCT_CREATED", "COMPLETED")).toThrow();
  });
});

describe("PIM Phase 7 field changes and redaction", () => {
  it("keeps null, empty string, and zero as distinct states", () => {
    expect(auditValueState(null)).toBe("NULL");
    expect(auditValueState("")).toBe("EMPTY_STRING");
    expect(auditValueState(0)).toBe("ZERO");
    expect(auditValueState("0")).toBe("VALUE");
  });

  it("stores only changed allowlisted fields", () => {
    const changes = diffPimAuditFields(
      { name: "Kaos", base_price: 0, status: "draft", password: "old" },
      { name: "Kaos Baru", base_price: null, status: "draft", password: "new" },
      ["name", "base_price", "status", "password"]
    );
    expect(changes.map((item) => item.field)).toEqual(["name", "base_price"]);
    expect(changes[1]).toMatchObject({ beforeState: "ZERO", afterState: "NULL" });
  });

  it("uses a strict safe-metadata allowlist and removes secrets", () => {
    expect(sanitizePimAuditMetadata({ targetCount: 10, signedUrl: "https://example.test/?token=secret", password: "x", unexpected: "x" })).toEqual({ targetCount: 10 });
  });
});

describe("PIM Phase 7 immutable canonical database model", () => {
  it("extends system_audit_log instead of creating a second audit parent", () => {
    expect(migration).toContain("alter table public.system_audit_log");
    expect(migration).not.toMatch(/create table if not exists public\.pim_audit_(operations|events)\b/);
    expect(migration).toContain("create table if not exists public.pim_audit_changes");
    expect(migration).toContain("create table if not exists public.pim_audit_entities");
  });

  it("enforces idempotency, append-only children, RLS, and service-only insert", () => {
    expect(migration).toContain("system_audit_log_pim_idempotency_idx");
    expect(migration).toContain("prevent_pim_audit_child_mutation_v1");
    expect(migration).toContain("before update or delete");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("grant execute on function public.record_pim_audit_event_v1");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("from public,anon,authenticated");
  });

  it("integrates legacy atomic batches and Phase 6 operation lifecycle", () => {
    expect(migration).toContain("canonicalize_legacy_pim_audit_v1");
    expect(migration).toContain("BULK_IMPORT_COMPLETED");
    expect(migration).toContain("BULK_EDIT_COMPLETED");
    expect(migration).toContain("audit_pim_phase6_operation_v1");
    expect(migration).toContain("EXPORT_EXPIRED");
    expect(migration).toContain("RECONCILIATION_COMPLETED");
  });

  it("does not backfill invented history or add cleanup deletion", () => {
    expect(migration).toContain("NO HISTORICAL BACKFILL");
    expect(migration).not.toContain("delete from public.system_audit_log");
    expect(migration).not.toContain("delete from public.pim_audit_changes");
  });
});

describe("PIM Phase 7 server/UI integration", () => {
  const api = read("app/api/admin/products/audit-history/route.ts");
  const server = read("lib/pim-audit-server.ts");
  const ui = read("components/admin/PimAuditHistoryAdmin.tsx");
  const productRoute = read("app/api/admin/products/route.ts");
  const importRoute = read("app/api/admin/products/bulk-import/route.ts");
  const editRoute = read("app/api/admin/products/bulk-edit/route.ts");

  it("keeps audit endpoints GET-only, authenticated, bounded, and server-filtered", () => {
    expect(api).toContain("export async function GET");
    expect(api).not.toContain("export async function POST");
    expect(api).toContain("requirePhase13Actor");
    expect(server).toContain("PAGE_SIZE_MAX = 100");
    expect(server).toContain("DATE_RANGE_MAX_DAYS = 366");
    expect(server).toContain('.order("created_at"');
    expect(server).toContain('.order("id"');
    expect(server).toContain("INVALID_CURSOR");
  });

  it("rejects invalid filters/cursors and bounds page size", () => {
    const bounded = parsePimAuditFilters(new URL("https://example.test/admin?from=2026-07-01&to=2026-07-31&pageSize=999"));
    expect(bounded.pageSize).toBe(100);
    expect(() => parsePimAuditFilters(new URL("https://example.test/admin?status=UNKNOWN"))).toThrow(PimAuditServerError);
    expect(() => parsePimAuditFilters(new URL("https://example.test/admin?cursor=invalid"))).toThrow(PimAuditServerError);
    expect(() => parsePimAuditFilters(new URL("https://example.test/admin?sort=anything"))).toThrow(PimAuditServerError);
  });

  it("provides read-only list, search, filters, lazy detail, and history entry points", () => {
    expect(ui).toContain("Akses hanya-baca");
    expect(ui).toContain("Terapkan filter");
    expect(ui).toContain("Muat aktivitas berikutnya");
    expect(ui).toContain("Lihat detail");
    expect(ui).toContain("Riwayat produk");
    expect(ui).toContain("Riwayat varian");
    expect(ui).toContain("Riwayat batch");
    expect(ui).not.toMatch(/data-admin-mutation|Undo|Auto Fix/);
    expect(read("components/admin/layout/admin-navigation.ts")).toContain("Riwayat Aktivitas");
    expect(read("components/admin/ProductAdmin.tsx")).toContain("Lihat Riwayat");
    expect(read("components/admin/ProductAdmin.tsx")).toContain("Riwayat Varian");
  });

  it("integrates Product Manager, Bulk Import, and Bulk Edit without replacing their business flow", () => {
    expect(productRoute).toContain("auditProductMutation");
    expect(productRoute).toContain("PRODUCT_PUBLISHED");
    expect(productRoute).toContain("VARIANT_MATRIX_UPDATED");
    expect(importRoute).toContain("BULK_IMPORT_PREVIEWED");
    expect(editRoute).toContain("BULK_EDIT_PREVIEWED");
    expect(read("lib/pim-bulk-import-server.ts")).toContain("linkPimAuditEntities");
    expect(read("lib/pim-bulk-edit-server.ts")).toContain("linkPimAuditEntities");
    expect(read("app/api/admin/products/export-reconciliation/download/[jobId]/route.ts")).toContain("EXPORT_DOWNLOADED");
    expect(read("app/api/admin/products/export-reconciliation/download/[jobId]/route.ts")).toContain("RECONCILIATION_REPORT_DOWNLOADED");
  });

  it("does not touch Public UI, Jersey, commerce, or order flows", () => {
    const forbiddenImports = ["@/lib/order", "@/lib/commerce-checkout", "@/lib/jersey", "@/components/Public"];
    for (const value of forbiddenImports) {
      expect(server).not.toContain(value);
      expect(ui).not.toContain(value);
    }
  });
});
