import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import {
  getProductManagerCapabilities,
  PRODUCT_MANAGER_ROLES,
  type ProductLifecycle
} from "@/lib/product-manager";
import {
  parseProductLibraryQuery,
  productLibrarySortSpec,
  type ProductLibraryItem
} from "@/lib/product-library";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";
import type { AdminRole } from "@/lib/access-control";

export const dynamic = "force-dynamic";

const PRODUCT_LIBRARY_FIELDS = [
  "id",
  "name",
  "nama",
  "slug",
  "status",
  "product_category_id",
  "kategori",
  "base_price",
  "sku",
  "image_url",
  "gambar_url",
  "updated_at"
].join(",");

export async function GET(request: Request) {
  try {
    const actor = await requireProductLibraryActor(request);
    const query = parseProductLibraryQuery(new URL(request.url).searchParams);
    const sort = productLibrarySortSpec(query.sort);
    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;

    let productsQuery = actor.adminClient
      .from("products")
      .select(PRODUCT_LIBRARY_FIELDS, { count: "exact" });

    if (query.status !== "all") productsQuery = productsQuery.eq("status", query.status);
    if (query.categoryId) productsQuery = productsQuery.eq("product_category_id", query.categoryId);
    if (query.q) {
      productsQuery = productsQuery.or(
        `name.ilike.%${query.q}%,nama.ilike.%${query.q}%,slug.ilike.%${query.q}%,sku.ilike.%${query.q}%`
      );
    }

    const [productsResult, categoriesResult] = await Promise.all([
      productsQuery.order(sort.column, { ascending: sort.ascending }).range(from, to),
      actor.adminClient
        .from("product_categories")
        .select("id,name,slug,is_active,status")
        .order("sort_order")
    ]);

    if (productsResult.error) {
      console.error("Product Library load failed", { code: productsResult.error.code });
      throw new ProductLibraryApiError(503, "Daftar produk belum dapat dimuat.");
    }
    if (categoriesResult.error) {
      console.error("Product Library categories failed", { code: categoriesResult.error.code });
      throw new ProductLibraryApiError(503, "Kategori produk belum dapat dimuat.");
    }

    const productRows = records(productsResult.data);
    const productIds = productRows.map((row) => String(row.id));
    const dependencyCounts = await loadPageDependencyCounts(actor.adminClient, productIds);
    const categories = records(categoriesResult.data)
      .filter((row) => row.is_active !== false && row.status !== "inactive")
      .map((row) => ({ id: String(row.id), name: String(row.name), slug: String(row.slug) }));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const total = Number(productsResult.count || 0);

    const items: ProductLibraryItem[] = productRows.map((row) => {
      const id = String(row.id);
      const categoryId = row.product_category_id ? String(row.product_category_id) : null;
      return {
        id,
        name: String(row.name || row.nama || ""),
        slug: String(row.slug || ""),
        status: lifecycle(row.status),
        categoryId,
        categoryName: String(categoryById.get(categoryId || "")?.name || row.kategori || ""),
        basePrice: finiteNumber(row.base_price) || 0,
        sku: typeof row.sku === "string" && row.sku ? row.sku : null,
        imageUrl: textOrNull(row.image_url) || textOrNull(row.gambar_url),
        variantCount: dependencyCounts.variantByProduct.get(id) || 0,
        sellableCount: dependencyCounts.sellableByProduct.get(id) || 0,
        imageCount: dependencyCounts.imageByProduct.get(id) || 0,
        updatedAt: textOrNull(row.updated_at)
      };
    });

    return noStoreJson({
      role: actor.role,
      capabilities: getProductManagerCapabilities(actor.role),
      items,
      categories,
      query,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total ? Math.ceil(total / query.pageSize) : 0
      }
    });
  } catch (error) {
    return productLibraryErrorResponse(error);
  }
}

async function requireProductLibraryActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(403, "Role ini tidak memiliki akses Product Library.");
  }
  return actor;
}

async function loadPageDependencyCounts(client: SupabaseClient, productIds: string[]) {
  const variantByProduct = new Map<string, number>();
  const sellableByProduct = new Map<string, number>();
  const imageByProduct = new Map<string, number>();
  if (!productIds.length) return { variantByProduct, sellableByProduct, imageByProduct };

  const variants = await selectInChunks(
    client,
    "product_variants",
    "id,product_id",
    "product_id",
    productIds,
    "Ringkasan varian belum dapat dimuat."
  );
  const productByVariant = new Map<string, string>();
  for (const variant of variants) {
    const variantId = String(variant.id);
    const productId = String(variant.product_id);
    productByVariant.set(variantId, productId);
    increment(variantByProduct, productId);
  }

  const variantIds = [...productByVariant.keys()];
  if (!variantIds.length) return { variantByProduct, sellableByProduct, imageByProduct };

  const [sellableRows, imageRows] = await Promise.all([
    selectInChunks(
      client,
      "product_variant_sizes",
      "id,variant_id",
      "variant_id",
      variantIds,
      "Ringkasan SKU belum dapat dimuat."
    ),
    selectInChunks(
      client,
      "product_variant_images",
      "id,variant_id",
      "variant_id",
      variantIds,
      "Ringkasan gambar belum dapat dimuat."
    )
  ]);

  for (const row of sellableRows) {
    const productId = productByVariant.get(String(row.variant_id));
    if (productId) increment(sellableByProduct, productId);
  }
  for (const row of imageRows) {
    const productId = productByVariant.get(String(row.variant_id));
    if (productId) increment(imageByProduct, productId);
  }

  return { variantByProduct, sellableByProduct, imageByProduct };
}

async function selectInChunks(
  client: SupabaseClient,
  table: string,
  columns: string,
  field: string,
  ids: string[],
  errorMessage: string
) {
  const output: Record<string, unknown>[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    if (!chunk.length) continue;
    const { data, error } = await client.from(table).select(columns).in(field, chunk);
    if (error) throw new ProductLibraryApiError(503, errorMessage);
    output.push(...records(data));
  }
  return output;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

function lifecycle(value: unknown): ProductLifecycle {
  return value === "active" || value === "archived" ? value : "draft";
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object") as Record<string, unknown>[]
    : [];
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store" }
  });
}

class ProductLibraryApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function productLibraryErrorResponse(error: unknown) {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  if (error instanceof ProductLibraryApiError || error instanceof Phase13AuthError) {
    return noStoreJson({ error: error.message }, error.status);
  }
  console.error("Product Library API failed", {
    error: error instanceof Error ? error.name : "unknown"
  });
  return noStoreJson({ error: "Product Library gagal diproses." }, 500);
}
