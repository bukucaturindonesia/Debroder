import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brochureProducts, getBrochureProduct } from "@/src/data/products";
import { brochureServices } from "@/src/data/services";

const home = readFileSync("app/page.tsx", "utf8");

describe("Owner-approved brochure homepage addendum", () => {
  it("renders the first-launch editorial sections in order", () => {
    const markers = [
      "<h1",
      "<ServiceSection />",
      'id="brochure-approach-title"',
      "<ProductSection />",
      'id="brochure-company-title"',
      "<ConsultationSection />"
    ];
    const positions = markers.map((marker) => {
      const index = home.indexOf(marker);
      expect(index, `missing brochure section: ${marker}`).toBeGreaterThan(-1);
      return index;
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("keeps first-launch brochure products empty without changing commerce authority", () => {
    expect(brochureProducts).toEqual([]);
    expect(getBrochureProduct("nsa-premium")).toBeUndefined();
    expect(getBrochureProduct("other-product")).toBeUndefined();
    expect(home).not.toContain("getPublicContent");
    expect(home).not.toContain("<StorefrontCartBoundary>");
  });

  it("keeps services limited to the owner's three requested offerings", () => {
    expect(brochureServices.map((service) => service.name)).toEqual(["Cetak DTF", "Produksi Jersey", "Maklon Sublim"]);
  });
});
