import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProductManagerCapabilities,
  normalizeProductRootInput,
  PRODUCT_MANAGER_ROLES,
  validateProductPublishSnapshot,
  validateProductRootDraft,
  type ProductLifecycle,
  type ProductPublishSnapshot,
  type ProductRootInput
} from "@/lib/product-manager";
import {
  Phase13AuthError,
  requirePhase13Actor
} from "@/lib/phase13-auth";
import type { AdminRole } from "@/lib/access-control";
import type { ValidationIssue } from "@/lib/types";
import { adminGuestErrorResponse } from "@/lib/admin-role-security";

export const dynamic = "force-dynamic";

type ProductAction =
  | "save_draft"
  | "duplicate"
  | "validate_publish"
  | "publish"
  | "archive";

type ActionBody = {
  action?: ProductAction;
  productId?: string;
  product?: unknown;
};

const PRODUCT_FIELDS = [
  "id",
  "name",
  "nama",
  "slug",
  "product_category_id",
  "product_subcategory_id",
  "kategori",
  "base_price",
  "description",
  "deskripsi",
  "sku",
  "status",
  "product_type",
  "pricing_mode",
  "minimum_order_qty",
  "image_url",
  "gambar_url",
  "updated_at"
].join(",");

export async function GET(request: Request) {
  try {
    const actor = await requireProductActor(request);
    const payload = await loadManagerPayload(actor.adminClient, actor.role);
    return noStoreJson(payload);
  } catch (error) {
    return productErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireProductActor(request);
    const body = await readBody(request);

    if (!body.action) throw new ProductApiError(400, "Aksi Product Manager tidak valid.");

    if (body.action === "save_draft") {
      const input = normalizeProductRootInput(body.product);
      if (!input) throw new ProductApiError(400, "Data produk tidak valid.");
      const rootIssues = validateProductRootDraft(input);
      if (rootIssues.length) return validationResponse(rootIssues);
      const productId = await saveProductRoot(actor.adminClient, actor.role, input);
      return noStoreJson({ ok: true, productId, message: "Draft produk tersimpan." });
    }

    const productId = cleanId(body.productId);
    if (!productId) throw new ProductApiError(400, "Produk wajib dipilih.");

    if (body.action === "duplicate") {
      const duplicateId = await duplicateProduct(actor.adminClient, actor.role, productId);
      return noStoreJson({ ok: true, productId: duplicateId, message: "Produk diduplikasi sebagai Draft." });
    }

    requireLifecycleRole(actor.role);

    if (body.action === "validate_publish" || body.action === "publish") {
      const snapshot = await loadPublishSnapshot(actor.adminClient, productId);
      const issues = validateProductPublishSnapshot(snapshot);
      if (body.action === "validate_publish" || issues.length) {
        return noStoreJson({ ok: issues.length === 0, productId, issues }, issues.length ? 422 : 200);
      }

      const { data, error } = await actor.adminClient
        .from("products")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", productId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();
      if (error || !data) {
        console.error("Product publish failed", { code: error?.code });
        throw new ProductApiError(409, "Produk tidak dapat dipublish. Muat ulang dan periksa status terbaru.");
      }
      return noStoreJson({ ok: true, productId, issues: [], message: "Produk berhasil dipublish." });
    }

    if (body.action === "archive") {
      const { data, error } = await actor.adminClient
        .from("products")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", productId)
        .eq("status", "active")
        .select("id")
        .maybeSingle();
      if (error || !data) {
        console.error("Product archive failed", { code: error?.code });
        throw new ProductApiError(409, "Hanya produk Active yang dapat diarsipkan.");
      }
      return noStoreJson({ ok: true, productId, message: "Produk diarsipkan tanpa menghapus data." });
    }

    throw new ProductApiError(400, "Aksi Product Manager tidak didukung.");
  } catch (error) {
    return productErrorResponse(error);
  }
}

async function requireProductActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(403, "Role ini tidak memiliki akses Product Manager.");
  }
  return actor;
}

function requireLifecycleRole(role: string) {
  if (!getProductManagerCapabilities(role).canPublish) {
    throw new ProductApiError(403, "Publish dan Archive hanya tersedia untuk Owner atau Super Admin.");
  }
}

