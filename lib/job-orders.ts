export const JOB_ORDER_ROLES = ["owner", "superadmin", "super_admin", "admin", "production_admin"] as const;
export const SUPER_ADMIN_ROLES = ["superadmin", "super_admin"] as const;

export type JobOrderStatus =
  | "draft"
  | "ready"
  | "released"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type JobOrderPriority = "low" | "normal" | "high" | "urgent";

export type JobOrderRow = {
  id: string;
  job_order_number: string;
  order_id: string;
  quotation_id: string | null;
  approved_mockup_set_id: string | null;
  status: JobOrderStatus;
  priority: JobOrderPriority;
  target_date: string | null;
  internal_notes: string | null;
  production_notes: string | null;
  order_snapshot: Record<string, unknown>;
  mockup_snapshot: Record<string, unknown>;
  payment_snapshot: Record<string, unknown>;
  progress_percentage: number;
  ready_by: string | null;
  ready_at: string | null;
  released_by: string | null;
  released_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
};

export const JOB_ORDER_STATUS_LABELS: Record<JobOrderStatus, string> = {
  draft: "Draft",
  ready: "Siap Dirilis",
  released: "Dirilis ke Produksi",
  in_progress: "Produksi Berjalan",
  on_hold: "Produksi Ditahan",
  completed: "Selesai",
  cancelled: "Dibatalkan"
};

export const JOB_ORDER_PRIORITY_LABELS: Record<JobOrderPriority, string> = {
  low: "Rendah",
  normal: "Normal",
  high: "Tinggi",
  urgent: "Mendesak"
};

export function isJobOrderRole(role: string | null | undefined) {
  return Boolean(role && JOB_ORDER_ROLES.includes(role as (typeof JOB_ORDER_ROLES)[number]));
}

export function isSuperAdminRole(role: string | null | undefined) {
  return Boolean(role && SUPER_ADMIN_ROLES.includes(role as (typeof SUPER_ADMIN_ROLES)[number]));
}

export function canEditJobOrder(status: JobOrderStatus) {
  return status === "draft" || status === "ready";
}

export function canArchiveJobOrder(status: JobOrderStatus) {
  return status === "draft" || status === "completed" || status === "cancelled";
}

export function getPhase9JobOrderTransitions(status: JobOrderStatus) {
  if (status === "draft") return ["ready", "cancelled"] as JobOrderStatus[];
  if (status === "ready") return ["draft", "released", "cancelled"] as JobOrderStatus[];
  if (status === "released") return ["in_progress", "on_hold", "cancelled"] as JobOrderStatus[];
  if (status === "in_progress") return ["on_hold", "cancelled"] as JobOrderStatus[];
  if (status === "on_hold") return ["in_progress", "cancelled"] as JobOrderStatus[];
  return [] as JobOrderStatus[];
}

export function getFoundationTransitions(status: JobOrderStatus) {
  return getPhase9JobOrderTransitions(status);
}

export function jobOrderTransitionNeedsReason(status: JobOrderStatus) {
  return status === "on_hold" || status === "cancelled";
}

export function getJobOrderTransitionLabel(status: JobOrderStatus) {
  return {
    ready: "Tandai Siap Dirilis",
    draft: "Kembalikan ke Draft",
    released: "Rilis ke Produksi",
    in_progress: "Mulai / Lanjutkan Produksi",
    on_hold: "Tahan Produksi",
    cancelled: "Batalkan Job Order",
    completed: "Selesaikan"
  }[status];
}

export function formatJobOrderDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar"
  }).format(new Date(value));
}
