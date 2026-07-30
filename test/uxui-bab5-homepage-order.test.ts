import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("app/page.tsx", "utf8");

describe("UX/UI Bab 5 canonical Homepage composition", () => {
  it("keeps the frozen public section order", () => {
    const orderedMarkers = [
      "<HeroSlider",
      'landingSection("benefits")',
      'landingSection("trending")',
      'landingSection("campaign-banners")',
      'id="shop-category"',
      'landingSection("fresh-drop")',
      'id="pakaian-polos"',
      'id="tentang"',
      "<PublicFooter"
    ];

    const positions = orderedMarkers.map((marker) => {
      const index = home.indexOf(marker, home.indexOf("return ("));
      expect(index, `missing Homepage marker: ${marker}`).toBeGreaterThan(-1);
      return index;
    });

    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it("keeps CMS visibility/copy around sections while product cards remain data-driven", () => {
    expect(home).toContain("<LandingSectionSlot");
    expect(home).toContain("content.homepageSections.find");
    expect(home).toContain("content.products.filter");
    expect(home).toContain("preferredHomepageItems");
    expect(home).not.toContain("const hardcodedProducts");
  });
});
