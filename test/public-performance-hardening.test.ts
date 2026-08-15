import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("public performance hardening contracts", () => {
  it("uses short-lived cross-request caches for public reads", () => {
    expect(read("lib/public-cache.ts")).toContain("PUBLIC_CACHE_REVALIDATE_SECONDS = 60");
    expect(read("lib/public-shell/runtime.ts")).toContain("unstable_cache");
    expect(read("lib/catalog-page/runtime.ts")).toContain("unstable_cache");
    expect(read("lib/product-read/data-access.ts")).toContain("unstable_cache");
    expect(read("lib/public-data.ts")).toContain("unstable_cache");
  });

  it("bounds public catalog and shell reads", () => {
    const shell = read("lib/public-shell/data-access.ts");
    const catalog = read("lib/product-read/data-access.ts");
    const content = read("lib/public-data.ts");

    expect(shell).toContain("PUBLIC_SHELL_PRODUCT_LIMIT");
    expect(shell).toContain(".limit(PUBLIC_SHELL_PRODUCT_LIMIT)");
    expect(shell).not.toContain('.from("product_variant_sizes")');
    expect(catalog).toContain("PUBLIC_CATALOG_PRODUCT_LIMIT");
    expect(catalog).toContain(".limit(limit)");
    expect(content).toContain("PUBLIC_CONTENT_PRODUCT_LIMIT");
    expect(content).toContain(".limit(PUBLIC_CONTENT_PRODUCT_LIMIT)");
  });

  it("keeps PDP related reads narrow and excludes the current product", () => {
    const detail = read("lib/product-detail-page/data-access.ts");
    expect(detail).toContain("excludeProductId");
    expect(detail).toContain("limit: 12");
    expect(detail).toContain("category: productCategory");
  });

  it("does not move private transaction authority into the public cache modules", () => {
    const cache = read("lib/public-cache.ts");
    expect(cache).not.toMatch(/checkout|payment|order|cart/i);
    expect(read("app/checkout/page.tsx")).toContain('dynamic = "force-dynamic"');
  });
});
