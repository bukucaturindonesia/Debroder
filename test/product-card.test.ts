import { describe, expect, it } from "vitest";
import {
  productCardColors,
  productCardMaterial,
  productCardMetadata,
  productCardPrice,
  productCardPriceState,
  productCardSizeRange,
  productCardSizes,
  productCardSwatches,
  productCommerceBadges
} from "@/lib/product-card";
import type { Product } from "@/lib/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    nama: "Produk Uji",
    kategori: "Kategori Uji",
    deskripsi: "",
    badge: "",
    gambar_url: "",
    whatsapp_link: "",
    urutan: 1,
    status_aktif: true,
    ...overrides
  };
}

describe("product card presentation data", () => {
  it("counts unique active PIM colors and ignores empty or inactive variants", () => {
    const item = product({
      variants: [
        { product_id: "p", color_name: "Hitam", is_active: true, sort_order: 1 },
        { product_id: "p", color_name: " hitam ", is_active: true, sort_order: 2 },
        { product_id: "p", color_name: "Putih", is_active: false, sort_order: 3 },
        { product_id: "p", color_name: "", is_active: true, sort_order: 4 }
      ]
    });

    expect(productCardColors(item)).toEqual(["Hitam"]);
    expect(productCardMetadata(item)).toBe("1 warna");
  });

  it("falls back to legacy color tags only when no variant collection exists", () => {
    expect(
      productCardMetadata(
        product({ color_tags: ["Navy", "navy", "Putih"] })
      )
    ).toBe("2 warna");

    expect(
      productCardMetadata(
        product({ variants: [], color_tags: ["Navy"] })
      )
    ).toBe("1 warna");
  });

  it("omits missing metadata parts without dangling separators", () => {
    expect(productCardMetadata(product({ color_tags: ["Hitam"] }))).toBe(
      "1 warna"
    );
    expect(productCardMetadata(product({ color_tags: [] }))).toBe("");
  });

  it("derives a readable active PIM size range and canonical material metadata", () => {
    const item = product({
      material_tags: ["Cotton Combed 24s"],
      variants: [{
        product_id: "p",
        color_name: "Hitam",
        hex_code: "#111111",
        is_active: true,
        sort_order: 1,
        sizes: [
          { variant_id: "v", size_name: "S", stock: 10, is_active: true, sort_order: 1 },
          { variant_id: "v", size_name: "M", stock: 10, is_active: true, sort_order: 2 },
          { variant_id: "v", size_name: "5XL", stock: 10, is_active: true, sort_order: 3 },
          { variant_id: "v", size_name: "6XL", stock: 0, is_active: false, sort_order: 4 }
        ]
      }]
    });

    expect(productCardSizes(item)).toEqual(["S", "M", "5XL"]);
    expect(productCardSizeRange(item)).toBe("S–5XL");
    expect(productCardMaterial(item)).toBe("Cotton Combed 24s");
    expect(productCardMetadata(item)).toContain("1 warna");
    expect(productCardMetadata(item)).toContain("S–5XL");
    expect(productCardMetadata(item)).toContain("Cotton Combed 24s");
  });

  it("shows canonical base price for every pricing mode and never fabricates a fallback", () => {
    expect(productCardPrice(product({ base_price: 45000, pricing_mode: "fixed_price" }))).toBe("Rp45.000");
    expect(productCardPrice(product({ base_price: "1.250.000", pricing_mode: "variant_based" }))).toBe("Rp1.250.000");
    expect(
      productCardPrice(product({ base_price: 140000, pricing_mode: "configurator_based", uses_configurator: true }))
    ).toBe("Rp140.000");
    expect(
      productCardPriceState(product({ price: 45000, harga: 45000, base_price: null }))
    ).toEqual({
      status: "unavailable",
      amount: null,
      label: "Harga belum tersedia"
    });
    expect(productCardPrice(product({ base_price: 0 }))).toBe("Harga belum tersedia");
  });

  it("exposes only canonical active variant swatches with valid exact hex values", () => {
    const item = product({
      variants: [
        { product_id: "p", color_name: "Hitam", hex_code: "#111111", is_active: true, sort_order: 1 },
        { product_id: "p", color_name: "Putih", color_hex: "#ffffff", is_active: true, sort_order: 2 },
        { product_id: "p", color_name: "Tanpa HEX", is_active: true, sort_order: 3 },
        { product_id: "p", color_name: "Nonaktif", hex_code: "#ff0000", is_active: false, sort_order: 4 }
      ]
    });

    expect(productCardSwatches(item)).toEqual([
      { label: "Hitam", hex: "#111111" },
      { label: "Putih", hex: "#FFFFFF" }
    ]);
    expect(productCardSwatches(product({ color_tags: ["Navy"] }))).toEqual([]);
  });

  it("derives canonical commerce badges from PIM sales mode and inventory", () => {
    expect(
      productCommerceBadges(
        product({
          sales_mode: "both",
          stock: 100,
          label_new: true
        })
      )
    ).toEqual(["Ready Stock + Custom", "New"]);

    expect(
      productCommerceBadges(
        product({
          sales_mode: "ready_stock",
          variants: [{
            product_id: "p",
            color_name: "Hitam",
            is_active: true,
            sort_order: 1,
            sizes: [{
              variant_id: "v",
              size_name: "M",
              stock: 0,
              is_active: true,
              sort_order: 1
            }]
          }]
        })
      )
    ).toEqual(["Ready Stock", "Sold Out"]);
  });
});
