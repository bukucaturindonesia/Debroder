import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDocumentNumberPreview,
  getDocumentTypeLabel,
  getResetRuleLabel,
  isSuperAdminRole,
  normalizeDocumentType
} from "@/lib/document-numbering";

describe("Phase 6 document numbering helpers", () => {
  it("normalizes custom document types", () => {
    expect(normalizeDocumentType("  Invoice Customer  ")).toBe("invoice_customer");
    expect(normalizeDocumentType("QC/Final#Report")).toBe("qc_final_report");
  });

  it("builds a Makassar-time document number preview", () => {
    const preview = buildDocumentNumberPreview(
      {
        prefix: "QTN-DEB",
        use_year: true,
        use_month: true,
        padding: 4,
        separator: "-"
      },
      new Date("2026-01-31T17:30:00.000Z"),
      9
    );
    expect(preview).toBe("QTN-DEB-2026-02-0009");
  });

  it("keeps readable labels and Super Admin restrictions", () => {
    expect(getDocumentTypeLabel("payment_receipt")).toBe("Kuitansi Pembayaran");
    expect(getDocumentTypeLabel("custom_invoice")).toBe("Custom Invoice");
    expect(getResetRuleLabel("monthly")).toBe("Reset tiap bulan");
    expect(isSuperAdminRole("superadmin")).toBe(true);
    expect(isSuperAdminRole("super_admin")).toBe(true);
    expect(isSuperAdminRole("owner")).toBe(false);
  });
});

describe("Phase 6 migration security contract", () => {
  const lifecycleSql = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260712091748_v1_2_phase_6_numbering_lifecycle_and_security.sql"
    ),
    "utf8"
  );
  const deleteCleanupSql = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260712093500_v1_2_phase_6_permanent_delete_audit_and_sequence_cleanup.sql"
    ),
    "utf8"
  );
  const allocatorSql = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260712091712_v1_2_phase_6_numbering_allocator_and_registry.sql"
    ),
    "utf8"
  );

  it("makes issued-number history immutable and sequence allocation private", () => {
    expect(lifecycleSql).toContain("prevent_document_number_issue_update_delete");
    expect(lifecycleSql).toContain("revoke all on public.document_number_sequences");
    expect(lifecycleSql).toContain("grant execute on function public.allocate_document_number(text) to service_role");
    expect(lifecycleSql).toContain("Hanya Super Admin yang dapat menghapus permanen");
    expect(deleteCleanupSql).toContain("delete from public.document_number_sequences");
    expect(deleteCleanupSql).toContain("'deleted'");
  });

  it("uses centralized allocation, Makassar business time, and automatic registry", () => {
    expect(allocatorSql).toContain("timezone('Asia/Makassar',now())");
    expect(allocatorSql).toContain("allocate_document_number");
    expect(allocatorSql).toContain("register_quotation_document_number");
    expect(allocatorSql).toContain("register_order_document_number");
    expect(allocatorSql).toContain("register_payment_document_number");
    expect(allocatorSql).toContain("on conflict do nothing");
  });
});
