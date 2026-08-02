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

export const TARGET_ADMIN_ROLES = [
  "owner",
  "head_store",
  "store_admin",
  "product_content_manager",
  "order_cs_admin",
  "finance_admin"
] as const satisfies readonly AdminRole[];

export const MANAGEABLE_ADMIN_ROLES = [
  "head_store",
  "store_admin",
  "product_content_manager",
  "order_cs_admin",
  "finance_admin"
] as const satisfies readonly AdminRole[];

export type ManageableAdminRole = (typeof MANAGEABLE_ADMIN_ROLES)[number];

// Kept for compatibility with the frozen three-role package. New account
// management uses MANAGEABLE_ADMIN_ROLES and never makes Owner assignable.
export const ASSIGNABLE_ADMIN_ROLES = [
  "superadmin",
  "admin",
  "admin_guest"
] as const satisfies readonly AdminRole[];

export type AssignableAdminRole = (typeof ASSIGNABLE_ADMIN_ROLES)[number];

export const ACCOUNT_STATUSES = [
  "TESTING",
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE",
  "LOCKED"
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ENABLED_ACCOUNT_STATUSES: readonly AccountStatus[] = ["TESTING", "ACTIVE"];

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  superadmin: "Super Admin",
  super_admin: "Super Admin (Legacy)",
  admin: "Admin",
  admin_guest: "Admin Guest",
  head_store: "Head Store",
  store_admin: "Store Admin",
  product_content_manager: "Product & Content Manager",
  order_cs_admin: "Order & CS Admin",
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
  owner: "Seluruh domain dan semua toko, termasuk pengelolaan akun serta audit.",
  superadmin: "Role kompatibilitas dengan akses pengelolaan sistem yang sudah ada.",
  super_admin: "Alias kompatibilitas Super Admin.",
  admin: "Akses operasional lama tanpa pengelolaan akses owner-only.",
  admin_guest: "Full Panel Viewer read-only melalui data yang disanitasi.",
  head_store: "Supervisi operasional lintas toko tanpa otoritas keuangan final atau akun.",
  store_admin: "Operasional hanya untuk satu toko canonical yang ditetapkan.",
  product_content_manager: "Produk, kategori, media, dan konten publik sesuai capability eksplisit.",
  order_cs_admin: "Pesanan, quotation, komunikasi pelanggan, produksi, QC, dan fulfillment.",
  finance_admin: "Pembayaran, verifikasi, refund, rekonsiliasi, dan referensi pesanan.",
  sales_admin: "Penawaran harga, pesanan, pelanggan, dan pencatatan pembayaran.",
  designer: "Mockup, file desain, revisi, dan pengiriman proof.",
  production_admin: "Surat Perintah Kerja, daftar pekerjaan, penugasan, dan status produksi.",
  operator: "Pekerjaan yang ditugaskan dan pembaruan progres produksi.",
  finance: "Verifikasi pembayaran, koreksi, dan riwayat pembayaran.",
  quality_control: "Pemeriksaan, bukti, hasil QC, dan rework.",
  store_staff: "Persiapan pengiriman, pickup, resi, dan serah terima."
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  TESTING: "Diundang / Pengujian",
  ACTIVE: "Aktif",
  SUSPENDED: "Dinonaktifkan",
  INACTIVE: "Dinonaktifkan",
  LOCKED: "Terkunci"
};

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

export type AdminProfile = {
  id: string;
  email: string | null;
  role: string;
  display_name: string | null;
  account_status: AccountStatus | string;
  primary_store_id: string | null;
  all_store_access: boolean;
  active_session_id?: string | null;
  session_version?: number;
  last_login_at: string | null;
  password_changed_at?: string | null;
  activated_at?: string | null;
  suspended_at?: string | null;
  inactive_at?: string | null;
  locked_at?: string | null;
  lifecycle_reason?: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminAccessSnapshot = {
  userId: string;
  email: string | null;
  displayName: string;
  role: AdminRole;
  roleLabel: string;
  accountStatus: AccountStatus;
  primaryStoreId: string | null;
  primaryStoreName: string | null;
  allStoreAccess: boolean;
  scopeLabel: string;
  permissions: string[];
  readOnly: boolean;
};

export type AdminAccountListItem = AdminProfile & {
  invitation_status: "Diundang" | "Aktif" | "Undangan Kedaluwarsa" | "Profil tanpa Auth" | "Auth tanpa Profil";
  auth_state: "linked" | "missing_profile" | "missing_auth";
  auth_created_at: string | null;
  invited_at: string | null;
  confirmed_at: string | null;
  store_name: string | null;
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

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ADMIN_ROLES.includes(value.toLowerCase() as AdminRole);
}

export function parseAdminRole(value: unknown): AdminRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isAdminRole(normalized) ? normalized : null;
}

export function isManageableAdminRole(value: unknown): value is ManageableAdminRole {
  return typeof value === "string" && MANAGEABLE_ADMIN_ROLES.includes(value as ManageableAdminRole);
}

export function isAssignableAdminRole(value: unknown): value is AssignableAdminRole {
  return typeof value === "string" && ASSIGNABLE_ADMIN_ROLES.includes(value as AssignableAdminRole);
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return typeof value === "string" && ACCOUNT_STATUSES.includes(value as AccountStatus);
}

export function isAccountEnabled(value: unknown): value is "TESTING" | "ACTIVE" {
  return isAccountStatus(value) && ENABLED_ACCOUNT_STATUSES.includes(value);
}

export function isAdminGuestRole(role: string | null | undefined) {
  return role === "admin_guest";
}

export function isCanonicalPanelRole(role: string | null | undefined) {
  return role === "superadmin" || role === "admin" || role === "admin_guest";
}

export function isOwnerRole(role: string | null | undefined) {
  return role === "owner";
}

export function isSuperAdminRole(role: string | null | undefined) {
  return role === "superadmin" || role === "super_admin";
}

export function getRoleLabel(role: string | null | undefined) {
  const parsed = parseAdminRole(role);
  return parsed ? ROLE_LABELS[parsed] : role || "Tanpa Role";
}

export function getAccountStatusLabel(status: string | null | undefined) {
  return isAccountStatus(status) ? ACCOUNT_STATUS_LABELS[status] : "Status tidak valid";
}

export function hasPermission(permissions: readonly string[], permission: string) {
  return permissions.includes(permission);
}

export function hasEveryPermission(permissions: readonly string[], required: readonly string[]) {
  return required.every((permission) => hasPermission(permissions, permission));
}

export function validateRoleAssignment(input: unknown) {
  if (!isManageableAdminRole(input)) {
    return ["Role tidak valid. Pilih salah satu role operasional yang disetujui Owner."];
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
