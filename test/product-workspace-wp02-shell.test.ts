import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { roleCanAccessPath } from "@/components/admin/layout/admin-navigation";
import {
  isValidProductWorkspaceId,
  PRODUCT_WORKSPACE_MODULES,
  productWorkspaceModuleFromPath,
  productWorkspacePath
} from "@/lib/product-workspace";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const libraryUi = readFileSync("components/admin/products/ProductLibrary.tsx", "utf8");
const workspaceShell = readFileSync(
  "components/admin/products/workspace/ProductWorkspaceShell.tsx",
  "utf8"
);
const workspaceModule = readFileSync(
  "components/admin/products/workspace/ProductWorkspaceReadOnlyModule.tsx",
  "utf8"
);
const workspaceRoute = readFileSync(
  "app/api/admin/products/[id]/workspace/route.ts",
  "utf8"
);
const workspaceIndex = readFileSync("app/admin/products/[id]/page.tsx", "utf8");
const legacyPage = readFileSync("app/admin/products/legacy/page.tsx", "utf8");

const moduleKeys = ["information", "variants", "inventory", "media", "review"] as const;

describe("WP-02 Product Workspace read-only shell", () => {
  it("defines exactly five canonical modules and stable UUID paths", () => {
    expect(PRODUCT_WORKSPACE_MODULES.map((item) => item.key)).toEqual(moduleKeys);
    expect(productWorkspacePath(PRODUCT_ID)).toBe(
      `/admin/products/${PRODUCT_ID}/information`
    );
    expect(productWorkspacePath(PRODUCT_ID, "media")).toBe(
      `/admin/products/${PRODUCT_ID}/media`
    );
    expect(isValidProductWorkspaceId(PRODUCT_ID)).toBe(true);
    expect(isValidProductWorkspaceId("legacy")).toBe(false);
    expect(productWorkspaceModuleFromPath(`/admin/products/${PRODUCT_ID}/review`)).toBe("review");
  });

  it("provides reloadable route files and redirects the workspace root", () => {
    expect(workspaceIndex).toContain("redirect(productWorkspacePath(id))");
    expect(existsSync("app/admin/products/[id]/layout.tsx")).toBe(true);
    for (const moduleKey of moduleKeys) {
      expect(existsSync(`app/admin/products/[id]/${moduleKey}/page.tsx`)).toBe(true);
    }
  });

  it("opens the new workspace and keeps legacy URLs as redirects only", () => {
    expect(libraryUi).toContain("productWorkspacePath(product.id)");
    expect(libraryUi).toContain("Buka Workspace");
    expect(libraryUi).not.toContain("/admin/products/legacy?productId=");
    expect(workspaceShell).not.toContain("/admin/products/legacy?productId=");
    expect(legacyPage).toContain("redirect(productWorkspacePath(params.productId))");
    expect(legacyPage).not.toContain("ProductAdminPanel");
  });

  it("keeps the shell read-only with loading, missing, invalid, and retry states", () => {
    expect(workspaceShell).toContain("ProductWorkspaceLoading");
    expect(workspaceShell).toContain("Produk tidak ditemukan");
    expect(workspaceShell).toContain("ID produk tidak valid");
    expect(workspaceShell).toContain("Coba lagi");
    expect(workspaceShell).toContain("MODE LIHAT SAJA");
    expect(workspaceShell).not.toContain("Simpan");
    expect(workspaceShell).not.toContain("onSubmit");
    expect(workspaceModule).toContain("READ-ONLY SHELL");
    expect(workspaceModule).not.toContain("<form");
  });

  it("loads only root identity through a GET-only endpoint", () => {
    expect(workspaceRoute).toContain("export async function GET");
    expect(workspaceRoute).toContain('.from("products")');
    expect(workspaceRoute).toContain("PRODUCT_WORKSPACE_FIELDS");
    expect(workspaceRoute).not.toContain("export async function POST");
    expect(workspaceRoute).not.toContain("export async function PATCH");
    expect(workspaceRoute).not.toContain("export async function PUT");
    expect(workspaceRoute).not.toContain("export async function DELETE");
    expect(workspaceRoute).not.toContain('.from("product_variants")');
    expect(workspaceRoute).not.toContain('.from("product_variant_sizes")');
    expect(workspaceRoute).not.toContain('.from("inventory_locations")');
    expect(workspaceRoute).not.toContain('.from("product_variant_images")');
    expect(workspaceRoute.toLowerCase()).not.toContain("create table");
    expect(workspaceRoute.toLowerCase()).not.toContain("alter table");
  });

  it.each(["owner", "superadmin", "super_admin", "admin", "admin_guest"] as const)(
    "allows %s to open every canonical workspace route",
    (role: "owner" | "superadmin" | "super_admin" | "admin" | "admin_guest") => {
      expect(roleCanAccessPath(role, `/admin/products/${PRODUCT_ID}`)).toBe(true);
      for (const moduleKey of moduleKeys) {
        expect(roleCanAccessPath(role, `/admin/products/${PRODUCT_ID}/${moduleKey}`)).toBe(true);
      }
    }
  );

  it.each(["sales_admin", "designer", "finance", "operator"] as const)(
    "keeps unrelated role %s outside Product Workspace",
    (role: "sales_admin" | "designer" | "finance" | "operator") => {
      expect(roleCanAccessPath(role, `/admin/products/${PRODUCT_ID}/information`)).toBe(false);
    }
  );

  it("rejects unknown nested product paths instead of widening catalog access", () => {
    expect(roleCanAccessPath("owner", `/admin/products/${PRODUCT_ID}/delete`)).toBe(false);
    expect(roleCanAccessPath("admin_guest", `/admin/products/${PRODUCT_ID}/delete`)).toBe(false);
    expect(roleCanAccessPath("admin", "/admin/products/not-a-uuid/information")).toBe(false);
  });
});
