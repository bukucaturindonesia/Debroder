import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/produk/[slug]/page.tsx", "utf8");
const gallery = readFileSync("components/ProductGallery.tsx", "utf8");
const purchasePanel = readFileSync(
  "components/TieredProductPurchasePanel.tsx",
  "utf8"
);
const disclosure = readFileSync(
  "components/product/ProductDetailDisclosure.tsx",
  "utf8"
);

describe("PDP Ready Stock visual and scroll refinement", () => {
  it("owns desktop sticky behavior in a viewport-safe purchase panel", () => {
    const sticky = readFileSync(
      "components/product/ProductStickyPurchasePanel.tsx",
      "utf8"
    );
    expect(page).toContain("data-pdp-primary");
    expect(page).toContain("data-pdp-media");
    expect(page).not.toContain("data-pdp-sticky-media");
    expect(sticky).toContain("ResizeObserver");
    expect(sticky).toContain("panelHeight <= usableHeight");
    expect(sticky).toContain("lg:sticky lg:top-24");
  });

  it("uses one dominant desktop media surface and an accessible thumbnail rail", () => {
    expect(gallery).toContain("grid-cols-[72px_minmax(0,1fr)]");
    expect(gallery).toContain("max-h-[calc(100vh-7.5rem)]");
    expect(gallery).toContain("overflow-y-auto");
    expect(gallery).toContain("aria-pressed={selected}");
    expect(gallery).toContain("resolvedImages[displayedIndex]");
    expect(gallery).not.toContain('className="hidden grid-cols-2 gap-2 lg:grid"');
    expect(gallery).toContain('className="lg:hidden"');
  });

  it("keeps one keyboard-operable disclosure system and hides empty guide data", () => {
    expect(disclosure).toContain('type="button"');
    expect(disclosure).toContain("aria-expanded={expanded}");
    expect(disclosure).toContain("aria-controls={panelId}");
    expect(disclosure).toContain("hidden={!expanded}");
    expect(page).toContain('title="Deskripsi Produk"');
    expect(page).toContain('title="Material & Detail"');
    expect(page).toContain('title="Panduan Ukuran"');
    expect(purchasePanel).not.toContain(
      "Sesuaikan dengan panduan ukuran produk ini."
    );
  });

  it("preserves canonical purchase commands while improving selector semantics", () => {
    expect(purchasePanel).toContain("aria-pressed={selected}");
    expect(purchasePanel).toContain("pdpColorOptions(variants)");
    expect(purchasePanel).toContain("grid grid-cols-3");
    expect(purchasePanel).toContain("cart.addItem({");
    expect(purchasePanel).toContain("focusFirstInvalidControl");
    expect(purchasePanel).not.toContain('router.push("/checkout")');
  });
});
