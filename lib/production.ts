import type { JobOrderStatus } from "@/lib/job-orders";
import type { WorkItemStatus } from "@/lib/work-items";

export type ProductionBoardTab = "active" | "ready" | "hold" | "awaiting_qc";

export function isProductionJobStatus(status: JobOrderStatus) {
  return ["ready", "released", "in_progress", "on_hold"].includes(status);
}

export function workItemProgressWeight(status: WorkItemStatus) {
  return {
    draft: 0,
    ready: 10,
    in_progress: 50,
    on_hold: 50,
    rework: 60,
    awaiting_qc: 90,
    completed: 100,
    cancelled: 0
  }[status];
}

export function isWaitingForQc(statuses: WorkItemStatus[]) {
  const active = statuses.filter((status) => status !== "cancelled");
  return active.length > 0 && active.every((status) => status === "awaiting_qc" || status === "completed");
}
