import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  formatPdpRupiah,
  nextPdpPricingTier,
  pdpColorOptions,
  pdpSizeOptions
} from "@/lib/pdp-purchase";
import type { ProductVariant } from "@/lib/types";

function variant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: "variant-black",
    product_id: "product-1",
    variant_name: "Hitam",
    color_name: "Hitam",
    color_hex: "#111111",
    status: "active",
    is_active: true,
    sort_order: 1,
    variant_images: [{
      id: "image-front",
      variant_id: "variant-black",
      image_url: "/products/black-front.webp",
      image_role: "front",
      is_cover: true,
      sort_order: 1
    }],
    sizes: [{
      id: "size-s",
      variant_id: "variant-black",
      size_name: "S",
      sku: "BLACK-S",
      stock: 8,
      status: "active",
      is_active: true,
      sort_order: 1
    }, {
      id: "size-m",
      variant_id: "variant-black",
      size_name: "M",
      sku: "BLACK-M",
      stock: 0,
      status: "out_of_stock",
      is_active: true,
      sort_order: 2
    }],
    ...overrides
  };
}

describe("DEBRODER PDP Final Experience V1", () => {
  it("uses only canonical color images and exact canonical hex values", () => {
    const options = pdpColorOptions([
      variant(),
      variant({
        id: "variant-unnamed",
        variant_name: "Stone",
        color_name: "Stone",
        color_hex: "not-a-hex",
        variant_images: [],
        sort_order: 2
      })
    ]);

    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      name: "Hitam",
      imageUrl: "/products/black-front.webp",
      hex: "#111111",
      disabled: false
    });
    expect(options[1]).toMatchObject({
      name: "Stone",
      imageUrl: null,
      hex: null
    });
  });

  it("keeps supported zero-stock sizes visible and never fabricates unsupported sizes", () => {
    const options = pdpSizeOptions(variant());

    expect(options.map((option) => option.name)).toEqual(["S", "M"]);
    expect(options[0]).toMatchObject({ disabled: false, stock: 8, sku: "BLACK-S" });
    expect(options[1]).toMatchObject({ disabled: true, stock: 0, sku: "BLACK-M" });
    expect(options.some((option) => option.name === "XL")).toBe(false);
  });

  it("formats exact Rupiah and resolves the next useful canonical tier", () => {
    const tiers = [
      { id: "tier-1", minQuantity: 1, maxQuantity: 11, unitPrice: 45_000, quoteRequired: false },
      { id: "tier-12", minQuantity: 12, maxQuantity: 23, unitPrice: 42_000, quoteRequired: false },
      { id: "tier-24", minQuantity: 24, maxQuantity: null, unitPrice: 40_000, quoteRequired: false }
    ];

    expect(formatPdpRupiah(1_250_000)).toBe("Rp1.250.000");
    expect(nextPdpPricingTier(tiers, 12)?.id).toBe("tier-24");
    expect(nextPdpPricingTier(tiers, 24)).toBeNull();
  });

  it("implements the locked image-first composition and header-aware sticky gallery", () => {
    const page = readFileSync("app/produk/[slug]/page.tsx", "utf8");
    const sticky = readFileSync(
      "components/product/ProductStickyPurchasePanel.tsx",
      "utf8"
    );

    expect(page.indexOf("<ProductGallery")).toBeLessThan(
      page.indexOf("<TieredProductPurchasePanel")
    );
    expect(page).toContain("<ProductStickyPurchasePanel>");
    expect(page).toContain(
      'data-pdp-media className="min-w-0 lg:self-stretch"'
    );
    expect(page).toContain("data-pdp-purchase-column");
    expect(page).not.toContain("data-pdp-sticky-media");
    expect(sticky).toContain("ResizeObserver");
    expect(sticky).toContain('data-sticky-safe={stickySafe ? "true" : "false"}');
    expect(sticky).toContain("[data-public-header]");
    expect(sticky).toContain("lg:top-[var(--pdp-sticky-top)]");
  });

  it("uses thumbnail colors, three-column sizes, bounded quantity, and focus-first validation", () => {
    const panel = readFileSync("components/TieredProductPurchasePanel.tsx", "utf8");

    expect(panel).toContain("pdpColorOptions(variants)");
    expect(panel).toContain("<SafeImage");
    expect(panel).toContain("grid grid-cols-3");
    expect(panel).toContain("APPAREL_SIZE_GRID");
    expect(panel).toContain("COLLAPSED_COLOR_LIMIT");
    expect(panel).toContain("Lihat semua warna");
    expect(panel).toContain("Tampilkan lebih sedikit");
    expect(panel).toContain("aria-expanded={showAllColors}");
    expect(panel).toContain('aria-label={`Ukuran ${name}${disabled ? ", tidak tersedia"');
    expect(panel).toContain("MAX_CART_LINE_QUANTITY");
    expect(panel).toContain("MAX_CART_TOTAL_QUANTITY");
    expect(panel).toContain("focusFirstInvalidControl");
    expect(panel).toContain("colorFieldsetRef.current?.focus()");
    expect(panel).toContain("sizeFieldsetRef.current?.focus()");
    expect(panel).not.toContain("defaultSizes");
    expect(panel).not.toContain("baseColors");
    expect(panel).not.toContain("Pilihan layanan");
    expect(panel).not.toContain("Custom Instan");
  });

  it("keeps exact pricing and cart identity server-authoritative", () => {
    const panel = readFileSync("components/TieredProductPurchasePanel.tsx", "utf8");
    const pricing = readFileSync("lib/supabase/products.ts", "utf8");

    expect(panel).toContain('fetch("/api/pricing/ready-stock"');
    expect(panel).toContain("pricingRequestKey");
    expect(panel).toContain('pricing_source: "server_canonical"');
    expect(panel).toContain("variantSizeId: exactPricing.variantSizeId");
    expect(panel).toContain("pricing_tiers: exactPricing.tiers");
    expect(pricing).toContain("const canonicalTiers = latest.product.priceTiers");
    expect(pricing).toContain("resolveReadyStockPricing({");
  });

  it("keeps Buy Now and Custom inside the canonical transaction hierarchy", () => {
    const page = readFileSync("app/produk/[slug]/page.tsx", "utf8");
    const panel = readFileSync("components/TieredProductPurchasePanel.tsx", "utf8");

    expect(page).toContain("showBuyNow={purchaseCapabilities.showBuyNow}");
    expect(page).toContain("customActionHref={customActionHref}");
    expect(panel).toContain("function buySelectedNow()");
    expect(panel).toContain('router.push("/checkout")');
    expect(panel).toMatch(/>\s*Beli Sekarang\s*<\/button>/);
    expect(panel).toMatch(/>\s*Custom\s*<\/Link>/);
    expect(panel.indexOf("Beli Sekarang")).toBeLessThan(
      panel.indexOf("Tambah ke Keranjang")
    );
  });

  it("hides unverified customer and outfit content while using a native similar-product rail", () => {
    const page = readFileSync("app/produk/[slug]/page.tsx", "utf8");
    const rail = readFileSync(
      "components/product/ProductRecommendationRail.tsx",
      "utf8"
    );

    expect(page).toContain('"Dipakai Pelanggan" and "Lengkapi Penampilan" intentionally remain');
    expect(page).toContain('<ProductRecommendationRail title="Produk Serupa"');
    expect(rail).toContain("overflow-x-auto");
    expect(rail).toContain("snap-mandatory");
    expect(rail).toContain("disabled={atStart}");
    expect(rail).toContain("disabled={atEnd}");
    expect(rail).not.toContain("autoplay");
  });
});
