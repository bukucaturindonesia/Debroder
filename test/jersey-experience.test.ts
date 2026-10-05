import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  JERSEY_ORDER_STEPS,
  JERSEY_NAV_ITEMS,
  JERSEY_SECTION_TYPES,
  jerseyFallbackSections,
  safeJerseyHref,
  validJerseyHref
} from "@/lib/jersey-experience";

describe("Jersey commerce experience", () => {
  it("keeps the frozen content sequence and seven order steps", () => {
    expect(JERSEY_SECTION_TYPES).toEqual([
      "poster_carousel",
      "centered_editorial_copy",
      "split_campaign",
      "wide_campaign",
      "custom_cta",
      "order_steps",
      "closing_campaign"
    ]);
    expect(JERSEY_ORDER_STEPS).toHaveLength(7);
    const fallback = jerseyFallbackSections(undefined, []);
    expect(fallback.filter((item) => item.section_type === "split_campaign")).toHaveLength(4);
    expect(fallback.filter((item) => item.section_type === "poster_carousel")).toHaveLength(14);
    expect(fallback.filter((item) => item.section_type === "centered_editorial_copy")).toHaveLength(1);
    expect(fallback.some((item) => item.section_type === "team_package_campaign")).toBe(false);
    expect(JERSEY_NAV_ITEMS.map((item) => String(item.label))).not.toContain("Paket Tim");
  });

  it("allows only official Jersey commerce targets", () => {
    expect(safeJerseyHref("/jersey/shop", "/jersey")).toBe("/jersey/shop");
    expect(safeJerseyHref("/jersey/configurator", "/jersey")).toBe("/jersey/configurator");
    expect(safeJerseyHref("/produk/jersey-home", "/jersey")).toBe("/produk/jersey-home");
    expect(safeJerseyHref("/jersey/route-yang-tidak-ada", "/jersey/shop")).toBe("/jersey/shop");
    expect(safeJerseyHref("/custom/form", "/jersey/configurator")).toBe("/jersey/configurator");
    expect(validJerseyHref("#anchor-yang-tidak-ada")).toBeNull();
    expect(validJerseyHref("/jersey#paket-tim")).toBeNull();
    expect(validJerseyHref("/jersey#jersey-carousel-01")).toBe("/jersey#jersey-carousel-01");
  });

  it("separates inspiration, catalog, product detail, and configurator routes", () => {
    const landing = readFileSync("app/jersey/page.tsx", "utf8");
    const shop = readFileSync("app/jersey/shop/page.tsx", "utf8");
    const card = readFileSync("components/PublicProductCard.tsx", "utf8");
    const configurator = readFileSync("app/jersey/configurator/page.tsx", "utf8");
    expect(landing).not.toContain("ProductCatalog");
    expect(shop).toContain("ProductCatalog");
    expect(shop).toContain('catalogProfile="jersey"');
    expect(shop).toContain('href="/jersey/configurator"');
    expect(card).toContain("return `/produk/${product.slug");
    expect(configurator).toContain("JerseyConfigurator");
  });

  it("keeps Jersey campaign CMS presentation-only", () => {
    const migration = readFileSync("supabase/migrations/20260713143000_commerce_jersey_experience.sql", "utf8");
    const addendumMigration = readFileSync("supabase/migrations/20260713223000_jersey_owner_approved_experience_addendum.sql", "utf8");
    const adminNav = readFileSync("components/admin/layout/admin-navigation.ts", "utf8");
    expect(migration).toContain("experience_key");
    expect(migration).toContain("section_type");
    expect(migration).not.toMatch(/add column if not exists (price|sku|stock|variant)/);
    expect(addendumMigration).toContain("centered_editorial_copy");
    expect(addendumMigration).toContain("section_group");
    expect(addendumMigration).not.toMatch(/add column if not exists (price|sku|stock|variant)/);
    expect(adminNav).toContain("/admin/commerce/jersey");
  });

  it("keeps the Jersey hub compact with fixed shop and configurator routes", () => {
    const landing = readFileSync("app/jersey/page.tsx", "utf8");
    const experience = readFileSync("components/jersey/JerseyExperience.tsx", "utf8");
    const chrome = readFileSync("components/jersey/JerseyChrome.tsx", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");
    expect(landing).toContain('theme="jersey"');
    expect(experience).toContain('href="/jersey/shop"');
    expect(experience).toContain('href="/jersey/configurator"');
    expect(experience).toContain("resolvedJerseySections");
    expect(experience).toContain("poster_carousel");
    expect(chrome).toContain("jersey-context-header");
    expect(styles).toContain("--jersey-section-gap");
    expect(styles).toContain("#39ff88");
  });

  it("keeps Jersey CMS campaign content presentation-only and routes to approved commerce", () => {
    const carousel = readFileSync("components/jersey/JerseyCarousel.tsx", "utf8");
    const experience = readFileSync("components/jersey/JerseyExperience.tsx", "utf8");

    expect(carousel).toContain("validJerseyHref(item.cta_url)");
    expect(experience).toContain("item.subtitle");
    expect(experience).toContain("item.eyebrow");
    expect(experience).toContain('href="/jersey/configurator"');
    expect(experience).not.toContain("wa.me");
  });

  it("removes the legacy Paket Tim block and keeps compact CMS ordering information", () => {
    const experience = readFileSync("components/jersey/JerseyExperience.tsx", "utf8");
    const chrome = readFileSync("components/jersey/JerseyChrome.tsx", "utf8");
    const footer = readFileSync("components/PublicFooter.tsx", "utf8");
    const order = experience.slice(experience.indexOf("function OrderSteps"), experience.indexOf("function firstByType"));

    expect(experience).not.toContain("packageCampaign");
    expect(experience).not.toContain('id="paket-tim"');
    expect(experience).toContain("Cara order");
    expect(order).toContain("steps.slice(0, 4)");
    expect(order).not.toContain("item.subtitle");
    expect(chrome).not.toContain("border-b border-white/12");
    expect(chrome).not.toContain("border-t border-white/10");
    expect(chrome).toContain("group-hover:scale-x-100");
    expect(chrome).toContain("group-focus-visible:scale-x-100");
    expect(chrome).not.toContain('active ? "scale-x-100"');
    expect(footer).toContain("data-public-footer");
    expect(footer).toContain("bg-black text-white");
  });

  it("provides reserved-ratio loading and a recoverable Jersey error state", () => {
    const loading = readFileSync("app/jersey/loading.tsx", "utf8");
    const error = readFileSync("app/jersey/error.tsx", "utf8");
    expect(loading).toContain("aspect-[4/5]");
    expect(loading).toContain("motion-reduce:animate-none");
    expect(error).toContain("reset");
    expect(error).toContain('href="/jersey/shop"');
  });
});
