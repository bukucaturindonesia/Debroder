import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { priceCustomProject } from "@/lib/custom-commerce/pricing";
import type { CustomCategoryCatalog, CustomProject } from "@/lib/custom-commerce/types";
import { parseCustomCheckoutProjects, parseCustomProject } from "@/lib/custom-commerce/validation";

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
    expect(pricing.finalTotal).toBe(29000);
    expect(pricing.totalQuantity).toBe(2);
    expect(pricing.issues).toEqual([]);
  });

  it("charges DTF print size once and keeps placement as a separate valid surcharge", () => {
    const value = project();
    value.items[0].allocations[0].quantity = 3;
    const data = catalog();
    data.products[0].basePrice = 45000;
    data.products[0].variants[0].priceAdjustment = 0;
    data.products[0].variants[0].sizes[0].priceAdjustment = 0;
    data.products[0].variants[0].sizes[0].size.priceAdjustment = 0;
    data.services[0].name = "Sablon DTF";
    data.services[0].basePrice = 15000;
    data.placements[0].name = "Belakang";
    data.placements[0].priceAdjustment = 10000;
    data.printSizes[0].name = "A4";
    data.printSizes[0].priceAdjustment = 15000;

    const pricing = priceCustomProject(value, [data]);
    expect(pricing.status).toBe("final");
    expect(pricing.finalTotal).toBe(210000);
    expect(pricing.lines.filter((line) => line.componentType === "method_fee")).toHaveLength(0);
    expect(pricing.lines.find((line) => line.componentType === "print_size")).toMatchObject({ unitPrice: 15000, quantity: 3, subtotal: 45000, calculationBasis: "per_item" });
    expect(pricing.lines.find((line) => line.componentType === "placement")).toMatchObject({ unitPrice: 10000, quantity: 3, subtotal: 30000 });
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

  it("fails closed when the canonical PIM base price is missing", () => {
    const missingPrice = catalog();
    missingPrice.products[0].basePrice = 0;
    const pricing = priceCustomProject(project(), [missingPrice]);
    expect(pricing.finalTotal).toBeNull();
    expect(pricing.issues).toContain("Harga dasar PIM untuk Produk Uji belum valid. Produk tidak dapat diproses.");
  });

  it("keeps the base product quantity matrix canonical and server calculated", () => {
    for (const [quantity, expected] of [[1, 45000], [2, 90000], [10, 450000]] as const) {
      const value = project();
      value.items[0].allocations[0].quantity = quantity;
      value.items[0].allocations[0].designPackageId = null;
      value.items[0].designPackages[0].services = [];
      const products = catalog();
      products.products[0].basePrice = 45000;
      products.products[0].variants[0].priceAdjustment = 0;
      products.products[0].variants[0].sizes[0].priceAdjustment = 0;
      products.products[0].variants[0].sizes[0].size.priceAdjustment = 0;
      const pricing = priceCustomProject(value, [products]);
      expect(pricing.finalTotal).toBe(expected);
      expect(pricing.issues).toEqual([]);
    }
  });

  it("rejects a selected service that is not assigned to any allocation", () => {
    const value = project();
    value.items[0].allocations[0].designPackageId = null;
    const pricing = priceCustomProject(value, [catalog()]);
    expect(pricing.issues[0]).toMatch(/layanan terpilih tetapi belum dialokasikan/);
    expect(pricing.finalTotal).toBeNull();
  });

  it("requires a deterministic active tier or an explicit manual quotation", () => {
    const tiered = catalog();
    tiered.services[0].pricingType = "tiered";
    tiered.services[0].pricingRules = [];
    expect(priceCustomProject(project(), [tiered]).issues[0]).toMatch(/Pricing rule Layanan Uji tidak tersedia/);

    const manual = catalog();
    manual.services[0].pricingType = "manual_quote";
    manual.services[0].basePrice = 0;
    const pricing = priceCustomProject(project(), [manual]);
    expect(pricing.status).toBe("quotation_required");
    expect(pricing.finalTotal).toBeNull();
    expect(pricing.issues).toEqual([]);
    expect(pricing.lines.find((line) => line.kind === "service")).toMatchObject({ serviceId: ids.service, serviceSlug: "layanan-uji", subtotal: null });
  });

  it("drops every browser-provided pricing value from the checkout contract", () => {
    const parsed = parseCustomCheckoutProjects([{ project: project(), pricing: { finalTotal: 1 }, clientPricing: { finalTotal: 1 } }]);
    expect(parsed).toEqual([{ project: project() }]);
    expect(parsed?.[0].clientPricing).toBeUndefined();
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

  it("blocks payment inserts until canonical Custom pricing is final", () => {
    const sql = readFileSync("supabase/migrations/20260718113000_custom_pricing_payment_final_guard.sql", "utf8");
    expect(sql).toContain("coalesce(order_pricing_status, 'final') <> 'final'");
    expect(sql).toContain("before insert on public.order_payments");
    expect(sql).toContain("coalesce(order_total, 0) <= 0");
    expect(sql).not.toMatch(/update\s+public\.orders/i);
    expect(sql).not.toMatch(/delete\s+from/i);
  });

  it("reads Custom services from the immutable order snapshot without presenting pending totals as zero", () => {
    const admin = readFileSync("components/admin/OrderDetailAdmin.tsx", "utf8");
    const confirmation = readFileSync("components/checkout/OrderConfirmationClient.tsx", "utf8");
    const tracking = readFileSync("components/tracking/GuestOrderTracking.tsx", "utf8");
    expect(admin).toContain("custom_project_snapshot");
    expect(admin).toContain("Layanan yang dipilih saat pemesanan");
    expect(admin).toContain("Belum dialokasikan—tidak ikut harga");
    expect(admin).toContain("Pembayaran diblokir sampai harga final");
    expect(confirmation).toContain("Menunggu penetapan harga");
    expect(tracking).toContain("Menunggu penetapan harga");
  });

  it("bootstraps the public Custom Hub from existing CMS/PIM data without fixed business arrays", () => {
    const source = readFileSync("lib/custom-commerce/data.ts", "utf8");
    expect(source).toContain('from("service_categories")');
    expect(source).toContain('listProducts({ allowFallback: false })');
    expect(source).toContain('product.basePrice > 0');
    expect(source).toContain('JERSEY_CONFIGURATOR_ROUTE');
    expect(source).toContain('has_custom_catalog_configuration');
    expect(source).toContain('listFallbackCustomCategories');
    expect(source).not.toMatch(/const\s+(categories|products|services)\s*=\s*\[\s*["']/i);
  });

  it("adds an owner-managed Custom CMS without seeding category names, products, services, or prices", () => {
    const sql = readFileSync("supabase/migrations/20260717173000_custom_commerce_cms_alignment.sql", "utf8");
    const admin = readFileSync("components/admin/CustomCommerceAdmin.tsx", "utf8");
    const navigation = readFileSync("components/admin/layout/admin-navigation.ts", "utf8");

    expect(sql).toContain("sync_custom_catalog_drafts_from_pim");
    expect(sql).toContain("has_custom_catalog_configuration");
    expect(sql).toContain("custom_categories_source_product_category_uidx");
    expect(sql).toContain("'superadmin'");
    expect(sql).toContain("'admin'");
    expect(sql).not.toMatch(/insert into public\.custom_categories\s*\([^)]*\)\s*values/i);
    expect(sql).not.toMatch(/insert into public\.custom_(presets|placements|print_sizes|personalization_rules)\b/i);

    expect(admin).toContain("Sinkronkan Draft dari PIM");
    expect(admin).toContain('from("custom_categories")');
    expect(admin).toContain('from("custom_category_products")');
    expect(admin).toContain('from("custom_presets")');
    expect(admin).toContain('from("custom_service_compatibilities")');
    expect(admin).toContain("Layanan default");
    expect(admin).toContain("service_ids");
    expect(admin).toContain("personalisasi default");
    expect(navigation).toContain('/admin/custom-commerce');
  });

});
