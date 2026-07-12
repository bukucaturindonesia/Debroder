export const ADMIN_ROLES = [
  "owner",
  "superadmin",
  "super_admin",
  "sales_admin",
  "admin"
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminNavigationLink = {
  label: string;
  href: string;
  roles: readonly AdminRole[];
  exact?: boolean;
};

export type AdminNavigationNode =
  | AdminNavigationLink
  | {
      label: string;
      roles: readonly AdminRole[];
      children: readonly AdminNavigationLink[];
    };

export type AdminNavigationGroup = {
  label: string;
  roles: readonly AdminRole[];
  items: readonly AdminNavigationNode[];
};

export const FULL_ADMIN_ROLES: readonly AdminRole[] = [
  "owner",
  "superadmin",
  "super_admin",
  "admin"
];

export const QUOTATION_ROLES: readonly AdminRole[] = [
  "owner",
  "superadmin",
  "super_admin",
  "sales_admin",
  "admin"
];

export const adminNavigationGroups: readonly AdminNavigationGroup[] = [
  {
    label: "DASHBOARD",
    roles: FULL_ADMIN_ROLES,
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        roles: FULL_ADMIN_ROLES,
        exact: true
      }
    ]
  },
  {
    label: "WEBSITE",
    roles: FULL_ADMIN_ROLES,
    items: [
      { label: "CMS / Landing Page", href: "/admin/homepage-sections", roles: FULL_ADMIN_ROLES },
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
      { label: "Produk & PIM", href: "/admin/products", roles: FULL_ADMIN_ROLES },
      { label: "PIM Manager", href: "/admin/pim-manager", roles: FULL_ADMIN_ROLES },
      { label: "PIM V2", href: "/admin/pim-v2", roles: FULL_ADMIN_ROLES },
      { label: "Kategori / Model", href: "/admin/categories", roles: FULL_ADMIN_ROLES },
      { label: "Layanan", href: "/admin/services", roles: FULL_ADMIN_ROLES },
      { label: "Store / Cabang", href: "/admin/store", roles: FULL_ADMIN_ROLES }
    ]
  },
  {
    label: "OPERASIONAL",
    roles: QUOTATION_ROLES,
    items: [
      {
        label: "Order",
        roles: QUOTATION_ROLES,
        children: [
          { label: "Pesanan", href: "/admin/orders", roles: QUOTATION_ROLES, exact: true },
          { label: "Formal Quotation", href: "/admin/orders/quotations", roles: QUOTATION_ROLES },
          { label: "Job Order", href: "/admin/job-orders", roles: FULL_ADMIN_ROLES },
          { label: "Work Item", href: "/admin/work-items", roles: FULL_ADMIN_ROLES },
          { label: "Status Produksi", href: "/admin/production", roles: FULL_ADMIN_ROLES },
          { label: "Quality Control", href: "/admin/quality-control", roles: FULL_ADMIN_ROLES }
        ]
      }
    ]
  },
  {
    label: "SISTEM",
    roles: FULL_ADMIN_ROLES,
    items: [
      { label: "Pengaturan", href: "/admin/website-settings", roles: FULL_ADMIN_ROLES },
      { label: "Penomoran Dokumen", href: "/admin/document-numbering", roles: FULL_ADMIN_ROLES }
    ]
  }
] as const;

export function isAdminRole(value: unknown): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

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
        .map((item) => {
          if (isNavigationLink(item)) return item;
          return {
            ...item,
            children: item.children.filter((child) => hasRole(role, child.roles))
          };
        })
        .filter((item) => (isNavigationLink(item) ? true : item.children.length > 0))
    }))
    .filter((group) => group.items.length > 0);
}

export function roleCanAccessPath(role: AdminRole, pathname: string) {
  if (hasRole(role, FULL_ADMIN_ROLES)) return true;
  return pathname.startsWith("/admin/orders");
}

export function getRoleHome(role: AdminRole) {
  return role === "sales_admin" ? "/admin/orders/quotations" : "/admin/dashboard";
}

