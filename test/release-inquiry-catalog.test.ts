import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { config } from "@/middleware";
import { PUBLIC_SITEMAP_ROUTES } from "@/lib/public-routes";
import robots from "@/app/robots";

describe("owner-approved complete storefront restoration", () => {
  it("removes the public page allowlist while preserving admin middleware", () => {
    expect(config.matcher).toEqual(["/admin/:path*"]);
    expect(readFileSync("middleware.ts", "utf8")).not.toContain("RELEASE_PUBLIC_PATHS");
  });
  it("restores canonical discovery routes and PIM product resolution", () => {
    expect(PUBLIC_SITEMAP_ROUTES).toContain("/koleksi");
    expect(PUBLIC_SITEMAP_ROUTES).toContain("/search");
    const detail = readFileSync("app/produk/[slug]/page.tsx", "utf8");
    expect(detail).toContain("getProductDetailPageModel(slug)");
    expect(detail).not.toContain("getBrochureProduct");
    expect(detail).not.toContain("PUBLIC_PRODUCT_DETAILS_ENABLED");
  });
  it("keeps preview indexing disabled", () => {
    const previous = process.env.VERCEL_ENV;
    try {
      process.env.VERCEL_ENV = "preview";
      expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    } finally {
      if (previous === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previous;
    }
  });
});
