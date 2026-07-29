import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_ROUTES,
  PUBLIC_SITEMAP_ROUTES,
  publicServiceHref
} from "@/lib/public-routes";

describe("Bab 4 canonical public information architecture", () => {
  it("keeps every required static route represented by an App Router page", () => {
    const pageFiles = [
      "app/page.tsx",
      "app/koleksi/page.tsx",
      "app/jersey/page.tsx",
      "app/jersey/shop/page.tsx",
      "app/jersey/configurator/page.tsx",
      "app/kaos-polos/page.tsx",
      "app/kaos-polos/shop/page.tsx",
      "app/jaket-hoodie/page.tsx",
      "app/jaket-hoodie/shop/page.tsx",
      "app/headwear/page.tsx",
      "app/headwear/shop/page.tsx",
      "app/sablon-dtf/page.tsx",
      "app/cetak-sublim/page.tsx",
      "app/cart/page.tsx",
      "app/checkout/page.tsx",
      "app/order-confirmation/page.tsx",
      "app/account/orders/page.tsx",
      "app/track-order/page.tsx",
      "app/search/page.tsx",
      "app/help/page.tsx"
    ];
    expect(pageFiles.filter((file) => !existsSync(file))).toEqual([]);
    expect(existsSync("app/produk/[slug]/page.tsx")).toBe(true);
    expect(existsSync("app/account/orders/[id]/page.tsx")).toBe(true);
  });

  it("uses one route registry from sitemap and global navigation", () => {
    const sitemap = readFileSync("app/sitemap.ts", "utf8");
    const header = readFileSync("components/header/SiteHeaderClient.tsx", "utf8");
    expect(sitemap).toContain("PUBLIC_SITEMAP_ROUTES");
    expect(header).toContain("PUBLIC_ROUTES");
    expect(new Set(PUBLIC_SITEMAP_ROUTES).size).toBe(PUBLIC_SITEMAP_ROUTES.length);
    expect(PUBLIC_ROUTES.product("kaos polos")).toBe("/produk/kaos%20polos");
  });

  it("keeps services separate while routing them to public-safe destinations", () => {
    expect(publicServiceHref("sablon-dtf", "dtf-a4")).toBe("/sablon-dtf/dtf-a4");
    expect(publicServiceHref("cetak-sublim", "sublim-printing")).toBe("/cetak-sublim");
    expect(publicServiceHref(undefined, "unknown")).toBe("/custom");
  });
});
