import {
  ADMIN_ROLES,
  ROLE_LABELS,
  isAdminRole,
  type AdminRole
} from "@/lib/access-control";

export { ADMIN_ROLES, ROLE_LABELS, isAdminRole };
export type { AdminRole };

export type AdminNavigationLink = {
  label: string;
  href: string;
  roles: readonly AdminRole[];
  exact?: boolean;
};
export type AdminNavigationNode = AdminNavigationLink | {
  label: string;
  roles: readonly AdminRole[];
  children: readonly AdminNavigationLink[];
};
export type AdminNavigationGroup = {
  label: string;
  roles: readonly AdminRole[];
  items: readonly AdminNavigationNode[];
};

export const FULL_ADMIN_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin"];
export const ADMIN_GUEST_ROLES: readonly AdminRole[] = ["admin_guest"];
export const DASHBOARD_ROLES: readonly AdminRole[] = [...FULL_ADMIN_ROLES, ...ADMIN_GUEST_ROLES];
export const PRODUCT_MANAGER_VIEW_ROLES: readonly AdminRole[] = [...FULL_ADMIN_ROLES, ...ADMIN_GUEST_ROLES];
export const QUOTATION_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "sales_admin", "admin"];
export const QUOTATION_VIEW_ROLES: readonly AdminRole[] = [...QUOTATION_ROLES, "designer"];
export const REPEAT_ORDER_ROLES: readonly AdminRole[] = QUOTATION_ROLES;
const ALL_STAFF_ROLES: readonly AdminRole[] = ADMIN_ROLES.filter((role) => role !== "admin_guest");
const ORDER_READ_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "sales_admin", "finance", "production_admin", "quality_control", "store_staff"];
const QUOTATION_READ_ROLES: readonly AdminRole[] = QUOTATION_VIEW_ROLES;
const PRODUCTION_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "production_admin", "operator"];
const QC_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "production_admin", "quality_control"];
const SHIPPING_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "production_admin", "store_staff"];
const TASK_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "sales_admin", "finance", "production_admin", "operator", "quality_control", "store_staff"];
const INVENTORY_OPERATION_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "production_admin", "store_staff"];
const REFUND_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "sales_admin", "finance"];
const OUTBOX_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "sales_admin", "finance", "store_staff"];
export const PRODUCT_MAINTENANCE_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin"];
const ACCESS_READ_ROLES: readonly AdminRole[] = PRODUCT_MAINTENANCE_ROLES;
const AUDIT_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin"];

