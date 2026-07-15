import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProductManagerCapabilities,
  getProductWorkflowProgress,
  normalizeProductRootInput,
  normalizeProductVariantInput,
  normalizeSellableSkuInput,
  normalizeVariantImageInput,
  PRODUCT_IMAGE_ROLES,
  PRODUCT_MANAGER_ROLES,
  validateProductPublishSnapshot,
  validateProductRootDraft,
  validateProductVariantDraft,
  validateSellableSkuDraft,
  validateVariantImageDraft,
  type ProductImageRole,
  type ProductLifecycle,
  type ProductPublishSnapshot,
  type ProductRootInput,
  type ProductVariantInput,
  type SellableSkuInput,
  type VariantImageInput
} from "@/lib/product-manager";
import {
  Phase13AuthError,
  requirePhase13Actor
} from "@/lib/phase13-auth";
import type { AdminRole } from "@/lib/access-control";
import type { ValidationIssue } from "@/lib/types";
import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import { deleteVariantImageRow } from "@/lib/product-manager-service";

export const dynamic = "force-dynamic";

type ProductAction =
  | "save_draft"
  | "duplicate"
  | "save_variant"
  | "save_sellable"
  | "save_image"
  | "remove_image"
  | "validate_publish"
  | "publish"
  | "archive";

type ActionBody = {
  action?: ProductAction;
  productId?: string;
  product?: unknown;
  variant?: unknown;
  sellable?: unknown;
  image?: unknown;
  imageId?: string;
};

const PRODUCT_FIELDS = [
  "id",
  "name",
  "nama",
  "slug",
  "product_category_id",
  "product_subcategory_id",
  "kategori",
  "subcategory",
  "base_price",
  "description",
  "deskripsi",
  "sku",
  "status",
  "product_type",
  "pricing_mode",
  "minimum_order_qty",
  "seo_title",
  "seo_description",
  "image_url",
  "gambar_url",
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
  "sku",
  "price_adjustment",
  "status",
  "is_active",
  "is_default",
  "sort_order",
  "image_url"
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
  "sort_order"
].join(",");

