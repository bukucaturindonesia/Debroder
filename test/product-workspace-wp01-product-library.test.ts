import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { roleCanAccessPath } from "@/components/admin/layout/admin-navigation";
import {
  parseProductLibraryQuery,
  productLibrarySortSpec,
  safeProductLibrarySearchToken
} from "@/lib/product-library";

const mainPage = readFileSync("app/admin/products/page.tsx", "utf8");
const legacyPage = readFileSync("app/admin/products/legacy/page.tsx", "utf8");
const libraryRoute = readFileSync("app/api/admin/products/library/route.ts", "utf8");
const libraryUi = readFileSync("components/admin/products/ProductLibrary.tsx", "utf8");
const legacyEditor = readFileSync("components/admin/ProductAdmin.tsx", "utf8");

function query(value = "") {
  return parseProductLibraryQuery(new URLSearchParams(value));
}

describe("WP-01 Product Library", () => {
  it("uses conservative query defaults and clamps pagination", () => {
    expect(query()).toMatchObject({
      q: "",
      status: "all",
      categoryId: "",
      sort: "updated_desc",
      page: 1,
      pageSize: 24
    });
    expect(query("page=-1&pageSize=999&status=unknown&sort=unknown")).toMatchObject({
      status: "all",
      sort: "updated_desc",
      page: 1,
      pageSize: 100
    });
  });

  it("sanitizes PostgREST search input and allowlists sort columns", () => {
    expect(safeProductLibrarySearchToken("kaos%,_premium(*)")).toBe("kaos premium");
    expect(productLibrarySortSpec("name_asc")).toEqual({ column: "name", ascending: true });
    expect(productLibrarySortSpec("price_desc")).toEqual({ column: "base_price", ascending: false });
  });

  it("keeps /admin/products as Product Library only", () => {
    expect(mainPage).toContain("ProductLibrary");
    expect(mainPage).not.toContain("ProductAdminPanel");
    expect(libraryUi).toContain("Product Library");
    expect(libraryUi).not.toContain("/api/admin/products/library");
  });

  it("loads a server-paginated summary instead of the full catalog tree", () => {
    expect(libraryRoute).toContain('{ count: "exact" }');
    expect(libraryRoute).toContain(".range(from, to)");
    expect(libraryRoute).toContain('"product_variants"');
    expect(libraryRoute).toContain('"product_variant_sizes"');
    expect(libraryRoute).toContain('"product_variant_images"');
    expect(libraryRoute).toContain('"product_id"');
    expect(libraryRoute).toContain('"variant_id"');
    expect(libraryRoute).toContain("productIds");
    expect(libraryRoute).toContain("variantIds");
    expect(libraryRoute).toContain(".in(field, chunk)");
    expect(libraryRoute).not.toContain('from("product_color_master")');
    expect(libraryRoute).not.toContain('from("product_size_master")');
    expect(libraryRoute).not.toContain('from("media_assets")');
    expect(libraryRoute).not.toContain("export async function POST");
  });

  it("preserves the old editor and opens it with a stable product ID", () => {
    expect(legacyPage).toContain("ProductAdminPanel");
    expect(legacyPage).toContain("initialProductId={productId}");
    expect(legacyPage).toContain('startNew={params.new === "1"}');
    expect(legacyEditor).toContain("initialProductId = null");
    expect(legacyEditor).toContain("startNew = false");
    expect(legacyEditor).toContain("refresh(initialProductRef.current)");
    expect(libraryUi).toContain("productId=${encodeURIComponent(product.id)}");
  });

  it.each(["owner", "superadmin", "super_admin", "admin", "admin_guest"] as const)(
    "keeps Product Library and legacy editor visible for %s",
    (role: "owner" | "superadmin" | "super_admin" | "admin" | "admin_guest") => {
      expect(roleCanAccessPath(role, "/admin/products")).toBe(true);
      expect(roleCanAccessPath(role, "/admin/products/bulk-edit")).toBe(true);
      expect(roleCanAccessPath(role, "/admin/products/legacy")).toBe(true);
    }
  );

  it.each(["sales_admin", "designer", "finance", "production_admin", "operator", "quality_control", "store_staff"] as const)(
    "does not expand Product Library access to unrelated role %s",
    (role) => {
      expect(roleCanAccessPath(role, "/admin/products")).toBe(false);
      expect(roleCanAccessPath(role, "/admin/products/bulk-edit")).toBe(false);
      expect(roleCanAccessPath(role, "/admin/products/legacy")).toBe(false);
    }
  );

  it("does not open WP-02 routes or introduce schema work", () => {
    for (const route of ["/information", "/variants", "/inventory", "/media", "/review"]) {
      expect(libraryUi).not.toContain(route);
    }
    expect(libraryRoute.toLowerCase()).not.toContain("create table");
    expect(libraryRoute.toLowerCase()).not.toContain("alter table");
  });
});
