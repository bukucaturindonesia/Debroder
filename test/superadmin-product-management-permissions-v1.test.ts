import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getProductManagerCapabilities } from "@/lib/product-manager";

const migration = readFileSync(
  "supabase/migrations/20260808131000_superadmin_product_management_permissions_v1.sql",
  "utf8"
).toLowerCase();
const verifySql = readFileSync(
  "supabase/verify/VERIFY_superadmin_product_management_permissions_v1.sql",
  "utf8"
).toLowerCase();
const productRoute = readFileSync("app/api/admin/products/route.ts", "utf8");

describe("Superadmin Product Management Permissions V1", () => {
  it("keeps the existing Product Manager capability model authoritative", () => {
    for (const role of ["superadmin", "super_admin"]) {
      const capabilities = getProductManagerCapabilities(role);
      expect(capabilities.canCreateDraft).toBe(true);
      expect(capabilities.canEditDraft).toBe(true);
      expect(capabilities.canEditPublished).toBe(true);
      expect(capabilities.canPublish).toBe(true);
      expect(capabilities.canArchive).toBe(true);
      expect(capabilities.canManageDependencies).toBe(true);
      expect(capabilities.canUseMaintenance).toBe(true);
    }
  });

  it("grants the required product permissions only to superadmin compatibility roles", () => {
    expect(migration).toContain("begin;");
    expect(migration).toContain("commit;");
    expect(migration).toContain("('superadmin'), ('super_admin')");
    for (const permission of [
      "product.read",
      "product.manage",
      "product.inventory.manage",
      "product.publish",
      "product.maintenance"
    ]) expect(migration).toContain(`('${permission}')`);
    expect(migration).not.toMatch(/\('admin'\)\s*[,)]/);
    expect(migration).not.toContain("update public.products");
    expect(migration).not.toContain("insert into public.products");
    expect(migration).not.toContain("delete from public.products");
  });

  it("does not weaken canonical Product Manager authorization guards", () => {
    expect(productRoute).toContain('requireProductActor(request, "product.manage")');
    expect(productRoute).toContain('requireActorPermission(actor.permissions, "product.inventory.manage")');
    expect(productRoute).toContain('requireActorPermission(actor.permissions, "product.publish")');
  });

  it("ships post-migration verification with an admin elevation guard", () => {
    expect(verifySql).toContain("expected superadmin product grants are missing");
    expect(verifySql).toContain("admin received unexpected product mutation permissions");
    expect(verifySql).toContain("rp.role = 'admin'");
  });
});
