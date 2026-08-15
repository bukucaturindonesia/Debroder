import {
  ADMIN_ROLES,
  ROLE_LABELS,
  hasPermission,
  isAdminRole,
  type AdminRole
} from "@/lib/access-control";

export { ADMIN_ROLES, ROLE_LABELS, isAdminRole };
export type { AdminRole };

export type AdminNavigationLink = {
  label: string;
  href: string;
  permission: string;
  exact?: boolean;
};

export type AdminNavigationNode = AdminNavigationLink | {
  label: string;
  permission: string;
  children: readonly AdminNavigationLink[];
};

export type AdminNavigationGroup = {
  label: string;
  items: readonly AdminNavigationNode[];
};

export const FULL_ADMIN_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin"];
export const ADMIN_GUEST_ROLES: readonly AdminRole[] = ["admin_guest"];
export const DASHBOARD_ROLES: readonly AdminRole[] = [...FULL_ADMIN_ROLES, ...ADMIN_GUEST_ROLES, "head_store", "store_admin", "product_content_manager", "order_cs_admin", "finance_admin"];
export const PRODUCT_MANAGER_VIEW_ROLES: readonly AdminRole[] = [...FULL_ADMIN_ROLES, ...ADMIN_GUEST_ROLES, "product_content_manager"];
export const QUOTATION_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "sales_admin", "admin", "order_cs_admin"];
export const QUOTATION_VIEW_ROLES: readonly AdminRole[] = [...QUOTATION_ROLES, "designer"];
export const REPEAT_ORDER_ROLES: readonly AdminRole[] = QUOTATION_ROLES;
export const PRODUCT_MAINTENANCE_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin"];

/**
 * The only Admin navigation registry. Links declare database permission keys,
 * never email addresses or duplicated role arrays. Runtime callers must pass
 * the effective permissions returned by role_permissions.
 */
export const adminNavigationGroups: readonly AdminNavigationGroup[] = [
  {
    label: "RINGKASAN",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", permission: "dashboard.read", exact: true },
      { label: "Kotak Tugas", href: "/admin/order-tasks", permission: "order.task.read" },
      { label: "Notifikasi", href: "/admin/notifications", permission: "notification.read" }
    ]
  },
  {
    label: "WEBSITE",
    items: [
      { label: "Landing Page", href: "/admin/homepage-sections", permission: "content.read" },
      { label: "CMS / Jersey", href: "/admin/commerce/jersey", permission: "content.read" },
      { label: "CMS / Kaos Polos", href: "/admin/commerce/kaos-polos", permission: "content.read" },
      { label: "CMS / Custom", href: "/admin/custom-commerce", permission: "content.read" },
      { label: "Hero & Banner", href: "/admin/page-hero", permission: "content.read" },
      { label: "Galeri Media", href: "/admin/media", permission: "content.read" },
      { label: "Gambar Website", href: "/admin/site-media", permission: "content.read" },
      { label: "Banner Instagram", href: "/admin/banner", permission: "content.read" }
    ]
  },
  {
    label: "KATALOG",
    items: [
      { label: "Manajemen Produk", href: "/admin/products", permission: "product.read", exact: true },
      { label: "Riwayat Aktivitas Produk", href: "/admin/products/audit-history", permission: "product.read" },
      { label: "Ekspor & Pencocokan Data", href: "/admin/products/export-reconciliation", permission: "product.read" },
      { label: "Manajemen Produk Lanjutan", href: "/admin/pim-v2", permission: "product.maintenance" },
      { label: "Pemeliharaan Produk", href: "/admin/pim-manager", permission: "product.maintenance" },
      { label: "Kategori / Model", href: "/admin/categories", permission: "product.read" },
      { label: "Layanan", href: "/admin/services", permission: "product.read" },
      { label: "Toko / Cabang", href: "/admin/store", permission: "store.read" }
    ]
  },
  {
    label: "OPERASIONAL",
    items: [{
      label: "Pesanan",
      permission: "order.read",
      children: [
        { label: "Pesanan", href: "/admin/orders", permission: "order.read", exact: true },
        { label: "Pesanan Ulang", href: "/admin/repeat-orders", permission: "quotation.write" },
        { label: "Penawaran Harga", href: "/admin/orders/quotations", permission: "quotation.read" },
        { label: "Surat Perintah Kerja", href: "/admin/job-orders", permission: "job_order.read" },
        { label: "Daftar Pekerjaan", href: "/admin/work-items", permission: "production.view" },
        { label: "Status Produksi", href: "/admin/production", permission: "production.view" },
        { label: "Pemeriksaan Kualitas", href: "/admin/quality-control", permission: "qc.view" },
        { label: "Pengiriman & Ambil di Toko", href: "/admin/fulfillments", permission: "shipping.view" },
        { label: "Stok Lokasi & Pickup", href: "/admin/inventory-operations", permission: "inventory.location.read" },
        { label: "Pembatalan & Refund", href: "/admin/refunds", permission: "refund.read" },
        { label: "Outbox Pelanggan", href: "/admin/customer-outbox", permission: "customer.outbox.read" }
      ]
    }]
  },
  {
    label: "KEUANGAN",
    items: [
      { label: "Pembayaran", href: "/admin/payments", permission: "payment.read" },
      { label: "Pengaturan Pembayaran", href: "/admin/payment-settings", permission: "payment.settings.read" },
      { label: "Laporan", href: "/admin/reports", permission: "report.read" }
    ]
  },
  {
    label: "SISTEM",
    items: [
      { label: "Pengaturan", href: "/admin/website-settings", permission: "settings.read" },
      { label: "Tema", href: "/admin/theme", permission: "settings.read" },
      { label: "Penomoran Dokumen", href: "/admin/document-numbering", permission: "settings.read" },
      { label: "Akun Admin", href: "/admin/access-control", permission: "access_control.read" },
      { label: "Riwayat Aktivitas", href: "/admin/audit-log", permission: "audit.read" },
      { label: "Kesehatan Operasional", href: "/admin/operations-health", permission: "operations.health.read" }
    ]
  }
] as const;

