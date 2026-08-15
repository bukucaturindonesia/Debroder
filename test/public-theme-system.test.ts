import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_THEME_ID,
  getPublicTheme,
  isPublicThemeId,
  PUBLIC_THEME_IDS,
  publicThemeCssVariables
} from "@/lib/public-theme/registry";

const read = (path: string) => readFileSync(path, "utf8");

describe("public theme system", () => {
  it("contains the ten canonical presets and a safe default", () => {
    expect(PUBLIC_THEME_IDS).toHaveLength(10);
    expect(new Set(PUBLIC_THEME_IDS).size).toBe(10);
    expect(DEFAULT_PUBLIC_THEME_ID).toBe("hybrid_premium_commerce");
    for (const id of PUBLIC_THEME_IDS) {
      const theme = getPublicTheme(id);
      expect(theme.id).toBe(id);
      expect(theme.name).toBeTruthy();
      expect(theme.tokens.canvas).toBeTruthy();
      expect(theme.tokens.contentMax).toBeGreaterThan(0);
      expect(theme.tokens.gridGap).toBeGreaterThan(0);
      expect(publicThemeCssVariables(theme)["--theme-canvas"]).toBe(theme.tokens.canvas);
    }
  });

  it("falls back invalid selections and keeps dark contrast tokens distinct", () => {
    expect(isPublicThemeId("not-a-theme")).toBe(false);
    expect(getPublicTheme("not-a-theme").id).toBe(DEFAULT_PUBLIC_THEME_ID);
    const dark = getPublicTheme("dark_premium");
    expect(dark.tokens.ink).not.toBe(dark.tokens.canvas);
    expect(dark.tokens.surface).not.toBe(dark.tokens.canvas);
  });

  it("wires the engine through public shell, cache invalidation, and Super Admin", () => {
    const shell = read("components/PublicPage.tsx");
    const home = read("app/page.tsx");
    const css = read("app/globals.css");
    const api = read("app/api/admin/theme/route.ts");
    const admin = read("components/admin/PublicThemeAdmin.tsx");
    expect(shell).toContain("data-public-theme");
    expect(shell).toContain("data-theme-card-treatment");
    expect(shell).toContain("getActivePublicTheme");
    expect(home).toContain("publicThemeId={activeTheme.id}");
    expect(css).toContain(".debroder-storefront[data-public-theme]");
    expect(api).toContain("website_settings");
    expect(api).toContain("system_audit_log");
    expect(api).toContain("revalidatePublicThemeCache");
    expect(api).toContain("rollback");
    expect(admin).toContain("Preview");
    expect(admin).toContain("Terapkan Tema");
    expect(admin).toContain("AKTIF");
    expect(admin).toContain('data-admin-mutation="true"');
  });

  it("does not couple theme modules to commerce authority", () => {
    const files = [
      read("lib/public-theme/registry.ts"),
      read("lib/public-theme/runtime.ts"),
      read("app/api/admin/theme/route.ts"),
      read("components/admin/PublicThemeAdmin.tsx")
    ].join("\n");
    expect(files).not.toMatch(/\.from\(["'](?:orders|payments|inventory|cart|checkout)["']\)/i);
    expect(files).not.toMatch(/@\/lib\/(?:checkout|payment|inventory|order|cart)/i);
  });
});