const IMAGE_FIELDS = [
  "id",
  "variant_id",
  "image_role",
  "image_url",
  "alt_text",
  "object_fit",
  "object_position",
  "target_ratio",
  "is_cover",
  "sort_order"
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

    if (body.action === "save_variant") {
      requireDependencyRole(actor.role);
      const input = normalizeProductVariantInput(body.variant);
      if (!input) throw new ProductApiError(400, "Data color variant tidak valid.");
      const issues = validateProductVariantDraft(input);
      if (issues.length) return validationResponse(issues);
      const result = await saveProductVariant(actor.adminClient, input);
      return noStoreJson({ ok: true, productId: input.productId, variantId: result.id, message: "Color variant tersimpan." });
    }

    if (body.action === "save_sellable") {
      requireDependencyRole(actor.role);
      const input = normalizeSellableSkuInput(body.sellable);
      if (!input) throw new ProductApiError(400, "Data sellable SKU tidak valid.");
      const issues = validateSellableSkuDraft(input);
      if (issues.length) return validationResponse(issues);
      const result = await saveSellableSku(actor.adminClient, input);
      return noStoreJson({ ok: true, productId: result.productId, variantId: input.variantId, sellableId: result.id, message: "Sellable SKU tersimpan." });
    }

    if (body.action === "save_image") {
      requireDependencyRole(actor.role);
      const input = normalizeVariantImageInput(body.image);
      if (!input) throw new ProductApiError(400, "Data gambar variant tidak valid.");
      const issues = validateVariantImageDraft(input);
      if (issues.length) return validationResponse(issues);
      const result = await saveVariantImage(actor.adminClient, input);
      return noStoreJson({ ok: true, productId: result.productId, variantId: input.variantId, imageId: result.id, message: `Gambar ${input.imageRole} tersimpan pada rasio 4:5.` });
    }

    if (body.action === "remove_image") {
      requireDependencyRole(actor.role);
      const imageId = cleanId(body.imageId);
      if (!imageId) throw new ProductApiError(400, "Gambar variant wajib dipilih.");
      const result = await removeVariantImage(actor.adminClient, imageId);
      return noStoreJson({ ok: true, productId: result.productId, variantId: result.variantId, message: "Slot gambar dikosongkan. File asli di Media Library tetap aman." });
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
      const blockers = issues.filter((issue) => issue.severity === "error");
      if (body.action === "validate_publish" || blockers.length) {
        return noStoreJson({ ok: blockers.length === 0, productId, issues }, blockers.length ? 422 : 200);
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

function requireDependencyRole(role: string) {
  if (!getProductManagerCapabilities(role).canManageDependencies) {
    throw new ProductApiError(403, "Pengelolaan variant, sellable SKU, harga, stok, dan gambar hanya tersedia untuk role yang diizinkan.");
  }
}

async function saveProductRoot(client: SupabaseClient, role: string, input: ProductRootInput) {
  const category = await activeCategory(client, input.productCategoryId);
  const subcategory = input.productSubcategoryId
    ? await activeSubcategory(client, input.productSubcategoryId, input.productCategoryId)
    : null;
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
    subcategory: subcategory?.name || "",
    base_price: input.basePrice,
    description: input.description || null,
    deskripsi: input.description || "",
    sku: input.sku || null,
    product_type: input.productType || "standard_product",
    pricing_mode: input.pricingMode || "fixed_price",
    minimum_order_qty: input.minimumOrderQty || 1,
    seo_title: input.seoTitle || null,
    seo_description: input.seoDescription || null,
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

async function saveProductVariant(client: SupabaseClient, input: ProductVariantInput) {
  await assertProductExists(client, input.productId);
  const colorMaster = input.colorMasterId ? await activeColorMaster(client, input.colorMasterId) : null;
  const normalized = colorMaster
    ? { name: String(colorMaster.name), slug: String(colorMaster.slug), hexCode: String(colorMaster.color_hex) }
    : { name: input.name.trim(), slug: input.slug.trim(), hexCode: input.hexCode.toUpperCase() };
  await assertUniqueVariantSlug(client, input.productId, normalized.slug, input.id || null);
  await assertUniqueOptionalVariantSku(client, input.sku || null, input.id || null);

  const payload = {
    product_id: input.productId,
    name: normalized.name,
    variant_name: normalized.name,
    color_name: normalized.name,
    slug: normalized.slug,
    hex_code: normalized.hexCode,
    color_hex: normalized.hexCode,
    sku: input.sku || null,
    price_adjustment: input.priceAdjustment,
    status: input.status,
    is_active: input.status === "active",
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString()
  };
  const query = input.id
    ? client.from("product_variants").update(payload).eq("id", input.id).eq("product_id", input.productId)
    : client.from("product_variants").insert(payload);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data?.id) {
    console.error("Product variant save failed", { code: error?.code });
    throw new ProductApiError(409, "Color variant gagal disimpan. Periksa slug dan SKU agar tidak duplikat.");
  }
  return { id: String(data.id) };
}

async function saveSellableSku(client: SupabaseClient, input: SellableSkuInput) {
  const variant = await variantWithProduct(client, input.variantId);
  const size = await activeSizeMaster(client, input.sizeId);
  await assertUniqueSellableSku(client, input.sku, input.id || null);
  await assertUniqueVariantSize(client, input.variantId, input.sizeId, input.id || null);

  const payload = {
    variant_id: input.variantId,
    size_id: input.sizeId,
    size_name: String(size.name),
    sku: input.sku.trim(),
    stock_quantity: input.stockQuantity,
    stock: input.stockQuantity,
    price_adjustment: input.priceAdjustment,
    status: input.status,
    is_active: input.status === "active",
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString()
  };
  const query = input.id
    ? client.from("product_variant_sizes").update(payload).eq("id", input.id).eq("variant_id", input.variantId)
    : client.from("product_variant_sizes").insert(payload);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data?.id) {
    console.error("Sellable SKU save failed", { code: error?.code });
    throw new ProductApiError(409, "Sellable SKU gagal disimpan. Pastikan SKU dan ukuran tidak duplikat.");
  }
  return { id: String(data.id), productId: String(variant.product_id) };
}

async function saveVariantImage(client: SupabaseClient, input: VariantImageInput) {
  const variant = await variantWithProduct(client, input.variantId);
  const { data: existing, error: existingError } = await client
    .from("product_variant_images")
    .select(IMAGE_FIELDS)
    .eq("variant_id", input.variantId)
    .eq("image_role", input.imageRole)
    .maybeSingle();
  if (existingError) throw new ProductApiError(503, "Slot gambar belum dapat diperiksa.");

  const previous = existing ? asRecord(existing) : null;
  const payload = {
    variant_id: input.variantId,
    image_role: input.imageRole,
    image_url: input.imageUrl.trim(),
    alt_text: input.altText || `${String(variant.name || variant.variant_name || "Variant")} ${input.imageRole}`,
    object_fit: input.objectFit || "cover",
    object_position: input.objectPosition || "center center",
    target_ratio: "4:5",
    is_cover: input.imageRole === "front",
    sort_order: PRODUCT_IMAGE_ROLES.indexOf(input.imageRole),
    updated_at: new Date().toISOString()
  };

  const request = previous?.id
    ? client.from("product_variant_images").update(payload).eq("id", previous.id)
    : client.from("product_variant_images").insert(payload);
  const { data, error } = await request.select("id").maybeSingle();
  if (error || !data?.id) {
    console.error("Variant image save failed", { code: error?.code });
    throw new ProductApiError(409, "Gambar variant gagal disimpan.");
  }

  if (input.imageRole === "front") {
    const previousVariantUrl = typeof variant.image_url === "string" ? variant.image_url : null;
    const { error: variantError } = await client
      .from("product_variants")
      .update({ image_url: input.imageUrl.trim(), updated_at: new Date().toISOString() })
      .eq("id", input.variantId);
    if (variantError) {
      await rollbackImageSave(client, String(data.id), previous);
      await client.from("product_variants").update({ image_url: previousVariantUrl }).eq("id", input.variantId);
      console.error("Variant front image projection failed", { code: variantError.code });
      throw new ProductApiError(409, "Gambar front tidak dapat diproyeksikan ke variant. Perubahan dibatalkan.");
    }
  }

  return { id: String(data.id), productId: String(variant.product_id) };
}

async function removeVariantImage(client: SupabaseClient, imageId: string) {
  const { data: image, error } = await client
    .from("product_variant_images")
    .select(IMAGE_FIELDS)
    .eq("id", imageId)
    .maybeSingle();
  if (error || !image) throw new ProductApiError(404, "Gambar variant tidak ditemukan.");
  const imageRow = asRecord(image);
  const variant = await variantWithProduct(client, String(imageRow.variant_id));
  const deletion = await deleteVariantImageRow(client, imageId);
  if (deletion.error) {
    console.error("Variant image remove failed", { code: deletion.error.code });
    throw new ProductApiError(409, "Slot gambar gagal dikosongkan.");
  }

  if (imageRow.image_role === "front") {
    const { error: variantError } = await client
      .from("product_variants")
      .update({ image_url: null, updated_at: new Date().toISOString() })
      .eq("id", String(imageRow.variant_id));
    if (variantError) {
      await client.from("product_variant_images").insert(restorableImagePayload(imageRow));
      console.error("Variant front image clear failed", { code: variantError.code });
      throw new ProductApiError(409, "Slot front tidak dapat dikosongkan. Perubahan dibatalkan.");
    }
  }
  return { variantId: String(imageRow.variant_id), productId: String(variant.product_id) };
}

async function rollbackImageSave(client: SupabaseClient, imageId: string, previous: Record<string, unknown> | null) {
  if (previous?.id) {
    await client.from("product_variant_images").update(restorableImagePayload(previous)).eq("id", previous.id);
    return;
  }
  await deleteVariantImageRow(client, imageId);
}

function restorableImagePayload(row: Record<string, unknown>) {
  return {
    variant_id: row.variant_id,
    image_url: row.image_url,
    image_role: row.image_role,
    alt_text: row.alt_text || "",
    object_fit: row.object_fit || "cover",
    object_position: row.object_position || "center center",
    target_ratio: row.target_ratio || "4:5",
    is_cover: Boolean(row.is_cover),
    sort_order: Number(row.sort_order || 0)
  };
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
  const [
    productsResult,
    categoriesResult,
    subcategoriesResult,
    colorsResult,
    sizesResult,
    variantsResult,
    sellableResult,
    imagesResult,
    mediaResult
  ] = await Promise.all([
    client.from("products").select(PRODUCT_FIELDS).order("updated_at", { ascending: false }),
    client.from("product_categories").select("id,name,slug,is_active,status").order("sort_order"),
    client.from("product_subcategories").select("id,category_id,name,slug,is_active").order("sort_order"),
    client.from("product_color_master").select("id,name,slug,color_hex,is_active").order("sort_order"),
    client.from("product_size_master").select("id,name,slug,size_group,is_active").order("sort_order"),
    client.from("product_variants").select(VARIANT_FIELDS).order("sort_order"),
    client.from("product_variant_sizes").select(SELLABLE_FIELDS).order("sort_order"),
    client.from("product_variant_images").select(IMAGE_FIELDS).order("sort_order"),
    client.from("media_assets").select("id,name,public_url,alt_text,width,height,status_aktif,media_type").eq("status_aktif", true).eq("media_type", "image").order("created_at", { ascending: false }).limit(200)
  ]);

  const results = [productsResult, categoriesResult, subcategoriesResult, colorsResult, sizesResult, variantsResult, sellableResult, imagesResult, mediaResult];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    console.error("Product manager load failed", { code: firstError.code });
    throw new ProductApiError(503, "Data Unified Product Manager belum dapat dimuat.");
  }

  const productRows = asRecordArray(productsResult.data);
  const categoryRows = asRecordArray(categoriesResult.data);
  const subcategoryRows = asRecordArray(subcategoriesResult.data);
  const colorRows = asRecordArray(colorsResult.data);
  const sizeRows = asRecordArray(sizesResult.data);
  const variantRows = asRecordArray(variantsResult.data);
  const sellableRows = asRecordArray(sellableResult.data);
  const imageRows = asRecordArray(imagesResult.data);
  const mediaRows = asRecordArray(mediaResult.data);

  const categories = categoryRows.filter((row) => row.is_active !== false && row.status !== "inactive");
  const subcategories = subcategoryRows.filter((row) => row.is_active !== false);
  const colorMaster = colorRows.filter((row) => row.is_active !== false);
  const sizeMaster = sizeRows.filter((row) => row.is_active !== false);
  const categoryById = new Map(categories.map((row) => [String(row.id), row]));
  const subcategoryById = new Map(subcategories.map((row) => [String(row.id), row]));
  const sizeById = new Map(sizeRows.map((row) => [String(row.id), row]));
  const skuCounts = skuFrequency(sellableRows);
  const slugCounts = frequency(productRows, "slug");

  const products = productRows.map((row) => {
    const id = String(row.id);
    const ownVariants = variantRows.filter((variant) => String(variant.product_id) === id);
    const variants = ownVariants.map((variant) => mapVariant(variant, sellableRows, imageRows, sizeById));
    const snapshot = buildSnapshot(row, categoryRows, ownVariants, sellableRows, imageRows, sizeRows, slugCounts, skuCounts);
    const validationIssues = validateProductPublishSnapshot(snapshot);
    return {
      id,
      name: String(row.name || row.nama || ""),
      slug: String(row.slug || ""),
      productCategoryId: row.product_category_id ? String(row.product_category_id) : null,
      productSubcategoryId: row.product_subcategory_id ? String(row.product_subcategory_id) : null,
      categoryName: String(categoryById.get(String(row.product_category_id))?.name || row.kategori || ""),
      subcategoryName: String(subcategoryById.get(String(row.product_subcategory_id))?.name || row.subcategory || ""),
      basePrice: Number(row.base_price || 0),
      description: typeof row.description === "string" ? row.description : null,
      sku: typeof row.sku === "string" ? row.sku : null,
      status: lifecycle(row.status),
      productType: String(row.product_type || "standard_product"),
      pricingMode: String(row.pricing_mode || "fixed_price"),
      minimumOrderQty: Math.max(1, Number(row.minimum_order_qty || 1)),
      seoTitle: typeof row.seo_title === "string" ? row.seo_title : null,
      seoDescription: typeof row.seo_description === "string" ? row.seo_description : null,
      imageUrl: typeof row.image_url === "string" ? row.image_url : typeof row.gambar_url === "string" ? row.gambar_url : null,
      variantCount: variants.length,
      sellableCount: variants.reduce((total, variant) => total + variant.sellable.length, 0),
      imageCount: variants.reduce((total, variant) => total + variant.images.length, 0),
      variants,
      validationIssues,
      workflow: getProductWorkflowProgress(snapshot),
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null
    };
  });

  return {
    role,
    capabilities: getProductManagerCapabilities(role),
    categories: categories.map((row) => ({ id: String(row.id), name: String(row.name), slug: String(row.slug) })),
    subcategories: subcategories.map((row) => ({ id: String(row.id), categoryId: String(row.category_id), name: String(row.name), slug: String(row.slug) })),
    colorMaster: colorMaster.map((row) => ({ id: String(row.id), name: String(row.name), slug: String(row.slug), colorHex: String(row.color_hex) })),
    sizeMaster: sizeMaster.map((row) => ({ id: String(row.id), name: String(row.name), slug: String(row.slug), sizeGroup: String(row.size_group || "apparel") })),
    mediaAssets: mediaRows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      publicUrl: String(row.public_url),
      altText: typeof row.alt_text === "string" ? row.alt_text : null,
      width: finiteNumber(row.width),
      height: finiteNumber(row.height)
    })),
    products
  };
}

