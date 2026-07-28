import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EMPTY_JERSEY_FILTERS,
  filterJerseyProducts,
  jerseyFilterOptions,
  jerseyHasCustomAvailability,
  jerseyHasReadyStock,
  jerseyProductStatus
} from "@/lib/jersey-commerce";
import { resolveProductPurchaseCapabilities } from "@/lib/product-detail-page/domain";
import type { Product } from "@/lib/types";

function product(patch: Partial<Product>): Product {
  return {
    id: "product-1",
    nama: "Jersey Futsal Home",
    kategori: "Jersey",
    subcategory: "Futsal",
    deskripsi: "",
    badge: "",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    whatsapp_link: "",
    price: 125_000,
    stock: 8,
    color_tags: ["Hitam"],
    size_tags: ["M", "L"],
    urutan: 10,
    status_aktif: true,
    ...patch
  };
}

describe("Jersey commerce catalog", () => {
  it("builds filters only from PIM values that actually exist", () => {
    const products = [
      product({ id: "futsal" }),
      product({
        id: "esports",
        nama: "Jersey Esports",
        subcategory: "Esports",
        color_tags: ["Navy"],
        size_tags: ["XL"],
        price: 225_000,
        stock: 0,
        uses_configurator: true
      })
    ];
    const options = jerseyFilterOptions(products);

    expect(options.categories.map((item) => item.value)).toEqual([
      "esports",
      "futsal"
    ]);
    expect(options.colors.map((item) => item.value)).toEqual(["hitam", "navy"]);
    expect(options.sizes.map((item) => item.value)).toEqual(["l", "m", "xl"]);
    expect(options.availability.map((item) => item.value)).toEqual([
      "ready",
      "custom"
    ]);
    expect(options.price.map((item) => item.value)).toEqual([
      "100-200",
      "over-200"
    ]);
  });

  it("filters and sorts products from URL-compatible scalar state", () => {
    const products = [
      product({ id: "futsal", price: 150_000 }),
      product({ id: "football", subcategory: "Football", price: 110_000 }),
      product({ id: "esports", subcategory: "Esports", price: 220_000 })
    ];

    expect(
      filterJerseyProducts(products, {
        ...EMPTY_JERSEY_FILTERS,
        category: "football"
      }).map((item) => item.id)
    ).toEqual(["football"]);
    expect(
      filterJerseyProducts(products, {
        ...EMPTY_JERSEY_FILTERS,
        sort: "price-high"
      }).map((item) => item.id)
    ).toEqual(["esports", "futsal", "football"]);
  });

  it("derives Ready Stock and Custom status without CMS product data", () => {
    const ready = product({ stock: 4 });
    const custom = product({ stock: 0, uses_configurator: true });
    const hybrid = product({ stock: 7, uses_configurator: true });

    expect(jerseyHasReadyStock(ready)).toBe(true);
    expect(jerseyHasCustomAvailability(custom)).toBe(true);
    expect(jerseyProductStatus(ready)).toBe("Low Stock");
    expect(jerseyProductStatus(custom)).toBe("Custom Available");
    expect(jerseyProductStatus(hybrid)).toBe("Ready Stock + Custom");
  });

  it("keeps the shop monochrome, uses the global header, and preserves three desktop columns", () => {
    const page = readFileSync("app/jersey/shop/page.tsx", "utf8");
    const catalog = readFileSync("components/jersey/JerseyShopCatalog.tsx", "utf8");
    const nav = readFileSync("components/jersey/JerseyCommerceNav.tsx", "utf8");

    expect(page).toContain('theme="jersey-commerce"');
    expect(page).not.toContain("showHeader");
    expect(page).toContain("<PublicShell");
    expect(catalog).toContain("lg:grid-cols-3");
    expect(catalog).toContain("router.replace");
    expect(catalog).toContain("ProductImageSwap");
    expect(nav).not.toContain("#39FF88");
    expect(nav).not.toContain("JerseyChrome");
  });

  it("keeps Jersey product detail on the universal product route", () => {
    const detail = readFileSync("app/produk/[slug]/page.tsx", "utf8");
    const domain = readFileSync("lib/product-detail-page/domain.ts", "utf8");
    const jerseyCategory = readFileSync("app/jersey/[slug]/page.tsx", "utf8");

    expect(detail).toContain("getProductDetailPageModel");
    expect(domain).toContain('productMatchesRoute(product, "jersey")');
    expect(domain).toContain("jerseyHasReadyStock(product)");
    expect(domain).toContain("jerseyHasCustomAvailability(product)");
    expect(detail).toContain("JerseyCommerceNav");
    expect(detail).toContain('href="/jersey/configurator"');
    expect(detail).toContain("purchaseCapabilities");
    expect(detail).toContain("showBuyNow={purchaseCapabilities.showBuyNow}");
    expect(jerseyCategory).toContain("content.categories.find");
    expect(jerseyCategory).toContain('href="/jersey/configurator"');
    expect(jerseyCategory).not.toContain("getProductDetailPageModel");
    expect(jerseyCategory).not.toContain("TieredProductPurchasePanel");
  });

  it.each([
    {
      label: "Jersey Ready Stock",
      input: {
        hasProduct: true,
        isJersey: true,
        hasReadyStock: true,
        hasCustomAvailability: false
      },
      expected: {
        showPurchasePanel: true,
        showAddToCart: true,
        showBuyNow: true,
        showCustomAction: false
      }
    },
    {
      label: "Jersey Custom-only",
      input: {
        hasProduct: true,
        isJersey: true,
        hasReadyStock: false,
        hasCustomAvailability: true
      },
      expected: {
        showPurchasePanel: false,
        showAddToCart: false,
        showBuyNow: false,
        showCustomAction: true
      }
    },
    {
      label: "Jersey unavailable",
      input: {
        hasProduct: true,
        isJersey: true,
        hasReadyStock: false,
        hasCustomAvailability: false
      },
      expected: {
        showPurchasePanel: true,
        showAddToCart: false,
        showBuyNow: false,
        showCustomAction: false
      }
    },
    {
      label: "non-Jersey Ready Stock",
      input: {
        hasProduct: true,
        isJersey: false,
        hasReadyStock: true,
        hasCustomAvailability: false
      },
      expected: {
        showPurchasePanel: true,
        showAddToCart: true,
        showBuyNow: false,
        showCustomAction: false
      }
    }
  ])("resolves $label purchase capabilities from canonical state", ({ input, expected }) => {
    expect(resolveProductPurchaseCapabilities(input)).toEqual(expected);
  });
});
