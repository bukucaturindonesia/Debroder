import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("app/page.tsx", "utf8");

describe("UX/UI Bab 5 canonical Homepage composition", () => {
  it("keeps the frozen public section order", () => {
    const orderedMarkers = [
      "<HeroSlider",
      'landingSection("benefits")',
      'landingSection("featured-products")',
      'landingSection("trending")',
      'landingSection("campaign-banners")',
      'landingSection("fresh-drop")',
      'id="shop-category"',
      'landingSection("stores")',
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

  it("renders the canonical Featured and Store/Cara Order sections without the legacy plain-category section", () => {
    expect(home).toContain("<ManagedHomepageSection section={managedSection} setting={setting} />");
    expect(home).toContain("<PublicStoreLocator stores={stores} />");
    expect(home).toContain('href="/cara-order"');
    expect(home).not.toContain('id="pakaian-polos"');
    expect(home).not.toContain("plainCategoryItems");
  });

  it("keeps CMS visibility/copy around sections while product cards remain data-driven", () => {
    expect(home).toContain("<LandingSectionSlot");
    expect(home).toContain("content.homepageSections.find");
    expect(home).toContain("content.products.filter");
    expect(home).toContain("preferredHomepageItems");
    expect(home).not.toContain("const hardcodedProducts");
  });
});
