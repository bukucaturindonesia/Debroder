import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canonicalProductEditorialImage,
  kaosColorDiscovery,
  kaosEditorialProducts
} from "@/lib/kaos-polos-editorial";
import type { Product } from "@/lib/types";

const read = (path: string) => readFileSync(path, "utf8");

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    slug: "soft-tee-black",
    nama: "Soft Tee Black",
    kategori: "Kaos Polos",
    deskripsi: "",
    badge: "",
    gambar_url: "/products/soft-tee-front.webp",
    gallery_urls: ["/products/soft-tee-back.webp"],
    whatsapp_link: "",
    urutan: 1,
    status: "active",
    status_aktif: true,
    variants: [],
    ...overrides
  };
}

describe("Kaos Polos editorial commerce", () => {
  it("keeps the canonical route and delegates only this page to its editorial experience", () => {
    const page = read("app/kaos-polos/page.tsx");
    const experience = read("components/KaosPolosEditorialExperience.tsx");

    expect(page).toContain('title: "Kaos Polos | DEBRODER"');
    expect(page).toContain("<KaosPolosEditorialExperience");
    expect(experience).toContain("<h1");
    expect(experience).toContain("Kaos Polos");
    expect(experience).toContain('catalogLayout="kaos-editorial"');
    expect(experience).toContain("<ProductCatalog");
  });

  it("follows the owner blueprint order without the removed shortcut, spotlight, color, and directory sections", () => {
    const experience = read("components/KaosPolosEditorialExperience.tsx");
    const hero = experience.indexOf('data-kaos-blueprint-section="hero"');
    const featured = experience.indexOf('data-kaos-blueprint-section="featured"');
    const campaign = experience.indexOf('data-kaos-blueprint-section="campaign"');
    const categories = experience.indexOf('data-kaos-blueprint-section="categories"');
    const catalog = experience.indexOf('data-kaos-blueprint-section="catalog"');

    expect(hero).toBeGreaterThan(-1);
    expect(featured).toBeGreaterThan(hero);
    expect(campaign).toBeGreaterThan(featured);
    expect(categories).toBeGreaterThan(campaign);
    expect(catalog).toBeGreaterThan(categories);
    expect(experience).not.toContain("kaos-editorial-shortcuts");
    expect(experience).not.toContain("Product spotlight");
    expect(experience).not.toContain("Warna yang tersedia");
    expect(experience).not.toContain("Jelajahi lebih lanjut");
    expect(experience).not.toContain("editorialCampaign=");
  });

  it("keeps the canonical responsive product catalog contract", () => {
    const catalog = read("components/ProductCatalog.tsx");

    expect(catalog).toContain('"lg:grid-cols-2" : "lg:grid-cols-3"');
    expect(catalog).toContain("lg:grid-cols-[17rem_minmax(0,1fr)]");
    expect(catalog).toContain("grid grid-cols-2");
  });

  it("uses only canonical PIM media for product-derived editorial content", () => {
    const withMedia = product();
    const withoutMedia = product({
      id: "missing-media",
      slug: "missing-media",
      gambar_url: "",
      gallery_urls: []
    });

    expect(kaosEditorialProducts([withoutMedia, withMedia])).toEqual([withMedia]);
    expect(canonicalProductEditorialImage(withMedia)).toBe("/products/soft-tee-back.webp");
  });

  it("builds color discovery only from exact active in-stock variant media", () => {
    const result = kaosColorDiscovery([
      product({
        variants: [
          {
            id: "black",
            product_id: "product-1",
            color_name: "Black",
            color_hex: "#111111",
            image_url: "/products/soft-tee-black.webp",
            is_active: true,
            sort_order: 1,
            sizes: [
              {
                id: "black-m",
                variant_id: "black",
                size_name: "M",
                stock: 4,
                stock_quantity: 4,
                is_active: true,
                sort_order: 1
              }
            ]
          },
          {
            id: "white",
            product_id: "product-1",
            color_name: "White",
            image_url: "/products/soft-tee-white.webp",
            is_active: true,
            sort_order: 2,
            sizes: [
              {
                id: "white-m",
                variant_id: "white",
                size_name: "M",
                stock: 0,
                stock_quantity: 0,
                is_active: true,
                sort_order: 1
              }
            ]
          }
        ]
      }),
      product({
        id: "product-2",
        slug: "premium-tee-black",
        nama: "Premium Tee Black",
        urutan: 2,
        variants: [
          {
            id: "black-premium",
            product_id: "product-2",
            color_name: "Black",
            image_url: "/products/premium-tee-black.webp",
            is_active: true,
            sort_order: 1,
            sizes: [
              {
                id: "black-premium-m",
                variant_id: "black-premium",
                size_name: "M",
                stock: 3,
                stock_quantity: 3,
                is_active: true,
                sort_order: 1
              }
            ]
          }
        ]
      })
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Black",
      slug: "black",
      imageUrl: "/products/soft-tee-black.webp",
      stock: 7
    });
  });

  it("does not add a permanent CTA to the shared product card", () => {
    const card = read("components/PublicProductCard.tsx");
    const experience = read("components/KaosPolosEditorialExperience.tsx");

    expect(card).not.toContain("Tambah ke Keranjang");
    expect(card).not.toContain("Beli Sekarang");
    expect(experience).toContain("Pesan Sekarang");
  });
});
