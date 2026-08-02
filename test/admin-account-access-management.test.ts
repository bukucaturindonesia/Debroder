import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MANAGEABLE_ADMIN_ROLES,
  TARGET_ADMIN_ROLES,
  hasEveryPermission,
  isAccountEnabled,
  parseAdminRole
} from "@/lib/access-control";
import {
  accountScopeIsComplete,
  adminAccountAccessSchema,
  adminAccountActionSchema,
  adminAccountInviteSchema,
  assertSafeAccountTarget,
  invitationStatus,
  normalizeAccountListQuery
} from "@/lib/admin-account-management";
import {
  canAccessAdminPath,
  getCompatibilityPermissions,
  getNavigationGroups,
  requiredPermissionForAdminPath,
  roleCanAccessPath
} from "@/components/admin/layout/admin-navigation";

const migration = readFileSync("supabase/migrations/20260802090000_admin_account_role_experience_v1.sql", "utf8").toLowerCase();
const verifySql = readFileSync("supabase/verify/VERIFY_admin_account_role_experience_v1.sql", "utf8").toLowerCase();
const middleware = readFileSync("middleware.ts", "utf8");
const phase13 = readFileSync("lib/phase13-auth.ts", "utf8");
const sessionApi = readFileSync("app/api/admin/session/route.ts", "utf8");
const accountApi = readFileSync("app/api/admin/access-control/route.ts", "utf8");
const accountDetailApi = readFileSync("app/api/admin/access-control/users/[id]/route.ts", "utf8");
const accountActionApi = readFileSync("app/api/admin/access-control/users/[id]/actions/route.ts", "utf8");
const notificationAuth = readFileSync("lib/notification-auth.ts", "utf8");
const paymentAuth = readFileSync("lib/payment-auth.ts", "utf8");
const orderRoute = readFileSync("app/api/admin/orders/[id]/route.ts", "utf8");
const productRoute = readFileSync("app/api/admin/products/route.ts", "utf8");
const productExport = readFileSync("app/api/admin/products/export-reconciliation/route.ts", "utf8");
const shell = readFileSync("components/admin/layout/AdminShell.tsx", "utf8");
const sidebar = readFileSync("components/admin/layout/AdminSidebar.tsx", "utf8");
const accessUi = readFileSync("components/admin/AccessControlAdmin.tsx", "utf8");
const detailUi = readFileSync("components/admin/AdminAccountDetail.tsx", "utf8");

const storeA = "11111111-1111-4111-8111-111111111111";

