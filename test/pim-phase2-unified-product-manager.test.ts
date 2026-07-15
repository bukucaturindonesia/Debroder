import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getProductWorkflowProgress,
  normalizeProductRootInput,
  normalizeProductVariantInput,
  normalizeSellableSkuInput,
  normalizeVariantImageInput,
  validateProductPublishSnapshot,
  type ProductPublishSnapshot
} from "@/lib/product-manager";

const productUi = readFileSync("components/admin/ProductAdmin.tsx", "utf8");
const productRoute = readFileSync("app/api/admin/products/route.ts", "utf8");
const legacyRoute = readFileSync("app/api/admin/pim-v2/products/route.ts", "utf8");

function validSnapshot(): ProductPublishSnapshot {
  return {
    id: "product-1",
    name: "Kaos Cotton 24s",
    slug: "kaos-cotton-24s",
    productCategoryId: "category-1",
    basePrice: 45000,
    status: "draft" as const,
    categoryActive: true,
    duplicateSlug: false,
    variants: [{
      id: "variant-1",
      name: "Black",
      slug: "black",
      hexCode: "#111111",
      status: "active",
      hasFrontImage: true,
      imageRoles: ["front", "back", "detail", "lifestyle"],
      sellable: [{
        id: "sellable-1",
        sku: "DBR-K24-BLK-M",
        sizeId: "size-1",
        sizeActive: true,
        stockQuantity: 12,
        status: "active",
        duplicateSku: false
      }]
    }]
  };
}

describe("PIM Phase 2 Unified Product Manager", () => {
  it("normalizes canonical product, color, sellable SKU, and image inputs", () => {
    expect(normalizeProductRootInput({
      name: "Kaos Cotton 24s",
      slug: "kaos-cotton-24s",
      productCategoryId: "category-1",
      basePrice: 45000,
      seoTitle: "Kaos Cotton 24s DEBRODER"
    })).toMatchObject({ basePrice: 45000, seoTitle: "Kaos Cotton 24s DEBRODER" });

    expect(normalizeProductVariantInput({
      productId: "product-1",
      name: "Black",
      slug: "black",
      hexCode: "#111111",
      priceAdjustment: 0,
      status: "active",
      sortOrder: 0
    })).toMatchObject({ productId: "product-1", name: "Black", status: "active" });

    expect(normalizeSellableSkuInput({
      variantId: "variant-1",
      sizeId: "size-1",
      sku: "DBR-K24-BLK-M",
      stockQuantity: 12,
      priceAdjustment: 0,
      status: "active",
      sortOrder: 0
    })).toMatchObject({ sizeId: "size-1", stockQuantity: 12 });

    expect(normalizeVariantImageInput({
      variantId: "variant-1",
      imageRole: "front",
      imageUrl: "https://example.com/front.webp"
    })).toMatchObject({ imageRole: "front", objectFit: "cover" });
  });

  it("shows all six workflow stages and becomes ready only for a valid product tree", () => {
    const progress = getProductWorkflowProgress(validSnapshot());
    expect(progress.map((step) => step.label)).toEqual([
      "Informasi Produk",
      "Warna",
      "Ukuran & SKU",
      "Harga & Stok",
      "Gambar",
      "Review & Publish"
    ]);
    expect(progress.at(-1)?.status).toBe("ready");
    expect(validateProductPublishSnapshot(validSnapshot())).toEqual([]);
  });

  it("keeps all active editor writes behind the canonical server route", () => {
    for (const action of ["save_draft", "save_variant", "save_sellable", "save_image", "remove_image", "publish", "archive"]) {
      expect(productRoute).toContain(`\"${action}\"`);
    }
    expect(productRoute).toContain("requirePhase13Actor(request)");
    expect(productRoute).toContain("requireDependencyRole(actor.role)");
    expect(productRoute).toContain("stock_quantity");
    expect(productRoute).toContain("size_id");
    expect(productRoute).toContain('target_ratio: "4:5"');
    expect(productRoute).not.toContain('from("products").delete');
    expect(productUi).not.toContain("createSupabaseClient");
    expect(productUi).not.toContain('.from("products")');
    expect(productUi).not.toContain('.from("product_variants")');
  });

  it("renders a single-route workflow with read-only compatibility and PIM V2 fallback", () => {
    for (const heading of ["Informasi Produk", "Warna", "Ukuran & SKU", "Harga & Stok", "Gambar", "Review & Publish"]) {
      expect(productUi).toContain(heading);
    }
    expect(productUi).toContain("Galeri product-root legacy — read-only compatibility");
    expect(productUi).toContain('href="/admin/pim-v2"');
    expect(productUi).toContain("MODE LIHAT SAJA");
    expect(legacyRoute).toContain("status: 410");
  });

  it("does not introduce a Phase 2 schema migration or a second product table", () => {
    expect(productRoute).toContain('from("products")');
    expect(productRoute).toContain('from("product_variants")');
    expect(productRoute).toContain('from("product_variant_sizes")');
    expect(productRoute).toContain('from("product_variant_images")');
    expect(productRoute).not.toContain("create table");
  });
});
