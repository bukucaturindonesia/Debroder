import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brandIcons } from "@/lib/icons";

describe("owner-provided brochure brand logo", () => {
  it("retains both canonical light and dark graphical assets", () => {
    for (const path of [
      brandIcons.logoSymbolBlack,
      brandIcons.logoWordmarkBlack,
      brandIcons.logoSymbolWhite,
      brandIcons.logoWordmarkWhite
    ]) {
      const file = `public${path}`;
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file, "utf8")).toContain("<svg");
    }
  });

  it("uses the existing complete logo treatment in both brochure positions", () => {
    const shell = readFileSync("components/brochure/BrochureShell.tsx", "utf8");
    const logo = readFileSync("components/Logo.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");
    expect(shell).toContain('<Link href="/" aria-label="DEBRODER — Beranda" className="brochure-brand">');
    expect(shell).toContain('<Logo variant="primary-black" size="sm" />');
    expect(shell).toContain('<Logo variant="primary-white" size="md" />');
    expect(shell).not.toContain("<p>DEBRODER</p>");
    expect(logo).toContain('role="img" aria-label="Logo DE BRODER"');
    expect(css).toContain(".brochure-footer-brand > .brochure-footer-description");
    expect(css).not.toContain(".brochure-footer-brand span { display: block");
  });
});
