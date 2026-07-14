import { describe, expect, it } from "vitest";
import {
  productCardColors,
  productCardMetadata,
  productCardPrice
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
    expect(productCardMetadata(item)).toBe("Kategori Uji · 1 warna");
  });

  it("falls back to legacy color tags only when no variant collection exists", () => {
    expect(
      productCardMetadata(
        product({ color_tags: ["Navy", "navy", "Putih"] })
      )
    ).toBe("Kategori Uji · 2 warna");

    expect(
      productCardMetadata(
        product({ variants: [], color_tags: ["Navy"] })
      )
    ).toBe("Kategori Uji · 1 warna");
  });

  it("omits missing metadata parts without dangling separators", () => {
    expect(productCardMetadata(product({ kategori: "", color_tags: ["Hitam"] }))).toBe(
      "1 warna"
    );
    expect(productCardMetadata(product({ kategori: "", color_tags: [] }))).toBe("");
  });

  it("uses the existing price source and only adds a global starting-price label", () => {
    expect(productCardPrice(product({ price: 45000 }))).toBe("Rp 45.000");
    expect(
      productCardPrice(product({ base_price: 45000, pricing_mode: "variant_based" }))
    ).toBe("Mulai Rp 45.000");
    expect(
      productCardPrice(
        product({ price_label: "Menunggu Konfirmasi", pricing_mode: "custom_quote" })
      )
    ).toBe("Menunggu Konfirmasi");
    expect(productCardPrice(product({ price_label: "Rp 45.000–Rp 50.000" }))).toBe(
      "Rp 45.000–Rp 50.000"
    );
    expect(productCardPrice(product({ price: null, price_label: null }))).toBe("");
  });
});