export const adminNavigationGroups: readonly AdminNavigationGroup[] = [
  {
    label: "RINGKASAN",
    roles: DASHBOARD_ROLES,
    items: [{ label: "Ringkasan", href: "/admin/dashboard", roles: DASHBOARD_ROLES, exact: true }]
  },
  {
    label: "WEBSITE",
    roles: FULL_ADMIN_ROLES,
    items: [
      { label: "CMS / Halaman Utama", href: "/admin/homepage-sections", roles: FULL_ADMIN_ROLES },
      { label: "CMS / Jersey", href: "/admin/commerce/jersey", roles: FULL_ADMIN_ROLES },
      { label: "CMS / Custom", href: "/admin/custom-commerce", roles: FULL_ADMIN_ROLES },
      { label: "Hero Halaman", href: "/admin/page-hero", roles: FULL_ADMIN_ROLES },
      { label: "Galeri Media", href: "/admin/media", roles: FULL_ADMIN_ROLES },
      { label: "Gambar Website", href: "/admin/site-media", roles: FULL_ADMIN_ROLES },
      { label: "Banner Instagram", href: "/admin/banner", roles: FULL_ADMIN_ROLES }
    ]
  },
  {
    label: "KATALOG",
    roles: PRODUCT_MANAGER_VIEW_ROLES,
    items: [
      { label: "Manajemen Produk", href: "/admin/products", roles: PRODUCT_MANAGER_VIEW_ROLES, exact: true },
      { label: "Riwayat Aktivitas Produk", href: "/admin/products/audit-history", roles: PRODUCT_MANAGER_VIEW_ROLES },
      { label: "Ekspor & Pencocokan Data", href: "/admin/products/export-reconciliation", roles: PRODUCT_MANAGER_VIEW_ROLES },
      { label: "Pemeliharaan Produk", href: "/admin/pim-manager", roles: PRODUCT_MAINTENANCE_ROLES },
      { label: "Kategori / Model", href: "/admin/categories", roles: FULL_ADMIN_ROLES },
      { label: "Layanan", href: "/admin/services", roles: FULL_ADMIN_ROLES },
      { label: "Toko / Cabang", href: "/admin/store", roles: FULL_ADMIN_ROLES }
    ]
  },
  {
    label: "OPERASIONAL",
    roles: ALL_STAFF_ROLES,
    items: [{
      label: "Pesanan",
      roles: ALL_STAFF_ROLES,
      children: [
        { label: "Kotak Tugas", href: "/admin/order-tasks", roles: TASK_ROLES },
        { label: "Pesanan", href: "/admin/orders", roles: ORDER_READ_ROLES, exact: true },
        { label: "Pembayaran", href: "/admin/payments", roles: REFUND_ROLES },
        { label: "Pesanan Ulang", href: "/admin/repeat-orders", roles: REPEAT_ORDER_ROLES },
        { label: "Penawaran Harga", href: "/admin/orders/quotations", roles: QUOTATION_READ_ROLES },
        { label: "Surat Perintah Kerja", href: "/admin/job-orders", roles: PRODUCTION_ROLES },
        { label: "Daftar Pekerjaan", href: "/admin/work-items", roles: PRODUCTION_ROLES },
        { label: "Status Produksi", href: "/admin/production", roles: PRODUCTION_ROLES },
        { label: "Pemeriksaan Kualitas", href: "/admin/quality-control", roles: QC_ROLES },
        { label: "Pengiriman & Ambil di Toko", href: "/admin/fulfillments", roles: SHIPPING_ROLES },
        { label: "Stok Lokasi & Pickup", href: "/admin/inventory-operations", roles: INVENTORY_OPERATION_ROLES },
        { label: "Pembatalan & Refund", href: "/admin/refunds", roles: REFUND_ROLES },
        { label: "Outbox Pelanggan", href: "/admin/customer-outbox", roles: OUTBOX_ROLES },
        { label: "Notifikasi", href: "/admin/notifications", roles: ALL_STAFF_ROLES }
      ]
    }]
  },
  {
    label: "SISTEM",
    roles: [...new Set([...FULL_ADMIN_ROLES, ...ACCESS_READ_ROLES, ...AUDIT_ROLES])],
    items: [
      { label: "Pengaturan", href: "/admin/website-settings", roles: FULL_ADMIN_ROLES },
      { label: "Penomoran Dokumen", href: "/admin/document-numbering", roles: FULL_ADMIN_ROLES },
      { label: "Pengguna & Hak Akses", href: "/admin/access-control", roles: ACCESS_READ_ROLES },
      { label: "Riwayat Aktivitas", href: "/admin/audit-log", roles: AUDIT_ROLES },
      { label: "Kesehatan Operasional", href: "/admin/operations-health", roles: AUDIT_ROLES }
    ]
  }
] as const;
const adminGuestNavigationGroups: readonly AdminNavigationGroup[] = [
  {
    label: "RINGKASAN",
    roles: ADMIN_GUEST_ROLES,
    items: [{ label: "Ringkasan", href: "/admin/dashboard", roles: ADMIN_GUEST_ROLES, exact: true }]
  },
  {
    label: "WEBSITE",
    roles: ADMIN_GUEST_ROLES,
    items: [
      { label: "CMS / Halaman Utama", href: "/admin/homepage-sections", roles: ADMIN_GUEST_ROLES },
      { label: "CMS / Jersey", href: "/admin/commerce/jersey", roles: ADMIN_GUEST_ROLES },
      { label: "CMS / Custom", href: "/admin/custom-commerce", roles: ADMIN_GUEST_ROLES },
      { label: "Hero Halaman", href: "/admin/page-hero", roles: ADMIN_GUEST_ROLES },
      { label: "Galeri Media", href: "/admin/media", roles: ADMIN_GUEST_ROLES },
      { label: "Gambar Website", href: "/admin/site-media", roles: ADMIN_GUEST_ROLES },
      { label: "Banner Instagram", href: "/admin/banner", roles: ADMIN_GUEST_ROLES }
    ]
  },
  {
    label: "KATALOG",
    roles: ADMIN_GUEST_ROLES,
    items: [
      { label: "Manajemen Produk", href: "/admin/products", roles: ADMIN_GUEST_ROLES, exact: true },
      { label: "Riwayat Aktivitas Produk", href: "/admin/products/audit-history", roles: ADMIN_GUEST_ROLES },
      { label: "Ekspor & Pencocokan Data", href: "/admin/products/export-reconciliation", roles: ADMIN_GUEST_ROLES },
      { label: "Manajemen Produk Lanjutan", href: "/admin/pim-v2", roles: ADMIN_GUEST_ROLES },
      { label: "Pemeliharaan Produk", href: "/admin/pim-manager", roles: ADMIN_GUEST_ROLES },
      { label: "Kategori / Model", href: "/admin/categories", roles: ADMIN_GUEST_ROLES },
      { label: "Layanan", href: "/admin/services", roles: ADMIN_GUEST_ROLES },
      { label: "Toko / Cabang", href: "/admin/store", roles: ADMIN_GUEST_ROLES }
    ]
  },
  {
    label: "OPERASIONAL",
    roles: ADMIN_GUEST_ROLES,
    items: [{
      label: "Operasional",
      roles: ADMIN_GUEST_ROLES,
      children: [
        { label: "Pesanan", href: "/admin/orders", roles: ADMIN_GUEST_ROLES, exact: true },
        { label: "Pembayaran", href: "/admin/payments", roles: ADMIN_GUEST_ROLES },
        { label: "Pesanan Ulang", href: "/admin/repeat-orders", roles: ADMIN_GUEST_ROLES },
        { label: "Penawaran Harga", href: "/admin/orders/quotations", roles: ADMIN_GUEST_ROLES },
        { label: "Surat Perintah Kerja", href: "/admin/job-orders", roles: ADMIN_GUEST_ROLES },
        { label: "Daftar Pekerjaan", href: "/admin/work-items", roles: ADMIN_GUEST_ROLES },
        { label: "Status Produksi", href: "/admin/production", roles: ADMIN_GUEST_ROLES },
        { label: "Pemeriksaan Kualitas", href: "/admin/quality-control", roles: ADMIN_GUEST_ROLES },
        { label: "Pengiriman & Ambil di Toko", href: "/admin/fulfillments", roles: ADMIN_GUEST_ROLES },
        { label: "Notifikasi", href: "/admin/notifications", roles: ADMIN_GUEST_ROLES },
        { label: "Laporan", href: "/admin/reports", roles: ADMIN_GUEST_ROLES }
      ]
    }]
  },
  {
    label: "SISTEM",
    roles: ADMIN_GUEST_ROLES,
    items: [
      { label: "Pengaturan", href: "/admin/website-settings", roles: ADMIN_GUEST_ROLES },
      { label: "Penomoran Dokumen", href: "/admin/document-numbering", roles: ADMIN_GUEST_ROLES },
      { label: "Pengguna & Hak Akses", href: "/admin/access-control", roles: ADMIN_GUEST_ROLES },
      { label: "Riwayat Aktivitas", href: "/admin/audit-log", roles: ADMIN_GUEST_ROLES }
    ]
  }
] as const;