async function saveProductRoot(client: SupabaseClient, role: string, input: ProductRootInput) {
  const category = await activeCategory(client, input.productCategoryId);
  await assertUniqueSlug(client, input.slug, input.id || null);

  let currentStatus: ProductLifecycle = "draft";
  if (input.id) {
    const { data: current, error } = await client
      .from("products")
      .select("status")
      .eq("id", input.id)
      .maybeSingle();
    if (error || !current) throw new ProductApiError(404, "Produk tidak ditemukan.");
    currentStatus = lifecycle(current.status);
    const capabilities = getProductManagerCapabilities(role);
    if (currentStatus !== "draft" && !capabilities.canEditPublished) {
      throw new ProductApiError(403, "Admin hanya dapat mengedit produk Draft.");
    }
  }

  const payload = {
    name: input.name.trim(),
    nama: input.name.trim(),
    slug: input.slug.trim(),
    product_category_id: input.productCategoryId,
    product_subcategory_id: input.productSubcategoryId || null,
    kategori: category.name,
    base_price: input.basePrice,
    description: input.description || null,
    deskripsi: input.description || "",
    sku: input.sku || null,
    product_type: input.productType || "standard_product",
    pricing_mode: input.pricingMode || "fixed_price",
    minimum_order_qty: input.minimumOrderQty || 1,
    status: input.id ? currentStatus : "draft",
    updated_at: new Date().toISOString()
  };

  const query = input.id
    ? client.from("products").update(payload).eq("id", input.id)
    : client.from("products").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error || !data?.id) {
    console.error("Product root save failed", { code: error?.code });
    throw new ProductApiError(409, "Draft produk gagal disimpan. Periksa data lalu coba lagi.");
  }
  return String(data.id);
}

async function duplicateProduct(client: SupabaseClient, role: string, productId: string) {
  if (!getProductManagerCapabilities(role).canCreateDraft) {
    throw new ProductApiError(403, "Role ini tidak dapat menduplikasi produk.");
  }
  const { data: source, error } = await client
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (error || !source) throw new ProductApiError(404, "Produk tidak ditemukan.");

  const suffix = Date.now().toString().slice(-6);
  const next = { ...source } as Record<string, unknown>;
  delete next.id;
  delete next.created_at;
  delete next.updated_at;
  next.name = `${String(source.name || source.nama || "Produk")} (Salinan)`;
  next.nama = next.name;
  next.slug = `${String(source.slug || "produk")}-salinan-${suffix}`;
  next.status = "draft";
  next.status_aktif = false;
  next.updated_at = new Date().toISOString();

  const { data, error: insertError } = await client
    .from("products")
    .insert(next)
    .select("id")
    .single();
  if (insertError || !data?.id) {
    console.error("Product duplicate failed", { code: insertError?.code });
    throw new ProductApiError(409, "Produk gagal diduplikasi.");
  }
  return String(data.id);
}

