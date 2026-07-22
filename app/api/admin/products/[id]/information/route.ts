import type { SupabaseClient } from "@supabase/supabase-js";
import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import type { AdminRole } from "@/lib/access-control";
import {
  getProductManagerCapabilities,
  normalizeProductRootInput,
  PRODUCT_MANAGER_ROLES,
  validateProductRootDraft,
  type ProductLifecycle,
  type ProductRootInput
} from "@/lib/product-manager";
import {
  PIM_AUDIT_EVENT_REGISTRY,
  diffPimAuditFields,
  type PimAuditEventCode
} from "@/lib/pim-audit";
import {
  actorAuditLabel,
  createPimAuditIdentity,
  recordPimAuditEvent
} from "@/lib/pim-audit-server";
import { isValidProductWorkspaceId } from "@/lib/product-workspace";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";
import type { ValidationIssue } from "@/lib/types";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const PRODUCT_INFORMATION_FIELDS = [
  "id",
  "name",
  "nama",
  "slug",
  "status",
  "product_category_id",
  "product_subcategory_id",
  "kategori",
  "subcategory",
  "base_price",
  "description",
  "deskripsi",
  "sku",
  "product_type",
  "pricing_mode",
  "minimum_order_qty",
  "seo_title",
  "seo_description",
  "image_url",
  "gambar_url",
  "updated_at"
].join(",");

const INFORMATION_AUDIT_FIELDS = [
  "name",
  "slug",
  "product_category_id",
  "product_subcategory_id",
  "base_price",
  "description",
  "sku",
  "product_type",
  "pricing_mode",
  "minimum_order_qty",
  "seo_title",
  "seo_description"
] as const;

export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireProductInformationActor(request);
    const { id } = await context.params;
    assertProductId(id);
    const payload = await loadProductInformationPayload(actor.adminClient, actor.role, id);
    return noStoreJson(payload);
  } catch (error) {
    return productInformationErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireProductInformationActor(request);
    const { id } = await context.params;
    assertProductId(id);

    const body = await readBody(request);
    if (!Object.prototype.hasOwnProperty.call(body, "expectedUpdatedAt")) {
      throw new ProductInformationApiError(400, "Versi data produk wajib dikirim.");
    }
    const expectedUpdatedAt = expectedVersion(body.expectedUpdatedAt);
    const source = isRecord(body.product) ? { ...body.product, id } : body.product;
    const normalized = normalizeProductRootInput(source);
    if (!normalized) {
      throw new ProductInformationApiError(400, "Data informasi produk tidak valid.");
    }
    const input: ProductRootInput = { ...normalized, id };
    const issues = validateProductRootDraft(input);
    if (issues.length) return validationResponse(issues);

    const { data: currentData, error: currentError } = await actor.adminClient
      .from("products")
      .select(PRODUCT_INFORMATION_FIELDS)
      .eq("id", id)
      .maybeSingle();
    if (currentError) {
      console.error("Product Information current row load failed", { code: currentError.code });
      throw new ProductInformationApiError(503, "Versi produk belum dapat diperiksa.");
    }
    if (!currentData || typeof currentData !== "object") {
      throw new ProductInformationApiError(404, "Produk tidak ditemukan.");
    }

    const current = currentData as Record<string, unknown>;
    const currentStatus = lifecycle(current.status);
    const capabilities = getProductManagerCapabilities(actor.role);
    const canEdit = currentStatus === "draft"
      ? capabilities.canEditDraft
      : capabilities.canEditPublished;
    if (!canEdit) {
      throw new ProductInformationApiError(
        403,
        currentStatus === "draft"
          ? "Role ini tidak dapat mengubah informasi produk."
          : "Admin hanya dapat mengedit produk Draft."
      );
    }

    const currentUpdatedAt = textOrNull(current.updated_at);
    if (currentUpdatedAt !== expectedUpdatedAt) {
      throw conflict();
    }

    const category = await activeCategory(actor.adminClient, input.productCategoryId);
    const subcategory = input.productSubcategoryId
      ? await activeSubcategory(
        actor.adminClient,
        input.productSubcategoryId,
        input.productCategoryId
      )
      : null;
    await assertUniqueSlug(actor.adminClient, input.slug, id);

    const expectedTime = expectedUpdatedAt ? Date.parse(expectedUpdatedAt) : 0;
    const nextUpdatedAt = new Date(Math.max(Date.now(), expectedTime + 1)).toISOString();
    const updatePayload = {
      name: input.name.trim(),
      nama: input.name.trim(),
      slug: input.slug.trim(),
      product_category_id: input.productCategoryId,
      product_subcategory_id: input.productSubcategoryId || null,
      kategori: String(category.name),
      subcategory: subcategory ? String(subcategory.name) : "",
      base_price: input.basePrice,
      description: input.description || null,
      deskripsi: input.description || "",
      sku: input.sku || null,
      product_type: input.productType || "standard_product",
      pricing_mode: input.pricingMode || "fixed_price",
      minimum_order_qty: input.minimumOrderQty || 1,
      seo_title: input.seoTitle || null,
      seo_description: input.seoDescription || null,
      updated_at: nextUpdatedAt
    };

    const baseUpdate = actor.adminClient
      .from("products")
      .update(updatePayload)
      .eq("id", id);
    const guardedUpdate = expectedUpdatedAt === null
      ? baseUpdate.is("updated_at", null)
      : baseUpdate.eq("updated_at", expectedUpdatedAt);
    const { data: updatedData, error: updateError } = await guardedUpdate
      .select(PRODUCT_INFORMATION_FIELDS)
      .maybeSingle();

    if (updateError) {
      console.error("Product Information update failed", { code: updateError.code });
      throw new ProductInformationApiError(
        409,
        "Informasi produk belum dapat disimpan. Periksa data lalu coba lagi."
      );
    }
    if (!updatedData || typeof updatedData !== "object") throw conflict();

    const updated = updatedData as Record<string, unknown>;
    const identity = createPimAuditIdentity(request, "workspace-information");
    await auditProductInformation({
      actor,
      identity,
      before: current,
      after: updated,
      productId: id
    });

    return noStoreJson({
      ok: true,
      message: "Informasi produk berhasil disimpan.",
      product: mapProductInformation(
        updated,
        String(category.name),
        subcategory ? String(subcategory.name) : ""
      )
    });
  } catch (error) {
    return productInformationErrorResponse(error);
  }
}