describe("Admin Account & Role-Based Experience V1", () => {
  it("1 parses only canonical Admin roles", () => {
    expect(parseAdminRole(" FINANCE_ADMIN ")).toBe("finance_admin");
    expect(parseAdminRole("customer")).toBeNull();
  });

  it("2 contains the six target presentation roles", () => {
    expect(TARGET_ADMIN_ROLES).toEqual(["owner", "head_store", "store_admin", "product_content_manager", "order_cs_admin", "finance_admin"]);
    expect(MANAGEABLE_ADMIN_ROLES).not.toContain("owner");
  });

  it("3 denies unknown routes by default", () => {
    expect(requiredPermissionForAdminPath("/admin/unknown-sensitive-area")).toBeNull();
    expect(canAccessAdminPath("/admin/unknown-sensitive-area", ["*"])).toBe(false);
  });

  it("4 presents Owner navigation from capability keys", () => {
    const labels = JSON.stringify(getNavigationGroups("owner", ["*"]));
    expect(labels).toContain("Akun Admin");
    expect(labels).toContain("Pembayaran");
  });

  it("5 presents Head Store operational navigation without account management", () => {
    const groups = JSON.stringify(getNavigationGroups("head_store", getCompatibilityPermissions("head_store")));
    expect(groups).toContain("Stok Lokasi & Pickup");
    expect(groups).not.toContain("Akun Admin");
  });

  it("6 presents Store Admin scoped operational navigation", () => {
    const groups = JSON.stringify(getNavigationGroups("store_admin", getCompatibilityPermissions("store_admin")));
    expect(groups).toContain("Pesanan");
    expect(groups).not.toContain("Pembayaran");
  });

  it("7 presents Product & Content navigation without finance", () => {
    const groups = JSON.stringify(getNavigationGroups("product_content_manager", getCompatibilityPermissions("product_content_manager")));
    expect(groups).toContain("Landing Page");
    expect(groups).toContain("Manajemen Produk");
    expect(groups).not.toContain("Pembayaran");
  });

  it("8 presents Order & CS navigation without payment verification", () => {
    const permissions = getCompatibilityPermissions("order_cs_admin");
    expect(roleCanAccessPath("order_cs_admin", "/admin/orders", permissions)).toBe(true);
    expect(roleCanAccessPath("order_cs_admin", "/admin/payments", permissions)).toBe(false);
  });

  it("9 presents Finance navigation without product mutation", () => {
    const permissions = getCompatibilityPermissions("finance_admin");
    expect(roleCanAccessPath("finance_admin", "/admin/payments", permissions)).toBe(true);
    expect(roleCanAccessPath("finance_admin", "/admin/products", permissions)).toBe(false);
  });

  it("10 rejects direct routes without their required capability", () => {
    expect(canAccessAdminPath("/admin/access-control", ["dashboard.read"])).toBe(false);
    expect(middleware).toContain("canAccessAdminPath(pathname, permissions)");
    expect(middleware).toContain("${status} — Akses Ditolak");
    expect(sessionApi).toContain("httpOnly: true");
  });

  it("11 protects server-side mutations with the canonical actor", () => {
    expect(accountDetailApi).toContain('requirePhase13Actor(request, "access_control.manage")');
    expect(accountDetailApi).toContain("adminAccountAccessSchema.safeParse");
  });

  it("12 makes API authorization consume database permissions", () => {
    expect(productRoute).toContain('requireProductActor(request, "product.manage")');
    expect(paymentAuth).toContain("requirePhase13Actor(request, permission)");
    expect(notificationAuth).toContain("requirePhase13Actor(request, permission)");
  });

  it("13 revokes anon access to account RPCs", () => {
    expect(migration).toContain("revoke all on function public.update_admin_account_access_v1");
    expect(migration).toContain("revoke all on function public.revoke_admin_sessions_v1");
    expect(verifySql).toContain("anon must not update admin access");
  });

  it("14 denies disabled accounts in every canonical request", () => {
    expect(isAccountEnabled("INACTIVE")).toBe(false);
    expect(phase13).toContain("ADMIN_ACCOUNT_DISABLED");
    expect(middleware).toContain("ADMIN_ACCOUNT_DISABLED");
  });

  it("15 denies invalid or missing profiles", () => {
    expect(phase13).toContain("ADMIN_PROFILE_INCOMPLETE");
    expect(phase13).toContain("if (!profile)");
  });

  it("16 denies missing Store Admin scope", () => {
    expect(accountScopeIsComplete({ role: "store_admin", primaryStoreId: null, allStoreAccess: false })).toBe(false);
    expect(adminAccountAccessSchema.safeParse({ role: "store_admin", accountStatus: "ACTIVE", primaryStoreId: null, allStoreAccess: false, reason: "Scope test evidence" }).success).toBe(false);
  });

  it("17 keeps cross-store lists behind user-token RLS", () => {
    expect(readFileSync("lib/admin-orders/data-access.ts", "utf8")).toContain('.from("orders")');
    expect(readFileSync("app/api/admin/orders/route.ts", "utf8")).toContain("loadAdminOrderListPage(actor.client)");
    expect(migration).toContain("public.can_access_store(id)");
  });

  it("18 keeps cross-store details behind user-token RLS", () => {
    expect(orderRoute).toContain("loadAdminOrderDetailPage(actor.client, id)");
    expect(orderRoute).not.toContain("loadAdminOrderDetailPage(actor.adminClient");
  });

  it("19 keeps cross-store mutations behind user-token RPC calls", () => {
    expect(orderRoute).toContain('actor.client.rpc("update_order_delivery_details"');
    expect(orderRoute).not.toContain('actor.adminClient.rpc("update_order_delivery_details"');
  });

  it("20 keeps restricted exports unavailable to Store Admin", () => {
    expect(productExport).toContain('requirePhase13Actor(authRequest, "product.read")');
    expect(getCompatibilityPermissions("store_admin")).not.toContain("product.read");
  });

  it("21 validates account invitation and normalized email", () => {
    expect(adminAccountInviteSchema.safeParse({ displayName: "Finance", email: "Finance@Example.com", role: "finance_admin", primaryStoreId: null, allStoreAccess: true, reason: "Owner approved invite" }).success).toBe(true);
    expect(accountApi).toContain("inviteUserByEmail");
    expect(accountApi).toContain("ilike(\"email\"");
  });

  it("22 validates role changes", () => {
    expect(adminAccountAccessSchema.safeParse({ role: "owner", accountStatus: "ACTIVE", primaryStoreId: null, allStoreAccess: true, reason: "Unsafe promotion" }).success).toBe(false);
    expect(accountDetailApi).toContain('rpc("update_admin_account_access_v1"');
  });

  it("23 validates scope changes", () => {
    expect(adminAccountAccessSchema.safeParse({ role: "store_admin", accountStatus: "ACTIVE", primaryStoreId: storeA, allStoreAccess: true, reason: "Unsafe global scope" }).success).toBe(false);
    expect(accountScopeIsComplete({ role: "store_admin", primaryStoreId: storeA, allStoreAccess: false })).toBe(true);
  });

  it("24 prevents self-disable", () => {
    expect(() => assertSafeAccountTarget({ actorId: storeA, targetId: storeA, currentRole: "finance_admin", nextStatus: "INACTIVE", activeOwnerCount: 1 })).toThrow("Akun sendiri");
    expect(accountActionApi).toContain("id === actor.user.id");
  });

  it("25 prevents self-demotion", () => {
    expect(() => assertSafeAccountTarget({ actorId: storeA, targetId: storeA, currentRole: "finance_admin", nextRole: "store_admin", activeOwnerCount: 1 })).toThrow("Role akun sendiri");
  });

  it("26 protects the final Owner", () => {
    expect(() => assertSafeAccountTarget({ actorId: "22222222-2222-4222-8222-222222222222", targetId: storeA, currentRole: "owner", nextStatus: "INACTIVE", activeOwnerCount: 1 })).toThrow("Owner aktif terakhir");
    expect(migration).toContain("target_row.role in ('owner','superadmin','super_admin')");
  });

  it("27 implements the session revocation path", () => {
    expect(adminAccountActionSchema.safeParse({ action: "revoke_sessions", reason: "Owner security response" }).success).toBe(true);
    expect(accountActionApi).toContain('rpc("revoke_admin_sessions_v1"');
    expect(migration).toContain("delete from auth.sessions");
  });

  it("28 records append-only lifecycle evidence", () => {
    expect(accountApi).toContain('rpc("initialize_admin_invitation_profile_v1"');
    expect(migration).toContain("admin_invitation_created");
    expect(migration).toContain("profile_and_audit_atomic");
    expect(migration).toContain("admin_account_access_updated");
    expect(migration).toContain("admin_sessions_revoked");
  });

  it("29 never exposes or persists secret values", () => {
    expect(`${accountApi}\n${accountDetailApi}\n${detailUi}`).not.toMatch(/refresh_token|access_token|password_hash|invite_token/i);
    expect(migration).not.toContain("insert into auth.users");
    expect(migration).not.toContain("@debroder.com");
  });

  it("30 keeps one navigation and one AdminShell source", () => {
    expect(sidebar).toContain("getNavigationGroups(role, access.permissions)");
    expect(shell).toContain("<AdminAccessProvider access={access}>");
    expect(accessUi).toContain("Akun, Role, dan Scope");
  });

  it("31 preserves transaction routes and canonical guards", () => {
    expect(orderRoute).toContain('requirePhase13Actor(request, "order.read")');
    expect(orderRoute).toContain('requirePhase13Actor(request, "order.edit")');
    expect(orderRoute).not.toContain("next_order_number");
  });

  it("32 derives lifecycle labels without inventing authorization", () => {
    expect(invitationStatus({ authExists: true, profileExists: true, invitedAt: "2026-08-01", confirmedAt: null, accountStatus: "TESTING" })).toBe("Diundang");
    expect(invitationStatus({ authExists: false, profileExists: true, invitedAt: null, confirmedAt: null, accountStatus: "ACTIVE" })).toBe("Profil tanpa Auth");
  });

  it("33 normalizes filters and clamps pagination", () => {
    expect(normalizeAccountListQuery(new URLSearchParams("page=-3&pageSize=999&role=finance_admin"))).toMatchObject({ page: 1, pageSize: 100, role: "finance_admin" });
  });

  it("34 requires complete multi-capability checks", () => {
    expect(hasEveryPermission(["order.read", "quotation.write"], ["order.read", "quotation.write"])).toBe(true);
    expect(hasEveryPermission(["order.read"], ["order.read", "quotation.write"])).toBe(false);
  });

  it("35 exposes account list, detail, sessions, and append-only activity states", () => {
    expect(accessUi).toContain("Undang Akun");
    expect(accessUi).toContain("Kirim Reset Password");
    expect(detailUi).toContain("Aktivitas Append-only");
    expect(detailUi).toContain("Token, refresh token, dan detail rahasia sesi tidak ditampilkan.");
  });
});
