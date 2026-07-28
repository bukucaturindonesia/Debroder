import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  normalizeReadyStockGarmentSize,
  resolveProvenServiceLevelFallback,
  resolveReadyStockGarmentSizeAdjustment,
  resolveReadyStockPricing
} from "@/lib/pricing-policy";
import { priceCustomProject } from "@/lib/custom-commerce/pricing";
import type {
  CustomCategoryCatalog,
  CustomProject
} from "@/lib/custom-commerce/types";

const migrationPath =
  "supabase/migrations/20260728153142_canonical_trial_pricing_v1.sql";
const migration = readFileSync(migrationPath, "utf8");

describe("Canonical Trial Pricing V1", () => {
  it("locks the 12 canonical product base-price identities without display-name matching", () => {
    const locked = [
      ["DBR-CC24", "cotton-combed-24s", 45_000],
      ["DBR-3600", "3600-soft-tee", 45_000],
      ["DBR-8100", "8100-polo", 60_000],
      ["DBR-72Y00", "72y00-youth", 37_000],
      ["DBR-PULLOVER", "pullover-hooded", 140_000],
      ["DBR-CREWNECK", "crewneck", 100_000],
      ["DBR-BOMBER", "bomber-jacket", 205_000],
      ["DBR-WINDBREAKER", "windbreaker", 185_000],
      ["DBR-ZIPHOOD", "zip-hooded", 150_000],
      ["DBD-HDWR", "6089-premium-classic-snapback", 30_000],
      ["DBR-JRS-FUTSAL", "jersey-futsal-custom", 100_000],
      ["DBR-JRS-FOOTBALL", "jersey-sepak-bola-custom", 130_000]
    ] as const;

    for (const [sku, slug, price] of locked) {
      expect(migration).toContain(`'${slug}', '${sku}', ${price}`);
    }
    expect(migration).toContain("expected 10 existing product identities");
    expect(migration).toContain("expected 12 canonical products");
    expect(migration).not.toMatch(/where\s+(?:name|nama)\s*=/i);
  });

  it("calculates S through XL at base price and NXL by the locked formula", () => {
    const expected = {
      S: 45_000,
      M: 45_000,
      L: 45_000,
      XL: 45_000,
      "2XL": 55_000,
      "3XL": 65_000,
      "4XL": 75_000,
      "5XL": 85_000,
      "6XL": 95_000
    };

    for (const [size, unitPrice] of Object.entries(expected)) {
      const adjustment = resolveReadyStockGarmentSizeAdjustment(size);
      expect(adjustment).not.toBeNull();
      expect(resolveReadyStockPricing({
        quantity: 1,
        pricingQuantity: 1,
        salesMode: "ready_stock",
        pricingMode: "variant_based",
        tierScope: "none",
        productStatus: "active",
        variantStatus: "active",
        variantSizeStatus: "active",
        sizeStatus: "active",
        basePrice: 45_000,
        variantAdjustment: 0,
        variantSizeAdjustment: adjustment ?? -1,
        tiers: []
      })).toMatchObject({ status: "priced", unitPrice });
    }
  });

  it("normalizes aliases to one canonical size identity", () => {
    expect(normalizeReadyStockGarmentSize("XXL")).toBe("2XL");
    expect(normalizeReadyStockGarmentSize("XXXL")).toBe("3XL");
    expect(normalizeReadyStockGarmentSize("XXXXL")).toBe("4XL");
    expect(resolveReadyStockGarmentSizeAdjustment("XXL")).toBe(10_000);
    expect(resolveReadyStockGarmentSizeAdjustment("2XL")).toBe(10_000);
  });

  it("uses the proven unpriced-service fallback without replacing explicit locks", () => {
    expect([0, 1, 2, 3].map(resolveProvenServiceLevelFallback)).toEqual([
      15_000,
      20_000,
      25_000,
      30_000
    ]);
    expect(resolveProvenServiceLevelFallback(-1)).toBeNull();
    expect(migration).toContain("when 'a4' then 20000");
    expect(migration).toContain("when 'a3' then 25000");
    expect(migration).toContain("'sablon-dtf-meteran'");
    expect(migration).toContain("harga_mulai = 30000");
  });

  it("keeps Posisi Desain free and prices complete pairs from Size Desain identity", () => {
    const catalog = customCatalog();
    const onePair = customProject([
      designSelection("selection-front", "placement-front", "size-a4")
    ]);
    const twoPairs = customProject([
      designSelection("selection-front", "placement-front", "size-a4"),
      designSelection("selection-back", "placement-back", "size-a3")
    ]);

    expect(priceCustomProject(onePair, [catalog], "2026-07-28T00:00:00.000Z"))
      .toMatchObject({ status: "final", finalTotal: 65_000 });
    const priced = priceCustomProject(
      twoPairs,
      [catalog],
      "2026-07-28T00:00:00.000Z"
    );
    expect(priced).toMatchObject({ status: "final", finalTotal: 90_000 });
    expect(priced.lines.filter((line) => line.kind === "print_size"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          selectionId: "selection-front",
          placementName: "Depan",
          printSizeName: "A4",
          unitPrice: 20_000
        }),
        expect.objectContaining({
          selectionId: "selection-back",
          placementName: "Belakang",
          printSizeName: "A3",
          unitPrice: 25_000
        })
      ]));
    expect(migration).toContain("price_adjustment = 0");
  });
});

