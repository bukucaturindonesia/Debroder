export const QC_ROLES = ["owner", "superadmin", "super_admin", "admin"] as const;
export const QC_SUPER_ADMIN_ROLES = ["superadmin", "super_admin"] as const;

export type QcWorkflowStatus = "draft" | "in_review" | "finalized";
export type QcResult = "pending" | "passed" | "partial" | "failed" | "rework";
export type QcChecklistResult = "pending" | "pass" | "fail" | "not_applicable";

export type QcRecordRow = {
  id: string;
  qc_number: string;
  job_order_id: string;
  work_item_id: string;
  attempt_number: number;
  checked_quantity: number;
  passed_quantity: number;
  failed_quantity: number;
  result: QcResult;
  status: QcWorkflowStatus;
  defect_notes: string | null;
  inspector_id: string | null;
  inspection_started_at: string | null;
  inspected_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
};

export type QcChecklistRow = {
  id: string;
  qc_record_id: string;
  template_id: string | null;
  code: string;
  label: string;
  result: QcChecklistResult;
  note: string | null;
  sort_order: number;
};

export type QcFileRow = {
  id: string;
  qc_record_id: string;
  bucket: string;
  path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  uploaded_at: string;
};

export const QC_WORKFLOW_LABELS: Record<QcWorkflowStatus, string> = {
  draft: "Draft QC",
  in_review: "Sedang Diperiksa",
  finalized: "Sudah Difinalisasi"
};

export const QC_RESULT_LABELS: Record<QcResult, string> = {
  pending: "Belum Diputuskan",
  passed: "Lulus",
  partial: "Lulus Sebagian / Perbaikan",
  failed: "Tidak Lulus",
  rework: "Perlu Perbaikan"
};

export const QC_CHECKLIST_LABELS: Record<QcChecklistResult, string> = {
  pending: "Belum Diperiksa",
  pass: "Lulus",
  fail: "Gagal",
  not_applicable: "Tidak Berlaku"
};

export function isQcRole(role: string | null | undefined) {
  return Boolean(role && QC_ROLES.includes(role as (typeof QC_ROLES)[number]));
}

export function isQcSuperAdmin(role: string | null | undefined) {
  return Boolean(role && QC_SUPER_ADMIN_ROLES.includes(role as (typeof QC_SUPER_ADMIN_ROLES)[number]));
}

export function canEditQc(record: Pick<QcRecordRow, "result" | "status" | "archived_at">) {
  return !record.archived_at && record.result === "pending" && ["draft", "in_review"].includes(record.status);
}

export function canArchiveQc(record: Pick<QcRecordRow, "result" | "status" | "archived_at">) {
  return !record.archived_at && record.result === "pending" && ["draft", "in_review"].includes(record.status);
}

export function formatQcDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar"
  }).format(new Date(value));
}

export function formatQcFileSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function safeQcFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "bukti-qc";
}