function mapVariant(
  variant: Record<string, unknown>,
  sellableRows: Array<Record<string, unknown>>,
  imageRows: Array<Record<string, unknown>>,
  sizeById: Map<string, Record<string, unknown>>
) {
  const variantId = String(variant.id);
  return {
    id: variantId,
    productId: String(variant.product_id),
    name: String(variant.name || variant.variant_name || variant.color_name || ""),
    slug: String(variant.slug || ""),
    hexCode: String(variant.hex_code || variant.color_hex || "#111111"),
    sku: typeof variant.sku === "string" ? variant.sku : null,
    priceAdjustment: Number(variant.price_adjustment || 0),
    status: variantStatus(variant.status, variant.is_active),
    isDefault: Boolean(variant.is_default),
    sortOrder: Number(variant.sort_order || 0),
    sellable: sellableRows.filter((row) => String(row.variant_id) === variantId).map((row) => ({
      id: String(row.id),
      variantId,
      sizeId: row.size_id ? String(row.size_id) : null,
      sizeName: String(sizeById.get(String(row.size_id))?.name || row.size_name || ""),
      sku: String(row.sku || ""),
      stockQuantity: Number(row.stock_quantity ?? row.stock ?? 0),
      priceAdjustment: Number(row.price_adjustment || 0),
      status: variantStatus(row.status, row.is_active),
      sortOrder: Number(row.sort_order || 0)
    })),
    images: imageRows.filter((row) => String(row.variant_id) === variantId).map((row) => ({
      id: String(row.id),
      variantId,
      imageRole: productImageRole(row.image_role, row.is_cover, row.sort_order),
      imageUrl: String(row.image_url || ""),
      altText: typeof row.alt_text === "string" ? row.alt_text : null,
      objectFit: row.object_fit === "contain" ? "contain" as const : "cover" as const,
      objectPosition: String(row.object_position || "center center"),
      targetRatio: String(row.target_ratio || "4:5"),
      sortOrder: Number(row.sort_order || 0)
    }))
  };
}

