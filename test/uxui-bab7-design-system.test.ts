import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const globals = read("app/globals.css");

describe("UX/UI Bab 7 Design System V1.1", () => {
  it("uses Inter through the Next.js font pipeline and removes the obsolete display family", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain('from "next/font/google"');
    expect(layout).toContain("Inter({");
    expect(layout).toContain('weight: ["400", "500", "600", "700", "800"]');
    expect(layout).toContain('display: "swap"');
    expect(globals).not.toMatch(/Barlow|Arial Narrow|Helvetica Neue Condensed/);
  });

  it("defines the frozen V1.1 typography, color, spacing, radius, motion, and z-index tokens centrally", () => {
    for (const token of [
      "--text-hero: clamp(2.75rem, 6vw, 5rem);",
      "--brand-500: #063d24;",
      "--neutral-600: #5f5f5f;",
      "--success: #0a7a43;",
      "--space-36: 144px;",
      "--radius-xl: 24px;",
      "--radius-pill: 9999px;",
      "--duration-fast: 120ms;",
      "--duration-overlay: 320ms;",
      "--container-max: 1440px;",
      "--z-sticky: 20;",
      "--z-modal: 60;"
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

  it("uses semantic layer tokens for the public shell and commerce overlays", () => {
    expect(read("components/header/SiteHeaderClient.tsx")).toContain("z-[var(--z-sticky)]");
    expect(read("components/header/HeaderSearchModal.tsx")).toContain("z-[var(--z-modal)]");
    expect(read("components/ProductCatalog.tsx")).toContain("z-[var(--z-drawer)]");
    expect(read("components/CartProvider.tsx")).toContain("z-[var(--z-overlay)]");
  });
});