async function loadProductInformationPayload(
  client: SupabaseClient,
  role: string,
  productId: string
) {
  const [productResult, categoriesResult, subcategoriesResult] = await Promise.all([
    client
      .from("products")
      .select(PRODUCT_INFORMATION_FIELDS)
      .eq("id", productId)
      .maybeSingle(),
    client
      .from("product_categories")
      .select("id,name,slug,is_active,status")
      .order("sort_order"),
    client
      .from("product_subcategories")
      .select("id,category_id,name,slug,is_active")
      .order("sort_order")
  ]);

  if (productResult.error) {
    console.error("Product Information load failed", { code: productResult.error.code });
    throw new ProductInformationApiError(503, "Informasi produk belum dapat dimuat.");
  }
  if (!productResult.data || typeof productResult.data !== "object") {
    throw new ProductInformationApiError(404, "Produk tidak ditemukan.");
  }
  const dependencyError = categoriesResult.error || subcategoriesResult.error;
  if (dependencyError) {
    console.error("Product Information master data load failed", {
      code: dependencyError.code
    });
    throw new ProductInformationApiError(
      503,
      "Kategori dan subkategori belum dapat dimuat."
    );
  }

  const categories = records(categoriesResult.data)
    .filter((row) => row.is_active !== false && row.status !== "inactive");
  const subcategories = records(subcategoriesResult.data)
    .filter((row) => row.is_active !== false);
  const categoryById = new Map(
    categories.map((row) => [String(row.id), String(row.name)])
  );
  const subcategoryById = new Map(
    subcategories.map((row) => [String(row.id), String(row.name)])
  );
  const product = productResult.data as Record<string, unknown>;
  const categoryId = textOrNull(product.product_category_id) || "";
  const subcategoryId = textOrNull(product.product_subcategory_id);

  return {
    role,
    capabilities: getProductManagerCapabilities(role),
    product: mapProductInformation(
      product,
      categoryById.get(categoryId) || textOrNull(product.kategori) || "",
      subcategoryId
        ? subcategoryById.get(subcategoryId) || textOrNull(product.subcategory) || ""
        : ""
    ),
    categories: categories.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug)
    })),
    subcategories: subcategories.map((row) => ({
      id: String(row.id),
      categoryId: String(row.category_id),
      name: String(row.name),
      slug: String(row.slug)
    }))
  };
}

async function requireProductInformationActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(
      403,
      "Role ini tidak memiliki akses Informasi Produk."
    );
  }
  return actor;
}

async function activeCategory(client: SupabaseClient, categoryId: string) {
  const { data, error } = await client
    .from("product_categories")
    .select("id,name,is_active,status")
    .eq("id", categoryId)
    .maybeSingle();
  if (error || !data || data.is_active === false || data.status === "inactive") {
    throw new ProductInformationApiError(
      422,
      "Kategori produk tidak valid atau tidak aktif."
    );
  }
  return data;
}

async function activeSubcategory(
  client: SupabaseClient,
  subcategoryId: string,
  categoryId: string
) {
  const { data, error } = await client
    .from("product_subcategories")
    .select("id,name,category_id,is_active")
    .eq("id", subcategoryId)
    .eq("category_id", categoryId)
    .maybeSingle();
  if (error || !data || data.is_active === false) {
    throw new ProductInformationApiError(
      422,
      "Subkategori tidak valid atau tidak aktif."
    );
  }
  return data;
}

