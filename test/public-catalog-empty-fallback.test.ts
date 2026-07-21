import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn()
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

import { fallbackProducts } from "@/lib/fallback-data";
import { readProducts } from "@/lib/public-data";

type QueryResult = { data: unknown; error: unknown };
type QueryCall = { table: string; method: string; args: unknown[] };

const legacySampleNames = [
  "Kaos Polos New State Apparel",
  "Kaos Cotton Combed",
  "Sablon DTF Custom",
  "Custom Jersey",
  "Maklon DTF",
  "Cetak Sublim",
  "Distributor Kaos NSA"
] as const;

function createQuery(
  table: string,
  result: QueryResult,
  calls: QueryCall[]
) {
  const builder = {
    select: (...args: unknown[]) => {
      calls.push({ table, method: "select", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      calls.push({ table, method: "eq", args });
      return builder;
    },
    in: (...args: unknown[]) => {
      calls.push({ table, method: "in", args });
      return builder;
    },
    order: (...args: unknown[]) => {
      calls.push({ table, method: "order", args });
      return builder;
    },
    then: <TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) => Promise.resolve(result).then(onfulfilled, onrejected)
  };

  return builder;
}

function createClient(results: Record<string, QueryResult>) {
  const calls: QueryCall[] = [];
  const client = {
    from: vi.fn((table: string) =>
      createQuery(
        table,
        results[table] ?? { data: [], error: null },
        calls
      )
    )
  };

  return { client, calls };
}

function expectNoLegacySamples(products: unknown[]) {
  const serialized = JSON.stringify(products);
  for (const name of legacySampleNames) expect(serialized).not.toContain(name);
}

describe("public catalog product fallback removal", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockReset();
  });

  it("returns an empty catalog when the Supabase server client is unavailable", async () => {
    mocks.createSupabaseServerClient.mockReturnValue(null);

    const products = await readProducts();

    expect(products).toEqual([]);
    expectNoLegacySamples(products);
  });

  it("returns an empty catalog when the active-products query fails", async () => {
    const { client, calls } = createClient({
      products: { data: null, error: new Error("query failed") }
    });
    mocks.createSupabaseServerClient.mockReturnValue(client);

    const products = await readProducts();

    expect(products).toEqual([]);
    expectNoLegacySamples(products);
    expect(calls).toContainEqual({
      table: "products",
      method: "eq",
      args: ["status", "active"]
    });
  });

  it("returns an empty catalog when there are no active products", async () => {
    const { client } = createClient({
      products: { data: [], error: null }
    });
    mocks.createSupabaseServerClient.mockReturnValue(client);

    const products = await readProducts();

    expect(products).toEqual([]);
    expectNoLegacySamples(products);
  });

  it("keeps real active products and their variant, size, image, and size-guide hydration", async () => {
    const productId = "11111111-1111-4111-8111-111111111111";
    const variantId = "22222222-2222-4222-8222-222222222222";
    const activeProduct = {
      id: productId,
      nama: "Produk Aktif Nyata",
      kategori: "Kaos Polos",
      urutan: 1,
      status: "active",
      status_aktif: true,
      has_variants: true
    };
    const activeVariant = {
      id: variantId,
      product_id: productId,
      status: "active",
      sort_order: 1,
      variant_name: "Hitam"
    };
    const activeSize = {
      id: "33333333-3333-4333-8333-333333333333",
      variant_id: variantId,
      status: "active",
      sort_order: 1,
      size_name: "M"
    };
    const activeImage = {
      id: "44444444-4444-4444-8444-444444444444",
      variant_id: variantId,
      image_url: "https://example.test/product.webp",
      is_cover: true,
      sort_order: 1
    };
    const sizeGuide = {
      id: "55555555-5555-4555-8555-555555555555",
      product_id: productId,
      is_active: true,
      sort_order: 1,
      title: "Panduan Ukuran"
    };
    const { client, calls } = createClient({
      products: { data: [activeProduct], error: null },
      product_variants: { data: [activeVariant], error: null },
      product_variant_sizes: { data: [activeSize], error: null },
      product_variant_images: { data: [activeImage], error: null },
      product_size_guides: { data: [sizeGuide], error: null }
    });
    mocks.createSupabaseServerClient.mockReturnValue(client);

    const products = await readProducts();

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      id: productId,
      nama: "Produk Aktif Nyata",
      variants: [
        {
          id: variantId,
          sizes: [activeSize],
          variant_images: [activeImage]
        }
      ],
      size_guide: sizeGuide
    });
    expect(calls).toContainEqual({
      table: "products",
      method: "eq",
      args: ["status", "active"]
    });
  });

  it("keeps the legacy sample-product list empty and preserves the existing collection empty state", () => {
    expect(fallbackProducts).toEqual([]);

    const collectionPage = readFileSync("app/koleksi/page.tsx", "utf8");
    const catalog = readFileSync("components/ProductCatalog.tsx", "utf8");

    expect(collectionPage).toContain("products={products}");
    expect(catalog).toContain("Produk tidak ditemukan");
    expect(catalog).toContain("visible.length ?");
  });
});
