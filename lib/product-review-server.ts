import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductManagerCapabilities } from "@/lib/product-manager";
import {
  normalizeHex,
  normalizeProductColorType,
  normalizeProductSwatchDirection
} from "@/lib/product-variants";
import {
  buildProductReviewPayload,
  createProductReviewVersion,
  validateProductReviewTransition,
  type ProductReviewAction,
  type ProductReviewPayload,
  type ProductReviewSnapshot,
  type ProductReviewVariant
} from "@/lib/product-review";

export class ProductReviewApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

type RecordRow = Record<string, unknown>;

const PRODUCT_FIELDS = [
  "id",
  "name",
  "nama",
  "slug",
  "status",
  "product_category_id",
  "base_price",
  "seo_title",
  "seo_description",
  "updated_at"
].join(",");

const VARIANT_FIELDS = [
  "id",
  "product_id",
  "name",
  "variant_name",
  "color_name",
  "slug",
  "hex_code",
  "color_hex",
  "price_adjustment",
  "status",
  "is_active",
  "sort_order",
  "updated_at"
].join(",");

const COLOR_MASTER_FIELDS = [
  "id",
  "name",
  "slug",
  "color_hex",
  "color_type",
  "primary_hex",
  "secondary_hex",
  "tertiary_hex",
  "swatch_direction",
  "pattern_image_url"
].join(",");

const SELLABLE_FIELDS = [
  "id",
  "variant_id",
  "size_id",
  "size_name",
  "sku",
  "stock_quantity",
  "stock",
  "price_adjustment",
  "status",
  "is_active",
  "sort_order",
  "updated_at"
].join(",");

const IMAGE_FIELDS = [
  "id",
  "variant_id",
  "image_role",
  "image_url",
  "is_cover",
  "sort_order",
  "updated_at"
].join(",");

const SIZE_FIELDS = "id,name,is_active";
const QUERY_CHUNK_SIZE = 100;

export async function loadProductReviewPayload(
  client: SupabaseClient,
  role: string,
  productId: string
): Promise<ProductReviewPayload> {
  const snapshot = await loadProductReviewSnapshot(client, productId);
  return buildProductReviewPayload({
    role,
    capabilities: getProductManagerCapabilities(role),
    snapshot
  });
}

export async function loadProductReviewSnapshot(
  client: SupabaseClient,
  productId: string
): Promise<ProductReviewSnapshot> {
  const productResult = await client
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("id", productId)
    .maybeSingle();
  if (productResult.error) {
    throw unavailable("Data produk belum dapat dimuat.", productResult.error.code);
  }
  if (!productResult.data) {
    throw new ProductReviewApiError(404, "Produk tidak ditemukan.");
  }
  const product = asRecord(productResult.data);
  const status = strictLifecycle(product.status);

  const [categoryResult, variantsResult, duplicateSlugResult] = await Promise.all([
    product.product_category_id
      ? client
        .from("product_categories")
        .select("id,is_active,status")
        .eq("id", String(product.product_category_id))
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from("product_variants")
      .select(VARIANT_FIELDS)
      .eq("product_id", productId)
      .order("sort_order"),
    client
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("slug", String(product.slug || ""))
      .neq("id", productId)
  ]);
  const baseError = categoryResult.error || variantsResult.error || duplicateSlugResult.error;
  if (baseError) {
    throw unavailable("Data readiness produk belum dapat dimuat.", baseError.code);
  }

  const variantRows = rows(variantsResult.data);
  const variantIds = variantRows.map((row) => String(row.id));
  const variantSlugs = variantRows
    .map((row) => textOrNull(row.slug))
    .filter(Boolean) as string[];

  const [sellableRows, imageRows, colorMasterRows] = await Promise.all([
    selectInChunks(
      client,
      "product_variant_sizes",
      SELLABLE_FIELDS,
      "variant_id",
      variantIds
    ),
    selectInChunks(
      client,
      "product_variant_images",
      IMAGE_FIELDS,
      "variant_id",
      variantIds
    ),
    selectInChunks(
      client,
      "product_color_master",
      COLOR_MASTER_FIELDS,
      "slug",
      variantSlugs
    )
  ]);

  const sizeIds = sellableRows
    .map((row) => textOrNull(row.size_id))
    .filter(Boolean) as string[];
  const skus = sellableRows
    .map((row) => textOrNull(row.sku))
    .filter(Boolean) as string[];
  const [sizeRows, matchingSkuRows] = await Promise.all([
    selectInChunks(client, "product_size_master", SIZE_FIELDS, "id", sizeIds),
    selectInChunks(client, "product_variant_sizes", "id,sku", "sku", skus)
  ]);

  const sizeById = new Map(sizeRows.map((row) => [String(row.id), row]));
  const masterBySlug = new Map(colorMasterRows.map((row) => [String(row.slug), row]));
  const skuCounts = frequency(matchingSkuRows, "sku");
  const imagesByVariant = groupRows(imageRows, "variant_id");
  const sellableByVariant = groupRows(sellableRows, "variant_id");

  return {
    id: productId,
    name: String(product.name || product.nama || ""),
    slug: String(product.slug || ""),
    status,
    productCategoryId: textOrNull(product.product_category_id),
    categoryActive: Boolean(
      categoryResult.data &&
      categoryResult.data.is_active !== false &&
      categoryResult.data.status !== "inactive"
    ),
    duplicateSlug: Number(duplicateSlugResult.count || 0) > 0,
    basePrice: finiteNumber(product.base_price),
    seoTitle: textOrNull(product.seo_title),
    seoDescription: textOrNull(product.seo_description),
    updatedAt: textOrNull(product.updated_at),
    variants: variantRows.map((variant) => mapVariant({
      variant,
      master: masterBySlug.get(String(variant.slug || "")) || null,
      images: imagesByVariant.get(String(variant.id)) || [],
      sellable: sellableByVariant.get(String(variant.id)) || [],
      sizeById,
      skuCounts
    }))
  };
}

