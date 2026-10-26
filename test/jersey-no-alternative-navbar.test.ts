import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const text = (path: string) => readFileSync(join(root, path), "utf8");

const routes = [
  "app/jersey/page.tsx",
  "app/jersey/shop/page.tsx",
  "app/jersey/configurator/page.tsx",
  "app/produk/[slug]/page.tsx",
  "components/jersey/JerseyExperience.tsx"
];

describe("Jersey: no alternative navbar", () => {
  it("removes both legacy Jersey navbar components and definitions", () => {
    expect(existsSync(join(root, "components/jersey/JerseyChrome.tsx"))).toBe(false);
    expect(existsSync(join(root, "components/jersey/JerseyCommerceNav.tsx"))).toBe(false);
    for (const path of routes) {
      expect(text(path)).not.toMatch(/JerseyChrome|JerseyCommerceNav|data-ui-context-tabs/);
    }
    expect(text("lib/jersey-experience.ts")).not.toContain("JERSEY_NAV_ITEMS");
    expect(text("lib/jersey-commerce.ts")).not.toContain("JERSEY_COMMERCE_NAV_ITEMS");
  });

  it("retains the regular site shell and essential Jersey customer journeys", () => {
    for (const route of routes.slice(0, 3)) expect(text(route)).toContain("<PublicShell");
    expect(text("components/jersey/JerseyExperience.tsx")).toContain('href="/jersey/shop"');
    expect(text("components/jersey/JerseyExperience.tsx")).toContain('href="/jersey/configurator"');
    expect(text("app/jersey/shop/page.tsx")).toContain("ProductCatalog");
    expect(text("app/jersey/configurator/page.tsx")).toContain("JerseyConfigurator");
    expect(text("app/produk/[slug]/page.tsx")).toContain('aria-label="Breadcrumb"');
  });
});
