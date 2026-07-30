import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("DEBRODER product catalog and PDP clickability", () => {
  it("keeps every public Product Card inside one full-height semantic link", () => {
    const card = read("components/PublicProductCard.tsx");

    expect(card.match(/<Link\b/g)).toHaveLength(1);
    expect(card).toContain("public-product-card h-full");
    expect(card).toContain("public-product-card-link group flex h-full");
    expect(card).not.toMatch(/preventDefault|stopPropagation|onClick=/);
  });

  it("keeps discovery URL state refreshable and restores browser history", () => {
    const catalog = read("components/ProductCatalog.tsx");

    expect(catalog).toContain("window.history.pushState");
    expect(catalog).toContain('window.addEventListener("popstate", restoreUrlState)');
    expect(catalog).toContain("productTypeValue(productType, productTypeOptions)");
    expect(catalog).toContain(
      "matchesProductType(product, activeProductType, productTypeOptions)"
    );
  });

  it("connects canonical PDP capabilities to Buy Now and Custom actions", () => {
    const page = read("app/produk/[slug]/page.tsx");
    const panel = read("components/TieredProductPurchasePanel.tsx");

    expect(page).toContain("showBuyNow={purchaseCapabilities.showBuyNow}");
    expect(page).toContain("customActionHref={customActionHref}");
    expect(panel).toContain("function buySelectedNow()");
    expect(panel).toContain('router.push("/checkout")');
    expect(panel).toMatch(/>\s*Beli Sekarang\s*<\/button>/);
    expect(panel).toMatch(/>\s*Custom\s*<\/Link>/);
    expect(panel).not.toContain("Pilihan layanan");
    expect(panel).not.toContain("Custom Instan");
  });

  it("keeps product information in the right column and the gallery sticky", () => {
    const page = read("app/produk/[slug]/page.tsx");
    const sticky = read("components/product/ProductStickyPurchasePanel.tsx");

    expect(page).toContain("data-pdp-purchase-column");
    expect(page.indexOf("product-information-title")).toBeLessThan(
      page.indexOf("</ProductVariantGalleryProvider>")
    );
    expect(sticky).toContain("[data-public-header]");
    expect(sticky).toContain("data-pdp-sticky-gallery");
    expect(sticky).toContain("lg:top-[var(--pdp-sticky-top)]");
  });
});