export function isNavigationLink(item: AdminNavigationNode): item is AdminNavigationLink {
  return "href" in item;
}

export function isNavigationActive(pathname: string, link: AdminNavigationLink) {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

function permissionGranted(permissions: readonly string[], permission: string) {
  return permissions.includes("*") || hasPermission(permissions, permission);
}

/**
 * Compatibility permissions are used only by old pure role tests and legacy
 * helpers. AdminShell and middleware always pass server-resolved permissions.
 */
export function getCompatibilityPermissions(role: AdminRole): string[] {
  if (role === "admin_guest") return ["*"];
  if (["owner", "superadmin", "super_admin", "admin"].includes(role)) return ["*"];

  const common = ["dashboard.read", "notification.read"];
  const byRole: Partial<Record<AdminRole, string[]>> = {
    head_store: ["order.read", "order.task.read", "quotation.read", "production.view", "job_order.read", "qc.view", "shipping.view", "inventory.location.read", "refund.read", "report.read", "store.read"],
    store_admin: ["order.read", "order.task.read", "shipping.view", "inventory.location.read", "refund.read"],
    product_content_manager: ["content.read", "product.read"],
    order_cs_admin: ["order.read", "order.task.read", "quotation.read", "quotation.write", "job_order.read", "production.view", "qc.view", "shipping.view", "refund.read", "customer.outbox.read"],
    finance_admin: ["order.read", "payment.read", "payment.settings.read", "refund.read", "report.read"],
    sales_admin: ["order.read", "order.task.read", "quotation.read", "quotation.write", "refund.read", "customer.outbox.read"],
    designer: ["quotation.read", "mockup.read"],
    production_admin: ["order.read", "order.task.read", "job_order.read", "production.view", "qc.view", "shipping.view", "inventory.location.read"],
    operator: ["order.task.read", "production.view"],
    finance: ["order.read", "payment.read", "refund.read"],
    quality_control: ["order.read", "order.task.read", "qc.view"],
    store_staff: ["order.read", "order.task.read", "shipping.view", "inventory.location.read", "customer.outbox.read"]
  };
  return [...common, ...(byRole[role] ?? [])];
}

export function getNavigationGroups(
  role: AdminRole,
  permissions: readonly string[] = getCompatibilityPermissions(role)
) {
  const guest = role === "admin_guest";
  return adminNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => guest || permissionGranted(permissions, item.permission))
        .map((item) => isNavigationLink(item)
          ? item
          : ({
              ...item,
              children: item.children.filter((child) => guest || permissionGranted(permissions, child.permission))
            }))
        .filter((item) => isNavigationLink(item) || item.children.length > 0)
    }))
    .filter((group) => group.items.length > 0);
}

const PRODUCT_WORKSPACE_PATH_PATTERN = /^\/admin\/products\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\/(?:information|variants|inventory|media|review))?$/i;

