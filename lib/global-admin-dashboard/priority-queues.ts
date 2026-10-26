import type { DashboardQueueItem } from "@/lib/global-admin-dashboard/contracts";

export type OperationalPriorityKey = "ready" | "in_progress" | "attention";
export type OperationalPriorityQueue = DashboardQueueItem & { actionLabel: string };
export type OperationalPriorityArea = {
  key: OperationalPriorityKey;
  title: string;
  description: string;
  emptyMessage: string;
  queues: OperationalPriorityQueue[];
};

const QUEUE_ACTIONS: Record<string, { area: OperationalPriorityKey; label: string }> = {
  quality_control: { area: "ready", label: "Buka pemeriksaan kualitas" },
  ready_to_ship: { area: "ready", label: "Buka pengiriman" },
  awaiting_payment: { area: "in_progress", label: "Pantau pembayaran" },
  production: { area: "in_progress", label: "Buka produksi" },
  pickup_waiting: { area: "in_progress", label: "Pantau pengambilan" },
  payment_verification: { area: "attention", label: "Tinjau pembayaran" },
  new_orders: { area: "attention", label: "Tinjau pesanan" },
  awaiting_service: { area: "attention", label: "Tinjau kebutuhan layanan" },
  shipping_incomplete: { area: "attention", label: "Lengkapi pengiriman" },
  overdue_orders: { area: "attention", label: "Tinjau keterlambatan" }
};

// Presentation only: preserve the permission-scoped canonical queues and counts.
// Queues may overlap; neither area totals nor new transaction states are derived.
export function groupOperationalQueues(queues: readonly DashboardQueueItem[]): OperationalPriorityArea[] {
  const areas: OperationalPriorityArea[] = [
    {
      key: "ready",
      title: "Siap Dikerjakan",
      description: "Pemeriksaan dan pengiriman yang perlu ditindaklanjuti.",
      emptyMessage: "Belum ada antrean untuk ditindaklanjuti di area ini.",
      queues: []
    },
    {
      key: "in_progress",
      title: "Dalam Proses",
      description: "Pantau pembayaran, produksi, dan pengambilan yang masih berjalan.",
      emptyMessage: "Belum ada antrean dalam proses di area ini.",
      queues: []
    },
    {
      key: "attention",
      title: "Perlu Perhatian",
      description: "Tinjau prasyarat atau hambatan sebelum melanjutkan pekerjaan.",
      emptyMessage: "Belum ada antrean yang memerlukan perhatian di area ini.",
      queues: []
    }
  ];
  const byKey = new Map(areas.map((area) => [area.key, area]));
  for (const queue of queues) {
    const action = Object.hasOwn(QUEUE_ACTIONS, queue.key)
      ? QUEUE_ACTIONS[queue.key]
      : { area: "attention" as const, label: "Tinjau antrean" };
    byKey.get(action.area)!.queues.push({ ...queue, actionLabel: action.label });
  }
  return areas;
}
