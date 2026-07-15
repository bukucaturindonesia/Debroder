import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLES,
  getRoleLabel,
  hasPermission,
  isAdminRole,
  isAssignableAdminRole,
  isSuperAdminRole,
  validateRoleAssignment
} from "@/lib/access-control";
import { isWorkItemRole, isWorkItemViewerRole } from "@/lib/work-items";
import { isNotificationRole } from "@/lib/notifications";
import { isPaymentRole, isPaymentVerifier } from "@/lib/payments";
import { roleCanAccessPath } from "@/components/admin/layout/admin-navigation";

const migration = [
  "20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql",
  "20260713091500_v1_2_phase_13_production_history_rls.sql"
]
  .map((file) => readFileSync(resolve("supabase/migrations", file), "utf8"))
  .join("\n")
  .toLowerCase();
const accessApi = readFileSync(resolve("app/api/admin/access-control/route.ts"), "utf8");
const userRoleApi = readFileSync(
  resolve("app/api/admin/access-control/users/[id]/route.ts"),
  "utf8"
);
const auditApi = readFileSync(resolve("app/api/admin/audit-log/route.ts"), "utf8");
const accessUi = readFileSync(resolve("components/admin/AccessControlAdmin.tsx"), "utf8");
const auditUi = readFileSync(resolve("components/admin/SystemAuditAdmin.tsx"), "utf8");
const navigation = readFileSync(
  resolve("components/admin/layout/admin-navigation.ts"),
  "utf8"
);
const workItemUi = readFileSync(resolve("components/admin/WorkItemAdmin.tsx"), "utf8");
const workItemDetailUi = readFileSync(
  resolve("components/admin/WorkItemDetailAdmin.tsx"),
  "utf8"
);

describe("Phase 13 role catalog and helpers", () => {
  it("keeps specialist roles recognizable while assigning only the final three panel roles", () => {
    expect(ADMIN_ROLES).toEqual(
      expect.arrayContaining([
        "sales_admin",
        "designer",
        "production_admin",
        "operator",
        "finance",
        "quality_control",
        "store_staff"
      ])
    );
    expect(isAdminRole("designer")).toBe(true);
    expect(isAdminRole("customer")).toBe(false);
    expect(getRoleLabel("quality_control")).toBe("Quality Control");
    expect(isAssignableAdminRole("superadmin")).toBe(true);
    expect(isAssignableAdminRole("admin")).toBe(true);
    expect(isAssignableAdminRole("admin_guest")).toBe(true);
    expect(isAssignableAdminRole("operator")).toBe(false);
    expect(validateRoleAssignment("operator")).toHaveLength(1);
    expect(validateRoleAssignment("unknown")).toHaveLength(1);
  });

  it("keeps destructive access exclusive to Super Admin aliases", () => {
    expect(isSuperAdminRole("superadmin")).toBe(true);
    expect(isSuperAdminRole("super_admin")).toBe(true);
    expect(isSuperAdminRole("owner")).toBe(false);
    expect(hasPermission(["audit.read"], "audit.read")).toBe(true);
  });

  it("aligns specialist UI helpers with their operational scope", () => {
    expect(isWorkItemRole("production_admin")).toBe(true);
    expect(isWorkItemRole("operator")).toBe(false);
    expect(isWorkItemViewerRole("operator")).toBe(true);
    expect(isNotificationRole("store_staff")).toBe(true);
    expect(isPaymentRole("finance")).toBe(true);
    expect(isPaymentVerifier("finance")).toBe(true);
  });
});

describe("Phase 13 database contract", () => {
  it("extends the profile role constraint without recreating Phase 13 foundations", () => {
    expect(migration).toContain("profiles_role_check");
    expect(migration).toContain("production_admin");
    expect(migration).toContain("quality_control");
    expect(migration).toContain("access_control.manage");
    expect(migration).not.toContain("create table public.system_audit_log");
    expect(migration).not.toContain("drop table");
  });

  it("ships permission RLS, assigned-operator protection, and secure role mutation", () => {
    expect(migration).toContain("update_profile_role");
    expect(migration).toContain("phase13 production work item read");
    expect(migration).toContain("assigned_to=auth.uid()");
    expect(migration).toContain("guard_operator_work_item_update");
    expect(migration).toContain("access_control.read");
    expect(auditApi).toContain("audit.read");
  });

  it("audits role, quantity, price, and file-bearing operational rows", () => {
    expect(migration).toContain("audit_profiles_role_changes");
    expect(migration).toContain("audit_role_permissions_changes");
    expect(migration).toContain("quotation_items");
    expect(migration).toContain("order_items");
    expect(migration).toContain("mockup_files");
    expect(migration).toContain("qc_files");
    expect(migration).toContain("fulfillment_files");
  });
});

describe("Phase 13 backend and UI contract", () => {
  it("uses authenticated permission checks and an audited role RPC", () => {
    expect(accessApi).toContain('requirePhase13Actor(request, "access_control.read")');
    expect(userRoleApi).toContain('requirePhase13Actor(request, "access_control.manage")');
    expect(userRoleApi).toContain('rpc("update_profile_role"');
    expect(userRoleApi).toContain("Super Admin terakhir");
    expect(auditApi).toContain('requirePhase13Actor(request, "audit.read")');
    expect(auditApi).toContain("system_audit_log");
  });

  it("provides loading, empty, error, success, matrix, and append-only history states", () => {
    expect(accessUi).toContain("Memuat role dan permission");
    expect(accessUi).toContain("Belum ada profil staf");
    expect(accessUi).toContain("Permission per Role");
    expect(accessUi).toContain('type="success"');
    expect(auditUi).toContain("Memuat audit sistem");
    expect(auditUi).toContain("Audit tidak ditemukan");
    expect(auditUi).toContain("append-only");
    expect(auditUi).toContain("Coba lagi");
  });

  it("keeps role-aware navigation and assigned operator UX compatible with Phase 14", () => {
    expect(navigation).toContain('href: "/admin/access-control"');
    expect(navigation).toContain('href: "/admin/audit-log"');
    expect(navigation).toContain('role === "quality_control"');
    expect(workItemUi).toContain("Mode operator");
    expect(workItemDetailUi).toContain("canTransition");
    expect(navigation).toContain('href: "/admin/repeat-orders"');
    expect(navigation).not.toContain("phase-15");
  });

  it("allows order readers to open order detail and archive routes", () => {
    const orderId = "2fa6c85e-99c8-4ba0-b0de-b55e52522352";

    expect(roleCanAccessPath("super_admin", `/admin/orders/${orderId}`)).toBe(true);
    expect(roleCanAccessPath("finance", `/admin/orders/${orderId}`)).toBe(true);
    expect(roleCanAccessPath("super_admin", "/admin/orders/archive")).toBe(true);
    expect(roleCanAccessPath("designer", `/admin/orders/${orderId}`)).toBe(false);
  });
});
