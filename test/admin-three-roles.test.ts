import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_ADMIN_ROLES,
  ROLE_LABELS,
  isAssignableAdminRole,
  isSuperAdminRole
} from "@/lib/access-control";
import {
  AdminGuestReadOnlyError,
  assertAdminRequestMethodAllowed,
  isReadOnlyHttpMethod
} from "@/lib/admin-role-security";
import {
  maskAddress,
  maskEmail,
  maskPhone,
  sanitizeAdminGuestRecord
} from "@/lib/admin-data-masking";
import { getNavigationGroups, roleCanAccessPath } from "@/components/admin/layout/admin-navigation";
import { isAdminGuestFullViewerPath } from "@/lib/admin-full-viewer";
import { getProductManagerCapabilities } from "@/lib/product-manager";

const migrationPath =
  "supabase/migrations/20260715223043_admin_three_roles_read_only.sql";
const migration = readFileSync(migrationPath, "utf8").toLowerCase();
const shell = readFileSync("components/admin/layout/AdminShell.tsx", "utf8");
const header = readFileSync("components/admin/layout/AdminHeader.tsx", "utf8");
const login = readFileSync("components/admin/AdminLogin.tsx", "utf8");
const sessionRoute = readFileSync("app/api/admin/session/route.ts", "utf8");
const productRoute = readFileSync("app/api/admin/products/route.ts", "utf8");
const fullViewerRoute = readFileSync("app/api/admin/full-viewer/route.ts", "utf8");
const fullViewer = readFileSync("components/admin/AdminGuestFullViewer.tsx", "utf8");

const mutationApiFiles = [
  "app/api/admin/access-control/users/[id]/route.ts",
  "app/api/admin/notification-templates/[id]/route.ts",
  "app/api/admin/notification-templates/route.ts",
  "app/api/admin/notifications/[id]/route.ts",
  "app/api/admin/notifications/route.ts",
  "app/api/admin/orders/[id]/payment-links/route.ts",
  "app/api/admin/orders/[id]/payment-requirement/route.ts",
  "app/api/admin/orders/[id]/tracking-link/route.ts",
  "app/api/admin/payments/[id]/verification/route.ts",
  "app/api/admin/payments/adjustments/route.ts",
  "app/api/admin/products/route.ts",
  "app/api/admin/repeat-orders/route.ts",
  "app/api/admin/pim-v2/custom-services/route.ts"
];