async function loadManagerPayload(client: SupabaseClient, role: string) {
  const [productsResult, categoriesResult, variantsResult, sellableResult, imagesResult, sizeMasterResult] = await Promise.all([
    client.from("products").select(PRODUCT_FIELDS).order("updated_at", { ascending: false }),
    client.from("product_categories").select("id,name,slug,is_active,status").order("sort_order"),
    client.from("product_variants").select("id,product_id,name,variant_name,status,is_active"),
    client.from("product_variant_sizes").select("id,variant_id,sku,size_id,stock_quantity,status,is_active"),
    client.from("product_variant_images").select("id,variant_id,image_role,image_url"),
    client.from("product_size_master").select("id,is_active")
  ]);

  const firstError = [productsResult, categoriesResult, variantsResult, sellableResult, imagesResult, sizeMasterResult]
    .find((result) => result.error)?.error;
  if (firstError) {
    console.error("Product manager load failed", { code: firstError.code });
    throw new ProductApiError(503, "Data Product Manager belum dapat dimuat.");
  }

  const productRows = asRecordArray(productsResult.data);
  const categoryRows = asRecordArray(categoriesResult.data);
  const categories = categoryRows.filter((row) => row.is_active !== false && row.status !== "inactive");
  const categoryById = new Map(categories.map((row) => [String(row.id), row]));
  const variants = asRecordArray(variantsResult.data);
  const sellable = asRecordArray(sellableResult.data);
  const sizeMaster = asRecordArray(sizeMasterResult.data);
  const images = asRecordArray(imagesResult.data);
  const variantIdsByProduct = new Map<string, string[]>();
  for (const variant of variants) {
    const productId = String(variant.product_id);
    variantIdsByProduct.set(productId, [...(variantIdsByProduct.get(productId) || []), String(variant.id)]);
  }

  const products = await Promise.all(productRows.map(async (row) => {
    const id = String(row.id);
    const variantIds = variantIdsByProduct.get(id) || [];
    const snapshot = await buildSnapshotFromLoaded(client, row, categoryRows, variants, sellable, images, sizeMaster);
    return {
      id,
      name: String(row.name || row.nama || ""),
      slug: String(row.slug || ""),
      productCategoryId: row.product_category_id ? String(row.product_category_id) : null,
      productSubcategoryId: row.product_subcategory_id ? String(row.product_subcategory_id) : null,
      categoryName: String(categoryById.get(String(row.product_category_id))?.name || row.kategori || ""),
      basePrice: Number(row.base_price || 0),
      description: typeof row.description === "string" ? row.description : null,
      sku: typeof row.sku === "string" ? row.sku : null,
      status: lifecycle(row.status),
      productType: String(row.product_type || "standard_product"),
      pricingMode: String(row.pricing_mode || "fixed_price"),
      minimumOrderQty: Math.max(1, Number(row.minimum_order_qty || 1)),
      imageUrl: typeof row.image_url === "string" ? row.image_url : typeof row.gambar_url === "string" ? row.gambar_url : null,
      variantCount: variantIds.length,
      sellableCount: sellable.filter((item) => variantIds.includes(String(item.variant_id))).length,
      imageCount: images.filter((item) => variantIds.includes(String(item.variant_id))).length,
      validationIssues: validateProductPublishSnapshot(snapshot),
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null
    };
  }));

  return {
    role,
    capabilities: getProductManagerCapabilities(role),
    categories: categories.map((row) => ({ id: String(row.id), name: String(row.name), slug: String(row.slug) })),
    products
  };
}

async function loadPublishSnapshot(client: SupabaseClient, productId: string) {
  const [productResult, categoriesResult, variantsResult, sellableResult, imagesResult, sizeMasterResult] = await Promise.all([
    client.from("products").select(PRODUCT_FIELDS).eq("id", productId).maybeSingle(),
    client.from("product_categories").select("id,is_active,status"),
    client.from("product_variants").select("id,product_id,name,variant_name,status,is_active").eq("product_id", productId),
    client.from("product_variant_sizes").select("id,variant_id,sku,size_id,stock_quantity,status,is_active"),
    client.from("product_variant_images").select("id,variant_id,image_role,image_url"),
    client.from("product_size_master").select("id,is_active")
  ]);
  if (productResult.error || !productResult.data) throw new ProductApiError(404, "Produk tidak ditemukan.");
  const error = [categoriesResult, variantsResult, sellableResult, imagesResult, sizeMasterResult].find((result) => result.error)?.error;
  if (error) {
    console.error("Product publish validation load failed", { code: error.code });
    throw new ProductApiError(503, "Data validasi Publish belum dapat dimuat.");
  }
  return buildSnapshotFromLoaded(
    client,
    asRecord(productResult.data),
    asRecordArray(categoriesResult.data),
    asRecordArray(variantsResult.data),
    asRecordArray(sellableResult.data),
    asRecordArray(imagesResult.data),
    asRecordArray(sizeMasterResult.data)
  );
}

