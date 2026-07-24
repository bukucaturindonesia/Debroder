import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildLoadingPublicShellPageModel,
  buildPublicShellPageModel,
  buildUnavailablePublicShellPageModel,
  loadPublicShellPageModel,
  type PublicShellSource
} from "@/lib/public-shell";

function source(overrides: Partial<PublicShellSource> = {}): PublicShellSource {
  return {
    products: {
      status: "ready",
      data: [{
        id: "product-1",
        nama: "Kaos Cotton Combed",
        kategori: "Kaos Polos",
        subcategory: "Cotton Combed",
        slug: "kaos-cotton-combed",
        link_url: "/produk/kaos-cotton-combed",
        product_category_id: "category-1",
        status: "active",
        status_aktif: true,
        label_new: true,
        label_promo: false,
        label_best_seller: true,
        sales_count: 3,
        stock: 0,
        uses_configurator: false,
        product_type: "standard_product",
        pricing_mode: "variant_based",
        color_tags: ["hitam"],
        intent_tags: ["kaos-polos"],
        collection_tags: [],
        material_tags: ["cotton-combed-24s"]
      }]
    },
    variants: {
      status: "ready",
      data: [{
        id: "variant-1",
        product_id: "product-1",
        status: "active",
        is_active: true,
        color_name: "Hitam",
        variant_name: "Hitam"
      }]
    },
    variantSizes: {
      status: "ready",
      data: [{
        variant_id: "variant-1",
        status: "active",
        is_active: true,
        stock: 4,
        stock_quantity: 4
      }]
    },
    categories: {
      status: "ready",
      data: [{
        id: "category-1",
        name: "Kaos Polos",
        slug: "kaos-polos",
        is_active: true,
        sort_order: 10,
        collection_section_order: 10,
        public_label: "Kaos Polos"
      }]
    },
    contact: {
      status: "ready",
      data: {
        email: "halo@example.com",
        whatsapp_utama: "081234567890",
        whatsapp_link: "https://wa.me/6281234567890",
        facebook: "https://facebook.com/debroder",
        instagram: "https://instagram.com/debroder"
      }
    },
    stores: {
      status: "ready",
      data: [{ nama_store: "STORE PETTARANI", urutan: 1, status_aktif: true }]
    },
    ...overrides
  };
}

describe("P3 public shell page-owned read model", () => {
  it("projects focused public data into a typed shell model", () => {
    const model = buildPublicShellPageModel(source());

    expect(model).toMatchObject({
      pageKey: "public-shell",
      locale: "id-ID",
      data: { state: "ready", warnings: [] }
    });
    expect(model.data.header.navigationFacets).toMatchObject({
      colors: [{ label: "Hitam", value: "black" }],
      availability: { readyStock: true, custom: false, hybrid: false },
      collections: { new: true, best: true, popular: true, promo: false }
    });
    expect(model.data.header.navigationFacets.categories).toContainEqual({
      label: "Kaos Polos",
      href: "/kaos-polos"
    });
    expect(model.data.footer.companyLinks).toContainEqual({
      label: "Store PETTARANI",
      href: "/store"
    });
    expect(model.data.footer.socialLinks.map((item) => item.icon)).toEqual([
      "instagram",
      "whatsapp",
      "facebook",
      "email"
    ]);
  });

  it("returns an empty model without inventing catalog facets", () => {
    const model = buildPublicShellPageModel(source({
      products: { status: "empty", data: [] },
      variants: { status: "empty", data: [] },
      variantSizes: { status: "empty", data: [] },
      categories: { status: "empty", data: [] }
    }));

    expect(model.data.state).toBe("empty");
    expect(model.data.header.navigationFacets).toMatchObject({
      colors: [],
      categories: [],
      availability: { readyStock: false, custom: false, hybrid: false }
    });
  });

  it("degrades safely when a public source is unavailable", () => {
    const model = buildPublicShellPageModel(source({
      products: { status: "unavailable", data: [] },
      variants: { status: "unavailable", data: [] },
      variantSizes: { status: "unavailable", data: [] },
      contact: { status: "unavailable", data: null },
      stores: { status: "unavailable", data: [] }
    }));

    expect(model.data.state).toBe("degraded");
    expect(model.data.warnings).toEqual(expect.arrayContaining([
      { code: "public_shell.catalog_unavailable", source: "products" },
      { code: "public_shell.contact_unavailable", source: "contact" },
      { code: "public_shell.stores_unavailable", source: "stores" }
    ]));
    expect(model.data.header.whatsappHref).toContain("wa.me");
    expect(model.data.footer.companyLinks.some((item) => item.label === "Store PETTARANI")).toBe(true);
  });

  it("provides an explicit loading model for server-boundary fallbacks", () => {
    expect(buildLoadingPublicShellPageModel().data.state).toBe("loading");
  });

  it("returns a degraded fallback when the read use case cannot reach its sources", () => {
    const model = buildUnavailablePublicShellPageModel();

    expect(model.data.state).toBe("degraded");
    expect(model.data.warnings.map((warning) => warning.source)).toEqual([
      "products",
      "categories",
      "contact",
      "stores"
    ]);
  });

  it("executes the pure use case with an injected source reader", async () => {
    const model = await loadPublicShellPageModel(async () => source());

    expect(model.data.state).toBe("ready");
  });

  it("returns a degraded model when the injected source reader throws", async () => {
    const model = await loadPublicShellPageModel(async () => {
      throw new Error("source unavailable");
    });

    expect(model.data.state).toBe("degraded");
  });

  it("keeps raw entities and database access outside public UI components", () => {
    const footer = readFileSync("components/PublicFooter.tsx", "utf8");
    const header = readFileSync("components/SiteHeader.tsx", "utf8");
    const publicPage = readFileSync("components/PublicPage.tsx", "utf8");
    const model = readFileSync("lib/public-shell/model.ts", "utf8");
    const dataAccess = readFileSync("lib/public-shell/data-access.ts", "utf8");
    const useCase = readFileSync("lib/public-shell/use-case.ts", "utf8");
    const runtime = readFileSync("lib/public-shell/runtime.ts", "utf8");
    const barrel = readFileSync("lib/public-shell/index.ts", "utf8");

    expect(footer).not.toContain("@/lib/types");
    expect(footer).not.toContain("PublicContent");
    expect(header).not.toContain("@/lib/public-data");
    expect(publicPage).not.toContain("buildPublicNavigationFacets");
    expect(publicPage).not.toContain("content: PublicContent;\n  children");
    expect(model).not.toContain("@/lib/types");
    expect(model).not.toContain("@supabase");
    expect(dataAccess).toContain('import "server-only"');
    expect(dataAccess).not.toContain('.select("*")');
    expect(useCase).not.toContain('server-only');
    expect(useCase).not.toContain('from "react"');
    expect(runtime).toContain('import "server-only"');
    expect(runtime).toContain('cache(');
    expect(barrel).not.toContain('export * from "./data-access"');
    expect(barrel).not.toContain('export * from "./runtime"');
  });

  it("removes full public-content reads from shell-only pages", () => {
    const shellOnlyPages = [
      "app/custom/page.tsx",
      "app/custom/[category-slug]/page.tsx",
      "app/keranjang/page.tsx",
      "app/track-order/page.tsx",
      "app/track-order/[order-number]/page.tsx"
    ];

    shellOnlyPages.forEach((file) => {
      expect(readFileSync(file, "utf8")).not.toContain("getPublicContent");
    });
  });
});
