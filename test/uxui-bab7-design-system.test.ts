import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const globals = read("app/globals.css");

describe("DEBRODER Deep Modular UI System foundation", () => {
  it("uses Geist Sans through the Next.js font pipeline", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain('from "next/font/google"');
    expect(layout).toContain("Geist({");
    expect(layout).toContain('display: "swap"');
    expect(layout).toContain('variable: "--font-geist-sans"');
    expect(globals).not.toMatch(/Barlow|Arial Narrow|Helvetica Neue Condensed/);
  });

  it("defines canonical typography, spacing, radius, motion, dimensions, and z-index tokens centrally", () => {
    for (const token of [
      "--text-hero: 56px;",
      "--leading-hero: 62px;",
      "--space-30: 120px;",
      "--radius-xl: 20px;",
      "--radius-full: 999px;",
      "--control-md: 44px;",
      "--control-lg: 48px;",
      "--control-xl: 52px;",
      "--duration-fast: 180ms;",
      "--duration-base: 220ms;",
      "--duration-slow: 280ms;",
      "--duration-overlay: 320ms;",
      "--container-max: 1280px;",
      "--z-sticky: 10;",
      "--z-nav: 20;",
      "--z-drawer: 40;",
      "--z-overlay: 50;",
      "--z-modal: 60;",
      "--z-critical: 80;"
    ]) {
      expect(globals, `missing token ${token}`).toContain(token);
    }
  });

  it("keeps public overlays keyboard-contained with Escape, scroll lock, and focus restoration", () => {
    const header = read("components/header/SiteHeaderClient.tsx");
    const search = read("components/header/HeaderSearchModal.tsx");
    const cart = read("components/CartProvider.tsx");
    const recommendation = read("components/ProductRecommendationDrawer.tsx");
    const sources = [header, search, cart, recommendation];

    for (const source of sources) {
      expect(source).toContain('event.key === "Escape"');
      expect(source).toContain('document.body.style.overflow = "hidden"');
      expect(source).toContain('event.key !== "Tab"');
      expect(source).toMatch(/\.focus\(\)/);
    }
  });

  it("uses canonical shell layers and bounded compatibility aliases for legacy drawer composition", () => {
    expect(read("components/header/SiteHeaderClient.tsx")).toContain("z-[var(--z-nav)]");
    expect(read("components/header/HeaderSearchModal.tsx")).toContain("z-[var(--z-modal)]");
    expect(read("components/ProductCatalog.tsx")).toContain("z-[var(--z-legacy-backdrop)]");
    expect(read("components/ProductCatalog.tsx")).toContain("z-[var(--z-legacy-drawer-surface)]");
    expect(read("components/CartProvider.tsx")).toContain("z-[var(--z-legacy-backdrop)]");
    expect(read("components/CartProvider.tsx")).toContain("z-[var(--z-legacy-drawer-surface)]");
  });
});
