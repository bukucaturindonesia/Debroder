import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { PUBLIC_SITEMAP_ROUTES } from "@/lib/public-routes";
import { PUBLIC_PRODUCT_DETAILS_ENABLED, RELEASE_PUBLIC_PATHS } from "@/lib/release-contract";
import { brochureProducts } from "@/src/data/products";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("website V1 owner-approved zero-product release", () => {
  it("publishes exactly five brochure pages", () => {
    expect(PUBLIC_SITEMAP_ROUTES).toEqual(["/", "/produk", "/layanan", "/kontak", "/tentang"]);
    expect([...RELEASE_PUBLIC_PATHS]).toEqual(["/", "/produk", "/layanan", "/tentang", "/kontak"]);
    expect(sitemap().map((entry) => new URL(entry.url).pathname)).toEqual(PUBLIC_SITEMAP_ROUTES);
  });

  it("keeps the public product catalogue empty and PIM commerce gated", () => {
    expect(brochureProducts).toHaveLength(0);
    expect(PUBLIC_PRODUCT_DETAILS_ENABLED).toBe(false);
    const page = readFileSync("app/produk/[slug]/page.tsx", "utf8");
    expect(page).toContain("if (!PUBLIC_PRODUCT_DETAILS_ENABLED) notFound()");
    expect(page).toContain("robots: { index: false, follow: false }");
    const middleware = readFileSync("middleware.ts", "utf8");
    expect(middleware).toContain("RELEASE_PUBLIC_PATHS.has(pathname)");
  });

  it("allows five brochure paths and rejects all product details and transaction pages", async () => {
    for (const path of RELEASE_PUBLIC_PATHS) {
      const response = await middleware(new NextRequest(`http://localhost${path}`));
      expect(response.headers.get("x-middleware-next"), path).toBe("1");
    }
    for (const path of ["/produk/nsa-premium", "/produk/cotton-combed-24s", "/produk/w3-test", "/produk/unknown", "/checkout", "/cart", "/account/orders", "/jersey/configurator"]) {
      const response = await middleware(new NextRequest(`http://localhost${path}`));
      expect(response.status, path).toBe(404);
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    }
  });

  it("renders no public WhatsApp CTA in the brochure release", () => {
    for (const file of [
      "app/page.tsx",
      "app/kontak/page.tsx",
      "components/brochure/BrochureContent.tsx",
      "components/brochure/BrochureNav.tsx",
      "components/brochure/BrochureShell.tsx"
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("brochureWhatsappHref");
      expect(source, file).not.toContain("wa.me");
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