function isProductWorkspacePath(pathname: string) {
  return PRODUCT_WORKSPACE_PATH_PATTERN.test(pathname);
}

const PATH_PERMISSION_RULES: readonly { test: (pathname: string) => boolean; permission: string }[] = [
  { test: (path) => path === "/admin" || path === "/admin/dashboard", permission: "dashboard.read" },
  { test: (path) => path === "/admin/products/bulk-import" || path === "/admin/products/bulk-edit" || path === "/admin/products/legacy" || path === "/admin/products/audit-history" || path === "/admin/products/export-reconciliation", permission: "product.read" },
  { test: isProductWorkspacePath, permission: "product.read" },
  { test: (path) => path === "/admin/products", permission: "product.read" },
  { test: (path) => path === "/admin/pim-v2" || path.startsWith("/admin/pim-v2/") || path.startsWith("/admin/pim-manager"), permission: "product.maintenance" },
  { test: (path) => path.startsWith("/admin/homepage-sections") || path.startsWith("/admin/commerce/") || path.startsWith("/admin/custom-commerce") || path.startsWith("/admin/page-hero") || path.startsWith("/admin/hero") || path.startsWith("/admin/media") || path.startsWith("/admin/site-media") || path.startsWith("/admin/banner") || path.startsWith("/admin/campaign-banners") || path.startsWith("/admin/featured-products") || path.startsWith("/admin/fresh-drop") || path.startsWith("/admin/trending") || path.startsWith("/admin/trust-about") || path.startsWith("/admin/contact-footer") || path.startsWith("/admin/plain-category") || path.startsWith("/admin/shop-category"), permission: "content.read" },
  { test: (path) => path.startsWith("/admin/categories") || path.startsWith("/admin/services"), permission: "product.read" },
  { test: (path) => path.startsWith("/admin/order-tasks"), permission: "order.task.read" },
  { test: (path) => path.startsWith("/admin/orders/quotations") || path.startsWith("/admin/quotations"), permission: "quotation.read" },
  { test: (path) => path.startsWith("/admin/orders"), permission: "order.read" },
  { test: (path) => path.startsWith("/admin/order"), permission: "order.read" },
  { test: (path) => path.startsWith("/admin/payments"), permission: "payment.read" },
  { test: (path) => path.startsWith("/admin/payment-settings"), permission: "payment.settings.read" },
  { test: (path) => path.startsWith("/admin/repeat-orders"), permission: "quotation.write" },
  { test: (path) => path.startsWith("/admin/job-orders"), permission: "job_order.read" },
  { test: (path) => path.startsWith("/admin/work-items") || path.startsWith("/admin/production"), permission: "production.view" },
  { test: (path) => path.startsWith("/admin/quality-control"), permission: "qc.view" },
  { test: (path) => path.startsWith("/admin/fulfillments"), permission: "shipping.view" },
  { test: (path) => path.startsWith("/admin/inventory-operations"), permission: "inventory.location.read" },
  { test: (path) => path.startsWith("/admin/refunds"), permission: "refund.read" },
  { test: (path) => path.startsWith("/admin/customer-outbox"), permission: "customer.outbox.read" },
  { test: (path) => path.startsWith("/admin/notifications/templates"), permission: "notification.manage" },
  { test: (path) => path.startsWith("/admin/notifications"), permission: "notification.read" },
  { test: (path) => path.startsWith("/admin/access-control"), permission: "access_control.read" },
  { test: (path) => path.startsWith("/admin/audit-log"), permission: "audit.read" },
  { test: (path) => path.startsWith("/admin/operations-health"), permission: "operations.health.read" },
  { test: (path) => path.startsWith("/admin/reports"), permission: "report.read" },
  { test: (path) => path.startsWith("/admin/website-settings") || path.startsWith("/admin/theme") || path.startsWith("/admin/document-numbering"), permission: "settings.read" },
  { test: (path) => path.startsWith("/admin/store"), permission: "store.read" }
];

export function requiredPermissionForAdminPath(pathname: string): string | null {
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) return null;
  return PATH_PERMISSION_RULES.find((rule) => rule.test(pathname))?.permission ?? null;
}

export function canAccessAdminPath(pathname: string, permissions: readonly string[]) {
  const required = requiredPermissionForAdminPath(pathname);
  return required !== null && permissionGranted(permissions, required);
}