async function buildSnapshotFromLoaded(
  client: SupabaseClient,
  product: Record<string, unknown>,
  categories: Array<Record<string, unknown>>,
  variants: Array<Record<string, unknown>>,
  sellableRows: Array<Record<string, unknown>>,
  images: Array<Record<string, unknown>>,
  sizeMaster: Array<Record<string, unknown>>
): Promise<ProductPublishSnapshot> {
  const productId = String(product.id);
  const productVariants = variants.filter((row) => String(row.product_id) === productId);
  const variantIds = new Set(productVariants.map((row) => String(row.id)));
  const ownSellable = sellableRows.filter((row) => variantIds.has(String(row.variant_id)));
  const skuCounts = new Map<string, number>();
  for (const row of sellableRows) {
    const sku = typeof row.sku === "string" ? row.sku.trim() : "";
    if (sku) skuCounts.set(sku, (skuCounts.get(sku) || 0) + 1);
  }

  const category = categories.find((row) => String(row.id) === String(product.product_category_id));
  const { count: duplicateSlugCount, error: duplicateSlugError } = await client
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("slug", String(product.slug || ""))
    .neq("id", productId);
  if (duplicateSlugError) {
    console.error("Product slug validation failed", { code: duplicateSlugError.code });
    throw new ProductApiError(503, "Validasi slug belum dapat dijalankan.");
  }

  return {
    id: productId,
    name: String(product.name || product.nama || ""),
    slug: String(product.slug || ""),
    productCategoryId: product.product_category_id ? String(product.product_category_id) : null,
    basePrice: finiteNumber(product.base_price),
    status: lifecycle(product.status),
    categoryActive: Boolean(category && category.is_active !== false && category.status !== "inactive"),
    duplicateSlug: Number(duplicateSlugCount || 0) > 0,
    variants: productVariants.map((variant) => {
      const variantId = String(variant.id);
      const variantSellable = ownSellable.filter((row) => String(row.variant_id) === variantId);
      return {
        id: variantId,
        name: String(variant.name || variant.variant_name || ""),
        status: String(variant.status || (variant.is_active === false ? "inactive" : "active")),
        hasFrontImage: images.some((image) => String(image.variant_id) === variantId && image.image_role === "front" && Boolean(image.image_url)),
        sellable: variantSellable.map((row) => {
          const sku = typeof row.sku === "string" ? row.sku.trim() : null;
          return {
            id: String(row.id),
            sku,
            sizeId: row.size_id ? String(row.size_id) : null,
            sizeActive: Boolean(row.size_id && sizeMaster.some((size) => String(size.id) === String(row.size_id) && size.is_active !== false)),
            stockQuantity: finiteNumber(row.stock_quantity),
            status: String(row.status || (row.is_active === false ? "inactive" : "active")),
            duplicateSku: Boolean(sku && (skuCounts.get(sku) || 0) > 1)
          };
        })
      };
    })
  };
}

async function activeCategory(client: SupabaseClient, categoryId: string) {
  const { data, error } = await client
    .from("product_categories")
    .select("id,name,is_active,status")
    .eq("id", categoryId)
    .maybeSingle();
  if (error || !data || data.is_active === false || data.status === "inactive") {
    throw new ProductApiError(422, "Kategori produk tidak valid atau tidak aktif.");
  }
  return data;
}

async function assertUniqueSlug(client: SupabaseClient, slug: string, productId: string | null) {
  let query = client.from("products").select("id").eq("slug", slug).limit(1);
  if (productId) query = query.neq("id", productId);
  const { data, error } = await query;
  if (error) throw new ProductApiError(503, "Validasi slug belum dapat dijalankan.");
  if (data?.length) throw new ProductApiError(409, "Slug sudah dipakai produk lain.");
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[] : [];
}

async function readBody(request: Request): Promise<ActionBody> {
  try {
    const body = await request.json();
    return typeof body === "object" && body !== null ? body as ActionBody : {};
  } catch {
    throw new ProductApiError(400, "JSON request tidak valid.");
  }
}

function cleanId(value: unknown) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : "";
}
function lifecycle(value: unknown): ProductLifecycle {
  return value === "active" || value === "archived" ? value : "draft";
}
function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function validationResponse(issues: ValidationIssue[]) {
  return noStoreJson({ ok: false, issues, error: "Validasi Draft gagal." }, 422);
}
function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

class ProductApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function productErrorResponse(error: unknown) {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  if (error instanceof ProductApiError || error instanceof Phase13AuthError) {
    return noStoreJson({ error: error.message }, error.status);
  }
  console.error("Product Manager API failed", { error: error instanceof Error ? error.name : "unknown" });
  return noStoreJson({ error: "Operasi Product Manager gagal diproses." }, 500);
}
