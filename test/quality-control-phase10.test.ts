import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  QC_CHECKLIST_LABELS,
  QC_RESULT_LABELS,
  QC_WORKFLOW_LABELS,
  canArchiveQc,
  canEditQc,
  safeQcFileName
} from "@/lib/quality-control";

const migrations = [
  "20260712145657_v1_2_phase_10_qc_schema_security.sql",
  "20260712150010_v1_2_phase_10_qc_begin_only_check.sql",
  "20260712150036_v1_2_phase_10_qc_create_record.sql",
  "20260712150101_v1_2_phase_10_qc_update_draft.sql",
  "20260712150123_v1_2_phase_10_qc_archive_restore.sql",
  "20260712150203_v1_2_phase_10_qc_completion_integration.sql",
  "20260712150646_v1_2_phase_10_qc_remove_file.sql",
  "20260712150711_v1_2_phase_10_qc_permanent_delete_alignment.sql"
]
  .map((file) => readFileSync(resolve("supabase/migrations", file), "utf8"))
  .join("\n")
  .toLowerCase();
const navigation = readFileSync(resolve("components/admin/layout/admin-navigation.ts"), "utf8");
const listUi = readFileSync(resolve("components/admin/QualityControlAdmin.tsx"), "utf8");
const detailUi = readFileSync(resolve("components/admin/QualityControlDetailAdmin.tsx"), "utf8");
const workItemDetail = readFileSync(resolve("components/admin/WorkItemDetailAdmin.tsx"), "utf8");

describe("Phase 10 QC helpers", () => {
  it("labels draft, review, final result, and checklist states", () => {
    expect(QC_WORKFLOW_LABELS.draft).toContain("Draft");
    expect(QC_WORKFLOW_LABELS.in_review).toContain("Diperiksa");
    expect(QC_RESULT_LABELS.passed).toBe("Lulus");
    expect(QC_RESULT_LABELS.rework).toContain("Perbaikan");
    expect(QC_CHECKLIST_LABELS.pending).toContain("Belum");
  });

  it("only allows edit/archive before finalization", () => {
    expect(canEditQc({ result: "pending", status: "draft", archived_at: null })).toBe(true);
    expect(canEditQc({ result: "pending", status: "in_review", archived_at: null })).toBe(true);
    expect(canEditQc({ result: "passed", status: "finalized", archived_at: null })).toBe(false);
    expect(canArchiveQc({ result: "pending", status: "draft", archived_at: null })).toBe(true);
  });

  it("sanitizes evidence file names", () => {
    expect(safeQcFileName(" Bukti QC Final 01.JPG ")).toBe("bukti-qc-final-01.jpg");
  });
});

describe("Phase 10 QC database and UI contract", () => {
  it("adds QC lifecycle functions and storage security", () => {
    expect(migrations).toContain("create or replace function public.create_qc_record");
    expect(migrations).toContain("create or replace function public.begin_qc_record");
    expect(migrations).toContain("create or replace function public.finalize_qc_record");
    expect(migrations).toContain("qc-proofs");
    expect(migrations).toContain("minimal satu bukti foto atau dokumen qc wajib diunggah");
    expect(migrations).toContain("quality control lulus");
  });

  it("keeps Phase 10 discoverable from navigation and Work Item detail", () => {
    expect(navigation).toContain('href: "/admin/quality-control"');
    expect(navigation).toContain("Detail Pemeriksaan Kualitas");
    expect(workItemDetail).toContain("Buka Pemeriksaan Kualitas");
  });

  it("ships list and detail managers", () => {
    expect(listUi).toContain("Pemeriksaan Kualitas");
    expect(listUi).toContain("Gudang Arsip");
    expect(detailUi).toContain("Selesaikan Pemeriksaan Kualitas");
    expect(detailUi).toContain("Unggah Bukti Pemeriksaan");
  });
});
