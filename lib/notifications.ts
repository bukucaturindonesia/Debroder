export const NOTIFICATION_ROLES = [
  "owner",
  "superadmin",
  "super_admin",
  "sales_admin",
  "admin",
  "designer",
  "production_admin",
  "operator",
  "finance",
  "quality_control",
  "store_staff"
] as const;

export const NOTIFICATION_MANAGER_ROLES = [
  "owner",
  "superadmin",
  "super_admin",
  "admin"
] as const;

export const NOTIFICATION_SUPER_ADMIN_ROLES = ["superadmin", "super_admin"] as const;

export type NotificationChannel = "in_app" | "email" | "whatsapp" | "sms" | "push";
export type NotificationStatus =
  | "queued"
  | "sent"
  | "failed"
  | "read"
  | "archived"
  | "not_configured";

export type NotificationRow = {
  id: string;
  event_id: string;
  recipient_id: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  related_path: string | null;
  status: NotificationStatus;
  sent_at: string | null;
  read_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  status_before_archive: Exclude<NotificationStatus, "archived"> | null;
  error_message: string | null;
  created_at: string;
};

export type NotificationEventRow = {
  id: string;
  event_code: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  idempotency_key: string;
  created_by: string | null;
  created_at: string;
};

export type NotificationDeliveryRow = {
  id: string;
  notification_id: string;
  attempt_number: number;
  provider: string | null;
  provider_message_id: string | null;
  status: "queued" | "sent" | "failed" | "not_configured";
  error_message: string | null;
  attempted_at: string;
};

export type NotificationTemplateRow = {
  id: string;
  event_code: string;
  channel: NotificationChannel;
  title_template: string;
  body_template: string;
  active: boolean;
  provider_configured: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
};

export type NotificationDeletionAuditRow = {
  id: string;
  notification_id: string;
  event_id: string;
  recipient_id: string;
  channel: NotificationChannel;
  snapshot: Record<string, unknown>;
  deleted_by: string | null;
  deleted_at: string;
  reason: string;
};

export type NotificationTemplateDeletionAuditRow = {
  id: string;
  template_id: string;
  event_code: string;
  channel: NotificationChannel;
  snapshot: Record<string, unknown>;
  deleted_by: string | null;
  deleted_at: string;
  reason: string;
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "Dalam Aplikasi",
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  push: "Push Notification"
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  queued: "Dalam Antrean",
  sent: "Terkirim",
  failed: "Gagal",
  read: "Sudah Dibaca",
  archived: "Diarsipkan",
  not_configured: "Provider Belum Aktif"
};

export const NOTIFICATION_EVENT_LABELS: Record<string, string> = {
  order_created: "Pesanan Dibuat",
  quotation_sent: "Quotation Dikirim",
  quotation_approved: "Quotation Disetujui",
  mockup_ready: "Mockup Siap Diperiksa",
  mockup_revision: "Mockup Memerlukan Revisi",
  mockup_approved: "Mockup Disetujui",
  payment_submitted: "Pembayaran Dikirim",
  payment_verified: "Pembayaran Diverifikasi",
  payment_rejected: "Pembayaran Ditolak",
  payment_requirement_met: "Syarat Pembayaran Terpenuhi",
  job_order_created: "Job Order Dibuat",
  production_started: "Produksi Dimulai",
  production_on_hold: "Produksi Ditahan",
  qc_passed: "QC Lulus",
  qc_failed: "QC Tidak Lulus",
  ready_to_ship: "Siap Dikirim",
  ready_for_pickup: "Siap Diambil",
  tracking_available: "Nomor Resi Tersedia",
  order_completed: "Pesanan Selesai"
};

export const NOTIFICATION_ENTITY_LABELS: Record<string, string> = {
  order: "Pesanan",
  quotation: "Quotation",
  mockup: "Mockup",
  order_payment: "Pembayaran",
  job_order: "Job Order",
  qc_record: "Quality Control",
  fulfillment: "Pengiriman / Pickup"
};

export function isNotificationRole(role: string | null | undefined) {
  return Boolean(
    role && NOTIFICATION_ROLES.includes(role as (typeof NOTIFICATION_ROLES)[number])
  );
}

export function canManageNotificationTemplates(role: string | null | undefined) {
  return Boolean(
    role &&
      NOTIFICATION_MANAGER_ROLES.includes(
        role as (typeof NOTIFICATION_MANAGER_ROLES)[number]
      )
  );
}

export function isNotificationSuperAdmin(role: string | null | undefined) {
  return Boolean(
    role &&
      NOTIFICATION_SUPER_ADMIN_ROLES.includes(
        role as (typeof NOTIFICATION_SUPER_ADMIN_ROLES)[number]
      )
  );
}

export function getNotificationEventLabel(eventCode: string) {
  return (
    NOTIFICATION_EVENT_LABELS[eventCode] ||
    eventCode
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function getNotificationEntityLabel(entityType: string) {
  return NOTIFICATION_ENTITY_LABELS[entityType] || entityType;
}

export function formatNotificationDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar"
  }).format(new Date(value));
}

export function formatNotificationRelativeDate(
  value: string | null | undefined,
  now = Date.now()
) {
  if (!value) return "-";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "-";
  const seconds = Math.round((timestamp - now) / 1000);
  const absolute = Math.abs(seconds);

  if (absolute < 60) return "Baru saja";

  const formatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  if (absolute < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (absolute < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  if (absolute < 604800) return formatter.format(Math.round(seconds / 86400), "day");
  return formatNotificationDate(value);
}

export function normalizeNotificationEventCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

export function validateNotificationTemplateInput(input: {
  eventCode: string;
  channel: NotificationChannel;
  titleTemplate: string;
  bodyTemplate: string;
}) {
  const errors: string[] = [];
  const eventCode = normalizeNotificationEventCode(input.eventCode);
  const title = input.titleTemplate.trim();
  const body = input.bodyTemplate.trim();

  if (!eventCode) errors.push("Kode event wajib diisi.");
  if (!title) errors.push("Judul template wajib diisi.");
  if (title.length > 160) errors.push("Judul template maksimal 160 karakter.");
  if (!body) errors.push("Isi template wajib diisi.");
  if (body.length > 2000) errors.push("Isi template maksimal 2.000 karakter.");
  if (!(input.channel in NOTIFICATION_CHANNEL_LABELS)) {
    errors.push("Channel notifikasi tidak valid.");
  }

  return errors;
}

export function getNotificationStatusTone(status: NotificationStatus) {
  if (status === "failed") return "error" as const;
  if (status === "queued" || status === "not_configured") return "warning" as const;
  if (status === "read" || status === "archived") return "neutral" as const;
  return "success" as const;
}