async function assertUniqueSlug(
  client: SupabaseClient,
  slug: string,
  productId: string
) {
  const { data, error } = await client
    .from("products")
    .select("id")
    .eq("slug", slug)
    .neq("id", productId)
    .limit(1);
  if (error) {
    throw new ProductInformationApiError(
      503,
      "Validasi slug belum dapat dijalankan."
    );
  }
  if (data?.length) {
    throw new ProductInformationApiError(409, "Slug sudah dipakai produk lain.");
  }
}

async function auditProductInformation(input: {
  actor: Awaited<ReturnType<typeof requireProductInformationActor>>;
  identity: ReturnType<typeof createPimAuditIdentity>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  productId: string;
}) {
  const eventCode: PimAuditEventCode =
    input.before.product_category_id !== input.after.product_category_id
      ? "PRODUCT_CATEGORY_CHANGED"
      : "PRODUCT_UPDATED";
  const changes = diffPimAuditFields(
    input.before,
    input.after,
    INFORMATION_AUDIT_FIELDS
  );
  await recordPimAuditEvent(input.actor.adminClient, {
    eventCode,
    status: "COMPLETED",
    actorId: input.actor.user.id,
    actorRole: input.actor.role,
    actorLabel: actorAuditLabel(input.actor.user),
    requestId: input.identity.requestId,
    operationId: input.identity.operationId,
    idempotencyKey: input.identity.idempotencyKey,
    entityType: "products",
    entityId: input.productId,
    entityLabel: String(input.after.name || input.after.nama || "Produk"),
    productId: input.productId,
    sku: textOrNull(input.after.sku),
    summary: PIM_AUDIT_EVENT_REGISTRY[eventCode].label,
    changes,
    metadata: {
      checkpoint: "WP-03",
      module: "information",
      changedFields: changes.map((change) => change.field)
    },
    entities: [{
      entityType: "products",
      entityId: input.productId,
      entityLabel: String(input.after.name || input.after.nama || "Produk"),
      productId: input.productId,
      sku: textOrNull(input.after.sku),
      resultStatus: "COMPLETED"
    }]
  });
}

function mapProductInformation(
  row: Record<string, unknown>,
  categoryName: string,
  subcategoryName: string
) {
  return {
    id: String(row.id),
    name: String(row.name || row.nama || ""),
    slug: String(row.slug || ""),
    status: lifecycle(row.status),
    productCategoryId: textOrNull(row.product_category_id) || "",
    productSubcategoryId: textOrNull(row.product_subcategory_id),
    categoryName,
    subcategoryName,
    basePrice: finiteNumber(row.base_price) || 0,
    description: textOrNull(row.description) || textOrNull(row.deskripsi),
    sku: textOrNull(row.sku),
    productType: textOrNull(row.product_type) || "standard_product",
    pricingMode: textOrNull(row.pricing_mode) || "fixed_price",
    minimumOrderQty: Math.max(1, finiteNumber(row.minimum_order_qty) || 1),
    seoTitle: textOrNull(row.seo_title),
    seoDescription: textOrNull(row.seo_description),
    imageUrl: textOrNull(row.image_url) || textOrNull(row.gambar_url),
    updatedAt: textOrNull(row.updated_at)
  };
}

function assertProductId(value: string) {
  if (!isValidProductWorkspaceId(value)) {
    throw new ProductInformationApiError(400, "ID produk tidak valid.");
  }
}

function expectedVersion(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !value || Number.isNaN(Date.parse(value))) {
    throw new ProductInformationApiError(400, "Versi data produk tidak valid.");
  }
  return value;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    if (!isRecord(value)) throw new Error("invalid");
    return value;
  } catch {
    throw new ProductInformationApiError(400, "JSON request tidak valid.");
  }
}

function conflict() {
  return new ProductInformationApiError(
    409,
    "Produk telah berubah di tempat lain. Muat ulang data terbaru sebelum menyimpan kembali."
  );
}

function lifecycle(value: unknown): ProductLifecycle {
  return value === "active" || value === "archived" ? value : "draft";
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(isRecord)
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validationResponse(issues: ValidationIssue[]) {
  return noStoreJson({
    error: "Validasi informasi produk gagal.",
    issues
  }, 422);
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" }
  });
}

class ProductInformationApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function productInformationErrorResponse(error: unknown) {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  if (error instanceof ProductInformationApiError || error instanceof Phase13AuthError) {
    return noStoreJson({ error: error.message }, error.status);
  }
  console.error("Product Information API failed", {
    error: error instanceof Error ? error.name : "unknown"
  });
  return noStoreJson({ error: "Informasi produk gagal diproses." }, 500);
}
