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

  it("keeps category discovery and catalog quantities aligned to the locked specification", () => {
    const discovery = read("components/CategoryCommerceCatalog.tsx");
    const catalog = read("components/ProductCatalog.tsx");
    const batches = read("lib/product-catalog.ts");
    const hero = read("components/PublicPage.tsx");

    expect(discovery).toContain(".slice(0, 7)");
    expect(discovery).toContain(".slice(0, 4)");
    expect(discovery).toContain("candidates.length >= 3");
    expect(catalog).toContain("md:grid-cols-3");
    expect(catalog).toContain("lg:grid-cols-4");
    expect(batches).toContain("return 12");
    expect(hero).toContain('variant?: "default" | "category"');
    expect(hero).toContain("h-[280px]");
    expect(hero).toContain("sm:h-[340px]");
    expect(hero).toContain("lg:h-[420px]");
  });

  it("builds Koleksi as discovery, curated, latest, and complete catalog without a new database category", () => {
    const page = read("app/koleksi/page.tsx");
    const experience = read("components/CollectionCommerceExperience.tsx");

    expect(page).toContain("<CollectionCommerceExperience");
    expect(experience).toContain("Belanja berdasarkan kategori");
    expect(experience).toContain("Koleksi pilihan");
    expect(experience).toContain("Produk terbaru");
    expect(experience).toContain("Semua produk");
    expect(experience).toContain("<ProductCatalog");
    expect(experience).not.toContain("supabase");
  });

  it("separates Custom T-Shirt and Jersey Custom while preserving official transaction paths", () => {
    const page = read("app/custom/page.tsx");
    const hub = read("components/custom/CustomHub.tsx");

    expect(page).toContain("getCatalogPageModel");
    expect(hub).toContain("Custom T-Shirt");
    expect(hub).toContain("Jersey Custom");
    expect(hub).toContain("/jersey/configurator");
    expect(hub).toContain("Order sebelum pembayaran");
    expect(hub).toContain("customSteps.map");
    expect(hub).not.toContain("wa.me");
  });

  it("keeps the Custom capability copy on its intended dark surface with readable contrast", () => {
    const hub = read("components/custom/CustomHub.tsx");
    const capabilityStart = hub.indexOf('<section className="keep-section-bg bg-black');
    const capability = hub.slice(capabilityStart, hub.indexOf("</section>", capabilityStart) + "</section>".length);

    expect(capabilityStart).toBeGreaterThan(-1);
    expect(capability).toContain('text-white/75">Satu alur transaksi');
    expect(capability).toContain('className="mt-3 max-w-4xl text-white text-[clamp(2.3rem,5vw,5rem)]');
    expect(capability).toContain("Dari kebutuhan sampai produksi, setiap keputusan tetap tercatat.");
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
