import { describe, expect, it } from "vitest";
import { buildPublicNavigationFacets, productMatchesNavigationColor, productMatchesNavigationStatus } from "@/lib/public-navigation";
import type { Product, ProductCategory } from "@/lib/types";

const category: ProductCategory = {
  id: "category-kaos",
  name: "Kaos Polos",
  slug: "kaos-polos",
  description: "",
  is_active: true,
  sort_order: 1
};

function product(overrides: Partial<Product>): Product {
  return {
    id: "product-1",
    nama: "Kaos Basic",
    kategori: "Kaos Polos",
    deskripsi: "",
    badge: "",
    gambar_url: "/product.png",
    whatsapp_link: "",
    urutan: 1,
    status_aktif: true,
    product_category_id: category.id,
    ...overrides
  };
}

describe("public navigation facets", () => {
  it("normalizes duplicate PIM color aliases", () => {
    const facets = buildPublicNavigationFacets([
      product({ color_tags: ["Red", "RED", "merah", "Yellow"] })
    ], [category]);

    expect(facets.colors).toEqual([
      { label: "Kuning", value: "yellow" },
      { label: "Merah", value: "red" }
    ]);
  });

  it("uses active variants before legacy color tags", () => {
    const facets = buildPublicNavigationFacets([
      product({
        color_tags: ["Purple"],
        variants: [{ product_id: "product-1", variant_name: "Black", color_name: "Black", is_active: true, sort_order: 1 }]
      })
    ], [category]);

    expect(facets.colors).toEqual([{ label: "Hitam", value: "black" }]);
  });

  it("excludes inactive and Jersey-owned products", () => {
    const facets = buildPublicNavigationFacets([
      product({ status_aktif: false, color_tags: ["Purple"] }),
      product({ id: "jersey", nama: "Jersey Futsal", kategori: "Jersey", color_tags: ["Orange"] })
    ], [category]);

    expect(facets.colors).toEqual([]);
  });

  it("exposes only supported real collections and availability", () => {
    const facets = buildPublicNavigationFacets([
      product({ stock: 4, label_new: true, label_best_seller: true, sales_count: 12 })
    ], [category]);

    expect(facets.availability).toEqual({ readyStock: true, custom: false, hybrid: false });
    expect(facets.collections).toEqual({ new: true, best: true, popular: true, promo: false });
    expect(facets.categories).toEqual([{ label: "Kaos Polos", href: "/kaos-polos" }]);
  });

  it("matches shareable collection color and availability filters", () => {
    const ready = product({ color_tags: ["RED"], stock: 3 });
    const custom = product({ color_tags: ["merah"], pricing_mode: "custom_quote" });

    expect(productMatchesNavigationColor(ready, "red")).toBe(true);
    expect(productMatchesNavigationColor(custom, "red")).toBe(true);
    expect(productMatchesNavigationStatus(ready, "ready-stock")).toBe(true);
    expect(productMatchesNavigationStatus(custom, "custom")).toBe(true);
    expect(productMatchesNavigationStatus(ready, "hybrid")).toBe(false);
  });
});
