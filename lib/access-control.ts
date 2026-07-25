export const ADMIN_ROLES = [
  "owner",
  "superadmin",
  "super_admin",
  "admin",
  "admin_guest",
  "head_store",
  "store_admin",
  "product_content_manager",
  "order_cs_admin",
  "finance_admin",
  "sales_admin",
  "designer",
  "production_admin",
  "operator",
  "finance",
  "quality_control",
  "store_staff"
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  superadmin: "Super Admin",
  super_admin: "Super Admin (Legacy)",
  admin: "Admin",
  admin_guest: "Admin Guest",
  head_store: "Head Store",
  store_admin: "Store Admin",
  product_content_manager: "Product & Content Manager",
  order_cs_admin: "Order & Customer Service Admin",
  finance_admin: "Finance Admin",
  sales_admin: "Sales / Admin Order",
  designer: "Designer",
  production_admin: "Admin Produksi",
  operator: "Operator",
  finance: "Finance",
  quality_control: "Pemeriksaan Kualitas",
  store_staff: "Store Staff"
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  owner: "Governance final, seluruh perusahaan, approval risiko tinggi, keamanan, dan audit.",
  superadmin: "Administrasi sistem serta operasional lintas-domain yang didelegasikan Owner.",
  super_admin: "Alias kompatibilitas Super Admin.",
  admin: "Role operasional legacy. Tidak digunakan untuk akun baru ADMIN-RBAC-01.",
  admin_guest: "Role read-only legacy. Tidak digunakan untuk akun baru ADMIN-RBAC-01.",
  head_store: "Store Pettarani sebagai lokasi utama dengan kewenangan operasional lintas-store dalam batas Owner.",
  store_admin: "Operasional tepat satu store yang ditugaskan; akses store lain ditolak.",
  product_content_manager: "Produk, katalog, varian, media, SEO, CMS, dan merchandising.",
  order_cs_admin: "Order, komunikasi pelanggan, quotation, produksi, fulfillment, dan eskalasi.",
  finance_admin: "Pembayaran, invoice, rekonsiliasi, refund, dan laporan finansial.",
  sales_admin: "Penawaran harga, pesanan, pelanggan, dan pencatatan pembayaran.",
  designer: "Mockup, file desain, revisi, dan pengiriman proof.",
  production_admin: "Surat Perintah Kerja, daftar pekerjaan, penugasan, dan status produksi.",
  operator: "Pekerjaan yang ditugaskan dan pembaruan progres produksi.",
  finance: "Verifikasi pembayaran, koreksi, dan riwayat pembayaran.",
  quality_control: "Pemeriksaan, bukti, hasil QC, dan rework.",
  store_staff: "Persiapan pengiriman, pickup, resi, dan serah terima."
};

/** Existing Phase 13 / three-role contract. Keep exact for regression compatibility. */
export const ASSIGNABLE_ADMIN_ROLES = [
  "superadmin",
  "admin",
  "admin_guest"
] as const satisfies readonly AdminRole[];

export type AssignableAdminRole = (typeof ASSIGNABLE_ADMIN_ROLES)[number];

/** Final FROZEN role catalog used for new accounts. VIEWER roles are intentionally absent. */
export const FROZEN_CANONICAL_ADMIN_ROLES = [
  "owner",
  "superadmin",
  "head_store",
  "store_admin",
  "product_content_manager",
  "order_cs_admin",
  "finance_admin"
] as const satisfies readonly AdminRole[];

export type FrozenCanonicalAdminRole = (typeof FROZEN_CANONICAL_ADMIN_ROLES)[number];

/** Owner and Super Admin are protected, so the normal account editor exposes only these roles. */
export const ASSIGNABLE_OPERATIONAL_ADMIN_ROLES = [
  "head_store",
  "store_admin",
  "product_content_manager",
  "order_cs_admin",
  "finance_admin"
] as const satisfies readonly FrozenCanonicalAdminRole[];

export type AssignableOperationalAdminRole =
  (typeof ASSIGNABLE_OPERATIONAL_ADMIN_ROLES)[number];

export const ACCOUNT_STATUSES = [
  "TESTING",
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE",
  "LOCKED"
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ADMIN_ROLES.includes(value as AdminRole);
}

export function isAssignableAdminRole(value: unknown): value is AssignableAdminRole {
  return typeof value === "string" && ASSIGNABLE_ADMIN_ROLES.includes(value as AssignableAdminRole);
}

export function isAssignableOperationalAdminRole(
  value: unknown
): value is AssignableOperationalAdminRole {
  return typeof value === "string" &&
    ASSIGNABLE_OPERATIONAL_ADMIN_ROLES.includes(value as AssignableOperationalAdminRole);
}

export function isFrozenCanonicalAdminRole(
  value: unknown
): value is FrozenCanonicalAdminRole {
  return typeof value === "string" &&
    FROZEN_CANONICAL_ADMIN_ROLES.includes(value as FrozenCanonicalAdminRole);
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return typeof value === "string" && ACCOUNT_STATUSES.includes(value as AccountStatus);
}

export function normalizeAccountStatus(value: unknown): AccountStatus {
  return isAccountStatus(value) ? value : "ACTIVE";
}

/** FROZEN lifecycle: TESTING and ACTIVE may login; all other states fail closed. */
export function isAccountLoginAllowed(status: string | null | undefined) {
  return status === "TESTING" || status === "ACTIVE";
}

export function isAdminGuestRole(role: string | null | undefined) {
  return role === "admin_guest";
}

/** Existing three-role panel contract. */
export function isCanonicalPanelRole(role: string | null | undefined) {
  return role === "superadmin" || role === "admin" || role === "admin_guest";
}

export type PermissionDefinition = {
  permission_key: string;
  module: string;
  label: string;
  description: string;
};

export type RolePermission = {
  role: string;
  permission_key: string;
  granted: boolean;
  updated_by: string | null;
  updated_at: string;
};

export type AdminStore = {
  id: string;
  nama_store: string;
};

export type AdminProfile = {
  id: string;
  email: string | null;
  display_name?: string | null;
  role: string;
  account_status?: AccountStatus | null;
  primary_store_id?: string | null;
  all_store_access?: boolean | null;
  active_session_id?: string | null;
  session_version?: number | null;
  activated_at?: string | null;
  suspended_at?: string | null;
  inactive_at?: string | null;
  locked_at?: string | null;
  lifecycle_reason?: string | null;
  created_at: string;
  updated_at: string;
};

export type SystemAuditRow = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  actor_id: string | null;
  actor_role: string | null;
  source: string;
  reason: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function isSuperAdminRole(role: string | null | undefined) {
  return role === "superadmin" || role === "super_admin";
}

export function canManageAdminAccounts(role: string | null | undefined) {
  return role === "owner" || isSuperAdminRole(role);
}

export function getRoleLabel(role: string | null | undefined) {
  return isAdminRole(role) ? ROLE_LABELS[role] : role || "Tanpa Role";
}

export function hasPermission(permissions: readonly string[], permission: string) {
  return permissions.includes(permission);
}

/** Existing Phase 13 role mutation validator. */
export function validateRoleAssignment(input: unknown) {
  if (!isAssignableAdminRole(input)) return ["Role tidak valid. Gunakan Super Admin, Admin, atau Admin Guest."];
  return [];
}

export function validateOperationalRoleAssignment(input: unknown) {
  if (!isAssignableOperationalAdminRole(input)) {
    return ["Role tidak valid. Gunakan role operasional FROZEN yang tersedia."];
  }
  return [];
}

export function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar"
  }).format(new Date(value));
}