export async function changeProductReviewLifecycle(input: {
  client: SupabaseClient;
  role: string;
  productId: string;
  action: ProductReviewAction;
  expectedUpdatedAt: string | null;
  expectedReviewVersion: string;
}): Promise<{
  before: ProductReviewPayload;
  after: ProductReviewPayload;
}> {
  const beforeSnapshot = await loadProductReviewSnapshot(
    input.client,
    input.productId
  );
  const before = buildProductReviewPayload({
    role: input.role,
    capabilities: getProductManagerCapabilities(input.role),
    snapshot: beforeSnapshot
  });
  if (
    before.product.updatedAt !== input.expectedUpdatedAt ||
    before.reviewVersion !== input.expectedReviewVersion
  ) {
    throw conflict();
  }

  const transitionError = validateProductReviewTransition({
    action: input.action,
    payload: before
  });
  if (transitionError) {
    const denied = input.action === "publish"
      ? !before.capabilities.canPublish
      : !before.capabilities.canArchive;
    throw new ProductReviewApiError(
      denied
        ? 403
        : before.counts.blockers > 0 && input.action === "publish"
          ? 422
          : 409,
      transitionError
    );
  }

  const nextStatus = input.action === "publish" ? "active" : "archived";
  const expectedStatus = input.action === "publish" ? "draft" : "active";
  const nextUpdatedAt = nextTimestamp(input.expectedUpdatedAt);
  let update = input.client
    .from("products")
    .update({ status: nextStatus, updated_at: nextUpdatedAt })
    .eq("id", input.productId)
    .eq("status", expectedStatus);
  update = input.expectedUpdatedAt === null
    ? update.is("updated_at", null)
    : update.eq("updated_at", input.expectedUpdatedAt);
  const { data, error } = await update
    .select("id,status,updated_at")
    .maybeSingle();
  if (error || !data) {
    throw conflict();
  }

  const afterSnapshot = await loadProductReviewSnapshot(
    input.client,
    input.productId
  );
  const after = buildProductReviewPayload({
    role: input.role,
    capabilities: getProductManagerCapabilities(input.role),
    snapshot: afterSnapshot
  });
  if (!sameDependencies(beforeSnapshot, afterSnapshot)) {
    const rolledBack = await rollbackLifecycle({
      client: input.client,
      productId: input.productId,
      expectedStatus: nextStatus,
      expectedUpdatedAt: String(data.updated_at),
      previousStatus: expectedStatus,
      previousUpdatedAt: input.expectedUpdatedAt
    });
    if (!rolledBack) {
      throw new ProductReviewApiError(
        409,
        "Data produk berubah bersamaan dan rollback status perlu diperiksa. Muat ulang data terbaru."
      );
    }
    throw conflict();
  }
  return { before, after };
}

function mapVariant(input: {
  variant: RecordRow;
  master: RecordRow | null;
  images: RecordRow[];
  sellable: RecordRow[];
  sizeById: Map<string, RecordRow>;
  skuCounts: Map<string, number>;
}): ProductReviewVariant {
  const master = input.master;
  const colorHex = normalizeHex(master?.color_hex) ||
    normalizeHex(input.variant.hex_code) ||
    normalizeHex(input.variant.color_hex);
  const imageRoles = input.images
    .filter((row) => Boolean(row.image_url))
    .map((row) => imageRole(row.image_role, row.is_cover, row.sort_order));

  return {
    id: String(input.variant.id),
    name: String(
      input.variant.name ||
      input.variant.variant_name ||
      input.variant.color_name ||
      ""
    ),
    slug: String(input.variant.slug || ""),
    status: variantStatus(input.variant.status, input.variant.is_active),
    colorType: normalizeProductColorType(master?.color_type),
    primaryHex: normalizeHex(master?.primary_hex),
    secondaryHex: normalizeHex(master?.secondary_hex),
    tertiaryHex: normalizeHex(master?.tertiary_hex),
    swatchDirection: normalizeProductSwatchDirection(master?.swatch_direction),
    patternImageUrl: textOrNull(master?.pattern_image_url),
    colorHex,
    priceAdjustment: finiteNumber(input.variant.price_adjustment),
    imageRoles,
    hasFrontImage: imageRoles.includes("front"),
    updatedAt: textOrNull(input.variant.updated_at),
    sellable: input.sellable.map((row) => {
      const sku = textOrNull(row.sku);
      const sizeId = textOrNull(row.size_id);
      const size = sizeId ? input.sizeById.get(sizeId) : null;
      return {
        id: String(row.id),
        sku,
        sizeId,
        sizeName: String(size?.name || row.size_name || ""),
        sizeActive: Boolean(size && size.is_active !== false),
        stockQuantity: finiteNumber(row.stock_quantity ?? row.stock),
        priceAdjustment: finiteNumber(row.price_adjustment),
        status: variantStatus(row.status, row.is_active),
        duplicateSku: Boolean(sku && Number(input.skuCounts.get(sku) || 0) > 1),
        updatedAt: textOrNull(row.updated_at)
      };
    })
  };
}

