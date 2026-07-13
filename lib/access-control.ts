export const ADMIN_ROLES = [
  "owner",
  "superadmin",
  "super_admin",
  "admin",
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
  admin: "Admin Umum",
  sales_admin: "Sales / Admin Order",
  designer: "Designer",
  production_admin: "Admin Produksi",
  operator: "Operator",
  finance: "Finance",
  quality_control: "Quality Control",
  store_staff: "Store Staff"
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  owner: "Akses owner dan pembacaan audit, tanpa hak hapus permanen.",
  superadmin: "Akses penuh, pengelolaan role, permission, dan hapus permanen.",
  super_admin: "Alias kompatibilitas Super Admin.",
  admin: "Akses operasional umum tanpa pengelolaan akses dan audit sensitif.",
  sales_admin: "Quotation, pesanan, pelanggan, dan pencatatan pembayaran.",
  designer: "Mockup, file desain, revisi, dan pengiriman proof.",
  production_admin: "Job Order, Work Item, penugasan, dan status produksi.",
  operator: "Work Item yang ditugaskan dan pembaruan progres produksi.",
  finance: "Verifikasi pembayaran, koreksi, dan riwayat pembayaran.",
  quality_control: "Pemeriksaan, bukti, hasil QC, dan rework.",
  store_staff: "Persiapan pengiriman, pickup, resi, dan serah terima."
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

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ADMIN_ROLES.includes(value as AdminRole);
}

export function isSuperAdminRole(role: string | null | undefined) {
  return role === "superadmin" || role === "super_admin";
}

export function getRoleLabel(role: string | null | undefined) {
  return isAdminRole(role) ? ROLE_LABELS[role] : role || "Tanpa Role";
}

export function hasPermission(permissions: readonly string[], permission: string) {
  return permissions.includes(permission);
}

export function validateRoleAssignment(input: unknown) {
  if (!isAdminRole(input)) return ["Role tidak valid."];
  return [];
}

export function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar"
  }).format(new Date(value));
}
