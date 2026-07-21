import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_MANAGER_VIEW_ROLES,
  getNavigationGroups,
  roleCanAccessPath,
  type AdminRole
} from "@/components/admin/layout/admin-navigation";

const BULK_IMPORT_PATH = "/admin/products/bulk-import";
const PRODUCT_MANAGER_PATH = "/admin/products";
const bulkImportServer = readFileSync("lib/pim-bulk-import-server.ts", "utf8");

const productManagerViewRoles = [
  "owner",
  "superadmin",
  "super_admin",
  "admin",
  "admin_guest"
] as const satisfies readonly AdminRole[];

const unrelatedRoles = [
  "sales_admin",
  "designer",
  "production_admin",
  "operator",
  "finance",
  "quality_control",
  "store_staff"
] as const satisfies readonly AdminRole[];

describe("CP-CATALOG-ACCESS-01 bulk import page access", () => {
  it("uses the canonical Product Manager view-role set", () => {
    expect(PRODUCT_MANAGER_VIEW_ROLES).toEqual(productManagerViewRoles);
  });

  it.each(productManagerViewRoles)("allows %s to open bulk import", (role) => {
    expect(roleCanAccessPath(role, BULK_IMPORT_PATH)).toBe(true);
  });

  it.each(unrelatedRoles)("keeps unrelated role %s denied", (role) => {
    expect(roleCanAccessPath(role, BULK_IMPORT_PATH)).toBe(false);
  });

  it.each(productManagerViewRoles)("keeps /admin/products available to %s", (role) => {
    expect(roleCanAccessPath(role, PRODUCT_MANAGER_PATH)).toBe(true);
  });

  it("preserves the existing Product Manager navigation entry", () => {
    for (const role of productManagerViewRoles) {
      const groups = getNavigationGroups(role);
      const serialized = JSON.stringify(groups);
      expect(serialized).toContain('"href":"/admin/products"');
      expect(serialized).toContain('"label":"Manajemen Produk"');
    }
  });

  it("keeps page access separate from final-import mutation authority", () => {
    expect(bulkImportServer).toContain(
      'return ["owner", "superadmin", "super_admin"].includes(role);'
    );
    expect(bulkImportServer).toContain(
      'Role ini hanya dapat melakukan preview Bulk Import.'
    );
  });
});
