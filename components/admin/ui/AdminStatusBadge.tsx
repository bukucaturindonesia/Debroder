const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  under_review: "Dalam Review",
  pricing: "Penyusunan Harga",
  sent: "Terkirim",
  revision_requested: "Minta Revisi",
  approved: "Disetujui",
  rejected: "Ditolak",
  expired: "Kedaluwarsa",
  converted_to_order: "Menjadi Order"
};

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

export function getQuotationStatusLabel(status: string) {
  return QUOTATION_STATUS_LABELS[status] || "Status tidak dikenal";
}

export function getQuotationStatusOptions() {
  return Object.entries(QUOTATION_STATUS_LABELS);
}

export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        QUOTATION_STATUS_CLASSES[status] ||
        "border-brand-softGray bg-brand-offWhite text-brand-charcoal"
      }`}
      title={status}
    >
      {getQuotationStatusLabel(status)}
    </span>
  );
}
