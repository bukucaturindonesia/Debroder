import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  availableKaosTypeOptions,
  canonicalProductEditorialImage,
  kaosColorDiscovery,
  kaosEditorialProducts,
  kaosTypeFilterHref
} from "@/lib/kaos-polos-editorial";
import { kaosTypeOptions } from "@/lib/product-taxonomy";
import type { CatalogPageFiltersViewModel } from "@/lib/catalog-page/model";
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

  it("puts product discovery before the existing CMS editorial sections", () => {
    const experience = read("components/KaosPolosEditorialExperience.tsx");
    const hero = experience.indexOf('data-kaos-blueprint-section="hero"');
    const quickCategory = experience.indexOf('data-kaos-blueprint-section="quick-category"');
    const catalog = experience.indexOf('data-kaos-blueprint-section="catalog"');
    const featured = experience.indexOf('data-kaos-blueprint-section="featured"');
    const campaign = experience.indexOf('data-kaos-blueprint-section="campaign"');
    const custom = experience.indexOf('data-kaos-blueprint-section="custom-cta"');

    expect(hero).toBeGreaterThan(-1);
    expect(quickCategory).toBeGreaterThan(hero);
    expect(catalog).toBeGreaterThan(quickCategory);
    expect(featured).toBeGreaterThan(catalog);
    expect(campaign).toBeGreaterThan(featured);
    expect(custom).toBeGreaterThan(campaign);
    expect(experience).toContain('"featured_editorial"');
    expect(experience).not.toContain("kaosFeaturedProducts");
    expect(experience).not.toContain("productDetailHref");
    expect(experience).toContain("Pilih bahan, cetak desain, dan produksi bersama DEBRODER.");
    expect(experience).toContain("href={customHref}>Mulai Custom</Link>");
  });

  it("uses a compact responsive CMS artwork hero without overlay typography", () => {
    const experience = read("components/KaosPolosEditorialExperience.tsx");
    const css = read("app/globals.css");

    expect(css).toContain("height: clamp(350px, 30vw, 420px)");
    expect(css).toContain("height: clamp(240px, 64vw, 320px)");
    expect(experience).toContain("desktopObjectPosition={hero.objectPosition}");
    expect(experience).toContain("mobileObjectPosition={hero.mobileObjectPosition}");
    expect(experience).not.toContain("kaos-blueprint-hero-title");
    expect(experience).toContain('<h1 className="kaos-category-title">Kaos Polos</h1>');
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

  it("shows only PIM-backed quick types and keeps combined filter state in chip links", () => {
    const experience = read("components/KaosPolosEditorialExperience.tsx");
    const products = [
      product({ nama: "NSA Premium Tee", slug: "nsa-premium" }),
      product({ id: "cotton", slug: "cotton-24s", nama: "Cotton Combed 24s" })
    ];
    const filters: CatalogPageFiltersViewModel = {
      query: "tee",
      color: "black",
      size: "m",
      price: "under-50",
      label: "all",
      sort: "price-low",
      productType: "all",
      status: "ready-stock"
    };

    expect(availableKaosTypeOptions(products, kaosTypeOptions).map((item) => item.value))
      .toEqual(["premium-cotton", "cotton-combed"]);
    expect(experience).toContain("availableKaosTypeOptions(products, productTypeOptions)");
    expect(experience).toContain('aria-label="Pilih tipe kaos"');
    expect(experience).toContain("kaos-category-type-link");
    expect(experience).not.toContain("kaos-category-carousel");
    expect(kaosTypeFilterHref("soft-tee", filters)).toBe(
      "/kaos-polos?type=soft-tee&q=tee&color=black&size=m&price=under-50&status=ready-stock&sort=price-low#catalog"
    );
    expect(kaosTypeFilterHref("all", filters)).toBe(
      "/kaos-polos?q=tee&color=black&size=m&price=under-50&status=ready-stock&sort=price-low#catalog"
    );
  });

  it("keeps compact filter/sort controls, accessible drawer behavior, and product grid", () => {
    const catalog = read("components/ProductCatalog.tsx");
    const css = read("app/globals.css");

    expect(catalog).toContain('aria-label="Urutkan produk"');
    expect(catalog).toContain("min-h-11 rounded-none");
    expect(catalog).toContain("lg:grid-cols-[17rem_minmax(0,1fr)]");
    expect(catalog).toContain('role="dialog"');
    expect(catalog).toContain("aria-modal=\"true\"");
    expect(catalog).toContain("lg:grid-cols-3 lg:gap-x-4 lg:gap-y-8");
    expect(catalog).toContain("syncUrlState");
    expect(catalog).toContain("Lihat Lebih Banyak");
    expect(css).toContain("aspect-ratio: 4 / 5");
  });

  it("keeps three desktop product columns while the filter sidebar is open", () => {
    const catalog = read("components/ProductCatalog.tsx");
    const css = read("app/globals.css");

    expect(catalog).toContain("lg:grid-cols-3 lg:gap-x-4 lg:gap-y-8");
    expect(catalog).toContain("lg:grid-cols-[17rem_minmax(0,1fr)]");
    expect(catalog).not.toContain('filtersOpen ? "lg:grid-cols-2" : "lg:grid-cols-3"');
    expect(catalog).toContain("isKaosEditorial");
    expect(catalog).toContain("lg:grid-cols-3 lg:gap-x-4 lg:gap-y-8");
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
    expect(css).toContain("padding-top: var(--kaos-section-gap)");
    expect(css).toContain(".kaos-blueprint-intro-section {");
    expect(css).toContain("padding-top: clamp(24px, 2.5vw, 40px)");
    expect(css).toContain(".kaos-blueprint-catalog-section {");
    expect(css).toContain("padding-top: 20px");
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