function customCatalog(): CustomCategoryCatalog {
  const size = {
    id: "size-m",
    name: "M",
    slug: "m",
    priceAdjustment: 0,
    status: "active" as const,
    sortOrder: 1
  };
  return {
    category: {
      id: "category-kaos",
      name: "Kaos Polos",
      slug: "kaos-polos",
      shortDescription: null,
      imageUrl: null,
      imageAlt: null,
      entryType: "project_builder",
      targetRoute: null,
      supportsQuickCustom: false,
      supportsFullCustom: true,
      priceDisplayMode: "final",
      minimumOrderDisplay: "Minimum 1 pcs",
      leadTimeDisplay: "Sesuai antrean",
      sourceProductCategoryId: null,
      seoTitle: null,
      seoDescription: null,
      sortOrder: 1,
      updatedAt: "2026-07-28T00:00:00.000Z"
    },
    products: [{
      id: "product-cc24",
      name: "Cotton Combed 24s",
      slug: "cotton-combed-24s",
      productCategoryId: "category-kaos",
      category: null,
      description: "",
      pricingMode: "variant_based",
      tierScope: "none",
      salesMode: "ready_stock",
      basePrice: 45_000,
      status: "active",
      sku: "DBR-CC24",
      variants: [{
        id: "variant-black",
        productId: "product-cc24",
        name: "Black",
        slug: "black",
        hexCode: "#000000",
        sku: "CC24-BLK",
        sortOrder: 1,
        priceAdjustment: 0,
        status: "active",
        isDefault: true,
        sizes: [{
          id: "variant-size-m",
          variantId: "variant-black",
          sizeId: "size-m",
          size,
          sku: "CC24-BLK-M",
          priceAdjustment: 0,
          stockQuantity: 10,
          status: "active"
        }],
        images: []
      }],
      priceTiers: [],
      minimumRule: null
    }],
    presets: [],
    services: [{
      id: "service-dtf",
      name: "Sablon DTF",
      slug: "sablon-dtf",
      description: "",
      status: "active",
      pricingType: "fixed_per_item",
      basePrice: 20_000,
      estimatedMinPrice: null,
      estimatedMaxPrice: null,
      minimumQuantity: 1,
      maximumQuantity: null,
      requiresReview: false,
      requiresUpload: false,
      requiresNotes: false,
      allowedFileTypes: [],
      isStackable: true,
      exclusiveGroup: null,
      sortOrder: 1,
      pricingRules: []
    }],
    placements: [
      placement("placement-front", "Depan", "depan"),
      placement("placement-back", "Belakang", "belakang")
    ],
    printSizes: [
      printSize("size-a4", "A4", "a4", 20_000),
      printSize("size-a3", "A3", "a3", 25_000)
    ],
    compatibility: [{
      id: "compatibility-dtf",
      serviceId: "service-dtf",
      categoryId: "category-kaos",
      productId: null,
      placementId: null,
      printSizeId: null
    }],
    personalizationRules: []
  };
}

function placement(id: string, name: string, slug: string) {
  return {
    id,
    categoryId: "category-kaos",
    name,
    slug,
    description: null,
    priceAdjustment: 0,
    sortOrder: 1
  };
}

function printSize(
  id: string,
  name: string,
  slug: string,
  priceAdjustment: number
) {
  return {
    id,
    categoryId: "category-kaos",
    name,
    slug,
    description: null,
    widthMm: null,
    heightMm: null,
    priceAdjustment,
    sortOrder: 1
  };
}

function designSelection(
  id: string,
  placementId: string,
  printSizeId: string
) {
  return {
    id,
    serviceId: "service-dtf",
    placementId,
    printSizeId,
    note: "",
    uploadIds: []
  };
}

function customProject(
  services: ReturnType<typeof designSelection>[]
): CustomProject {
  return {
    version: 1,
    id: "project-custom-pricing",
    mode: "free",
    presetId: null,
    categoryId: "category-kaos",
    categoryName: "Kaos Polos",
    categorySlug: "kaos-polos",
    sessionToken: "session-token-canonical-pricing",
    items: [{
      id: "item-custom-pricing",
      categoryId: "category-kaos",
      categoryName: "Kaos Polos",
      categorySlug: "kaos-polos",
      productId: "product-cc24",
      productName: "Cotton Combed 24s",
      productSlug: "cotton-combed-24s",
      allocations: [{
        id: "allocation-m",
        variantId: "variant-black",
        variantName: "Black",
        variantSizeId: "variant-size-m",
        sizeName: "M",
        colorHex: "#000000",
        sku: "CC24-BLK-M",
        quantity: 1,
        designPackageId: "design-package"
      }],
      designPackages: [{
        id: "design-package",
        name: "Desain",
        services
      }],
      personalization: {
        ruleId: null,
        mode: "same_for_all",
        sharedValue: "",
        entries: []
      },
      uploads: [],
      note: "",
      leadTime: "Sesuai antrean"
    }],
    note: "",
    createdAt: "2026-07-28T00:00:00.000Z",
    updatedAt: "2026-07-28T00:00:00.000Z"
  };
}