export function roleCanAccessPath(
  role: AdminRole,
  pathname: string,
  permissions: readonly string[] = getCompatibilityPermissions(role)
) {
  if (role === "admin_guest") {
    return pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && requiredPermissionForAdminPath(pathname) !== null;
  }
  return canAccessAdminPath(pathname, permissions);
}

export function getRoleHome(role: AdminRole) {
  if (role === "head_store") return "/admin/dashboard";
  if (role === "store_admin") return "/admin/dashboard";
  if (role === "product_content_manager") return "/admin/products";
  if (role === "order_cs_admin" || role === "sales_admin" || role === "designer") return "/admin/orders";
  if (role === "finance_admin") return "/admin/payments";
  if (role === "finance") return "/admin/orders";
  if (role === "production_admin" || role === "operator") return "/admin/work-items";
  if (role === "quality_control") return "/admin/quality-control";
  if (role === "store_staff") return "/admin/fulfillments";
  return "/admin/dashboard";
}

export function getCurrentNavigationLabel(pathname: string) {
  if (isProductWorkspacePath(pathname)) {
    if (pathname.endsWith("/variants")) return "Varian Produk";
    if (pathname.endsWith("/inventory")) return "Harga & Stok Produk";
    if (pathname.endsWith("/media")) return "Media Produk";
    if (pathname.endsWith("/review")) return "Review & Publish Produk";
    return "Informasi Produk";
  }
  if (/^\/admin\/access-control\/[^/]+$/.test(pathname)) return "Detail Akun Admin";
  if (pathname === "/admin/access-control") return "Akun Admin";
  if (pathname === "/admin/notifications/templates") return "Template Notifikasi";
  if (pathname === "/admin/notifications/history") return "Riwayat Notifikasi";
  if (pathname.startsWith("/admin/notifications/")) return "Detail Notifikasi";
  if (pathname.startsWith("/admin/fulfillments/")) return "Detail Pengiriman";
  if (pathname.startsWith("/admin/quality-control/")) return "Detail Pemeriksaan Kualitas";
  for (const group of adminNavigationGroups) {
    for (const item of group.items) {
      if (isNavigationLink(item)) {
        if (isNavigationActive(pathname, item)) return item.label;
      } else {
        for (const child of item.children) if (isNavigationActive(pathname, child)) return child.label;
      }
    }
  }
  return "Panel Admin";
}

export type AdminBreadcrumbItem = { label: string; href?: string };

export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumbItem[] {
  if (pathname === "/admin/dashboard" || pathname === "/admin") return [{ label: "Ringkasan" }];
  if (pathname.startsWith("/admin/access-control/")) return [{ label: "Sistem" }, { label: "Akun Admin", href: "/admin/access-control" }, { label: "Detail Akun" }];
  if (pathname === "/admin/access-control") return [{ label: "Sistem" }, { label: "Akun Admin" }];
  if (isProductWorkspacePath(pathname)) return [{ label: "Katalog" }, { label: "Produk", href: "/admin/products" }, { label: getCurrentNavigationLabel(pathname) }];
  if (pathname.startsWith("/admin/notifications")) return [{ label: "Ringkasan" }, { label: "Notifikasi", href: pathname === "/admin/notifications" ? undefined : "/admin/notifications" }, ...(pathname === "/admin/notifications" ? [] : [{ label: getCurrentNavigationLabel(pathname) }])];
  const group = pathname.startsWith("/admin/orders") ? "Pesanan" : pathname.match(/job-orders|work-items|production|quality-control|fulfillments|inventory/) ? "Operasional" : pathname.match(/products|categories|services/) ? "Katalog" : "Sistem";
  return [{ label: group }, { label: getCurrentNavigationLabel(pathname) }];
}

export function isLegacyAdminRoute(pathname: string) {
  return !(pathname.startsWith("/admin/orders") || pathname.startsWith("/admin/order-tasks") || pathname.startsWith("/admin/inventory-operations") || pathname.startsWith("/admin/refunds") || pathname.startsWith("/admin/customer-outbox") || pathname.startsWith("/admin/operations-health") || pathname.startsWith("/admin/document-numbering") || pathname.startsWith("/admin/job-orders") || pathname.startsWith("/admin/work-items") || pathname.startsWith("/admin/production") || pathname.startsWith("/admin/quality-control") || pathname.startsWith("/admin/fulfillments") || pathname.startsWith("/admin/notifications") || pathname.startsWith("/admin/access-control") || pathname.startsWith("/admin/audit-log") || pathname.startsWith("/admin/repeat-orders") || pathname.startsWith("/admin/custom-commerce"));
}
