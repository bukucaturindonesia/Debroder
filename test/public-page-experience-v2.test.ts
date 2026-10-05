import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("public page experience V2", () => {
  it("attaches every desktop mega dropdown to the measured navbar bottom with zero vertical gap", () => {
    const header = read("components/header/SiteHeaderClient.tsx");
    const mega = header.slice(header.indexOf("function MegaDropdown"), header.indexOf("export function SiteHeaderClient"));

    expect(header).toContain("header.getBoundingClientRect().height");
    expect(header).toContain("new ResizeObserver");
    expect(mega).toContain("top: dropdownTop");
    expect(mega).toContain("data-mega-dropdown");
    expect(mega).not.toContain("top-[72px]");
    expect(mega).not.toContain("pt-3");
    expect(mega).not.toContain("translate-y");
    expect(mega).not.toContain("margin");
  });

  it("puts the product-backed quick navigation and catalog before CMS campaign content", () => {
    const discovery = read("components/CategoryCommerceCatalog.tsx");
    const page = read("components/CategoryCommercePage.tsx");
    const catalog = read("components/ProductCatalog.tsx");
    const batches = read("lib/product-catalog.ts");

    expect(discovery).toContain('aria-label={shortcutLabel}');
    expect(discovery).toContain("products.some((product) => matchesProductType");
    expect(discovery).toContain("backedProductTypeOptions.map");
    expect(discovery.indexOf('id="catalog"')).toBeLessThan(discovery.indexOf('aria-label="Cerita dan campaign"'));
    expect(page).toContain("CommercePageIntro");
    expect(catalog).toContain("md:grid-cols-3");
    expect(catalog).toContain("lg:grid-cols-4");
    expect(batches).toContain("return 12");
  });

  it("places Koleksi route navigation directly before the shared complete catalog", () => {
    const page = read("app/koleksi/page.tsx");
    const experience = read("components/CollectionCommerceExperience.tsx");

    expect(page).toContain("<CollectionCommerceExperience");
    expect(experience).toContain('href: "/kaos-polos"');
    expect(experience).toContain('href: "/jersey"');
    expect(experience).toContain("Semua produk");
    expect(experience).toContain("<ProductCatalog");
    expect(experience).not.toContain("Koleksi pilihan");
    expect(experience).not.toContain("supabase");
    expect(experience.indexOf("<ProductCatalog")).toBeLessThan(experience.indexOf('aria-label="Campaign koleksi"'));
  });

  it("separates Custom T-Shirt and Jersey Custom while preserving official transaction paths", () => {
    const page = read("app/custom/page.tsx");
    const hub = read("components/custom/CustomHub.tsx");

    expect(page).toContain("getCatalogPageModel");
    expect(hub).toContain("Custom T-Shirt");
    expect(hub).toContain("Jersey Custom");
    expect(hub).toContain("/jersey/configurator");
    expect(hub).toContain("Order dibuat sebelum pembayaran");
    expect(hub).toContain("categoryHref(category)");
    expect(hub).not.toContain("wa.me");
  });

  it("keeps the Custom gateway compact and on the shared storefront surface", () => {
    const hub = read("components/custom/CustomHub.tsx");
    expect(hub).toContain("Pilih jalur pesanan custom");
    expect(hub).toContain("Jersey Configurator");
    expect(hub).not.toContain("bg-black py-12 text-white");
  });

  it("keeps DTF service details as the primary path and WhatsApp as consultation", () => {
    const cards = read("components/ServiceCatalog.tsx");
    const detail = read("app/sablon-dtf/[slug]/page.tsx");
    expect(cards).toContain("Lihat detail");
    expect(cards).toContain("Konsultasi");
    expect(cards).not.toContain(">Pesan</a>");
    expect(detail).toContain('ctaText="Konsultasi via WhatsApp"');
  });

  it("publishes accessible legal drafts at existing canonical routes without claiming legal approval", () => {
    const terms = read("app/legal/terms/page.tsx");
    const privacy = read("app/legal/privacy/page.tsx");
    const document = read("components/legal/LegalDocumentPage.tsx");
    const content = read("lib/legal-content.ts");

    expect(terms).toContain('canonical: "/legal/terms"');
    expect(privacy).toContain('canonical: "/legal/privacy"');
    expect(terms).toContain("index: false");
    expect(privacy).toContain("index: false");
    expect(document).toContain("belum disetujui secara hukum");
    expect(document).toContain("Belum siap dipublikasikan sebagai kebijakan final");
    expect(content).toContain("wajib diisi");
    expect(content).not.toContain("LEGALLY APPROVED");
  });

  it("keeps the existing canonical About route and footer integration", () => {
    const about = read("app/tentang/page.tsx");
    const routes = read("lib/public-routes.ts");
    const footer = read("lib/public-shell/domain.ts");

    expect(about).toContain('canonical: "/tentang"');
    expect(routes).toContain('about: "/tentang"');
    expect(routes).not.toContain('"/tentang-debroder"');
    expect(footer).toContain("PUBLIC_ROUTES.about");
    expect(footer).toContain("PUBLIC_ROUTES.terms");
    expect(footer).toContain("PUBLIC_ROUTES.privacy");
  });
});
