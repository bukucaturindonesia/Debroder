import {
  getQuotationStatusDescription,
  getQuotationStatusLabel as getSharedQuotationStatusLabel,
  getQuotationStatusOptions as getSharedQuotationStatusOptions
} from "@/lib/quotation-status-copy";

const QUOTATION_STATUS_CLASSES: Record<string, string> = {
  draft: "border-brand-softGray bg-brand-offWhite text-brand-charcoal",
  submitted: "border-blue-200 bg-blue-50 text-blue-800",
  under_review: "border-violet-200 bg-violet-50 text-violet-800",
  pricing: "border-amber-200 bg-amber-50 text-amber-800",
  sent: "border-sky-200 bg-sky-50 text-sky-800",
  revision_requested: "border-orange-200 bg-orange-50 text-orange-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  expired: "border-slate-200 bg-slate-50 text-slate-700",
  converted_to_order: "border-brand-green/20 bg-brand-green/10 text-brand-green"
};

export function getQuotationStatusLabelForAdmin(status: string) {
  return getSharedQuotationStatusLabel(status, "admin");
}

// Dipertahankan agar import lama tidak rusak.
export const getQuotationStatusLabel = getQuotationStatusLabelForAdmin;

export function getQuotationStatusOptions() {
  return getSharedQuotationStatusOptions();
}

export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        QUOTATION_STATUS_CLASSES[status] ||
        "border-brand-softGray bg-brand-offWhite text-brand-charcoal"
      }`}
      title={getQuotationStatusDescription(status, "admin")}
    >
      {getQuotationStatusLabelForAdmin(status)}
    </span>
  );
}
