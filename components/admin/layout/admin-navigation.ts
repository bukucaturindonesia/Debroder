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
export const QUOTATION_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "sales_admin", "admin"];
export const QUOTATION_VIEW_ROLES: readonly AdminRole[] = [...QUOTATION_ROLES, "designer"];
export const REPEAT_ORDER_ROLES: readonly AdminRole[] = QUOTATION_ROLES;
const ALL_STAFF_ROLES: readonly AdminRole[] = ADMIN_ROLES;
const ORDER_READ_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "sales_admin", "finance", "production_admin", "store_staff"];
const QUOTATION_READ_ROLES: readonly AdminRole[] = QUOTATION_VIEW_ROLES;
const PRODUCTION_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "production_admin", "operator"];
const QC_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "production_admin", "quality_control"];
const SHIPPING_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin", "admin", "production_admin", "store_staff"];
export const PRODUCT_MAINTENANCE_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin"];
const ACCESS_READ_ROLES: readonly AdminRole[] = PRODUCT_MAINTENANCE_ROLES;
const AUDIT_ROLES: readonly AdminRole[] = ["owner", "superadmin", "super_admin"];

export const adminNavigationGroups: readonly AdminNavigationGroup[] = [
  {
    label: "DASHBOARD",
    roles: FULL_ADMIN_ROLES,
    items: [{ label: "Dashboard", href: "/admin/dashboard", roles: FULL_ADMIN_ROLES, exact: true }]
  },
  {
    label: "WEBSITE",
    roles: FULL_ADMIN_ROLES,
    items: [
      { label: "CMS / Landing Page", href: "/admin/homepage-sections", roles: FULL_ADMIN_ROLES },
      { label: "CMS / Jersey", href: "/admin/commerce/jersey", roles: FULL_ADMIN_ROLES },
      { label: "Page Hero", href: "/admin/page-hero", roles: FULL_ADMIN_ROLES },
      { label: "Media Library", href: "/admin/media", roles: FULL_ADMIN_ROLES },
      { label: "Gambar Website", href: "/admin/site-media", roles: FULL_ADMIN_ROLES },
      { label: "Banner Instagram", href: "/admin/banner", roles: FULL_ADMIN_ROLES }
    ]
  },
  {
    label: "KATALOG",
    roles: FULL_ADMIN_ROLES,
    items: [
      { label: "Product Manager", href: "/admin/products", roles: FULL_ADMIN_ROLES },
      { label: "Maintenance PIM", href: "/admin/pim-manager", roles: PRODUCT_MAINTENANCE_ROLES },
      { label: "Kategori / Model", href: "/admin/categories", roles: FULL_ADMIN_ROLES },
      { label: "Layanan", href: "/admin/services", roles: FULL_ADMIN_ROLES },
      { label: "Store / Cabang", href: "/admin/store", roles: FULL_ADMIN_ROLES }
    ]
  },
  {
    label: "OPERASIONAL",
    roles: ALL_STAFF_ROLES,
    items: [{
      label: "Order",
      roles: ALL_STAFF_ROLES,
      children: [
        { label: "Pesanan", href: "/admin/orders", roles: ORDER_READ_ROLES, exact: true },
        { label: "Repeat Order", href: "/admin/repeat-orders", roles: REPEAT_ORDER_ROLES },
        { label: "Formal Quotation", href: "/admin/orders/quotations", roles: QUOTATION_READ_ROLES },
        { label: "Job Order", href: "/admin/job-orders", roles: PRODUCTION_ROLES },
        { label: "Work Item", href: "/admin/work-items", roles: PRODUCTION_ROLES },
        { label: "Status Produksi", href: "/admin/production", roles: PRODUCTION_ROLES },
        { label: "Quality Control", href: "/admin/quality-control", roles: QC_ROLES },
        { label: "Pengiriman & Pickup", href: "/admin/fulfillments", roles: SHIPPING_ROLES },
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
      { label: "Role & Permission", href: "/admin/access-control", roles: ACCESS_READ_ROLES },
      { label: "Audit Sistem", href: "/admin/audit-log", roles: AUDIT_ROLES }
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
  return adminNavigationGroups
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
  if (pathname === "/admin" || pathname === "/admin/dashboard") return hasRole(role, FULL_ADMIN_ROLES);
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
  if (pathname === "/admin/access-control") return "Role & Permission";
  if (pathname === "/admin/audit-log") return "Audit Sistem";
  if (pathname === "/admin/notifications/templates") return "Template Notifikasi";
  if (pathname === "/admin/notifications/history") return "Riwayat Notifikasi";
  if (pathname.startsWith("/admin/notifications/")) return "Detail Notifikasi";
  if (pathname === "/admin/notifications") return "Notifikasi";
  if (pathname.startsWith("/admin/fulfillments/")) return "Detail Pengiriman & Pickup";
  if (pathname === "/admin/fulfillments") return "Pengiriman & Pickup";
  if (pathname.startsWith("/admin/quality-control/")) return "Detail Quality Control";
  if (pathname === "/admin/quality-control") return "Quality Control";
  if (pathname === "/admin/production") return "Status Produksi";
  if (pathname.startsWith("/admin/work-items/")) return "Detail Work Item";
  if (pathname === "/admin/work-items") return "Work Item";
  if (pathname.startsWith("/admin/job-orders/")) return "Detail Job Order";
  if (pathname === "/admin/job-orders") return "Job Order";
  if (pathname === "/admin/repeat-orders") return "Repeat Order";
  if (pathname === "/admin/orders/quotations/new") return "Buat Quotation";
  if (pathname.startsWith("/admin/orders/quotations/")) return "Detail Quotation";
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
  if (pathname === "/admin/dashboard" || pathname === "/admin") return [{ label: "Dashboard" }];
  if (pathname === "/admin/access-control") return [{ label: "Sistem" }, { label: "Role & Permission" }];
  if (pathname === "/admin/audit-log") return [{ label: "Sistem" }, { label: "Audit Sistem" }];
  if (pathname === "/admin/repeat-orders") return [{ label: "Order", href: "/admin/orders" }, { label: "Repeat Order" }];
  if (pathname.startsWith("/admin/notifications")) {
    const crumbs: AdminBreadcrumbItem[] = [{ label: "Operasional" }, { label: "Notifikasi", href: pathname === "/admin/notifications" ? undefined : "/admin/notifications" }];
    if (pathname === "/admin/notifications/templates") crumbs.push({ label: "Template" });
    else if (pathname === "/admin/notifications/history") crumbs.push({ label: "Riwayat" });
    else if (pathname !== "/admin/notifications") crumbs.push({ label: "Detail Notifikasi" });
    return crumbs;
  }
  const group = pathname.startsWith("/admin/orders") ? "Order" : pathname.startsWith("/admin/") ? (pathname.match(/job-orders|work-items|production|quality-control|fulfillments/) ? "Operasional" : "Sistem") : "Admin";
  return [{ label: group }, { label: getCurrentNavigationLabel(pathname) }];
}

export function isLegacyAdminRoute(pathname: string) {
  return !(pathname.startsWith("/admin/orders") || pathname.startsWith("/admin/document-numbering") || pathname.startsWith("/admin/job-orders") || pathname.startsWith("/admin/work-items") || pathname.startsWith("/admin/production") || pathname.startsWith("/admin/quality-control") || pathname.startsWith("/admin/fulfillments") || pathname.startsWith("/admin/notifications") || pathname.startsWith("/admin/access-control") || pathname.startsWith("/admin/audit-log") || pathname.startsWith("/admin/repeat-orders"));
}
