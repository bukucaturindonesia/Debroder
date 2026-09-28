import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { PUBLIC_SITEMAP_ROUTES } from "@/lib/public-routes";
import { PUBLIC_PRODUCT_DETAILS_ENABLED, RELEASE_PUBLIC_PATHS } from "@/lib/release-contract";
import { brochureProducts } from "@/src/data/products";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("website V1 owner-approved inquiry catalogue", () => {
  it("publishes five brochure pages plus only the two approved product details", () => {
    expect(PUBLIC_SITEMAP_ROUTES).toEqual(["/", "/produk", "/layanan", "/kontak", "/tentang"]);
    expect([...RELEASE_PUBLIC_PATHS]).toEqual(["/", "/produk", "/layanan", "/tentang", "/kontak", "/produk/nsa-premium", "/produk/cotton-combed-24s"]);
    expect(sitemap().map((entry) => new URL(entry.url).pathname)).toEqual([...PUBLIC_SITEMAP_ROUTES, "/produk/nsa-premium", "/produk/cotton-combed-24s"]);
  });

  it("keeps PIM commerce gated without invented catalogue prices or stock", () => {
    expect(brochureProducts).toHaveLength(2);
    expect(brochureProducts.every((product) => product.priceFrom === undefined && !("stock" in product) && !("sku" in product))).toBe(true);
    expect(PUBLIC_PRODUCT_DETAILS_ENABLED).toBe(false);
    const page = readFileSync("app/produk/[slug]/page.tsx", "utf8");
    expect(page).toContain("if (!PUBLIC_PRODUCT_DETAILS_ENABLED) notFound()");
    expect(page).toContain("robots: { index: false, follow: false }");
    const middleware = readFileSync("middleware.ts", "utf8");
    expect(middleware).toContain("RELEASE_PUBLIC_PATHS.has(pathname)");
  });

  it("allows the real inquiry paths and rejects unknown products and transaction pages", async () => {
    for (const path of RELEASE_PUBLIC_PATHS) {
      const response = await middleware(new NextRequest(`http://localhost${path}`));
      expect(response.headers.get("x-middleware-next"), path).toBe("1");
    }
    for (const path of ["/produk/w3-test", "/produk/unknown", "/checkout", "/cart", "/account/orders", "/jersey/configurator"]) {
      const response = await middleware(new NextRequest(`http://localhost${path}`));
      expect(response.status, path).toBe(404);
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    }
  });

  it("prevents preview indexing without altering production robots", () => {
    const previous = process.env.VERCEL_ENV;
    try {
      process.env.VERCEL_ENV = "preview";
      expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }]);
      process.env.VERCEL_ENV = "production";
      expect(robots().rules).toEqual([{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }]);
    } finally {
      if (previous === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previous;
    }
  });
});
