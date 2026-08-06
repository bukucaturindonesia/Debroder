import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  changeCustomDesignPairPlacement,
  compatibleCustomPrintSizes,
  findCustomDesignPairPricingLine,
  removeCustomDesignPackageFromItem,
  removeCustomDesignPairFromItem
} from "@/lib/custom-commerce/design-pairs";
import { priceCustomProject, toPublicCustomPricing } from "@/lib/custom-commerce/pricing";
import type { CustomCategoryCatalog, CustomProject } from "@/lib/custom-commerce/types";
import { parsePublicCheckoutRequest } from "@/lib/commerce-checkout";
import {
  customCheckoutDesignPairIssue,
  parseCustomCheckoutProjects,
  parseCustomProject,
  parseCustomProjectDraft
} from "@/lib/custom-commerce/validation";

const ids = {
  category: "10000000-0000-4000-8000-000000000001",
  product: "10000000-0000-4000-8000-000000000002",
  variant: "10000000-0000-4000-8000-000000000003",
  size: "10000000-0000-4000-8000-000000000004",
  variantSize: "10000000-0000-4000-8000-000000000005",
  service: "10000000-0000-4000-8000-000000000006",
  placementFront: "10000000-0000-4000-8000-000000000007",
  placementBack: "10000000-0000-4000-8000-000000000008",
  placementSleeve: "10000000-0000-4000-8000-000000000009",
  printA3: "10000000-0000-4000-8000-000000000011",
  printA4: "10000000-0000-4000-8000-000000000012",
  printA5: "10000000-0000-4000-8000-000000000013"
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
      designPackages: [{ id: "design-0001", name: "Desain 1", services: [{ id: "design-service-0001", serviceId: ids.service, placementId: ids.placementFront, printSizeId: ids.printA3, note: "Catatan", uploadIds: [] }] }],
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
    products: [{ id: ids.product, name: "Produk Uji", slug: "produk-uji", productCategoryId: ids.category, category: null, basePrice: 10000, description: null, status: "active", sku: null, priceTiers: [], minimumRule: { id: "10000000-0000-4000-8000-000000000010", productId: ids.product, minimumQuantity: 1, minimumForTierQuantity: null, quotationQuantity: null, status: "active" }, variants: [{ id: ids.variant, productId: ids.product, name: "Hitam", slug: "hitam", hexCode: "#111111", sku: "VAR-UJI", sortOrder: 1, isDefault: true, status: "active", priceAdjustment: 1000, images: [], sizes: [{ id: ids.variantSize, variantId: ids.variant, sizeId: ids.size, sku: "SKU-UJI", stockQuantity: 0, priceAdjustment: 2000, status: "active", size: { id: ids.size, name: "L", slug: "l", sortOrder: 1, status: "active", priceAdjustment: 0 } }] }] }],
    presets: [],
    services: [{ id: ids.service, slug: "sablon-dtf", name: "Sablon DTF", description: null, status: "active", pricingType: "fixed_per_item", basePrice: 5000, estimatedMinPrice: null, estimatedMaxPrice: null, minimumQuantity: 1, maximumQuantity: null, requiresUpload: false, requiresNotes: true, requiresReview: false, allowedFileTypes: ["png"], isStackable: true, exclusiveGroup: null, sortOrder: 1, pricingRules: [] }],
    placements: [
      { id: ids.placementFront, categoryId: ids.category, name: "Depan", slug: "depan", description: null, priceAdjustment: 10000, sortOrder: 1 },
      { id: ids.placementBack, categoryId: ids.category, name: "Belakang", slug: "belakang", description: null, priceAdjustment: 20000, sortOrder: 2 },
      { id: ids.placementSleeve, categoryId: ids.category, name: "Lengan Kiri", slug: "lengan-kiri", description: null, priceAdjustment: 30000, sortOrder: 3 }
    ],
    printSizes: [
      { id: ids.printA3, categoryId: ids.category, name: "A3", slug: "a3", description: null, widthMm: 297, heightMm: 420, priceAdjustment: 500, sortOrder: 1 },
      { id: ids.printA4, categoryId: ids.category, name: "A4", slug: "a4", description: null, widthMm: 210, heightMm: 297, priceAdjustment: 750, sortOrder: 2 },
      { id: ids.printA5, categoryId: ids.category, name: "A5", slug: "a5", description: null, widthMm: 148, heightMm: 210, priceAdjustment: 250, sortOrder: 3 }
    ],
    compatibility: [
      { id: "20000000-0000-4000-8000-000000000001", serviceId: ids.service, categoryId: ids.category, productId: ids.product, placementId: ids.placementFront, printSizeId: ids.printA3 },
      { id: "20000000-0000-4000-8000-000000000002", serviceId: ids.service, categoryId: ids.category, productId: ids.product, placementId: ids.placementFront, printSizeId: ids.printA4 },
      { id: "20000000-0000-4000-8000-000000000003", serviceId: ids.service, categoryId: ids.category, productId: ids.product, placementId: ids.placementBack, printSizeId: ids.printA3 },
      { id: "20000000-0000-4000-8000-000000000004", serviceId: ids.service, categoryId: ids.category, productId: ids.product, placementId: ids.placementBack, printSizeId: ids.printA4 },
      { id: "20000000-0000-4000-8000-000000000005", serviceId: ids.service, categoryId: ids.category, productId: ids.product, placementId: ids.placementSleeve, printSizeId: ids.printA5 }
    ],
    personalizationRules: []
  };
}