export function hasRole(role: AdminRole | null, allowedRoles: readonly AdminRole[]) {
  return role !== null && allowedRoles.includes(role);
}
export function isNavigationLink(item: AdminNavigationNode): item is AdminNavigationLink {
  return "href" in item;
}
export function isNavigationActive(pathname: string, link: AdminNavigationLink) {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}
export function getNavigationGroups(role: AdminRole) {
  const groups = role === "admin_guest" ? adminGuestNavigationGroups : adminNavigationGroups;
  return groups
    .filter((group) => hasRole(role, group.roles))
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => hasRole(role, item.roles))
        .map((item) => isNavigationLink(item) ? item : ({ ...item, children: item.children.filter((child) => hasRole(role, child.roles)) }))
        .filter((item) => isNavigationLink(item) || item.children.length > 0)
    }))
    .filter((group) => group.items.length > 0);
}

function pathAllowedByRole(role: AdminRole, pathname: string) {
  for (const group of adminNavigationGroups) {
    for (const item of group.items) {
      if (isNavigationLink(item)) {
        if (isNavigationActive(pathname, item) && hasRole(role, item.roles)) return true;
      } else {
        for (const child of item.children) {
          if (isNavigationActive(pathname, child) && hasRole(role, child.roles)) return true;
        }
      }
    }
  }
  return false;
}

