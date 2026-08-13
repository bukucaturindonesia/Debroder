import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const styles = read("app/globals.css");

describe("DEBRODER public UI foundation normalization V1", () => {
  it("defines the proposed canonical container, rhythm, grid, card, and radius tokens", () => {
    for (const token of [
      "--public-container-max: 1280px;",
      "--public-gutter-desktop: 48px;",
      "--public-gutter-laptop: 32px;",
      "--public-gutter-tablet: 24px;",
      "--public-gutter-mobile: 20px;",
      "--public-gutter-mobile-sm: 16px;",
      "--public-section-space-desktop: 64px;",
      "--public-section-space-laptop: 56px;",
      "--public-section-space-tablet: 48px;",
      "--public-section-space-mobile: 40px;",
      "--public-grid-gap-desktop: 20px;",
      "--public-grid-gap-tablet: 16px;",
      "--public-grid-gap-mobile: 12px;",
      "--public-card-content-gap: 14px;",
      "--public-card-content-gap-mobile: 10px;",
      "--public-radius-product: 2px;",
      "--public-radius-functional: 8px;",
      "--public-radius-control: 4px;"
    ]) {
      expect(styles, `missing normalization token ${token}`).toContain(token);
    }
  });

  it("applies one geometry layer to every shared public shell", () => {
    expect(styles).toContain(".debroder-storefront .section-shell");
    expect(styles).toContain(".debroder-storefront .public-section-frame");
    expect(styles).toContain("calc(100% - (var(--storefront-gutter) * 2))");
    expect(styles).toContain(".debroder-storefront .public-footer-system-v1 > .section-shell");
  });

  it("uses canonical product, editorial, campaign, and product-rail grid hooks", () => {
    expect(read("components/ProductCatalog.tsx")).toContain("data-ui-grid={isKaosEditorial ? \"editorial-product\" : \"product\"}");
    expect(read("components/CategoryCommerceCatalog.tsx")).toContain('data-ui-grid="product-rail"');
    expect(read("components/CollectionCommerceExperience.tsx")).toContain('data-ui-grid="product-rail"');
    expect(read("components/jersey/JerseyShopCatalog.tsx")).toContain('data-ui-grid="product"');
    expect(read("app/page.tsx")).toContain('data-ui-grid="campaign"');
    expect(read("app/page.tsx")).toContain('data-ui-grid="editorial"');
    expect(read("app/page.tsx")).toContain('data-ui-grid="product-rail"');
  });

  it("keeps Jersey as a content exception without a second public shell geometry", () => {
    expect(read("components/PublicPage.tsx")).toContain("jersey-theme bg-brand-offWhite text-brand-charcoal");
    expect(styles).toContain(".debroder-storefront.jersey-theme .jersey-shell");
    expect(styles).toContain(".debroder-storefront.jersey-theme .jersey-section");
    expect(styles).toContain(".jersey-theme .keep-section-bg");
    expect(styles).not.toContain(".jersey-theme section,\n.jersey-theme .section-canvas");
    expect(read("app/jersey/loading.tsx")).toContain("bg-brand-offWhite text-brand-charcoal");
    expect(read("app/jersey/error.tsx")).toContain("bg-brand-offWhite");
  });

  it("marks public loading and recovery boundaries for the same foundation", () => {
    for (const path of [
      "app/loading.tsx",
      "app/error.tsx",
      "app/not-found.tsx",
      "app/produk/[slug]/loading.tsx",
      "app/produk/[slug]/error.tsx",
      "app/track-order/[order-number]/loading.tsx",
      "app/track-order/[order-number]/error.tsx",
      "app/jersey/loading.tsx",
      "app/jersey/error.tsx",
      "app/jersey/shop/loading.tsx",
      "app/jersey/shop/error.tsx"
    ]) {
      expect(read(path), `missing canonical state marker in ${path}`).toContain('data-ui-system="canonical"');
    }
  });
});