function addPair(value: CustomProject, input: { id: string; placementId: string | null; printSizeId: string | null }) {
  value.items[0].designPackages[0].services.push({
    id: input.id,
    serviceId: ids.service,
    placementId: input.placementId,
    printSizeId: input.printSizeId,
    note: "Catatan",
    uploadIds: []
  });
}

function checkoutPayload(value: CustomProject) {
  return {
    idempotencyKey: "checkout-custom-design-pair-0001",
    accessToken: "a".repeat(64),
    customer: { name: "Pelanggan Uji", phone: "081234567890" },
    fulfillment: {
      method: "pickup",
      pickupLocationId: "30000000-0000-4000-8000-000000000001",
      paymentMethod: "bank_transfer"
    },
    items: [],
    customProjects: [{ project: value }]
  };
}

describe("Custom T-Shirt configuration integrity", () => {
  it("prices one complete pair using only the canonical Size Desain adjustment", () => {
    const pricing = priceCustomProject(project(), [catalog()], "2026-07-17T01:00:00.000Z");
    expect(pricing.status).toBe("final");
    expect(pricing.finalTotal).toBe(27000);
    expect(pricing.totalQuantity).toBe(2);
    expect(pricing.issues).toEqual([]);
    expect(pricing.lines.filter((line) => line.componentType === "placement")).toHaveLength(0);
    expect(pricing.lines.filter((line) => line.componentType === "method_fee")).toHaveLength(0);
    expect(pricing.lines.find((line) => line.key === "print-size:design-service-0001")).toMatchObject({
      selectionId: "design-service-0001",
      placementName: "Depan",
      printSizeName: "A3",
      unitPrice: 500,
      quantity: 2,
      subtotal: 1000
    });
  });

  it("ignores every position adjustment and never emits a position pricing line", () => {
    const data = catalog();
    data.placements[0].priceAdjustment = 999999;
    const pricing = priceCustomProject(project(), [data]);
    expect(pricing.finalTotal).toBe(27000);
    expect(pricing.lines.some((line) => line.kind === "placement")).toBe(false);
  });

  it("rejects final submission without a complete pair while preserving editable drafts", () => {
    const value = project();
    value.items[0].designPackages[0].services = [];
    expect(parseCustomProjectDraft(value)).not.toBeNull();
    expect(parseCustomProject(value)).toBeNull();
    expect(priceCustomProject(value, [catalog()]).issues).toContain("Pilih minimal satu Posisi Desain dan Size Desain.");
  });

  it("rejects position-only and Size-Desain-only canonical states", () => {
    const positionOnly = project();
    positionOnly.items[0].designPackages[0].services[0].printSizeId = null;
    expect(parseCustomProjectDraft(positionOnly)).not.toBeNull();
    expect(parseCustomProject(positionOnly)).toBeNull();
    expect(priceCustomProject(positionOnly, [catalog()]).issues).toContain("Pilih Size Desain untuk posisi Depan.");

    const sizeOnly = project();
    sizeOnly.items[0].designPackages[0].services[0].placementId = null;
    expect(parseCustomProjectDraft(sizeOnly)).not.toBeNull();
    expect(parseCustomProject(sizeOnly)).toBeNull();
    expect(priceCustomProject(sizeOnly, [catalog()]).issues).toContain("Pilih Posisi Desain untuk Size Desain A3.");
  });

  it("rejects an incompatible pair", () => {
    const value = project();
    value.items[0].designPackages[0].services[0].placementId = ids.placementSleeve;
    value.items[0].designPackages[0].services[0].printSizeId = ids.printA3;
    expect(parseCustomProject(value)).not.toBeNull();
    expect(priceCustomProject(value, [catalog()]).issues).toContain("Size Desain A3 tidak kompatibel dengan posisi Lengan Kiri.");
  });

  it("preserves a compatible Size Desain and clears an incompatible one after position change", () => {
    const data = catalog();
    const selection = project().items[0].designPackages[0].services[0];
    const preserved = changeCustomDesignPairPlacement(selection, ids.placementBack, data, ids.product, ids.category);
    expect(preserved).toMatchObject({ placementId: ids.placementBack, printSizeId: ids.printA3 });

    const sleeve = changeCustomDesignPairPlacement(selection, ids.placementSleeve, data, ids.product, ids.category);
    expect(sleeve).toMatchObject({ placementId: ids.placementSleeve, printSizeId: null });
    expect(compatibleCustomPrintSizes(data, ids.service, ids.product, ids.category, ids.placementSleeve).map((size) => size.id)).toEqual([ids.printA5]);
  });

  it("uses explicit position and Size Desain mappings instead of a wildcard cross-product", () => {
    const data = catalog();
    data.compatibility.unshift({
      id: "20000000-0000-4000-8000-000000000099",
      serviceId: ids.service,
      categoryId: ids.category,
      productId: ids.product,
      placementId: null,
      printSizeId: null
    });
    expect(compatibleCustomPrintSizes(
      data,
      ids.service,
      ids.product,
      ids.category,
      ids.placementSleeve
    ).map((size) => size.id)).toEqual([ids.printA5]);
  });

  it("intersects separate position and Size Desain constraints without opening extra options", () => {
    const data = catalog();
    data.compatibility = [
      {
        id: "20000000-0000-4000-8000-000000000010",
        serviceId: ids.service,
        categoryId: ids.category,
        productId: ids.product,
        placementId: ids.placementFront,
        printSizeId: null
      },
      {
        id: "20000000-0000-4000-8000-000000000011",
        serviceId: ids.service,
        categoryId: ids.category,
        productId: ids.product,
        placementId: null,
        printSizeId: ids.printA3
      }
    ];

    expect(compatibleCustomPrintSizes(
      data,
      ids.service,
      ids.product,
      ids.category,
      ids.placementFront
    ).map((size) => size.id)).toEqual([ids.printA3]);
    expect(compatibleCustomPrintSizes(
      data,
      ids.service,
      ids.product,
      ids.category,
      ids.placementBack
    )).toEqual([]);
  });

  it("removes one pair and its local upload association atomically", () => {
    const value = project();
    const uploadId = "40000000-0000-4000-8000-000000000001";
    value.items[0].designPackages[0].services[0].uploadIds = [uploadId];
    value.items[0].uploads = [{
      id: uploadId,
      file_name: "desain.png",
      storage_path: "customer/design.png",
      mime_type: "image/png",
      file_size: 100,
      status: "uploaded",
      design_version: 1,
      design_stage: "customer_upload",
      replaces_upload_id: null,
      version_note: null
    }];
    const next = removeCustomDesignPairFromItem(value.items[0], "design-0001", "design-service-0001");
    expect(next.designPackages[0].services).toEqual([]);
    expect(next.uploads).toEqual([]);
  });

  it("removes every pair association when an entire Design Package is deleted", () => {
    const value = project();
    const uploadId = "40000000-0000-4000-8000-000000000002";
    value.items[0].designPackages.push({
      id: "design-0002",
      name: "Desain 2",
      services: [{
        id: "design-service-0002",
        serviceId: ids.service,
        placementId: ids.placementBack,
        printSizeId: ids.printA4,
        note: "Catatan",
        uploadIds: [uploadId]
      }]
    });
    value.items[0].allocations[0].designPackageId = "design-0002";
    value.items[0].uploads = [{
      id: uploadId,
      file_name: "belakang.png",
      storage_path: "customer/belakang.png",
      mime_type: "image/png",
      file_size: 100,
      status: "uploaded",
      design_version: 1,
      design_stage: "customer_upload",
      replaces_upload_id: null,
      version_note: null
    }];
    const next = removeCustomDesignPackageFromItem(value.items[0], "design-0002");
    expect(next.designPackages.map((designPackage) => designPackage.id)).toEqual(["design-0001"]);
    expect(next.allocations[0].designPackageId).toBeNull();
    expect(next.uploads).toEqual([]);
  });

  it("accepts the same service for multiple positions and sums each Size Desain adjustment", () => {
    const value = project();
    value.items[0].allocations[0].quantity = 3;
    addPair(value, { id: "design-service-0002", placementId: ids.placementBack, printSizeId: ids.printA4 });
    const data = catalog();
    data.products[0].basePrice = 45000;
    data.products[0].variants[0].priceAdjustment = 0;
    data.products[0].variants[0].sizes[0].priceAdjustment = 0;
    data.printSizes.find((size) => size.id === ids.printA3)!.priceAdjustment = 15000;
    data.printSizes.find((size) => size.id === ids.printA4)!.priceAdjustment = 7000;

    const pricing = priceCustomProject(value, [data]);
    expect(pricing.status).toBe("final");
    expect(pricing.issues).toEqual([]);
    expect(pricing.finalTotal).toBe(201000);
    expect(pricing.lines.filter((line) => line.kind === "print_size")).toHaveLength(2);
    expect(pricing.lines.filter((line) => line.serviceId === ids.service)).toEqual(expect.arrayContaining([
      expect.objectContaining({ selectionId: "design-service-0001", placementName: "Depan", printSizeName: "A3", subtotal: 45000 }),
      expect.objectContaining({ selectionId: "design-service-0002", placementName: "Belakang", printSizeName: "A4", subtotal: 21000 })
    ]));
  });

  it("binds every summary line to unique selection identity", () => {
    const value = project();
    addPair(value, { id: "design-service-0002", placementId: ids.placementBack, printSizeId: ids.printA4 });
    const pricing = priceCustomProject(value, [catalog()]);
    const first = findCustomDesignPairPricingLine(pricing.lines, value.items[0].designPackages[0].services[0]);
    const second = findCustomDesignPairPricingLine(pricing.lines, value.items[0].designPackages[0].services[1]);
    expect(first?.selectionId).toBe("design-service-0001");
    expect(first?.placementName).toBe("Depan");
    expect(second?.selectionId).toBe("design-service-0002");
    expect(second?.placementName).toBe("Belakang");
  });

  it("rejects a duplicate position even when the Size Desain differs", () => {
    const value = project();
    addPair(value, { id: "design-service-0002", placementId: ids.placementFront, printSizeId: ids.printA4 });
    expect(parseCustomProject(value)).toBeNull();
    expect(priceCustomProject(value, [catalog()]).issues).toContain("Posisi Desain pada Produk Uji terduplikasi.");
  });

  it("allows the same position in a different Custom Project Item", () => {
    const value = project();
    value.items.push({
      ...structuredClone(value.items[0]),
      id: "item-0002",
      allocations: [{ ...value.items[0].allocations[0], id: "allocation-0002" }],
      designPackages: [{
        ...value.items[0].designPackages[0],
        id: "design-0002",
        services: [{ ...value.items[0].designPackages[0].services[0], id: "design-service-0002" }]
      }]
    });
    value.items[1].allocations[0].designPackageId = "design-0002";
    expect(parseCustomProject(value)).not.toBeNull();
  });

  it("rejects a selection identity collision across different product items", () => {
    const value = project();
    const second = structuredClone(value.items[0]);
    second.id = "item-0002";
    second.productName = "Produk Uji Kedua";
    second.allocations[0].id = "allocation-0002";
    second.allocations[0].designPackageId = "design-0002";
    second.designPackages[0].id = "design-0002";
    second.designPackages[0].services[0].placementId = ids.placementBack;
    second.designPackages[0].services[0].printSizeId = ids.printA4;
    value.items.push(second);

    expect(parseCustomProjectDraft(value)).toBeNull();
    expect(parseCustomProject(value)).toBeNull();
  });

  it("rejects partial and duplicate pairs at the public checkout parser", () => {
    const valid = project();
    expect(parsePublicCheckoutRequest(checkoutPayload(valid))?.customProjects).toHaveLength(1);

    const partial = project();
    partial.items[0].designPackages[0].services[0].printSizeId = null;
    expect(customCheckoutDesignPairIssue(checkoutPayload(partial).customProjects)).toBe("Posisi Desain dan Size Desain pada Produk Uji belum lengkap.");
    expect(parsePublicCheckoutRequest(checkoutPayload(partial))).toBeNull();

    const duplicate = project();
    addPair(duplicate, { id: "design-service-0002", placementId: ids.placementFront, printSizeId: ids.printA4 });
    expect(customCheckoutDesignPairIssue(checkoutPayload(duplicate).customProjects)).toBe("Posisi Desain pada Produk Uji terduplikasi.");
    expect(parsePublicCheckoutRequest(checkoutPayload(duplicate))).toBeNull();
  });

  it("drops every browser-provided pricing value from the checkout contract", () => {
    const parsed = parseCustomCheckoutProjects([{ project: project(), pricing: { finalTotal: 1 }, clientPricing: { finalTotal: 1 } }]);
    expect(parsed).toEqual([{ project: project() }]);
    expect(parsed?.[0].clientPricing).toBeUndefined();
  });

  it("strips client-provided design pricing fields before canonical server pricing", () => {
    const value = project() as CustomProject & {
      items: Array<CustomProject["items"][number] & {
        designPackages: Array<CustomProject["items"][number]["designPackages"][number] & {
          services: Array<CustomProject["items"][number]["designPackages"][number]["services"][number] & Record<string, unknown>>;
        }>;
      }>;
    };
    const selection = value.items[0].designPackages[0].services[0];
    selection.positionAdjustment = 900_000;
    selection.designSizeAdjustment = 800_000;
    selection.subtotal = 700_000;
    selection.total = 600_000;

    const parsed = parseCustomProject(value);
    expect(parsed).not.toBeNull();
    expect(parsed?.items[0].designPackages[0].services[0]).not.toHaveProperty("positionAdjustment");
    expect(parsed?.items[0].designPackages[0].services[0]).not.toHaveProperty("designSizeAdjustment");
    expect(priceCustomProject(parsed!, [catalog()]).finalTotal).toBe(27000);
  });

  it("keeps base-product tier pricing server calculated while Size Desain adjustment is zero", () => {
    for (const [quantity, expected] of [[1, 45000], [2, 90000], [10, 450000]] as const) {
      const value = project();
      value.items[0].allocations[0].quantity = quantity;
      const products = catalog();
      products.products[0].basePrice = 45000;
      products.products[0].variants[0].priceAdjustment = 0;
      products.products[0].variants[0].sizes[0].priceAdjustment = 0;
      products.printSizes[0].priceAdjustment = 0;
      const pricing = priceCustomProject(value, [products]);
      expect(pricing.finalTotal).toBe(expected);
      expect(pricing.issues).toEqual([]);
      expect(pricing.lines.find((line) => line.kind === "print_size")).toMatchObject({ unitPrice: 0, subtotal: 0 });
    }
  });

  it("requires an active tier and represents manual quotation as a Size Desain line", () => {
    const tiered = catalog();
    tiered.services[0].pricingType = "tiered";
    tiered.services[0].pricingRules = [];
    expect(priceCustomProject(project(), [tiered]).issues).toContain("Pricing rule Sablon DTF tidak tersedia untuk 2 pcs.");

    const manual = catalog();
    manual.services[0].pricingType = "manual_quote";
    manual.services[0].basePrice = 0;
    const pricing = priceCustomProject(project(), [manual]);
    expect(pricing.status).toBe("quotation_required");
    expect(pricing.finalTotal).toBeNull();
    expect(pricing.issues).toEqual([]);
    expect(pricing.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "print_size", selectionId: "design-service-0001", serviceId: ids.service, subtotal: null, calculationBasis: "quotation" })
    ]));
  });

  it("converts historical estimated rules into order-first pricing without public nominal values", () => {
    const estimated = catalog();
    estimated.services[0].pricingType = "estimated";
    estimated.services[0].estimatedMinPrice = 5000;
    estimated.services[0].estimatedMaxPrice = 9000;
    const publicPricing = toPublicCustomPricing(priceCustomProject(project(), [estimated]));
    expect(publicPricing.status).toBe("quotation_required");
    expect(publicPricing.finalTotal).toBeNull();
    expect(publicPricing.estimatedMinTotal).toBeNull();
    expect(publicPricing.estimatedMaxTotal).toBeNull();
    expect(publicPricing.issues).toEqual([]);
    expect(publicPricing.lines.every((line) => line.unitPrice === null && line.subtotal === null)).toBe(true);
  });

  it("uses the locked public terminology and selection identity in customer/admin consumers", () => {
    const sources = [
      readFileSync("components/custom/CustomProjectBuilder.tsx", "utf8"),
      readFileSync("components/CartProvider.tsx", "utf8"),
      readFileSync("components/checkout/CheckoutClient.tsx", "utf8"),
      readFileSync("components/checkout/OrderConfirmationClient.tsx", "utf8"),
      readFileSync("components/admin/CustomCommerceAdmin.tsx", "utf8"),
      readFileSync("components/admin/OrderDetailAdmin.tsx", "utf8"),
      readFileSync("components/admin/CustomOrderOperationalWorkspace.tsx", "utf8"),
      readFileSync("components/admin/FulfillmentDetailAdmin.tsx", "utf8")
    ].join("\n");
    expect(sources).toContain("Posisi Desain + Size Desain");
    expect(sources).toContain("Size Desain");
    expect(sources).not.toMatch(/label="Placement"|Ukuran cetak|Ukuran Desain|Print Size/);
    expect(readFileSync("components/admin/OrderDetailAdmin.tsx", "utf8")).toContain("line.selectionId === selection.id");
    expect(readFileSync("components/custom/CustomProjectBuilder.tsx", "utf8")).toContain("removeCustomDesignPairFromItem");
    const customAdmin = readFileSync("components/admin/CustomCommerceAdmin.tsx", "utf8");
    expect(customAdmin).toContain('price_adjustment: 0');
    expect(customAdmin).toContain('title="Posisi Desain"');
  });
});