export function getCurrentNavigationLabel(pathname: string) {
  if (pathname.startsWith("/admin/quality-control/")) return "Detail Quality Control";
  if (pathname === "/admin/quality-control") return "Quality Control";
  if (pathname === "/admin/production") return "Status Produksi";
  if (pathname.startsWith("/admin/work-items/")) return "Detail Work Item";
  if (pathname === "/admin/work-items") return "Work Item";
  if (pathname.startsWith("/admin/job-orders/")) return "Detail Job Order";
  if (pathname === "/admin/job-orders") return "Job Order";
  if (pathname === "/admin/orders/quotations/new") return "Buat Quotation";
  if (pathname.startsWith("/admin/orders/quotations/")) return "Detail Quotation";
  if (pathname === "/admin/orders/archive") return "Gudang Arsip Pesanan";
  if (pathname.startsWith("/admin/orders/") && !pathname.startsWith("/admin/orders/quotations")) {
    return "Detail Pesanan";
  }

  for (const group of adminNavigationGroups) {
    for (const item of group.items) {
      if (isNavigationLink(item)) {
        if (isNavigationActive(pathname, item)) return item.label;
      } else {
        for (const child of item.children) {
          if (isNavigationActive(pathname, child)) return child.label;
        }
      }
    }
  }

  return "Panel Admin";
}

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumbItem[] {
  if (pathname === "/admin/dashboard" || pathname === "/admin") {
    return [{ label: "Dashboard" }];
  }


  if (pathname.startsWith("/admin/quality-control")) {
    const crumbs: AdminBreadcrumbItem[] = [
      { label: "Operasional" },
      { label: "Quality Control", href: pathname === "/admin/quality-control" ? undefined : "/admin/quality-control" }
    ];
    if (pathname !== "/admin/quality-control") crumbs.push({ label: "Detail Quality Control" });
    return crumbs;
  }

  if (pathname === "/admin/production") {
    return [{ label: "Operasional" }, { label: "Status Produksi" }];
  }

  if (pathname.startsWith("/admin/work-items")) {
    const crumbs: AdminBreadcrumbItem[] = [
      { label: "Operasional" },
      { label: "Work Item", href: pathname === "/admin/work-items" ? undefined : "/admin/work-items" }
    ];
    if (pathname !== "/admin/work-items") crumbs.push({ label: "Detail Work Item" });
    return crumbs;
  }

  if (pathname.startsWith("/admin/job-orders")) {
    const crumbs: AdminBreadcrumbItem[] = [
      { label: "Operasional" },
      { label: "Job Order", href: pathname === "/admin/job-orders" ? undefined : "/admin/job-orders" }
    ];
    if (pathname !== "/admin/job-orders") crumbs.push({ label: "Detail Job Order" });
    return crumbs;
  }

  if (pathname.startsWith("/admin/orders/quotations")) {
    const crumbs: AdminBreadcrumbItem[] = [
      { label: "Order" },
      {
        label: "Formal Quotation",
        href: pathname === "/admin/orders/quotations" ? undefined : "/admin/orders/quotations"
      }
    ];
    if (pathname === "/admin/orders/quotations/new") {
      crumbs.push({ label: "Buat Quotation" });
    } else if (pathname !== "/admin/orders/quotations") {
      crumbs.push({ label: "Detail Quotation" });
    }
    return crumbs;
  }

  if (pathname.startsWith("/admin/orders")) {
    const crumbs: AdminBreadcrumbItem[] = [
      { label: "Order" },
      {
        label: "Pesanan",
        href: pathname === "/admin/orders" ? undefined : "/admin/orders"
      }
    ];
    if (pathname === "/admin/orders/archive") {
      crumbs.push({ label: "Gudang Arsip" });
    } else if (pathname !== "/admin/orders") {
      crumbs.push({ label: "Detail Pesanan" });
    }
    return crumbs;
  }

  const groupMap: Record<string, string> = {
    "/admin/homepage-sections": "Website",
    "/admin/page-hero": "Website",
    "/admin/media": "Website",
    "/admin/site-media": "Website",
    "/admin/banner": "Website",
    "/admin/products": "Katalog",
    "/admin/pim-manager": "Katalog",
    "/admin/pim-v2": "Katalog",
    "/admin/categories": "Katalog",
    "/admin/services": "Katalog",
    "/admin/store": "Katalog",
    "/admin/website-settings": "Sistem",
    "/admin/document-numbering": "Sistem",
    "/admin/job-orders": "Operasional",
    "/admin/work-items": "Operasional",
    "/admin/production": "Operasional",
    "/admin/quality-control": "Operasional"
  };

  const matchingRoute = Object.keys(groupMap).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (matchingRoute) {
    return [
      { label: groupMap[matchingRoute] },
      { label: getCurrentNavigationLabel(pathname) }
    ];
  }

  return [{ label: getCurrentNavigationLabel(pathname) }];
}

export function isLegacyAdminRoute(pathname: string) {
  return !(
    pathname.startsWith("/admin/orders") ||
    pathname.startsWith("/admin/document-numbering") ||
    pathname.startsWith("/admin/job-orders") ||
    pathname.startsWith("/admin/work-items") ||
    pathname.startsWith("/admin/production")
  );
}
