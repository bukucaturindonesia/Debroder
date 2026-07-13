export const WORK_ITEM_ROLES = ["owner", "superadmin", "super_admin", "admin", "production_admin"] as const;
export const WORK_ITEM_SUPER_ADMIN_ROLES = ["superadmin", "super_admin"] as const;
export const WORK_ITEM_VIEWER_ROLES = [...WORK_ITEM_ROLES, "operator"] as const;

export type WorkItemStatus =
  | "draft"
  | "ready"
  | "in_progress"
  | "on_hold"
  | "awaiting_qc"
  | "rework"
  | "completed"
  | "cancelled";

export type WorkItemPriority = "low" | "normal" | "high" | "urgent";

export type WorkItemRow = {
  id: string;
  work_item_number: string;
  job_order_id: string;
  source_order_item_id: string | null;
  source_order_item_service_id: string | null;
  source_mockup_part_id: string | null;
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  assigned_to: string | null;
  target_date: string | null;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  instruction_snapshot: Record<string, unknown>;
  approved_design_snapshot: Record<string, unknown>;
  ready_by: string | null;
  ready_at: string | null;
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

export type WorkItemJobOrder = {
  id: string;
  job_order_number: string;
  status: string;
  priority: WorkItemPriority;
  target_date: string | null;
  order_snapshot: Record<string, unknown>;
  mockup_snapshot: Record<string, unknown>;
  archived_at: string | null;
};

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  draft: "Draft",
  ready: "Siap Dikerjakan",
  in_progress: "Sedang Dikerjakan",
  on_hold: "Ditahan",
  awaiting_qc: "Menunggu QC",
  rework: "Perbaikan",
  completed: "Selesai",
  cancelled: "Dibatalkan"
};

export const WORK_ITEM_PRIORITY_LABELS: Record<WorkItemPriority, string> = {
  low: "Rendah",
  normal: "Normal",
  high: "Tinggi",
  urgent: "Mendesak"
};

export function isWorkItemRole(role: string | null | undefined) {
  return Boolean(role && WORK_ITEM_ROLES.includes(role as (typeof WORK_ITEM_ROLES)[number]));
}

export function isWorkItemViewerRole(role: string | null | undefined) {
  return Boolean(role && WORK_ITEM_VIEWER_ROLES.includes(role as (typeof WORK_ITEM_VIEWER_ROLES)[number]));
}

export function isWorkItemSuperAdmin(role: string | null | undefined) {
  return Boolean(
    role && WORK_ITEM_SUPER_ADMIN_ROLES.includes(role as (typeof WORK_ITEM_SUPER_ADMIN_ROLES)[number])
  );
}

export function canEditWorkItem(status: WorkItemStatus) {
  return status === "draft" || status === "ready";
}

export function canArchiveWorkItem(status: WorkItemStatus) {
  return status === "draft" || status === "completed" || status === "cancelled";
}

export function getPhase9WorkItemTransitions(status: WorkItemStatus, jobOrderStatus?: string | null) {
  if (status === "draft") return ["ready", "cancelled"] as WorkItemStatus[];
  if (status === "ready") {
    return ["released", "in_progress"].includes(jobOrderStatus || "")
      ? (["draft", "in_progress", "cancelled"] as WorkItemStatus[])
      : (["draft", "cancelled"] as WorkItemStatus[]);
  }
  if (status === "in_progress" && jobOrderStatus === "in_progress") {
    return ["on_hold", "awaiting_qc", "cancelled"] as WorkItemStatus[];
  }
  if (status === "on_hold" && jobOrderStatus === "in_progress") {
    return ["in_progress", "cancelled"] as WorkItemStatus[];
  }
  if (status === "rework" && jobOrderStatus === "in_progress") {
    return ["in_progress", "awaiting_qc", "cancelled"] as WorkItemStatus[];
  }
  return [] as WorkItemStatus[];
}

export function getPhase8WorkItemTransitions(status: WorkItemStatus) {
  return getPhase9WorkItemTransitions(status, null);
}

export function workItemTransitionNeedsReason(status: WorkItemStatus) {
  return status === "on_hold" || status === "cancelled" || status === "rework";
}

export function getWorkItemTransitionLabel(status: WorkItemStatus) {
  return {
    ready: "Tandai Siap Dikerjakan",
    draft: "Kembalikan ke Draft",
    in_progress: "Mulai / Lanjutkan Pekerjaan",
    on_hold: "Tahan Pekerjaan",
    awaiting_qc: "Kirim ke Quality Control",
    rework: "Kembalikan untuk Perbaikan",
    completed: "Selesaikan",
    cancelled: "Batalkan Work Item"
  }[status];
}

export function formatWorkItemDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar"
  }).format(new Date(value));
}

export function formatWorkItemTarget(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Makassar"
  }).format(new Date(`${value}T00:00:00+08:00`));
}

export function readSnapshotObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
