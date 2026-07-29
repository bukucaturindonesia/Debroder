import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync("app/globals.css", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const tailwind = readFileSync("tailwind.config.ts", "utf8");
const productionContract = `${globals}\n${home}\n${tailwind}`;

const frozenColors = {
  "--color-canvas": "#ffffff",
  "--color-ink": "#111111",
  "--color-text-secondary": "#5f5f5f",
  "--color-surface-soft": "#f5f5f5",
  "--color-divider-soft": "#e5e5e5",
  "--color-border": "#cacaca"
} as const;

describe("DEBRODER Public Experience P0 design tokens", () => {
  it("defines the frozen color contract once at the global root", () => {
    for (const [token, value] of Object.entries(frozenColors)) {
      expect(globals).toContain(`${token}: ${value};`);
      expect(globals.match(new RegExp(`${token}:`, "g"))).toHaveLength(1);
    }

    expect(globals).toContain("--font-sans: var(--font-inter), Inter, Arial, Helvetica, sans-serif;");
    expect(globals).toContain("--font-heading: var(--font-sans);");
    expect(readFileSync("app/layout.tsx", "utf8")).toContain("Inter({");
  });

  it("defines canonical layout, shape, focus, and motion primitives", () => {
    expect(globals).toContain("--container-max: 1440px;");
    expect(globals).toContain("--content-max: var(--container-max);");
    expect(globals).toContain("--content-gutter: 20px;");
    expect(globals).toContain("--section-space: 64px;");
    expect(globals).toContain("--radius-image: 0;");
    expect(globals).toContain("--radius-card: 0;");
    expect(globals).toContain("--radius-pill: 9999px;");
    expect(globals).toContain("--shadow-decorative: none;");
    expect(globals).toContain("--control-min-size: 48px;");
    expect(globals).toContain("--duration-fast: 120ms;");
    expect(globals).toContain("--duration-base: 180ms;");
    expect(globals).toContain("--duration-overlay: 320ms;");
    expect(globals).toContain("outline: var(--focus-ring-width) solid var(--color-info-focus);");
  });

  it("covers the frozen responsive breakpoint system", () => {
    for (const breakpoint of [640, 768, 1024, 1280, 1440]) {
      expect(globals).toContain(`@media (min-width: ${breakpoint}px)`);
    }

    expect(globals).toContain("--content-gutter: 32px;");
    expect(globals).toContain("--content-gutter: 48px;");
    expect(globals).toContain("--content-gutter: 64px;");
  });

  it("makes public consumers use the canonical contract", () => {
    expect(globals).toContain("--landing-content-max: var(--content-max);");
    expect(globals).toContain("--landing-page-gutter: var(--content-gutter);");
    expect(globals).toContain("--category-canvas: var(--color-canvas);");
    expect(globals).toContain("background: var(--color-surface-soft);");
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
