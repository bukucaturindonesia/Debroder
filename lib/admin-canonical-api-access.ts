import type { AdminRole } from "@/lib/access-control";

const ALWAYS_ALLOWED = [
  "/api/admin/session",
  "/api/admin/change-password"
] as const;

const ROLE_PREFIXES: Partial<Record<AdminRole, readonly string[]>> = {
  head_store: [
    "/api/admin/dashboard",
    "/api/admin/products",
    "/api/admin/categories",
    "/api/admin/services",
    "/api/admin/store",
    "/api/admin/orders",
    "/api/admin/order-tasks",
    "/api/admin/inventory-operations",
    "/api/admin/production",
    "/api/admin/fulfillments",
    "/api/admin/notifications",
    "/api/admin/customer-outbox",
    "/api/admin/repeat-orders"
  ],
  store_admin: [
    "/api/admin/dashboard",
    "/api/admin/orders",
    "/api/admin/order-tasks",
    "/api/admin/inventory-operations",
    "/api/admin/fulfillments",
    "/api/admin/notifications"
  ],
  product_content_manager: [
    "/api/admin/products",
    "/api/admin/product",
    "/api/admin/categories",
    "/api/admin/media",
    "/api/admin/site-media",
    "/api/admin/homepage",
    "/api/admin/homepage-sections",
    "/api/admin/landing",
    "/api/admin/banner",
    "/api/admin/instagram-banners",
    "/api/admin/hero-banners",
    "/api/admin/page-hero",
    "/api/admin/page-heroes",
    "/api/admin/custom-commerce",
    "/api/admin/commerce/jersey",
    "/api/admin/notifications"
  ],
  order_cs_admin: [
    "/api/admin/dashboard",
    "/api/admin/orders",
    "/api/admin/order-tasks",
    "/api/admin/repeat-orders",
    "/api/admin/production",
    "/api/admin/fulfillments",
    "/api/admin/notifications",
    "/api/admin/customer-outbox",
    "/api/admin/refunds",
    "/api/admin/payments"
  ],
  finance_admin: [
    "/api/admin/dashboard",
    "/api/admin/orders",
    "/api/admin/payments",
    "/api/admin/refunds",
    "/api/admin/reports",
    "/api/admin/document-numbering",
    "/api/admin/notifications"
  ]
};

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canonicalRoleCanAccessAdminApi(
  role: AdminRole,
  pathname: string
) {
  if (ALWAYS_ALLOWED.some((prefix) => matchesPrefix(pathname, prefix))) return true;
  if (role === "owner" || role === "superadmin" || role === "super_admin") return true;

  const prefixes = ROLE_PREFIXES[role];
  if (!prefixes) {
    // Existing legacy roles continue through the legacy authorization layer.
    return true;
  }
  return prefixes.some((prefix) => matchesPrefix(pathname, prefix));
}
