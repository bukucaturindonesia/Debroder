export type DocumentNumberRule = {
  document_type: string;
  prefix: string;
  use_year: boolean;
  use_month: boolean;
  padding: number;
  separator: string;
  reset_rule: "never" | "yearly" | "monthly";
  active: boolean;
  updated_by: string | null;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  quotation: "Quotation",
  quotation_version: "Versi Quotation",
  order: "Pesanan",
  payment: "Pembayaran",
  payment_receipt: "Kuitansi Pembayaran",
  job_order: "Job Order",
  work_item: "Work Item",
  qc: "Quality Control",
  delivery: "Pengiriman",
  pickup_handover: "Serah Terima Pickup"
};

export function normalizeDocumentType(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getDocumentTypeLabel(documentType: string) {
  return (
    DOCUMENT_TYPE_LABELS[documentType] ||
    documentType
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function getResetRuleLabel(resetRule: string) {
  if (resetRule === "monthly") return "Reset tiap bulan";
  if (resetRule === "yearly") return "Reset tiap tahun";
  return "Tidak pernah reset";
}

export function isSuperAdminRole(role: string | null | undefined) {
  return role === "superadmin" || role === "super_admin";
}

function makassarDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(date);
  return {
    year: parts.find((part) => part.type === "year")?.value || "0000",
    month: parts.find((part) => part.type === "month")?.value || "00"
  };
}

export function buildDocumentNumberPreview(
  rule: Pick<
    DocumentNumberRule,
    "prefix" | "use_year" | "use_month" | "padding" | "separator"
  >,
  date = new Date(),
  sequence = 1
) {
  const { year, month } = makassarDateParts(date);
  const separator = rule.separator || "-";
  const segments = [rule.prefix.trim()];
  if (rule.use_year) segments.push(year);
  if (rule.use_month) segments.push(month);
  segments.push(String(Math.max(1, sequence)).padStart(rule.padding, "0"));
  return segments.join(separator);
}