export function roleCanAccessPath(role: AdminRole, pathname: string) {
  if (pathname === "/admin/products/bulk-import") {
    return hasRole(role, PRODUCT_MANAGER_VIEW_ROLES);
  }
  if (role === "admin_guest") {
    return pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  }
  if (pathname === "/admin" || pathname === "/admin/dashboard") return hasRole(role, DASHBOARD_ROLES);
  if (
    pathname === "/admin/orders/archive" ||
    /^\/admin\/orders\/[^/]+$/.test(pathname)
  ) {
    return hasRole(role, ORDER_READ_ROLES);
  }
  if (pathname === "/admin/notifications/templates" || pathname.startsWith("/admin/notifications/templates/")) {
    return hasRole(role, FULL_ADMIN_ROLES);
  }
  if (pathname.startsWith("/admin/notifications")) return true;
  if (pathname.startsWith("/admin/order-tasks")) return hasRole(role, TASK_ROLES);
  if (pathname.startsWith("/admin/inventory-operations")) return hasRole(role, INVENTORY_OPERATION_ROLES);
  if (pathname.startsWith("/admin/refunds")) return hasRole(role, REFUND_ROLES);
  if (pathname.startsWith("/admin/customer-outbox")) return hasRole(role, OUTBOX_ROLES);
  if (pathname.startsWith("/admin/operations-health")) return hasRole(role, AUDIT_ROLES);
  if (pathname === "/admin/pim-v2" || pathname.startsWith("/admin/pim-v2/")) {
    return hasRole(role, PRODUCT_MAINTENANCE_ROLES);
  }
  return pathAllowedByRole(role, pathname);
}

export function getRoleHome(role: AdminRole) {
  if (role === "sales_admin" || role === "designer") return "/admin/orders/quotations";
  if (role === "finance") return "/admin/orders";
  if (role === "production_admin" || role === "operator") return "/admin/work-items";
  if (role === "quality_control") return "/admin/quality-control";
  if (role === "store_staff") return "/admin/fulfillments";
  return "/admin/dashboard";
}