describe("Custom Commerce governance preservation", () => {
  it("rejects duplicate allocation identities and unbalanced personalization input", () => {
    const value = project();
    value.items[0].allocations.push({ ...value.items[0].allocations[0] });
    expect(parseCustomProject(value)).toBeNull();

    const personalized = project();
    personalized.items[0].personalization = { ruleId: "10000000-0000-4000-8000-000000000014", mode: "per_item", sharedValue: "", entries: ["Satu"] };
    const rules = catalog();
    rules.personalizationRules = [{ id: "10000000-0000-4000-8000-000000000014", categoryId: ids.category, name: "Nama", slug: "nama", pricingType: "fixed_per_item", unitPrice: 1000, flatPrice: null, estimatedMinPrice: null, estimatedMaxPrice: null, quoteRequired: false, sortOrder: 1 }];
    expect(priceCustomProject(personalized, [rules]).issues).toContain("Personalisasi per item Produk Uji harus berjumlah 2.");
  });

  it("fails closed when the canonical PIM base price is missing", () => {
    const missingPrice = catalog();
    missingPrice.products[0].basePrice = 0;
    const pricing = priceCustomProject(project(), [missingPrice]);
    expect(pricing.finalTotal).toBeNull();
    expect(pricing.issues).toContain("Harga dasar PIM untuk Produk Uji belum valid. Produk tidak dapat diproses.");
  });

  it("rejects a selected design package that is not assigned to any allocation", () => {
    const value = project();
    value.items[0].allocations[0].designPackageId = null;
    const pricing = priceCustomProject(value, [catalog()]);
    expect(pricing.issues.some((issue) => /layanan terpilih tetapi belum dialokasikan/.test(issue))).toBe(true);
    expect(pricing.finalTotal).toBeNull();
  });

  it("keeps historical migrations, RLS, payment guard, and immutable snapshots untouched", () => {
    const foundation = readFileSync("supabase/migrations/20260717160000_custom_commerce_foundation.sql", "utf8");
    expect(foundation).toContain("custom_project_snapshot jsonb");
    expect(foundation).toContain("security definer");
    expect(foundation).toContain("revoke all on function public.create_public_custom_checkout_order");
    expect(foundation).not.toMatch(/insert into public\.custom_(categories|presets|placements|print_sizes|personalization_rules)/i);

    const payment = readFileSync("supabase/migrations/20260718113000_custom_pricing_payment_final_guard.sql", "utf8");
    expect(payment).toContain("coalesce(order_pricing_status, 'final') <> 'final'");
    expect(payment).toContain("before insert on public.order_payments");
    expect(payment).toContain("coalesce(order_total, 0) <= 0");
    expect(payment).not.toMatch(/update\s+public\.orders/i);
  });

  it("keeps the owner-managed Custom CMS data-driven", () => {
    const source = readFileSync("lib/custom-commerce/data.ts", "utf8");
    expect(source).toContain('from("service_categories")');
    expect(source).toContain('listProducts({ allowFallback: false })');
    expect(source).toContain('JERSEY_CONFIGURATOR_ROUTE');
    expect(source).toContain("priceAdjustment: 0");
    expect(source).not.toMatch(/const\s+(categories|products|services)\s*=\s*\[\s*["']/i);
  });
});
