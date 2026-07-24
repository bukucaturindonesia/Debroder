import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCatalogPageModel } from "@/lib/catalog-page/domain";
import { loadCatalogPageModel } from "@/lib/catalog-page/use-case";
import { buildProductDetailPageModel } from "@/lib/product-detail-page/domain";
import { loadProductDetailPageModel } from "@/lib/product-detail-page/use-case";
import type { ProductReadSource, ProductRow } from "@/lib/product-read/source";

function productRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "product-1",
    name: "Kaos Polos",
    nama: "Kaos Polos",
    kategori: "Kaos Polos",
    deskripsi: "Kaos polos untuk Ready Stock.",
    short_detail: "Cotton combed",
    description: "Kaos polos untuk kebutuhan harian.",
    subcategory: "Cotton Combed",
    compare_price: null,
    specifications: ["Bahan: Cotton Combed"],
    gallery_urls: [],
    label_new: true,
    label_promo: false,
    label_best_seller: false,
    seo_title: null,
    seo_description: null,
    og_image_url: null,
    canonical_url: null,
    focal_x: 50,
    focal_y: 50,
    focal_zoom: 1,
    target_ratio: "4:5",
    focal_points: null,
    sales_count: 2,
    badge: "",
    gambar_url: "/product.webp",
    image_url: "/product.webp",
    image_alt: "Kaos Polos",
    collection_tags: [],
    intent_tags: ["kaos-polos"],
    color_tags: ["Hitam"],
    size_tags: ["S", "M"],
    size_chart: [],
    bulk_order_note: null,
    material_tags: ["Cotton"],
    brand: "DEBRODER",
    object_fit: "cover",
    object_position: "center center",
    whatsapp_link: "https://wa.me/620000000000",
    link_url: "/produk/kaos-polos",
    price: 45000,
    harga: 45000,
    base_price: 45000,
    price_label: null,
    slug: "kaos-polos",
    stock: 10,
    product_category_id: "category-1",
    product_subcategory_id: null,
    size_guide_id: null,
    product_type: "standard_product",
    pricing_mode: "fixed_price",
    sku: "KP",
    has_variants: false,
    uses_configurator: false,
    minimum_order_qty: 1,
    urutan: 1,
    status: "active",
    status_aktif: true,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

function productSource(rows: ProductRow[]): ProductReadSource {
  return {
    products: { status: rows.length ? "ready" : "empty", data: rows },
    variants: { status: "empty", data: [] },
    variantSizes: { status: "empty", data: [] },
    variantImages: { status: "empty", data: [] },
    sizeGuides: { status: "empty", data: [] }
  };
}

describe("P4 category page isolation", () => {
  it("projects focused source data into a typed category page model", () => {
    const model = buildCatalogPageModel({
      routeKey: "kaos-polos",
      status: "ready",
      hero: null,
      category: { id: "category-1", name: "Kaos Polos", slug: "kaos-polos", is_active: true, sort_order: 1 },
      productSource: productSource([productRow()]),
      customDestination: "/custom/kaos"
    }, {
      routeKey: "kaos-polos",
      searchParams: { color: "Hitam", label: "new", sort: "price-low" }
    });

    expect(model.data.state).toBe("ready");
    expect(model.data.products).toHaveLength(1);
    expect(model.data.products[0]?.nama).toBe("Kaos Polos");
    expect(model.data.filters).toMatchObject({ color: "hitam", label: "new", sort: "price-low" });
    expect(model.data.journeyAvailability.readyStock).toBe(true);
    expect(model.data.customDestination).toBe("/custom/kaos");
  });

  it("fails closed into an unavailable model when the read use case throws", async () => {
    const model = await loadCatalogPageModel({ routeKey: "kaos-polos" }, async () => {
      throw new Error("database unavailable");
    });
    expect(model.data.state).toBe("unavailable");
    expect(model.data.products).toEqual([]);
  });
});

describe("P4 product detail isolation", () => {
  it("projects product, trust-critical information, and Ready Stock journey state", () => {
    const model = buildProductDetailPageModel("kaos-polos", {
      status: "ready",
      productSource: productSource([productRow()]),
      relatedSource: productSource([productRow({ id: "product-2", slug: "kaos-lain", nama: "Kaos Lain" })]),
      contact: { whatsapp_link: "https://wa.me/620000000000", whatsapp_utama: null },
      customDestination: "/custom/kaos?product=product-1"
    });

    expect(model.data.state).toBe("ready");
    expect(model.data.product?.nama).toBe("Kaos Polos");
    expect(model.data.priceLabel).toContain("45");
    expect(model.data.relatedProducts).toHaveLength(1);
    expect(model.data.journey).toEqual({ mode: "ready_stock", readyStock: true, custom: false });
    expect(model.metadata.canonicalPath).toBe("/produk/kaos-polos");
  });

  it("keeps not-found distinct from infrastructure failure", async () => {
    const notFound = buildProductDetailPageModel("missing", {
      status: "not_found",
      productSource: productSource([]),
      relatedSource: productSource([]),
      contact: null,
      customDestination: null
    });
    expect(notFound.data.state).toBe("not_found");

    const unavailable = await loadProductDetailPageModel("missing", async () => {
      throw new Error("network");
    });
    expect(unavailable.data.state).toBe("unavailable");
  });
});

describe("P4 import and data boundary", () => {
  const pageFiles = [
    "app/kaos-polos/page.tsx",
    "app/jaket-hoodie/page.tsx",
    "app/headwear/page.tsx",
    "app/kemeja/page.tsx",
    "app/koleksi/page.tsx",
    "app/jersey/shop/page.tsx",
    "app/produk/[slug]/page.tsx"
  ];

  it("prevents category and PDP pages from importing Supabase or broad public content directly", () => {
    pageFiles.forEach((file) => {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/@\/lib\/supabase|createSupabase|getPublicContent|@\/lib\/public-data/);
    });
  });

  it("uses explicit focused selects instead of wildcard product reads", () => {
    const productAccess = readFileSync("lib/product-read/data-access.ts", "utf8");
    const catalogAccess = readFileSync("lib/catalog-page/data-access.ts", "utf8");
    expect(productAccess).not.toContain('select("*")');
    expect(catalogAccess).not.toContain('select("*")');
    expect(productAccess).toContain("PRODUCT_SELECT");
  });
});
