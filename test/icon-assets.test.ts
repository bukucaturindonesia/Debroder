import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { brandIcons } from "@/lib/icons";

const publicRoot = resolve("public");

function walkSvg(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkSvg(path) : entry.name.toLowerCase().endsWith(".svg") ? [path] : [];
  });
}

function publicPath(url: string) {
  return resolve(publicRoot, url.replace(/^\/+/, ""));
}

function hasExactCase(url: string) {
  let current = publicRoot;
  for (const segment of url.replace(/^\/+/, "").split("/")) {
    const exact = readdirSync(current).find((entry) => entry === segment);
    if (!exact) return false;
    current = join(current, exact);
  }
  return true;
}

describe("owner SVG asset registry", () => {
  it("registers every owner SVG under public/brand exactly once", () => {
    const ownerAssets = walkSvg(resolve(publicRoot, "brand"))
      .map((path) => `/${path.slice(publicRoot.length + 1).replaceAll("\\", "/")}`)
      .sort();
    const registered = Object.values(brandIcons).filter((url) => url.startsWith("/brand/")).sort();

    expect(registered).toEqual(ownerAssets);
    expect(new Set(Object.keys(brandIcons)).size).toBe(Object.keys(brandIcons).length);
  });

  it("keeps every registry URL valid, nonempty, and exact-case", () => {
    for (const url of Object.values(brandIcons)) {
      expect(url).not.toMatch(/^\/public\//);
      expect(url).not.toContain("/brand/additional-icons/");
      expect(url).not.toMatch(/\.svg\.svg$/i);
      expect(existsSync(publicPath(url))).toBe(true);
      expect(hasExactCase(url)).toBe(true);
      expect(statSync(publicPath(url)).size).toBeGreaterThan(0);
      expect(readFileSync(publicPath(url), "utf8")).toMatch(/<svg\b/i);
    }
  });

  it("provides the verified active header, navigation, social, and commerce keys", () => {
    expect(brandIcons).toMatchObject({
      menu: "/brand/navigation/menu.svg",
      close: "/brand/filters/x.svg",
      search: "/brand/navigation/search.svg",
      cart: "/brand/navigation/shopping-cart.svg",
      user: "/brand/navigation/user.svg",
      wishlist: "/brand/commerce/heart.svg",
      chevronDown: "/brand/navigation/arrow-down.svg",
      category: "/brand/navigation/grid-2x2.svg",
      instagram: "/brand/social/INSTAGRAM.svg",
      whatsapp: "/brand/social/WHATSAPP.svg",
      email: "/brand/social/email.svg",
      share: "/brand/commerce/share.svg",
      package: "/brand/commerce/package.svg",
      truck: "/brand/commerce/truck.svg"
    });
  });

  it("keeps every direct public SVG reference resolvable", () => {
    const sources = ["app", "components", "lib"].flatMap((directory) =>
      walkSource(resolve(directory))
    );
    const urls = sources.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return Array.from(
        source.matchAll(/["'](\/(?:brand|debroder)\/[^"']+\.svg)["']/g),
        (match) => match[1]
      );
    });

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(existsSync(publicPath(url))).toBe(true);
      expect(hasExactCase(url)).toBe(true);
    }
  });
});

function walkSource(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkSource(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}