function sameDependencies(
  before: ProductReviewSnapshot,
  after: ProductReviewSnapshot
) {
  const normalizedAfter: ProductReviewSnapshot = {
    ...after,
    status: before.status,
    updatedAt: before.updatedAt
  };
  return createProductReviewVersion(normalizedAfter) ===
    createProductReviewVersion(before);
}

async function rollbackLifecycle(input: {
  client: SupabaseClient;
  productId: string;
  expectedStatus: "active" | "archived";
  expectedUpdatedAt: string;
  previousStatus: "draft" | "active";
  previousUpdatedAt: string | null;
}) {
  try {
    const { data, error } = await input.client
      .from("products")
      .update({
        status: input.previousStatus,
        updated_at: input.previousUpdatedAt
      })
      .eq("id", input.productId)
      .eq("status", input.expectedStatus)
      .eq("updated_at", input.expectedUpdatedAt)
      .select("id")
      .maybeSingle();
    return Boolean(!error && data);
  } catch {
    return false;
  }
}

async function selectInChunks(
  client: SupabaseClient,
  table: string,
  fields: string,
  column: string,
  values: string[]
) {
  const unique = [...new Set(values.filter(Boolean))];
  if (!unique.length) return [];
  const output: RecordRow[] = [];
  for (let index = 0; index < unique.length; index += QUERY_CHUNK_SIZE) {
    const chunk = unique.slice(index, index + QUERY_CHUNK_SIZE);
    const { data, error } = await client
      .from(table)
      .select(fields)
      .in(column, chunk);
    if (error) {
      throw unavailable(`Data ${table} belum dapat dimuat.`, error.code);
    }
    output.push(...rows(data));
  }
  return output;
}

function groupRows(source: RecordRow[], key: string) {
  const result = new Map<string, RecordRow[]>();
  for (const row of source) {
    const value = String(row[key] || "");
    if (!value) continue;
    const group = result.get(value) || [];
    group.push(row);
    result.set(value, group);
  }
  return result;
}

function frequency(source: RecordRow[], key: string) {
  const result = new Map<string, number>();
  for (const row of source) {
    const value = textOrNull(row[key]);
    if (value) result.set(value, Number(result.get(value) || 0) + 1);
  }
  return result;
}

function imageRole(
  value: unknown,
  isCover: unknown,
  sortOrder: unknown
): "front" | "back" | "detail" | "lifestyle" {
  if (value === "front" || value === "back" || value === "detail" || value === "lifestyle") {
    return value;
  }
  if (isCover === true) return "front";
  const roles = ["front", "back", "detail", "lifestyle"] as const;
  const index = Math.max(0, Math.min(3, Number(sortOrder || 0)));
  return roles[index] || "lifestyle";
}

function strictLifecycle(value: unknown): "draft" | "active" | "archived" {
  if (value === "draft" || value === "active" || value === "archived") return value;
  throw new ProductReviewApiError(
    409,
    "Status lifecycle produk tidak dikenal. Perubahan status dihentikan."
  );
}

function variantStatus(value: unknown, active: unknown): "active" | "inactive" {
  return value === "inactive" || active === false ? "inactive" : "active";
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rows(value: unknown): RecordRow[] {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "object" && item !== null) as RecordRow[]
    : [];
}

function asRecord(value: unknown): RecordRow {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as RecordRow
    : {};
}

function nextTimestamp(expected: string | null) {
  const expectedTime = expected ? Date.parse(expected) : 0;
  return new Date(Math.max(Date.now(), expectedTime + 1)).toISOString();
}

function unavailable(message: string, code?: string) {
  console.error("Product Review query failed", { code });
  return new ProductReviewApiError(503, message);
}

function conflict() {
  return new ProductReviewApiError(
    409,
    "Data produk telah berubah. Muat ulang data terbaru sebelum melanjutkan."
  );
}
