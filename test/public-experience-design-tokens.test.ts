import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync("app/globals.css", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const tailwind = readFileSync("tailwind.config.ts", "utf8");
const productionContract = `${globals}\n${layout}\n${home}\n${tailwind}`;

const currentNeutralCompatibility = {
  "--color-canvas": "#ffffff",
  "--color-ink": "#111111",
  "--color-text-secondary": "#5f5f5f",
  "--color-surface-soft": "#f5f5f5",
  "--color-divider-soft": "#e5e5e5",
  "--color-border": "#cacaca"
} as const;

describe("DEBRODER Deep Modular UI foundation tokens", () => {
  it("uses Geist Sans through the Next.js font pipeline", () => {
    expect(globals).toContain(
      '--font-sans: var(--font-geist-sans), "Geist Sans", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;'
    );
    expect(globals).toContain("--font-heading: var(--font-sans);");
    expect(layout).toContain('import { Geist } from "next/font/google";');
    expect(layout).toContain("Geist({");
    expect(layout).toContain('variable: "--font-geist-sans"');
    expect(layout).not.toContain("Inter({");
  });

  it("keeps current neutral values centralized without finalizing the owner-open green", () => {
    for (const [token, value] of Object.entries(currentNeutralCompatibility)) {
      expect(globals).toContain(`${token}: ${value};`);
      expect(globals.match(new RegExp(`${token}:`, "g"))).toHaveLength(1);
    }

    expect(globals).toContain("Official DEBRODER green HEX and Green 50–950 remain OWNER OPEN.");
    expect(tailwind).toContain('green: "var(--color-brand-primary)"');
    expect(tailwind).toContain('greenDark: "var(--color-brand-primary)"');
  });

  it("defines the canonical typography, spacing, layout, radius, and dimension contract", () => {
    for (const token of [
      "--text-hero: 56px;",
      "--leading-hero: 62px;",
      "--text-h1: 40px;",
      "--leading-h1: 44px;",
      "--text-h2: 32px;",
      "--leading-h2: 38px;",
      "--text-h3: 24px;",
      "--leading-h3: 30px;",
      "--text-h4: 20px;",
      "--leading-h4: 26px;",
      "--text-body-lg: 18px;",
      "--leading-body-lg: 28px;",
      "--text-body: 16px;",
      "--leading-body: 24px;",
      "--text-commerce: 14px;",
      "--leading-commerce: 20px;",
      "--text-metadata: 13px;",
      "--leading-metadata: 18px;",
      "--text-caption: 12px;",
      "--leading-caption: 16px;",
      "--container-max: 1280px;",
      "--content-gutter-small-mobile: 14px;",
      "--content-gutter: 16px;",
      "--radius-xl: 20px;",
      "--radius-full: 999px;",
      "--control-sm: 36px;",
      "--control-md: 44px;",
      "--control-lg: 48px;",
      "--control-xl: 52px;",
      "--nav-desktop: 72px;",
      "--nav-tablet: 64px;",
      "--nav-mobile: 58px;",
      "--sidebar-admin: 248px;",
      "--sidebar-admin-collapsed: 72px;",
      "--topbar-admin: 64px;"
    ]) {
      expect(globals, `missing token ${token}`).toContain(token);
    }

    expect(globals).not.toContain("--space-36: 144px;");
    expect(globals).toContain("outline: var(--focus-ring-width) solid var(--color-info-focus);");
  });

  it("keeps canonical responsive gutters and grid gaps at the shared foundation", () => {
    for (const breakpoint of [640, 768, 1024, 1280]) {
      expect(globals).toContain(`@media (min-width: ${breakpoint}px)`);
    }

    expect(globals).toContain("--content-gutter: 24px;");
    expect(globals).toContain("--content-gutter: 32px;");
    expect(globals).not.toContain("--content-gutter: 48px;");
    expect(globals).not.toContain("--content-gutter: 64px;");
    expect(globals).toContain("--grid-gap: 20px;");
    expect(globals).toContain("--grid-gap: 24px;");
  });

  it("defines canonical motion and stacking tokens without regressing current drawer layering", () => {
    for (const token of [
      "--duration-fast: 180ms;",
      "--duration-base: 220ms;",
      "--duration-slow: 280ms;",
      "--duration-overlay: 320ms;",
      "--ease-enter: ease-out;",
      "--z-content: 0;",
      "--z-sticky: 10;",
      "--z-nav: 20;",
      "--z-dropdown: 30;",
      "--z-drawer: 40;",
      "--z-overlay: 50;",
      "--z-modal: 60;",
      "--z-toast: 70;",
      "--z-critical: 80;",
      "--z-legacy-backdrop: var(--z-drawer);",
      "--z-legacy-drawer-surface: var(--z-overlay);"
    ]) {
      expect(globals, `missing token ${token}`).toContain(token);
    }
  });

  it("keeps public consumers connected to the shared contract", () => {
    expect(globals).toContain("--landing-content-max: var(--content-max);");
    expect(globals).toContain("--landing-page-gutter: var(--content-gutter);");
    expect(globals).toContain("--category-canvas: var(--color-canvas);");
    expect(globals).toContain("max-width: var(--content-max);");
    expect(home).toContain("bg-experience-canvas text-experience-ink");
    expect(tailwind).toContain('canvas: "var(--color-canvas)"');
    expect(tailwind).toContain('focus: "var(--color-info-focus)"');
  });

  it("keeps the external reference implementation out of production", () => {
    expect(productionContract).not.toMatch(/landing-nike/i);
    expect(productionContract).not.toMatch(/static\.nike|nike\.com|swoosh/i);
    expect(productionContract).not.toMatch(/@font-face[\s\S]*?nike/i);
    expect(home).toContain("debroder-landing");
  });
});
