import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brochureProducts, getBrochureProduct } from "@/src/data/products";
import { brochureServices } from "@/src/data/services";

const home = readFileSync("app/page.tsx", "utf8");

describe("Owner-approved brochure homepage addendum", () => {
  it("renders the new editorial sections in the approved order", () => {
    const markers = [
      "<h1",
      "<ProductSection />",
      "<ServiceSection />",
      'id="values-heading"',
      'id="portfolio-heading"',
      "<ConsultationSection />"
    ];
    const positions = markers.map((marker) => {
      const index = home.indexOf(marker);
      expect(index, `missing brochure section: ${marker}`).toBeGreaterThan(-1);
      return index;
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("has exactly two consultation-only editorial products, without commerce fields", () => {
    expect(brochureProducts.map((product) => product.slug)).toEqual(["nsa-premium", "cotton-combed-24s"]);
    expect(getBrochureProduct("nsa-premium")?.name).toBe("NSA PREMIUM");
    expect(getBrochureProduct("other-product")).toBeUndefined();
    for (const product of brochureProducts) {
      expect(product.image.startsWith("/")).toBe(true);
      expect(product).not.toHaveProperty("sku");
      expect(product).not.toHaveProperty("price");
    }
    expect(home).not.toContain("getPublicContent");
    expect(home).not.toContain("<StorefrontCartBoundary>");
  });

  it("keeps services limited to the owner's three requested offerings", () => {
    expect(brochureServices.map((service) => service.name)).toEqual(["Cetak DTF", "Produksi Jersey", "Maklon Sublim"]);
  });
});
