import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();

function readSource(path: string) {
  return readFileSync(join(repositoryRoot, path), "utf8");
}

function listSourceFiles(directory: string): string[] {
  const absoluteDirectory = join(repositoryRoot, directory);
  return readdirSync(absoluteDirectory).flatMap((entry) => {
    const absolutePath = join(absoluteDirectory, entry);
    if (statSync(absolutePath).isDirectory()) {
      return listSourceFiles(relative(repositoryRoot, absolutePath));
    }
    return /\.(?:ts|tsx)$/.test(entry)
      ? [relative(repositoryRoot, absolutePath).replaceAll("\\", "/")]
      : [];
  });
}

function isClientModule(source: string) {
  return /^(?:"use client"|'use client');/.test(source.trimStart());
}

function valueImportSpecifiers(source: string) {
  const specifiers: string[] = [];
  const importPattern =
    /import\s+(?!type\b)(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["'];?/g;
  for (const match of source.matchAll(importPattern)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

describe("P5 client boundary isolation", () => {
  it("keeps the root layout server-owned and scopes cart state to storefront compositions", () => {
    const rootLayout = readSource("app/layout.tsx");
    const publicShell = readSource("components/PublicPage.tsx");
    const homePage = readSource("app/page.tsx");
    const storefrontBoundary = readSource("components/storefront/StorefrontCartBoundary.tsx");

    expect(rootLayout).not.toContain("CartProvider");
    expect(rootLayout).not.toContain("StorefrontCartBoundary");
    expect(publicShell).toContain("<StorefrontCartBoundary>");
    expect(homePage).toContain("<StorefrontCartBoundary>");
    expect(storefrontBoundary).toContain('"use client"');
    expect(storefrontBoundary).toContain("<CartProvider>{children}</CartProvider>");
  });

  it("keeps static header composition server-owned and loads search only on demand", () => {
    const serverHeader = readSource("components/SiteHeader.tsx");
    const clientHeader = readSource("components/header/SiteHeaderClient.tsx");
    const searchModal = readSource("components/header/HeaderSearchModal.tsx");

    expect(serverHeader).not.toContain('"use client"');
    expect(serverHeader).toContain("<SiteHeaderClient");
    expect(clientHeader).toContain('dynamic(');
    expect(clientHeader).toContain('import("@/components/header/HeaderSearchModal")');
    expect(clientHeader).toContain("isSearchOpen ? (");
    expect(clientHeader).not.toContain("const searchItems");
    expect(searchModal).toContain('"use client"');
    expect(searchModal).toContain("const searchItems");
  });

  it("guards every P5 server data or service-role module with server-only", () => {
    const guardedModules = [
      "lib/server-env.ts",
      "lib/supabase/admin.ts",
      "lib/supabase/custom-services.ts",
      "lib/supabase/products.ts",
      "lib/custom-commerce/data.ts",
      "lib/catalog-page/data-access.ts",
      "lib/product-detail-page/data-access.ts",
      "lib/product-read/data-access.ts",
      "lib/public-shell/data-access.ts",
      "lib/pim-bulk-edit-server.ts",
      "lib/pim-bulk-import-server.ts"
    ];

    for (const path of guardedModules) {
      expect(readSource(path), `${path} must be compiler-guarded`).toContain(
        'import "server-only";'
      );
    }

    expect(readSource("package.json")).toContain('"server-only": "0.0.1"');
    expect(readSource("lib/env.ts")).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(readSource("lib/supabase/client.ts")).not.toContain("getAdminSupabaseClient");
  });

  it("rejects client imports of server-only data access, env, or service-role modules", () => {
    const clientModules = ["app", "components", "lib"]
      .flatMap(listSourceFiles)
      .filter((path) => isClientModule(readSource(path)));
    const prohibitedImports = [
      "@/lib/server-env",
      "@/lib/supabase/admin",
      "/data-access",
      "-server"
    ];

    for (const path of clientModules) {
      const source = readSource(path);
      const imports = valueImportSpecifiers(source);
      for (const prohibitedImport of prohibitedImports) {
        expect(
          imports.some((specifier) => specifier.includes(prohibitedImport)),
          `${path} imports prohibited boundary ${prohibitedImport}`
        ).toBe(false);
      }
      expect(source, `${path} contains a service-role secret name`).not.toMatch(
        /SUPABASE_SERVICE_(?:ROLE_)?KEY/
      );
    }
  });
});
