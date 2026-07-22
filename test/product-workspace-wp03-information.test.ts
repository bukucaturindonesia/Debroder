import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getProductManagerCapabilities } from "@/lib/product-manager";
import {
  canEditProductInformation,
  productInformationFormFromProduct,
  productInformationInput,
  sameProductInformation,
  slugifyProductInformation,
  type ProductInformationProduct
} from "@/lib/product-information";

const informationPage = readFileSync(
  "app/admin/products/[id]/information/page.tsx",
  "utf8"
);
const informationRoute = readFileSync(
  "app/api/admin/products/[id]/information/route.ts",
  "utf8"
);
const informationForm = readFileSync(
  "components/admin/products/workspace/ProductInformationForm.tsx",
  "utf8"
);
const workspaceShell = readFileSync(
  "components/admin/products/workspace/ProductWorkspaceShell.tsx",
  "utf8"
);

const product: ProductInformationProduct = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "7200 Premium",
  slug: "7200-premium",
  status: "draft",
  productCategoryId: "22222222-2222-4222-8222-222222222222",
  productSubcategoryId: null,
  categoryName: "Kaos Polos",
  subcategoryName: "",
  basePrice: 47000,
  description: "Kaos premium",
  sku: "7200",
  productType: "standard_product",
  pricingMode: "fixed_price",
  minimumOrderQty: 1,
  seoTitle: "7200 Premium",
  seoDescription: "Kaos premium DEBRODER",
  imageUrl: null,
  updatedAt: "2026-07-22T00:00:00.000Z"
};

describe("WP-03 Product Information", () => {
  it("replaces the WP-02 read-only information page with the editable module", () => {
    expect(informationPage).toContain("ProductInformationForm");
    expect(informationPage).not.toContain("ProductWorkspaceReadOnlyModule");
    expect(informationForm).toContain("WP-03 INFORMATION");
    expect(informationForm).toContain("Simpan Informasi");
  });

  it("loads and saves only product root information through a module route", () => {
    expect(informationRoute).toContain("export async function GET");
    expect(informationRoute).toContain("export async function PATCH");
    expect(informationRoute).not.toContain("export async function POST");
    expect(informationRoute).not.toContain("export async function DELETE");
    expect(informationRoute).toContain('.from("products")');
    expect(informationRoute).toContain('.from("product_categories")');
    expect(informationRoute).toContain('.from("product_subcategories")');
    expect(informationRoute).not.toContain('.from("product_variants")');
    expect(informationRoute).not.toContain('.from("product_variant_sizes")');
    expect(informationRoute).not.toContain('.from("inventory_locations")');
    expect(informationRoute).not.toContain('.from("product_variant_images")');
  });

  it("enforces optimistic concurrency and returns a conflict instead of overwriting", () => {
    expect(informationRoute).toContain("expectedUpdatedAt");
    expect(informationRoute).toContain('.eq("updated_at", expectedUpdatedAt)');
    expect(informationRoute).toContain('.is("updated_at", null)');
    expect(informationRoute).toContain("Produk telah berubah di tempat lain");
    expect(informationRoute).toContain("409");
  });

  it("implements every frozen save state and dirty navigation decision", () => {
    for (const state of ["clean", "dirty", "saving", "saved", "conflict", "error"]) {
      expect(informationForm).toContain(state);
    }
    expect(informationForm).toContain("Simpan perubahan sebelum keluar?");
    expect(informationForm).toContain("Keluar tanpa menyimpan");
    expect(informationForm).toContain("Tetap di sini");
    expect(informationForm).toContain('saving ? "Menyimpan..." : "Simpan"');
    expect(informationForm).toContain("beforeunload");
  });

  it("preserves root validation, category checks, unique slug, and PIM audit", () => {
    expect(informationRoute).toContain("normalizeProductRootInput");
    expect(informationRoute).toContain("validateProductRootDraft");
    expect(informationRoute).toContain("activeCategory");
    expect(informationRoute).toContain("activeSubcategory");
    expect(informationRoute).toContain("assertUniqueSlug");
    expect(informationRoute).toContain("recordPimAuditEvent");
    expect(informationRoute).toContain("PRODUCT_UPDATED");
    expect(informationRoute).toContain("PRODUCT_CATEGORY_CHANGED");
  });

  it("keeps frozen role parity", () => {
    const guest = getProductManagerCapabilities("admin_guest");
    const admin = getProductManagerCapabilities("admin");
    const owner = getProductManagerCapabilities("owner");

    expect(canEditProductInformation(guest, "draft")).toBe(false);
    expect(canEditProductInformation(admin, "draft")).toBe(true);
    expect(canEditProductInformation(admin, "active")).toBe(false);
    expect(canEditProductInformation(owner, "active")).toBe(true);
    expect(informationForm).toContain("MODE LIHAT SAJA");
    expect(informationRoute).toContain("Admin hanya dapat mengedit produk Draft");
  });

  it("normalizes root form values without opening WP-04 through WP-07", () => {
    const form = productInformationFormFromProduct(product);
    expect(sameProductInformation(form, { ...form })).toBe(true);
    expect(sameProductInformation(form, { ...form, name: "7200 Premium Plus" })).toBe(false);
    expect(slugifyProductInformation(" 7200 Premium Plus ")).toBe("7200-premium-plus");
    expect(productInformationInput(product.id, form)).toMatchObject({
      id: product.id,
      name: product.name,
      slug: product.slug,
      productCategoryId: product.productCategoryId,
      basePrice: 47000
    });

    for (const forbidden of [
      "product_variants",
      "product_variant_sizes",
      "product_variant_images",
      "inventory_locations",
      'action: "publish"',
      'action: "archive"'
    ]) {
      expect(informationForm).not.toContain(forbidden);
    }
  });

  it("updates the shared workspace header after a successful information save", () => {
    expect(workspaceShell).toContain("updateWorkspaceProduct");
    expect(informationForm).toContain("updateWorkspaceProduct");
    expect(informationForm).toContain("workspaceProductFromInformation");
  });

  it("does not introduce schema or security expansion", () => {
    expect(informationRoute.toLowerCase()).not.toContain("create table");
    expect(informationRoute.toLowerCase()).not.toContain("alter table");
    expect(informationRoute).not.toContain("service_role");
    expect(informationRoute).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
