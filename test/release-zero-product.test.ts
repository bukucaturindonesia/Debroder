import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { PUBLIC_SITEMAP_ROUTES } from "@/lib/public-routes";
import { PUBLIC_PRODUCT_DETAILS_ENABLED, RELEASE_PUBLIC_PATHS } from "@/lib/release-contract";
import { brochureProducts } from "@/src/data/products";

describe("website V1 zero-product release contract", () => {
  it("publishes only the five approved brochure routes", () => {
    expect(PUBLIC_SITEMAP_ROUTES).toEqual(["/", "/produk", "/layanan", "/kontak", "/tentang"]);
    expect([...RELEASE_PUBLIC_PATHS]).toEqual(["/", "/produk", "/layanan", "/tentang", "/kontak"]);
    expect(sitemap().map((entry) => new URL(entry.url).pathname)).toEqual(PUBLIC_SITEMAP_ROUTES);
  });

  it("keeps both editorial and PIM product details unavailable", () => {
    expect(brochureProducts).toEqual([]);
    expect(PUBLIC_PRODUCT_DETAILS_ENABLED).toBe(false);
    const page = readFileSync("app/produk/[slug]/page.tsx", "utf8");
    expect(page).toContain("if (!PUBLIC_PRODUCT_DETAILS_ENABLED) notFound()");
    expect(page).toContain("robots: { index: false, follow: false }");
    const middleware = readFileSync("middleware.ts", "utf8");
    expect(middleware).toContain("RELEASE_PUBLIC_PATHS.has(pathname)");
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
