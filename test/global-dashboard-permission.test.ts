import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { roleCanAccessPath } from "@/components/admin/layout/admin-navigation";
import { resolveGlobalDashboardAccess } from "@/lib/global-admin-dashboard/access";
import {
  Phase13AuthError,
  phase13ErrorResponse,
  requirePhase13Actor
} from "@/lib/phase13-auth";

const storeA = "11111111-1111-4111-8111-111111111111";
const storeB = "22222222-2222-4222-8222-222222222222";

describe("Global Dashboard canonical permission", () => {
  it.each(["owner", "superadmin", "super_admin"] as const)(
    "allows %s to read all stores",
    (role) => {
      expect(resolveGlobalDashboardAccess({
        role,
        primaryStoreId: null,
        allStoreAccess: true
      }, storeA)).toEqual({ storeId: storeA, storeScopeLocked: false });
      expect(roleCanAccessPath(role, "/admin/dashboard")).toBe(true);
    }
  );

  it("locks Store Admin to the assigned store", () => {
    expect(resolveGlobalDashboardAccess({
      role: "store_admin",
      primaryStoreId: storeA,
      allStoreAccess: false
    }, null)).toEqual({ storeId: storeA, storeScopeLocked: true });
    expect(() => resolveGlobalDashboardAccess({
      role: "store_admin",
      primaryStoreId: storeA,
      allStoreAccess: false
    }, storeB)).toThrowError("Store Admin hanya dapat membaca toko yang ditetapkan.");
    expect(roleCanAccessPath("store_admin", "/admin/dashboard")).toBe(true);
    expect(roleCanAccessPath("store_admin", "/admin/orders")).toBe(false);
  });

  it("rejects an authenticated role without Dashboard permission", () => {
    expect(() => resolveGlobalDashboardAccess({
      role: "finance",
      primaryStoreId: null,
      allStoreAccess: true
    }, null)).toThrowError("Role ini tidak memiliki akses Dashboard Global.");
  });

  it("rejects anonymous requests as 401 before database access", async () => {
    await expect(requirePhase13Actor(new Request("http://localhost/api/admin/global-dashboard")))
      .rejects.toMatchObject({ status: 401 });
  });

  it("keeps permission service failures distinct from a 403", async () => {
    const response = phase13ErrorResponse(new Phase13AuthError(
      503,
      "Pemeriksaan permission sedang tidak tersedia."
    ));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Layanan panel Admin belum tersedia."
    });
  });

  it("registers the signed-in canonical session and owns restrictive store RLS", () => {
    const login = readFileSync("components/admin/AdminLogin.tsx", "utf8");
    const migration = readFileSync(
      "supabase/migrations/20260726090522_global_dashboard_store_scope_restrictive_rls.sql",
      "utf8"
    );
    expect(login).toContain('"current_request_session_id"');
    expect(login).toContain('"register_admin_session_v1"');
    expect(readFileSync("lib/phase13-auth.ts", "utf8"))
      .toContain('"is_current_admin_session"');
    expect(migration).toContain("as restrictive for select to authenticated");
    expect(migration).toContain("public.can_access_order(order_id)");
    expect(migration).toContain("public.can_access_store(id)");
  });
});