async function loadPublishSnapshot(client: SupabaseClient, productId: string) {
  const [productResult, categoriesResult, variantsResult, sellableResult, imagesResult, sizeMasterResult] = await Promise.all([
    client.from("products").select(PRODUCT_FIELDS).eq("id", productId).maybeSingle(),
    client.from("product_categories").select("id,is_active,status"),
    client.from("product_variants").select(VARIANT_FIELDS).eq("product_id", productId),
    client.from("product_variant_sizes").select(SELLABLE_FIELDS),
    client.from("product_variant_images").select(IMAGE_FIELDS),
    client.from("product_size_master").select("id,is_active")
  ]);
  if (productResult.error || !productResult.data) throw new ProductApiError(404, "Produk tidak ditemukan.");
  const error = [categoriesResult, variantsResult, sellableResult, imagesResult, sizeMasterResult].find((result) => result.error)?.error;
  if (error) {
    console.error("Product publish validation load failed", { code: error.code });
    throw new ProductApiError(503, "Data validasi Publish belum dapat dimuat.");
  }
  const productRows = [asRecord(productResult.data)];
  const slugCounts = frequency(productRows, "slug");
  const { count, error: duplicateError } = await client
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("slug", String(productRows[0]?.slug || ""))
    .neq("id", productId);
  if (duplicateError) throw new ProductApiError(503, "Validasi slug belum dapat dijalankan.");
  if (Number(count || 0) > 0) slugCounts.set(String(productRows[0]?.slug || ""), 2);

  return buildSnapshot(
    productRows[0] || {},
    asRecordArray(categoriesResult.data),
    asRecordArray(variantsResult.data),
    asRecordArray(sellableResult.data),
    asRecordArray(imagesResult.data),
    asRecordArray(sizeMasterResult.data),
    slugCounts,
    skuFrequency(asRecordArray(sellableResult.data))
  );
}

