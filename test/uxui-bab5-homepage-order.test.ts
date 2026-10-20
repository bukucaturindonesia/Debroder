import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("app/page.tsx", "utf8");

describe("UX/UI Bab 5 canonical Homepage composition", () => {
  it("keeps the owner-approved public section order with consultation before About", () => {
    const orderedMarkers = [
      "<HeroSlider",
      'landingSection("benefits")',
      'landingSection("featured-products")',
      'landingSection("trending")',
      'landingSection("campaign-banners")',
      'landingSection("fresh-drop")',
      'id="shop-category"',
      'landingSection("stores")',
      'aria-labelledby="consultation-heading"',
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

  it("preserves product discovery and stores while replacing the order guide with WhatsApp consultation", () => {
    expect(home).toContain("<ManagedHomepageSection section={managedSection} setting={setting} />");
    expect(home).toContain("<PublicStoreLocator stores={stores} />");
    expect(home).toContain('title="Produk Pilihan"');
    expect(home).toContain('title="Sedang Tren"');
    expect(home).toContain('title="Kunjungi Toko Debroder"');
    expect(home).toContain("Bingung Mau Mulai dari Mana?");
    expect(home).toContain("Ceritakan kebutuhan kaos, sablon, atau jersey custom kamu. Tim Debroder siap membantu lewat WhatsApp.");
    expect(home).toContain('href={whatsappHref}');
    expect(home).toContain("content.contact.whatsapp_link || content.contact.whatsapp_utama");
    expect(home).not.toContain('href="/cara-order"');
    expect(home).not.toContain("home-quick-categories");
    expect(home).not.toContain("home-section home-order");
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
