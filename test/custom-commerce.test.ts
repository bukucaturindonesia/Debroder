import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { priceCustomProject } from "@/lib/custom-commerce/pricing";
import type { CustomCategoryCatalog, CustomProject } from "@/lib/custom-commerce/types";
import { parseCustomProject } from "@/lib/custom-commerce/validation";

const ids = {
  category: "10000000-0000-4000-8000-000000000001",
  product: "10000000-0000-4000-8000-000000000002",
  variant: "10000000-0000-4000-8000-000000000003",
  size: "10000000-0000-4000-8000-000000000004",
  variantSize: "10000000-0000-4000-8000-000000000005",
  service: "10000000-0000-4000-8000-000000000006",
  compatibility: "10000000-0000-4000-8000-000000000007",
  placement: "10000000-0000-4000-8000-000000000008",
  printSize: "10000000-0000-4000-8000-000000000009"
};

function project(): CustomProject {
  return {
    version: 1,
    id: "project-0001",
    mode: "free",
    presetId: null,
    categoryId: ids.category,
    categoryName: "Kategori Uji",
    categorySlug: "kategori-uji",
    sessionToken: "a".repeat(64),
    note: "",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z",
    items: [{
      id: "item-0001",
      categoryId: ids.category,
      categoryName: "Kategori Uji",
      categorySlug: "kategori-uji",
      productId: ids.product,
      productName: "Produk Uji",
      productSlug: "produk-uji",
      allocations: [{ id: "allocation-0001", variantId: ids.variant, variantSizeId: ids.variantSize, variantName: "Hitam", colorHex: "#111111", sizeName: "L", sku: "SKU-UJI", quantity: 2, designPackageId: "design-0001" }],
      designPackages: [{ id: "design-0001", name: "Desain 1", services: [{ id: "design-service-0001", serviceId: ids.service, placementId: ids.placement, printSizeId: ids.printSize, note: "Catatan", uploadIds: [] }] }],
      personalization: { ruleId: null, mode: "same_for_all", sharedValue: "", entries: [] },
      uploads: [],
      note: "",
      leadTime: "7–10 hari kerja"
    }]
  };
}

function catalog(): CustomCategoryCatalog {
  return {
    category: { id: ids.category, name: "Kategori Uji", slug: "kategori-uji", shortDescription: null, imageUrl: null, imageAlt: null, entryType: "project_builder", targetRoute: null, supportsQuickCustom: true, supportsFullCustom: true, priceDisplayMode: "final", minimumOrderDisplay: "Minimum 1 pcs", leadTimeDisplay: "7–10 hari kerja", sourceProductCategoryId: null, seoTitle: null, seoDescription: null, sortOrder: 1, updatedAt: null },
    products: [{ id: ids.product, name: "Produk Uji", slug: "produk-uji", productCategoryId: ids.category, category: null, basePrice: 10000, description: null, status: "active", sku: null, priceTiers: [], minimumRule: { id: "10000000-0000-4000-8000-000000000010", productId: ids.product, minimumQuantity: 1, minimumForTierQuantity: null, quotationQuantity: null, status: "active" }, variants: [{ id: ids.variant, productId: ids.product, name: "Hitam", slug: "hitam", hexCode: "#111111", sku: "VAR-UJI", sortOrder: 1, isDefault: true, status: "active", priceAdjustment: 1000, images: [], sizes: [{ id: ids.variantSize, variantId: ids.variant, sizeId: ids.size, sku: "SKU-UJI", stockQuantity: 0, priceAdjustment: 0, status: "active", size: { id: ids.size, name: "L", slug: "l", sortOrder: 1, status: "active", priceAdjustment: 2000 } }] }] }],
    presets: [],
    services: [{ id: ids.service, slug: "layanan-uji", name: "Layanan Uji", description: null, status: "active", pricingType: "fixed_per_item", basePrice: 5000, estimatedMinPrice: null, estimatedMaxPrice: null, minimumQuantity: 1, maximumQuantity: null, requiresUpload: false, requiresNotes: true, requiresReview: false, allowedFileTypes: ["png"], isStackable: true, exclusiveGroup: null, sortOrder: 1, pricingRules: [] }],
    placements: [{ id: ids.placement, categoryId: ids.category, name: "Dada", slug: "dada", description: null, priceAdjustment: 1000, sortOrder: 1 }],
    printSizes: [{ id: ids.printSize, categoryId: ids.category, name: "Kecil", slug: "kecil", description: null, widthMm: 100, heightMm: 100, priceAdjustment: 500, sortOrder: 1 }],
    compatibility: [{ id: ids.compatibility, serviceId: ids.service, categoryId: ids.category, productId: ids.product, placementId: ids.placement, printSizeId: ids.printSize }],
    personalizationRules: []
  };
}

describe("Custom Commerce", () => {
  it("prices every actual variant, service, placement, and print-size combination", () => {
    const pricing = priceCustomProject(project(), [catalog()], "2026-07-17T01:00:00.000Z");
    expect(pricing.status).toBe("final");
    expect(pricing.finalTotal).toBe(39000);
    expect(pricing.totalQuantity).toBe(2);
    expect(pricing.issues).toEqual([]);
  });

  it("rejects duplicate allocation identities and unbalanced personalization input", () => {
    const value = project();
    value.items[0].allocations.push({ ...value.items[0].allocations[0] });
    expect(parseCustomProject(value)).toBeNull();

    const personalized = project();
    personalized.items[0].personalization = { ruleId: "10000000-0000-4000-8000-000000000011", mode: "per_item", sharedValue: "", entries: ["Satu"] };
    const rules = catalog();
    rules.personalizationRules = [{ id: "10000000-0000-4000-8000-000000000011", categoryId: ids.category, name: "Nama", slug: "nama", pricingType: "fixed_per_item", unitPrice: 1000, flatPrice: null, estimatedMinPrice: null, estimatedMaxPrice: null, quoteRequired: false, sortOrder: 1 }];
    expect(priceCustomProject(personalized, [rules]).issues[0]).toMatch(/harus berjumlah 2/);
  });

  it("keeps the migration data-driven, RLS protected, atomic, and service-role only", () => {
    const sql = readFileSync("supabase/migrations/20260717160000_custom_commerce_foundation.sql", "utf8");
    expect(sql).toContain("create table if not exists public.custom_categories");
    expect(sql).toContain("custom_project_snapshot jsonb");
    expect(sql).toContain("security definer");
    expect(sql).toContain("revoke all on function public.create_public_custom_checkout_order");
    expect(sql).toContain("grant execute on function public.create_public_custom_checkout_order");
    expect(sql).not.toMatch(/insert into public\.custom_(categories|presets|placements|print_sizes|personalization_rules)/i);
  });
});
