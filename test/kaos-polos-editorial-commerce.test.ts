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

describe("Kaos Polos owner editorial revision", () => {
  it("keeps the canonical route and dedicated experience", () => {
    const page = read("app/kaos-polos/page.tsx");
    const experience = read("components/KaosPolosEditorialExperience.tsx");

    expect(page).toContain('title: "Kaos Polos | DEBRODER"');
    expect(page).toContain("<KaosPolosEditorialExperience");
    expect(experience).toContain("<h1");
    expect(experience).toContain("Kaos Polos");
    expect(experience).toContain('catalogLayout="kaos-editorial"');
    expect(experience).toContain("<ProductCatalog");
  });

  it("keeps the owner section order and removes product-derived Featured", () => {
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
    expect(experience).toContain('"featured_editorial"');
    expect(experience).not.toContain("kaosFeaturedProducts");
    expect(experience).not.toContain("productDetailHref");
  });

  it("reduces the hero height by forty percent and its primary typography by twenty percent", () => {
    const css = read("app/globals.css");

    expect(css).toContain("height: clamp(312px, 30vw, 456px)");
    expect(css).toContain("font-size: clamp(2.6rem, 6.8vw, 7rem)");
    expect(css).toContain("font-size: clamp(1.2rem, 2.56vw, 2.4rem)");
    expect(css).toContain("height: min(43.2svh, 372px)");
    expect(css).toContain("min-height: 288px");
  });

  it("uses CMS Featured cards with zero gap and regular-weight Featured heading", () => {
    const experience = read("components/KaosPolosEditorialExperience.tsx");
    const css = read("app/globals.css");

    expect(experience).toContain("campaignsOfType(");
    expect(experience).toContain('className="kaos-blueprint-section-label kaos-blueprint-heading-normal"');
    expect(experience).toContain("<FeaturedEditorialCard");
    expect(css).toContain(".kaos-blueprint-feature-grid");
    expect(css).toContain("gap: 0");
    expect(css).toContain(".kaos-blueprint-heading-normal");
    expect(css).toContain("font-weight: 400");
  });

  it("locks the editorial banner to 1600 × 500 on desktop and keeps a horizontal mobile composition", () => {
    const experience = read("components/KaosPolosEditorialExperience.tsx");
    const css = read("app/globals.css");

    expect(experience).toContain('"banner_editorial_left"');
    expect(experience).toContain('"banner_editorial_right"');
    expect(experience).toContain("href={customHref}");
    expect(experience).toContain('className="kaos-blueprint-editorial-right relative');
    expect(css).toContain("max-width: 1600px");
    expect(css).toContain("aspect-ratio: 16 / 5");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 3fr)");
    expect(css).toContain("gap: 1px");
    expect(css).toContain("grid-template-columns: minmax(0, 32fr) minmax(0, 68fr)");
    expect(css).toContain("height: clamp(190px, 52vw, 240px)");
  });

  it("presents Pilih Kategori with the homepage-style native rail and visible scrollbar", () => {
    const experience = read("components/KaosPolosEditorialExperience.tsx");

    expect(experience).toContain("Pilih Kategori");
    expect(experience).not.toContain("Berdasarkan Kategori");
    expect(experience).toContain('ScrollButtons containerId="kaos-category-carousel"');
    expect(experience).toContain("category-carousel premium-scrollbar");
    expect(experience).toContain("snap-x snap-mandatory overflow-x-auto pb-6");
    expect(experience).toContain("aspect-[4/5]");
  });

  it("keeps three desktop product columns while the filter sidebar is open", () => {
    const catalog = read("components/ProductCatalog.tsx");
    const css = read("app/globals.css");

    expect(catalog).toContain("lg:grid-cols-3 lg:gap-x-4 lg:gap-y-12");
    expect(catalog).toContain("lg:grid-cols-[17rem_minmax(0,1fr)]");
    expect(catalog).not.toContain('filtersOpen ? "lg:grid-cols-2" : "lg:grid-cols-3"');
    expect(catalog).toContain('isKaosEditorial\n                  ? "lg:grid-cols-3 lg:gap-x-4"');
    expect(catalog).toContain('{visible.length} Produk');
    expect(catalog).not.toContain('{title} ({visible.length})');
    expect(css).toContain("aspect-ratio: 4 / 5");
  });

  it("uses a fixed-slot owner-friendly CMS manager and records the required database migration", () => {
    const adminPage = read("app/admin/commerce/kaos-polos/page.tsx");
    const admin = read("components/admin/KaosPolosExperienceAdmin.tsx");
    const navigation = read("components/admin/layout/admin-navigation.ts");
    const migration = read("supabase/migrations/20260801045549_kaos_polos_editorial_section_types_v1.sql");

    expect(adminPage).toContain("KaosPolosExperienceAdmin");
    expect(admin).toContain('.eq("experience_key", "kaos-polos")');
    expect(admin).toContain('label: "Featured 01"');
    expect(admin).toContain('label: "Featured 02"');
    expect(admin).toContain('label: "Banner kiri"');
    expect(admin).toContain('label: "Banner kanan"');
    expect(admin).toContain("POSITION_OPTIONS");
    expect(admin).toContain("loadLatestCmsRevisions");
    expect(admin).toContain("mergeCmsRevision");
    expect(admin).toContain('grid-cols-[32fr_68fr]');
    expect(admin).not.toContain('Field label="Jenis konten"');
    expect(admin).not.toContain('Field label="Nama internal"');
    expect(admin).not.toContain('Field label="Urutan"');
    expect(migration).toContain("'featured_editorial'");
    expect(migration).toContain("'banner_editorial_left'");
    expect(migration).toContain("'banner_editorial_right'");
    expect(navigation).toContain('href: "/admin/commerce/kaos-polos"');
  });

  it("inherits the canonical homepage section rhythm instead of stacking block padding", () => {
    const css = read("app/globals.css");

    expect(css).toContain("--kaos-section-gap: var(--section-space)");
    expect(css).toContain("--kaos-end-space: var(--section-space-end)");
    expect(css).toContain("padding-top: var(--kaos-section-gap)");
    expect(css).toContain("padding-bottom: var(--kaos-end-space)");
    expect(css).not.toContain(".kaos-blueprint-section {\n  padding-block:");
  });

  it("still accepts only canonical PIM media for product discovery helpers", () => {
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
});