describe("DEBRODER final three admin roles", () => {
  it("keeps the existing canonical Super Admin and exposes only three assignable roles", () => {
    expect(isSuperAdminRole("superadmin")).toBe(true);
    expect(ROLE_LABELS.superadmin).toBe("Super Admin");
    expect(ROLE_LABELS.admin).toBe("Admin");
    expect(ROLE_LABELS.admin_guest).toBe("Admin Guest");
    expect(ASSIGNABLE_ADMIN_ROLES).toEqual(["superadmin", "admin", "admin_guest"]);
    expect(isAssignableAdminRole("super_admin")).toBe(false);
    expect(isAssignableAdminRole("admin_guest")).toBe(true);
  });

  it("allows Admin Guest to open the full panel while keeping login outside the viewer", () => {
    const paths = [
      "/admin/dashboard",
      "/admin/products",
      "/admin/pim-v2",
      "/admin/pim-manager",
      "/admin/orders",
      "/admin/payments",
      "/admin/job-orders",
      "/admin/production",
      "/admin/fulfillments",
      "/admin/homepage-sections",
      "/admin/media",
      "/admin/access-control",
      "/admin/audit-log",
      "/admin/website-settings",
      "/admin/reports"
    ];
    for (const path of paths) expect(roleCanAccessPath("admin_guest", path), path).toBe(true);
    expect(roleCanAccessPath("admin_guest", "/admin/login")).toBe(false);
    expect(isAdminGuestFullViewerPath("/admin/access-control")).toBe(true);
    expect(isAdminGuestFullViewerPath("/admin/products")).toBe(false);

    const labels = JSON.stringify(getNavigationGroups("admin_guest"));
    for (const label of ["Manajemen Produk Lanjutan", "Pemeliharaan Produk", "Pembayaran", "Laporan", "Pengguna & Hak Akses", "Riwayat Aktivitas"]) {
      expect(labels).toContain(label);
    }
  });

  it("makes Product Manager read-only for Admin Guest without reducing Admin or Super Admin", () => {
    expect(getProductManagerCapabilities("admin_guest")).toEqual({
      canCreateDraft: false,
      canEditDraft: false,
      canEditPublished: false,
      canPublish: false,
      canArchive: false,
      canManageDependencies: false,
      canUseMaintenance: false
    });
    expect(getProductManagerCapabilities("admin")).toMatchObject({
      canCreateDraft: true,
      canEditDraft: true,
      canPublish: false,
      canArchive: false
    });
    expect(getProductManagerCapabilities("superadmin")).toMatchObject({
      canCreateDraft: true,
      canEditDraft: true,
      canPublish: true,
      canArchive: true,
      canManageDependencies: true,
      canUseMaintenance: true
    });
  });

  it("rejects every mutation method for Admin Guest at the shared server guard", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(() => assertAdminRequestMethodAllowed("admin_guest", method))
        .toThrow(AdminGuestReadOnlyError);
    }
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(isReadOnlyHttpMethod(method)).toBe(true);
      expect(() => assertAdminRequestMethodAllowed("admin_guest", method)).not.toThrow();
    }
    expect(() => assertAdminRequestMethodAllowed("admin", "POST")).not.toThrow();
    expect(() => assertAdminRequestMethodAllowed("superadmin", "DELETE")).not.toThrow();
  });

  it("masks or removes customer-sensitive values", () => {
    expect(maskPhone("081234567890")).toBe("0812••••7890");
    expect(maskEmail("nama@email.com")).toBe("na•••@email.com");
    expect(maskAddress("Jl. Mamuju Nomor 10")).toBe("Jl. Mamuju ••••");
    expect(sanitizeAdminGuestRecord({
      customer_phone: "081234567890",
      customer_email: "nama@email.com",
      shipping_address: "Jl. Mamuju Nomor 10",
      payment_proof_url: "private-url",
      tracking_token: "secret-token",
      internal_notes: "sensitive"
    })).toEqual({
      customer_phone: "0812••••7890",
      customer_email: "na•••@email.com",
      shipping_address: "Jl. Mamuju ••••",
      payment_proof_url: null,
      tracking_token: null,
      internal_notes: null
    });
  });

  it("uses a trusted server session guard and presents the read-only UI", () => {
    expect(sessionRoute).toContain("requirePhase13Actor(request)");
    expect(sessionRoute).toContain("roleCanAccessPath(actor.role, pathname)");
    expect(sessionRoute).not.toContain("searchParams.get(\"role\")");
    expect(shell).toContain("MODE LIHAT SAJA");
    expect(shell).toContain("Akun ini dapat melihat seluruh Panel Admin, tetapi tidak dapat melakukan perubahan.");
    expect(shell).toContain("AdminGuestFullViewer");
    expect(header).toContain("isAdminGuestRole(role) ? null : <AdminNotificationBell />");
    expect(login).toContain("/api/admin/session?path=%2Fadmin%2Fdashboard");
    expect(login).not.toMatch(/password\s*[:=]\s*["'][^"']+["']/i);
  });

  it("keeps mutation APIs behind trusted role helpers", () => {
    for (const file of mutationApiFiles) {
      const source = readFileSync(file, "utf8");
      const terminalLegacyRoute = source.includes("status: 410");
      const protectedRoute = /requirePhase13Actor|requirePaymentActor|requireNotificationActor|requireRepeatOrderActor/.test(source);
      expect(terminalLegacyRoute || protectedRoute, `${file} must reject or authorize mutations`).toBe(true);
    }
    expect(productRoute).toContain("adminGuestErrorResponse(error)");
  });


  it("serves sanitized full-panel reads through a server-only allowlist", () => {
    expect(fullViewerRoute).toContain("requirePhase13Actor(request)");
    expect(fullViewerRoute).toContain("isAdminGuestRole(actor.role)");
    expect(fullViewerRoute).toContain("actor.adminClient");
    expect(fullViewerRoute).toContain("resource.columns");
    expect(fullViewerRoute).toContain("sanitizeAdminGuestRecord");
    expect(fullViewerRoute).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(fullViewer).toContain("READ-ONLY DATA");
    expect(fullViewer).not.toMatch(/onSubmit=|method=["']post/i);
  });

  it("adds fail-closed RLS, RPC, Storage, and role-assignment enforcement", () => {
    expect(migration).toContain("'admin_guest'::text");
    expect(migration).toContain("select 'admin_guest', definition.permission_key, false");
    expect(migration).toContain("when public.is_admin_guest() then false");
    expect(migration).toContain("profile_row.role <> 'admin_guest'");
    expect(migration).toContain("p_role not in ('superadmin', 'admin', 'admin_guest')");
    expect(migration).toContain("as restrictive for insert to authenticated");
    expect(migration).toContain("as restrictive for update to authenticated");
    expect(migration).toContain("as restrictive for delete to authenticated");
    expect(migration).toContain("admin guest private storage deny");
    expect(migration).not.toContain("insert into auth.users");
    expect(migration).not.toContain("password");
  });
});
