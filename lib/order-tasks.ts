export const ORDER_TASK_STATUSES = [
  "open",
  "acknowledged",
  "in_progress",
  "blocked",
  "resolved",
  "cancelled"
] as const;

export type OrderTaskStatus = typeof ORDER_TASK_STATUSES[number];

export const ORDER_TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type OrderTaskPriority = typeof ORDER_TASK_PRIORITIES[number];

export const ORDER_TASK_TYPES = [
  "review_new_order",
  "review_custom_order",
  "set_shipping_quote",
  "prepare_custom_quote",
  "review_payment",
  "resolve_payment_correction",
  "create_job_order",
  "prepare_ready_stock",
  "run_production",
  "run_quality_control",
  "pack_order",
  "run_final_check",
  "dispatch_shipping",
  "handover_pickup",
  "resolve_integrity"
] as const;

export type OrderTaskType = typeof ORDER_TASK_TYPES[number];

export type OrderTaskRow = {
  id: string;
  task_key: string;
  order_id: string;
  task_type: OrderTaskType;
  status: OrderTaskStatus;
  priority: OrderTaskPriority;
  assigned_role: string;
  assigned_to: string | null;
  source_event_id: string | null;
  title: string;
  description: string;
  related_path: string | null;
  stage_snapshot: unknown;
  due_at: string | null;
  acknowledged_at: string | null;
  started_at: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
  resolved_at: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
};

const TASK_TYPE_LABELS: Record<OrderTaskType, string> = {
  review_new_order: "Periksa Pesanan Baru",
  review_custom_order: "Periksa Pesanan Custom",
  set_shipping_quote: "Tetapkan Ongkir",
  prepare_custom_quote: "Siapkan Penawaran Custom",
  review_payment: "Periksa Pembayaran",
  resolve_payment_correction: "Tangani Koreksi Pembayaran",
  create_job_order: "Buat Surat Perintah Kerja",
  prepare_ready_stock: "Siapkan Barang Ready Stock",
  run_production: "Jalankan Produksi",
  run_quality_control: "Lakukan Pemeriksaan Kualitas",
  pack_order: "Kemas Pesanan",
  run_final_check: "Lakukan Pengecekan Akhir",
  dispatch_shipping: "Serahkan Pesanan ke Kurir",
  handover_pickup: "Serahkan Pesanan Pickup",
  resolve_integrity: "Periksa Integritas Pesanan"
};

const TASK_STATUS_LABELS: Record<OrderTaskStatus, string> = {
  open: "Belum Dikerjakan",
  acknowledged: "Sudah Diterima",
  in_progress: "Sedang Dikerjakan",
  blocked: "Terhambat",
  resolved: "Selesai",
  cancelled: "Dibatalkan"
};

export function orderTaskTypeLabel(value: string) {
  return TASK_TYPE_LABELS[value as OrderTaskType] ?? "Tugas Pesanan";
}

export function orderTaskStatusLabel(value: string) {
  return TASK_STATUS_LABELS[value as OrderTaskStatus] ?? "Status Tugas Tidak Dikenal";
}

export function isActiveOrderTaskStatus(value: string): value is Extract<OrderTaskStatus, "open" | "acknowledged" | "in_progress" | "blocked"> {
  return value === "open" || value === "acknowledged" || value === "in_progress" || value === "blocked";
}
