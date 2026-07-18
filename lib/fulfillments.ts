export const FULFILLMENT_ROLES = ["owner", "superadmin", "super_admin", "admin", "production_admin", "store_staff"] as const;
export const FULFILLMENT_SUPER_ADMIN_ROLES = ["superadmin", "super_admin"] as const;

export type FulfillmentMethod = "shipping" | "pickup";
export type FulfillmentStatus =
  | "preparing"
  | "packing"
  | "ready_to_ship"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "ready_for_pickup"
  | "picked_up"
  | "problem"
  | "cancelled";

export type FulfillmentRow = {
  id: string;
  fulfillment_number: string;
  order_id: string;
  job_order_id: string | null;
  method: FulfillmentMethod;
  status: FulfillmentStatus;
  receiver_name: string | null;
  receiver_phone: string | null;
  destination: string | null;
  courier: string | null;
  tracking_number: string | null;
  package_count: number;
  scheduled_at: string | null;
  packing_at: string | null;
  ready_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  picked_up_at: string | null;
  problem_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  final_verification_checklist: Record<string, boolean> | null;
  final_verified_at: string | null;
  final_verified_by: string | null;
  final_verification_note: string | null;
};

export type FulfillmentItemRow = {
  id: string;
  fulfillment_id: string;
  work_item_id: string | null;
  order_item_id: string | null;
  quantity: number;
  created_at: string;
};

export type FulfillmentFileType = "handover" | "signature" | "photo" | "document";

export type FulfillmentFileRow = {
  id: string;
  fulfillment_id: string;
  file_type: FulfillmentFileType;
  bucket: string;
  path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type FulfillmentHistoryRow = {
  id: string;
  fulfillment_id: string;
  from_status: FulfillmentStatus | null;
  to_status: FulfillmentStatus;
  note: string | null;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
  metadata: Record<string, unknown>;
};

export type FulfillmentRevisionRow = {
  id: string;
  fulfillment_id: string;
  revision_number: number;
  reason: string;
  previous_snapshot: Record<string, unknown>;
  new_snapshot: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export const FULFILLMENT_METHOD_LABELS: Record<FulfillmentMethod, string> = {
  shipping: "Pengiriman",
  pickup: "Ambil di Toko"
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  preparing: "Persiapan",
  packing: "Sedang Dikemas",
  ready_to_ship: "Siap Dikirim",
  shipped: "Sudah Dikirim",
  in_transit: "Dalam Perjalanan",
  delivered: "Sudah Diterima",
  ready_for_pickup: "Siap Diambil",
  picked_up: "Sudah Diambil",
  problem: "Bermasalah",
  cancelled: "Dibatalkan"
};

export const FULFILLMENT_FILE_LABELS: Record<FulfillmentFileType, string> = {
  handover: "Bukti Serah Terima",
  signature: "Tanda Tangan",
  photo: "Foto",
  document: "Dokumen"
};

export function isFulfillmentRole(role: string | null | undefined) {
  return Boolean(role && FULFILLMENT_ROLES.includes(role as (typeof FULFILLMENT_ROLES)[number]));
}

export function isFulfillmentSuperAdmin(role: string | null | undefined) {
  return Boolean(
    role && FULFILLMENT_SUPER_ADMIN_ROLES.includes(role as (typeof FULFILLMENT_SUPER_ADMIN_ROLES)[number])
  );
}

export function canEditFulfillment(status: FulfillmentStatus, archivedAt?: string | null) {
  return !archivedAt && ["preparing", "packing", "ready_to_ship", "ready_for_pickup", "problem"].includes(status);
}

export function canArchiveFulfillment(status: FulfillmentStatus, archivedAt?: string | null) {
  return !archivedAt && ["preparing", "delivered", "picked_up", "cancelled"].includes(status);
}

export function getFulfillmentTransitions(method: FulfillmentMethod, status: FulfillmentStatus) {
  if (status === "preparing") return ["packing", "problem", "cancelled"] as FulfillmentStatus[];
  if (status === "packing") {
    return [method === "pickup" ? "ready_for_pickup" : "ready_to_ship", "problem", "cancelled"] as FulfillmentStatus[];
  }
  if (status === "ready_to_ship") return ["shipped", "problem", "cancelled"] as FulfillmentStatus[];
  if (status === "shipped") return ["in_transit", "delivered", "problem"] as FulfillmentStatus[];
  if (status === "in_transit") return ["delivered", "problem"] as FulfillmentStatus[];
  if (status === "ready_for_pickup") return ["picked_up", "problem", "cancelled"] as FulfillmentStatus[];
  if (status === "problem") {
    return ["preparing", "packing", method === "pickup" ? "ready_for_pickup" : "ready_to_ship", "cancelled"] as FulfillmentStatus[];
  }
  return [] as FulfillmentStatus[];
}

export function fulfillmentTransitionNeedsReason(status: FulfillmentStatus) {
  return status === "problem" || status === "cancelled";
}

export function getFulfillmentTransitionLabel(status: FulfillmentStatus) {
  return {
    preparing: "Kembalikan ke Persiapan",
    packing: "Mulai Packing",
    ready_to_ship: "Tandai Siap Dikirim",
    shipped: "Tandai Sudah Dikirim",
    in_transit: "Tandai Dalam Perjalanan",
    delivered: "Konfirmasi Sudah Diterima",
    ready_for_pickup: "Tandai Siap Diambil",
    picked_up: "Konfirmasi Sudah Diambil",
    problem: "Laporkan Masalah",
    cancelled: "Batalkan Penyerahan"
  }[status];
}

export function formatFulfillmentDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar"
  }).format(new Date(value));
}

export function formatFulfillmentFileSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function safeFulfillmentFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "bukti-penyerahan";
}