function buildSnapshot(
  product: Record<string, unknown>,
  categories: Array<Record<string, unknown>>,
  variants: Array<Record<string, unknown>>,
  sellableRows: Array<Record<string, unknown>>,
  images: Array<Record<string, unknown>>,
  sizeMaster: Array<Record<string, unknown>>,
  slugCounts: Map<string, number>,
  skuCounts: Map<string, number>
): ProductPublishSnapshot {
  const productId = String(product.id);
  const productVariants = variants.filter((row) => String(row.product_id) === productId);
  const variantIds = new Set(productVariants.map((row) => String(row.id)));
  const ownSellable = sellableRows.filter((row) => variantIds.has(String(row.variant_id)));
  const category = categories.find((row) => String(row.id) === String(product.product_category_id));

  return {
    id: productId,
    name: String(product.name || product.nama || ""),
    slug: String(product.slug || ""),
    productCategoryId: product.product_category_id ? String(product.product_category_id) : null,
    basePrice: finiteNumber(product.base_price),
    status: lifecycle(product.status),
    categoryActive: Boolean(category && category.is_active !== false && category.status !== "inactive"),
    duplicateSlug: (slugCounts.get(String(product.slug || "")) || 0) > 1,
    variants: productVariants.map((variant) => {
      const variantId = String(variant.id);
      const variantSellable = ownSellable.filter((row) => String(row.variant_id) === variantId);
      const variantImages = images.filter((image) => String(image.variant_id) === variantId && Boolean(image.image_url));
      return {
        id: variantId,
        name: String(variant.name || variant.variant_name || ""),
        slug: String(variant.slug || ""),
        hexCode: String(variant.hex_code || variant.color_hex || ""),
        status: variantStatus(variant.status, variant.is_active),
        hasFrontImage: variantImages.some((image) => productImageRole(image.image_role, image.is_cover, image.sort_order) === "front"),
        imageRoles: variantImages.map((image) => productImageRole(image.image_role, image.is_cover, image.sort_order)),
        sellable: variantSellable.map((row) => {
          const sku = typeof row.sku === "string" ? row.sku.trim() : null;
          return {
            id: String(row.id),
            sku,
            sizeId: row.size_id ? String(row.size_id) : null,
            sizeActive: Boolean(row.size_id && sizeMaster.some((size) => String(size.id) === String(row.size_id) && size.is_active !== false)),
            stockQuantity: finiteNumber(row.stock_quantity ?? row.stock),
            status: variantStatus(row.status, row.is_active),
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

async function activeSubcategory(client: SupabaseClient, subcategoryId: string, categoryId: string) {
  const { data, error } = await client
    .from("product_subcategories")
    .select("id,name,category_id,is_active")
    .eq("id", subcategoryId)
    .eq("category_id", categoryId)
    .maybeSingle();
  if (error || !data || data.is_active === false) throw new ProductApiError(422, "Subkategori tidak valid atau tidak aktif.");
  return data;
}

async function activeColorMaster(client: SupabaseClient, colorId: string) {
  const { data, error } = await client
    .from("product_color_master")
    .select("id,name,slug,color_hex,is_active")
    .eq("id", colorId)
    .maybeSingle();
  if (error || !data || data.is_active === false) throw new ProductApiError(422, "Master warna tidak valid atau tidak aktif.");
  return data;
}

async function activeSizeMaster(client: SupabaseClient, sizeId: string) {
  const { data, error } = await client
    .from("product_size_master")
    .select("id,name,is_active")
    .eq("id", sizeId)
    .maybeSingle();
  if (error || !data || data.is_active === false) throw new ProductApiError(422, "Master ukuran tidak valid atau tidak aktif.");
  return data;
}

async function assertProductExists(client: SupabaseClient, productId: string) {
  const { data, error } = await client.from("products").select("id,status").eq("id", productId).maybeSingle();
  if (error || !data) throw new ProductApiError(404, "Produk tidak ditemukan.");
  return data;
}

async function variantWithProduct(client: SupabaseClient, variantId: string) {
  const { data, error } = await client.from("product_variants").select("id,product_id,name,variant_name,image_url").eq("id", variantId).maybeSingle();
  if (error || !data) throw new ProductApiError(404, "Color variant tidak ditemukan.");
  return data;
}

async function assertUniqueSlug(client: SupabaseClient, slug: string, productId: string | null) {
  let query = client.from("products").select("id").eq("slug", slug).limit(1);
  if (productId) query = query.neq("id", productId);
  const { data, error } = await query;
  if (error) throw new ProductApiError(503, "Validasi slug belum dapat dijalankan.");
  if (data?.length) throw new ProductApiError(409, "Slug sudah dipakai produk lain.");
}

async function assertUniqueVariantSlug(client: SupabaseClient, productId: string, slug: string, variantId: string | null) {
  let query = client.from("product_variants").select("id").eq("product_id", productId).eq("slug", slug).limit(1);
  if (variantId) query = query.neq("id", variantId);
  const { data, error } = await query;
  if (error) throw new ProductApiError(503, "Validasi slug warna belum dapat dijalankan.");
  if (data?.length) throw new ProductApiError(409, "Slug warna sudah dipakai pada produk ini.");
}

async function assertUniqueOptionalVariantSku(client: SupabaseClient, sku: string | null, variantId: string | null) {
  if (!sku?.trim()) return;
  let query = client.from("product_variants").select("id").eq("sku", sku.trim()).limit(1);
  if (variantId) query = query.neq("id", variantId);
  const { data, error } = await query;
  if (error) throw new ProductApiError(503, "Validasi SKU induk warna belum dapat dijalankan.");
  if (data?.length) throw new ProductApiError(409, "SKU induk warna sudah dipakai.");
}

async function assertUniqueSellableSku(client: SupabaseClient, sku: string, sellableId: string | null) {
  let query = client.from("product_variant_sizes").select("id").eq("sku", sku.trim()).limit(1);
  if (sellableId) query = query.neq("id", sellableId);
  const { data, error } = await query;
  if (error) throw new ProductApiError(503, "Validasi sellable SKU belum dapat dijalankan.");
  if (data?.length) throw new ProductApiError(409, "Sellable SKU sudah dipakai.");
}

async function assertUniqueVariantSize(client: SupabaseClient, variantId: string, sizeId: string, sellableId: string | null) {
  let query = client.from("product_variant_sizes").select("id").eq("variant_id", variantId).eq("size_id", sizeId).limit(1);
  if (sellableId) query = query.neq("id", sellableId);
  const { data, error } = await query;
  if (error) throw new ProductApiError(503, "Validasi ukuran variant belum dapat dijalankan.");
  if (data?.length) throw new ProductApiError(409, "Ukuran tersebut sudah tersedia pada color variant ini.");
}

function skuFrequency(rows: Array<Record<string, unknown>>) {
  const result = new Map<string, number>();
  for (const row of rows) {
    const sku = typeof row.sku === "string" ? row.sku.trim() : "";
    if (sku) result.set(sku, (result.get(sku) || 0) + 1);
  }
  return result;
}

function frequency(rows: Array<Record<string, unknown>>, key: string) {
  const result = new Map<string, number>();
  for (const row of rows) {
    const value = typeof row[key] === "string" ? String(row[key]).trim() : "";
    if (value) result.set(value, (result.get(value) || 0) + 1);
  }
  return result;
}

function productImageRole(value: unknown, isCover: unknown, sortOrder: unknown): ProductImageRole {
  if (PRODUCT_IMAGE_ROLES.includes(value as ProductImageRole)) return value as ProductImageRole;
  if (isCover === true) return "front";
  return PRODUCT_IMAGE_ROLES[Math.max(0, Math.min(3, Number(sortOrder || 0)))] || "lifestyle";
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
function variantStatus(value: unknown, legacyActive: unknown): "active" | "inactive" {
  if (value === "inactive" || legacyActive === false) return "inactive";
  return "active";
}
function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
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
  return noStoreJson({ error: "Operasi Unified Product Manager gagal diproses." }, 500);
}