export function getCurrentNavigationLabel(pathname: string) {
  if (pathname === "/admin/products/export-reconciliation") return "Ekspor & Pencocokan Data";
  if (pathname === "/admin/products/bulk-edit") return "Ubah Banyak Produk";
  if (pathname === "/admin/products/bulk-import") return "Impor Banyak Produk";
  if (pathname === "/admin/custom-commerce") return "CMS / Custom";
  if (pathname === "/admin/access-control") return "Pengguna & Hak Akses";
  if (pathname === "/admin/payments") return "Pembayaran";
  if (pathname === "/admin/order-tasks") return "Kotak Tugas";
  if (pathname === "/admin/inventory-operations") return "Stok Lokasi & Pickup";
  if (pathname === "/admin/refunds") return "Pembatalan & Refund";
  if (pathname === "/admin/customer-outbox") return "Outbox Pelanggan";
  if (pathname === "/admin/operations-health") return "Kesehatan Operasional";
  if (pathname === "/admin/reports") return "Laporan Operasional";
  if (pathname === "/admin/pim-v2") return "Manajemen Produk Lanjutan";
  if (pathname === "/admin/pim-manager") return "Pemeliharaan Produk";
  if (pathname === "/admin/audit-log") return "Riwayat Aktivitas";
  if (pathname === "/admin/notifications/templates") return "Template Notifikasi";
  if (pathname === "/admin/notifications/history") return "Riwayat Notifikasi";
  if (pathname.startsWith("/admin/notifications/")) return "Detail Notifikasi";
  if (pathname === "/admin/notifications") return "Notifikasi";
  if (pathname.startsWith("/admin/fulfillments/")) return "Detail Pengiriman";
  if (pathname === "/admin/fulfillments") return "Pengiriman & Ambil di Toko";
  if (pathname.startsWith("/admin/quality-control/")) return "Detail Pemeriksaan Kualitas";
  if (pathname === "/admin/quality-control") return "Pemeriksaan Kualitas";
  if (pathname === "/admin/production") return "Status Produksi";
  if (pathname.startsWith("/admin/work-items/")) return "Detail Pekerjaan";
  if (pathname === "/admin/work-items") return "Daftar Pekerjaan";
  if (pathname.startsWith("/admin/job-orders/")) return "Detail Surat Perintah Kerja";
  if (pathname === "/admin/job-orders") return "Surat Perintah Kerja";
  if (pathname === "/admin/repeat-orders") return "Pesanan Ulang";
  if (pathname === "/admin/orders/quotations/new") return "Buat Penawaran Harga";
  if (pathname.startsWith("/admin/orders/quotations/")) return "Detail Penawaran Harga";
  if (pathname === "/admin/orders/archive") return "Gudang Arsip Pesanan";
  if (pathname.startsWith("/admin/orders/")) return "Detail Pesanan";
  for (const group of adminNavigationGroups) for (const item of group.items) {
    if (isNavigationLink(item)) { if (isNavigationActive(pathname, item)) return item.label; }
    else for (const child of item.children) if (isNavigationActive(pathname, child)) return child.label;
  }
  return "Panel Admin";
}

export type AdminBreadcrumbItem = { label: string; href?: string };
export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumbItem[] {
  if (pathname === "/admin/dashboard" || pathname === "/admin") return [{ label: "Ringkasan" }];
  if (pathname === "/admin/custom-commerce") return [{ label: "Website" }, { label: "CMS / Custom" }];
  if (pathname === "/admin/access-control") return [{ label: "Sistem" }, { label: "Pengguna & Hak Akses" }];
  if (pathname === "/admin/audit-log") return [{ label: "Sistem" }, { label: "Riwayat Aktivitas" }];
  if (pathname === "/admin/repeat-orders") return [{ label: "Pesanan", href: "/admin/orders" }, { label: "Pesanan Ulang" }];
  if (pathname.startsWith("/admin/notifications")) {
    const crumbs: AdminBreadcrumbItem[] = [{ label: "Operasional" }, { label: "Notifikasi", href: pathname === "/admin/notifications" ? undefined : "/admin/notifications" }];
    if (pathname === "/admin/notifications/templates") crumbs.push({ label: "Template" });
    else if (pathname === "/admin/notifications/history") crumbs.push({ label: "Riwayat" });
    else if (pathname !== "/admin/notifications") crumbs.push({ label: "Detail Notifikasi" });
    return crumbs;
  }
  const group = pathname.startsWith("/admin/orders") ? "Pesanan" : pathname.startsWith("/admin/") ? (pathname.match(/job-orders|work-items|production|quality-control|fulfillments/) ? "Operasional" : "Sistem") : "Admin";
  return [{ label: group }, { label: getCurrentNavigationLabel(pathname) }];
}

export function isLegacyAdminRoute(pathname: string) {
  return !(pathname.startsWith("/admin/orders") || pathname.startsWith("/admin/order-tasks") || pathname.startsWith("/admin/inventory-operations") || pathname.startsWith("/admin/refunds") || pathname.startsWith("/admin/customer-outbox") || pathname.startsWith("/admin/operations-health") || pathname.startsWith("/admin/document-numbering") || pathname.startsWith("/admin/job-orders") || pathname.startsWith("/admin/work-items") || pathname.startsWith("/admin/production") || pathname.startsWith("/admin/quality-control") || pathname.startsWith("/admin/fulfillments") || pathname.startsWith("/admin/notifications") || pathname.startsWith("/admin/access-control") || pathname.startsWith("/admin/audit-log") || pathname.startsWith("/admin/repeat-orders") || pathname.startsWith("/admin/custom-commerce"));
}
