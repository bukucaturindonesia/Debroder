import type { SupabaseClient } from "@supabase/supabase-js";
import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import type { AdminRole } from "@/lib/access-control";
import {
  getProductManagerCapabilities,
  PRODUCT_MANAGER_ROLES,
  type ProductLifecycle,
  type ProductVariantStatus
} from "@/lib/product-manager";
import {
  PIM_AUDIT_EVENT_REGISTRY,
  diffPimAuditFields,
  type PimAuditChange,
  type PimAuditEntity,
  type PimAuditEventCode
} from "@/lib/pim-audit";
import {
  actorAuditLabel,
  createPimAuditIdentity,
  recordPimAuditEvent
} from "@/lib/pim-audit-server";
import {
  normalizeHex,
  normalizeProductColorType,
  normalizeProductSwatchDirection,
  type ProductColorSwatchValue,
  type ProductVariantColorMaster,
  type ProductVariantSizeAvailability,
  type ProductVariantSizeMaster,
  type ProductVariantsPayload,
  type SaveProductVariantInput,
  type SaveProductVariantSizesInput
} from "@/lib/product-variants";
import { isValidProductWorkspaceId } from "@/lib/product-workspace";
import { buildDeterministicSku, isValidSkuCode } from "@/lib/variant-matrix";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
type RecordRow = Record<string, unknown>;
type ProductVariantsActor = Awaited<ReturnType<typeof requireProductVariantsActor>>;

const PRODUCT_FIELDS = "id,name,nama,sku,status";
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
  "image_url",
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
  "pattern_image_url",
  "is_active",
  "sort_order",
  "updated_at"
].join(",");
const SIZE_MASTER_FIELDS = "id,name,slug,size_group,is_active,sort_order";
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
const FRONT_IMAGE_FIELDS = "variant_id,image_role,image_url,is_cover";
const VARIANT_AUDIT_FIELDS = ["status", "is_active", "is_default", "sort_order"] as const;
const SIZE_AUDIT_FIELDS = ["size_id", "sku", "status", "is_active"] as const;

export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireProductVariantsActor(request);
    const { id } = await context.params;
    assertProductId(id);
    return noStoreJson(await loadProductVariantsPayload(actor.adminClient, actor.role, id));
  } catch (error) {
    return productVariantsErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireProductVariantsActor(request);
    requireVariantMutation(actor.role);
    const { id } = await context.params;
    assertProductId(id);
    const body = await readBody(request);
    const action = text(body.action);

    if (action === "save_variant") {
      const input = parseVariantInput(body.input);
      const result = await saveVariant(actor, request, id, input);
      return noStoreJson(result);
    }
    if (action === "save_sizes") {
      const input = parseSizeInput(body.input);
      const result = await saveSizes(actor, request, id, input);
      return noStoreJson(result);
    }
    throw new ProductVariantsApiError(400, "Aksi modul Varian tidak didukung.");
  } catch (error) {
    return productVariantsErrorResponse(error);
  }
}

async function saveVariant(
  actor: ProductVariantsActor,
  request: Request,
  productId: string,
  input: SaveProductVariantInput
) {
  const product = await loadProduct(actor.adminClient, productId);
  const variants = await loadVariantRows(actor.adminClient, productId);
  const current = input.variantId
    ? variants.find((row) => String(row.id) === input.variantId) || null
    : null;
  if (input.variantId && !current) {
    throw new ProductVariantsApiError(404, "Color variant tidak ditemukan.");
  }

  const master = input.colorMasterId
    ? await loadActiveColorMaster(actor.adminClient, input.colorMasterId)
    : null;
  if (!current && !master) {
    throw new ProductVariantsApiError(422, "Master warna wajib dipilih untuk warna baru.");
  }
  if (current) {
    requireExpectedVersion(input.expectedUpdatedAt, current.updated_at, "Color variant");
    if (master && String(current.slug || "") !== String(master.slug || "")) {
      throw new ProductVariantsApiError(
        409,
        "Master warna pada varian existing tidak boleh diganti. Buat warna baru agar histori SKU tetap aman."
      );
    }
    if (!master) {
      const matched = await loadColorMasterBySlug(actor.adminClient, String(current.slug || ""));
      if (matched) input.colorMasterId = String(matched.id);
    }
  }

  const previousDefault = variants.find((row) => row.is_default === true) || null;
  if (current?.is_default === true && !input.isDefault) {
    throw new ProductVariantsApiError(
      422,
      "Warna default tidak dapat dilepas langsung. Tetapkan warna lain sebagai default."
    );
  }
  if (input.status === "inactive" && input.isDefault) {
    throw new ProductVariantsApiError(422, "Warna default harus tetap aktif.");
  }
  if (current && input.status === "inactive" && variantStatus(current.status, current.is_active) === "active") {
    const activeSizeCount = await countActiveVariantSizes(actor.adminClient, String(current.id));
    if (activeSizeCount > 0) {
      throw new ProductVariantsApiError(422, "Nonaktifkan seluruh ukuran pada warna ini sebelum menonaktifkan warnanya.");
    }
  }
  if (!current && variants.length === 0 && !input.isDefault) {
    throw new ProductVariantsApiError(422, "Warna pertama harus menjadi warna default.");
  }

  const previousDefaultNeedsClear = Boolean(
    input.isDefault && previousDefault && String(previousDefault.id) !== String(current?.id || "")
  );
  if (previousDefaultNeedsClear) {
    requireExpectedVersion(
      input.expectedDefaultUpdatedAt,
      previousDefault?.updated_at,
      "Warna default sebelumnya"
    );
  }

  let clearedDefault: RecordRow | null = null;
  try {
    if (previousDefaultNeedsClear && previousDefault) {
      clearedDefault = previousDefault;
      await updateVariantGuarded(actor.adminClient, previousDefault, {
        is_default: false,
        updated_at: nextTimestamp(previousDefault.updated_at)
      });
    }

    let variantId: string;
    let before: RecordRow | null = current;
    let after: RecordRow;
    if (current) {
      after = await updateVariantGuarded(actor.adminClient, current, {
        status: input.status,
        is_active: input.status === "active",
        is_default: input.isDefault,
        sort_order: input.sortOrder,
        updated_at: nextTimestamp(current.updated_at)
      });
      variantId = String(after.id);
    } else {
      const swatch = mapMasterSwatch(master as RecordRow);
      const colorHex = swatch.primaryHex || swatch.colorHex || "#111111";
      const now = new Date().toISOString();
      const { data, error } = await actor.adminClient
        .from("product_variants")
        .insert({
          product_id: productId,
          name: String(master?.name || ""),
          variant_name: String(master?.name || ""),
          color_name: String(master?.name || ""),
          slug: String(master?.slug || ""),
          hex_code: colorHex,
          color_hex: colorHex,
          sku: null,
          price_adjustment: 0,
          status: input.status,
          is_active: input.status === "active",
          is_default: input.isDefault,
          sort_order: input.sortOrder,
          updated_at: now
        })
        .select(VARIANT_FIELDS)
        .maybeSingle();
      if (error || !data) {
        console.error("Product variant create failed", { code: error?.code });
        throw new ProductVariantsApiError(
          error?.code === "23505" ? 409 : 422,
          error?.code === "23505"
            ? "Warna tersebut sudah tersedia pada produk ini."
            : "Warna baru belum dapat disimpan."
        );
      }
      after = asRecord(data);
      before = null;
      variantId = String(after.id);
    }

    const identity = createPimAuditIdentity(request, "workspace-variants");
    await auditVariantMutation({
      actor,
      identity,
      before,
      after,
      productId,
      variantId,
      previousDefaultId: clearedDefault ? String(clearedDefault.id) : null
    });

    return {
      ok: true as const,
      message: current ? "Detail warna berhasil disimpan." : "Warna baru berhasil ditambahkan.",
      variantId,
      payload: await loadProductVariantsPayload(actor.adminClient, actor.role, String(product.id))
    };
  } catch (error) {
    if (clearedDefault) await restoreDefault(actor.adminClient, clearedDefault);
    throw error;
  }
}

async function saveSizes(
  actor: ProductVariantsActor,
  request: Request,
  productId: string,
  input: SaveProductVariantSizesInput
) {
  const product = await loadProduct(actor.adminClient, productId);
  const variant = await loadVariant(actor.adminClient, productId, input.variantId);
  requireExpectedVersion(input.expectedVariantUpdatedAt, variant.updated_at, "Color variant");

  const sizeMaster = await loadSizeMaster(actor.adminClient);
  const sizeById = new Map(sizeMaster.map((row) => [String(row.id), row]));
  const desired = new Set(input.activeSizeIds);
  for (const sizeId of desired) {
    if (!sizeById.has(sizeId)) {
      throw new ProductVariantsApiError(422, "Pilihan ukuran tidak valid atau sudah tidak aktif.");
    }
  }

  const currentRows = await loadSellableRows(actor.adminClient, [input.variantId]);
  const currentBySize = new Map(currentRows.map((row) => [String(row.size_id), row]));
  const updates: Array<{ row: RecordRow; active: boolean }> = [];
  const inserts: Array<{ size: RecordRow; sku: string }> = [];

  for (const size of sizeMaster) {
    const sizeId = String(size.id);
    const row = currentBySize.get(sizeId);
    const shouldBeActive = desired.has(sizeId);
    if (row) {
      const currentlyActive = variantStatus(row.status, row.is_active) === "active";
      if (currentlyActive !== shouldBeActive) updates.push({ row, active: shouldBeActive });
    } else if (shouldBeActive) {
      if (!isValidSkuCode(String(product.sku || ""))) {
        throw new ProductVariantsApiError(
          422,
          "SKU induk produk wajib uppercase dan valid sebelum menambah ukuran baru."
        );
      }
      const sku = buildDeterministicSku(
        String(product.sku),
        String(variant.slug || ""),
        String(size.slug || "")
      );
      if (!sku) {
        throw new ProductVariantsApiError(422, "SKU ukuran baru belum dapat dibentuk.");
      }
      inserts.push({ size, sku });
    }
  }

  for (const update of updates) {
    const expected = input.expectedRowVersions[String(update.row.id)];
    requireExpectedVersion(expected, update.row.updated_at, `Ukuran ${String(update.row.size_name || "")}`);
  }
  await assertGlobalSkusAvailable(actor.adminClient, inserts.map((item) => item.sku));

  const updatedSnapshots: RecordRow[] = [];
  const createdRows: RecordRow[] = [];
  try {
    for (const update of updates) {
      updatedSnapshots.push(update.row);
      const expected = String(update.row.updated_at);
      const { data, error } = await actor.adminClient
        .from("product_variant_sizes")
        .update({
          status: update.active ? "active" : "inactive",
          is_active: update.active,
          updated_at: nextTimestamp(expected)
        })
        .eq("id", String(update.row.id))
        .eq("updated_at", expected)
        .select(SELLABLE_FIELDS)
        .maybeSingle();
      if (error || !data) {
        throw conflictError("Ukuran telah berubah di tempat lain.");
      }
    }

    for (const item of inserts) {
      const { data, error } = await actor.adminClient
        .from("product_variant_sizes")
        .insert({
          variant_id: input.variantId,
          size_id: String(item.size.id),
          size_name: String(item.size.name),
          sku: item.sku,
          stock_quantity: 0,
          stock: 0,
          price_adjustment: 0,
          status: "active",
          is_active: true,
          sort_order: Number(item.size.sort_order || 0),
          updated_at: new Date().toISOString()
        })
        .select(SELLABLE_FIELDS)
        .maybeSingle();
      if (error || !data) {
        console.error("Product variant size create failed", { code: error?.code });
        throw new ProductVariantsApiError(
          error?.code === "23505" ? 409 : 422,
          error?.code === "23505"
            ? "Kombinasi warna dan ukuran sudah dibuat oleh proses lain. Muat ulang data."
            : "Ukuran baru belum dapat disimpan."
        );
      }
      createdRows.push(asRecord(data));
    }

    const identity = createPimAuditIdentity(request, "workspace-variant-sizes");
    await auditSizeMutation({
      actor,
      identity,
      productId,
      variant,
      updatedSnapshots,
      createdRows,
      desiredSizeIds: [...desired]
    });

    return {
      ok: true as const,
      message: "Ukuran tersedia berhasil disimpan tanpa menghapus SKU historis.",
      variantId: input.variantId,
      payload: await loadProductVariantsPayload(actor.adminClient, actor.role, productId)
    };
  } catch (error) {
    const recovered = await rollbackSizeChanges(
      actor.adminClient,
      updatedSnapshots,
      createdRows
    );
    if (!recovered) {
      console.error("WP-04 size availability rollback incomplete", {
        productId,
        variantId: input.variantId
      });
      throw new ProductVariantsApiError(
        500,
        "Penyimpanan ukuran gagal dan recovery tidak lengkap. Hentikan operasi dan periksa audit database."
      );
    }
    throw error;
  }
}

async function loadProductVariantsPayload(
  client: SupabaseClient,
  role: string,
  productId: string
): Promise<ProductVariantsPayload> {
  const [productResult, variantsResult, mastersResult, sizeResult] = await Promise.all([
    client.from("products").select(PRODUCT_FIELDS).eq("id", productId).maybeSingle(),
    client.from("product_variants").select(VARIANT_FIELDS).eq("product_id", productId).order("sort_order"),
    client.from("product_color_master").select(COLOR_MASTER_FIELDS).order("sort_order"),
    client.from("product_size_master").select(SIZE_MASTER_FIELDS).eq("is_active", true).order("sort_order")
  ]);
  if (productResult.error) throw unavailable("Produk belum dapat dimuat.", productResult.error.code);
  if (!productResult.data) throw new ProductVariantsApiError(404, "Produk tidak ditemukan.");
  const dependencyError = variantsResult.error || mastersResult.error || sizeResult.error;
  if (dependencyError) throw unavailable("Data varian dan master belum dapat dimuat.", dependencyError.code);

  const variants = rows(variantsResult.data);
  const masters = rows(mastersResult.data);
  const sizes = rows(sizeResult.data);
  const variantIds = variants.map((row) => String(row.id));
  const [sellable, images] = await Promise.all([
    loadSellableRows(client, variantIds),
    loadFrontImages(client, variantIds)
  ]);
  const masterBySlug = new Map(masters.map((row) => [String(row.slug), row]));
  const frontVariantIds = new Set(
    images
      .filter((row) => Boolean(row.image_url) && (row.image_role === "front" || row.is_cover === true))
      .map((row) => String(row.variant_id))
  );
  const sellableByVariant = groupBy(sellable, "variant_id");
  const mappedSizeMaster: ProductVariantSizeMaster[] = sizes.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    sizeGroup: String(row.size_group || "apparel"),
    sortOrder: Number(row.sort_order || 0)
  }));

  return {
    role,
    capabilities: getProductManagerCapabilities(role),
    product: {
      id: String(productResult.data.id),
      name: String(productResult.data.name || productResult.data.nama || ""),
      sku: textOrNull(productResult.data.sku),
      status: lifecycle(productResult.data.status)
    },
    colorMasters: masters.filter((row) => row.is_active !== false).map(mapColorMaster),
    sizeMaster: mappedSizeMaster,
    variants: variants.map((variant) => {
      const variantId = String(variant.id);
      const master = masterBySlug.get(String(variant.slug || "")) || null;
      const ownSellable = sellableByVariant.get(variantId) || [];
      const availability: ProductVariantSizeAvailability[] = mappedSizeMaster.map((size) => {
        const row = ownSellable.find((item) => String(item.size_id) === size.id) || null;
        const status = row ? variantStatus(row.status, row.is_active) : "inactive";
        return {
          sizeId: size.id,
          sizeName: size.name,
          sizeSlug: size.slug,
          sizeGroup: size.sizeGroup,
          masterSortOrder: size.sortOrder,
          active: status === "active",
          sellableId: row ? String(row.id) : null,
          sku: row ? textOrNull(row.sku) : null,
          status,
          stockQuantity: row ? Number(row.stock_quantity ?? row.stock ?? 0) : 0,
          priceAdjustment: row ? Number(row.price_adjustment || 0) : 0,
          sortOrder: row ? Number(row.sort_order || 0) : size.sortOrder,
          updatedAt: row ? textOrNull(row.updated_at) : null
        };
      });
      const swatch = master ? mapMasterSwatch(master) : fallbackVariantSwatch(variant);
      return {
        id: variantId,
        productId,
        colorMasterId: master ? String(master.id) : null,
        colorMasterName: master ? String(master.name) : null,
        name: String(variant.name || variant.variant_name || variant.color_name || ""),
        slug: String(variant.slug || ""),
        ...swatch,
        sku: textOrNull(variant.sku),
        priceAdjustment: Number(variant.price_adjustment || 0),
        status: variantStatus(variant.status, variant.is_active),
        isDefault: variant.is_default === true,
        sortOrder: Number(variant.sort_order || 0),
        frontImageComplete: frontVariantIds.has(variantId) || Boolean(variant.image_url),
        activeSizeCount: availability.filter((item) => item.active).length,
        activeSkuCount: availability.filter((item) => item.active && item.sku).length,
        updatedAt: String(variant.updated_at),
        sizes: availability
      };
    })
  };
}

async function requireProductVariantsActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(403, "Role ini tidak memiliki akses modul Varian.");
  }
  return actor;
}

function requireVariantMutation(role: string) {
  if (!getProductManagerCapabilities(role).canManageDependencies) {
    throw new ProductVariantsApiError(
      403,
      "Pengelolaan varian hanya tersedia untuk Owner atau Super Admin."
    );
  }
}

async function loadProduct(client: SupabaseClient, productId: string) {
  const { data, error } = await client.from("products").select(PRODUCT_FIELDS).eq("id", productId).maybeSingle();
  if (error) throw unavailable("Produk belum dapat dimuat.", error.code);
  if (!data) throw new ProductVariantsApiError(404, "Produk tidak ditemukan.");
  return asRecord(data);
}

async function loadVariant(client: SupabaseClient, productId: string, variantId: string) {
  const { data, error } = await client
    .from("product_variants")
    .select(VARIANT_FIELDS)
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle();
  if (error) throw unavailable("Color variant belum dapat dimuat.", error.code);
  if (!data) throw new ProductVariantsApiError(404, "Color variant tidak ditemukan.");
  return asRecord(data);
}

async function loadVariantRows(client: SupabaseClient, productId: string) {
  const { data, error } = await client.from("product_variants").select(VARIANT_FIELDS).eq("product_id", productId);
  if (error) throw unavailable("Color variant belum dapat dimuat.", error.code);
  return rows(data);
}

async function loadActiveColorMaster(client: SupabaseClient, colorMasterId: string) {
  const { data, error } = await client
    .from("product_color_master")
    .select(COLOR_MASTER_FIELDS)
    .eq("id", colorMasterId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw unavailable("Master warna belum dapat dimuat.", error.code);
  if (!data) throw new ProductVariantsApiError(422, "Master warna tidak valid atau tidak aktif.");
  return asRecord(data);
}

async function loadColorMasterBySlug(client: SupabaseClient, slug: string) {
  if (!slug) return null;
  const { data, error } = await client
    .from("product_color_master")
    .select(COLOR_MASTER_FIELDS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw unavailable("Master warna belum dapat dimuat.", error.code);
  return data ? asRecord(data) : null;
}

async function loadSizeMaster(client: SupabaseClient) {
  const { data, error } = await client
    .from("product_size_master")
    .select(SIZE_MASTER_FIELDS)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw unavailable("Master ukuran belum dapat dimuat.", error.code);
  return rows(data);
}

async function countActiveVariantSizes(client: SupabaseClient, variantId: string) {
  const { count, error } = await client
    .from("product_variant_sizes")
    .select("id", { count: "exact", head: true })
    .eq("variant_id", variantId)
    .or("status.eq.active,and(status.is.null,is_active.eq.true)");
  if (error) throw unavailable("Status ukuran varian belum dapat diperiksa.", error.code);
  return Number(count || 0);
}

async function loadSellableRows(client: SupabaseClient, variantIds: string[]) {
  if (!variantIds.length) return [];
  const { data, error } = await client
    .from("product_variant_sizes")
    .select(SELLABLE_FIELDS)
    .in("variant_id", variantIds)
    .order("sort_order");
  if (error) throw unavailable("Ukuran varian belum dapat dimuat.", error.code);
  return rows(data);
}

async function loadFrontImages(client: SupabaseClient, variantIds: string[]) {
  if (!variantIds.length) return [];
  const { data, error } = await client
    .from("product_variant_images")
    .select(FRONT_IMAGE_FIELDS)
    .in("variant_id", variantIds);
  if (error) throw unavailable("Status gambar front belum dapat dimuat.", error.code);
  return rows(data);
}

async function updateVariantGuarded(
  client: SupabaseClient,
  current: RecordRow,
  patch: Record<string, unknown>
) {
  const expected = String(current.updated_at);
  const { data, error } = await client
    .from("product_variants")
    .update(patch)
    .eq("id", String(current.id))
    .eq("product_id", String(current.product_id))
    .eq("updated_at", expected)
    .select(VARIANT_FIELDS)
    .maybeSingle();
  if (error || !data) throw conflictError("Color variant telah berubah di tempat lain.");
  return asRecord(data);
}

async function restoreDefault(client: SupabaseClient, snapshot: RecordRow) {
  try {
    const { error } = await client
      .from("product_variants")
      .update({
        is_default: true,
        updated_at: snapshot.updated_at
      })
      .eq("id", String(snapshot.id));
    return !error;
  } catch {
    return false;
  }
}

async function rollbackSizeChanges(
  client: SupabaseClient,
  snapshots: RecordRow[],
  createdRows: RecordRow[]
) {
  try {
    for (const snapshot of [...snapshots].reverse()) {
      const { error } = await client
        .from("product_variant_sizes")
        .update({
          status: snapshot.status,
          is_active: snapshot.is_active,
          updated_at: snapshot.updated_at
        })
        .eq("id", String(snapshot.id));
      if (error) return false;
    }
    for (const created of createdRows) {
      const { error } = await client
        .from("product_variant_sizes")
        .update({
          status: "inactive",
          is_active: false,
          updated_at: nextTimestamp(created.updated_at)
        })
        .eq("id", String(created.id));
      if (error) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function assertGlobalSkusAvailable(client: SupabaseClient, skus: string[]) {
  if (!skus.length) return;
  const { data, error } = await client
    .from("product_variant_sizes")
    .select("id,sku")
    .in("sku", [...new Set(skus)]);
  if (error) throw unavailable("Validasi SKU belum dapat dijalankan.", error.code);
  if (Array.isArray(data) && data.length) {
    throw new ProductVariantsApiError(409, "SKU ukuran baru sudah dipakai. Muat ulang data.");
  }
}

async function auditVariantMutation(input: {
  actor: ProductVariantsActor;
  identity: ReturnType<typeof createPimAuditIdentity>;
  before: RecordRow | null;
  after: RecordRow;
  productId: string;
  variantId: string;
  previousDefaultId: string | null;
}) {
  const eventCode: PimAuditEventCode = !input.before
    ? "PRODUCT_COLOR_CREATED"
    : input.before.status !== input.after.status || input.before.is_active !== input.after.is_active
      ? "PRODUCT_COLOR_STATUS_CHANGED"
      : "PRODUCT_COLOR_UPDATED";
  const changes = diffPimAuditFields(input.before, input.after, VARIANT_AUDIT_FIELDS);
  await recordPimAuditEvent(input.actor.adminClient, {
    eventCode,
    status: "COMPLETED",
    actorId: input.actor.user.id,
    actorRole: input.actor.role,
    actorLabel: actorAuditLabel(input.actor.user),
    requestId: input.identity.requestId,
    operationId: input.identity.operationId,
    idempotencyKey: input.identity.idempotencyKey,
    entityType: "product_variants",
    entityId: input.variantId,
    entityLabel: String(input.after.name || input.after.variant_name || "Warna produk"),
    productId: input.productId,
    productColorId: input.variantId,
    variantId: input.variantId,
    sku: textOrNull(input.after.sku),
    summary: PIM_AUDIT_EVENT_REGISTRY[eventCode].label,
    changes,
    metadata: {
      checkpoint: "WP-04",
      module: "variants",
      previousDefaultId: input.previousDefaultId,
      changedFields: changes.map((change) => change.field)
    },
    entities: [{
      entityType: "product_variants",
      entityId: input.variantId,
      entityLabel: String(input.after.name || input.after.variant_name || "Warna produk"),
      productId: input.productId,
      variantId: input.variantId,
      sku: textOrNull(input.after.sku),
      resultStatus: "COMPLETED"
    }]
  });
}

async function auditSizeMutation(input: {
  actor: ProductVariantsActor;
  identity: ReturnType<typeof createPimAuditIdentity>;
  productId: string;
  variant: RecordRow;
  updatedSnapshots: RecordRow[];
  createdRows: RecordRow[];
  desiredSizeIds: string[];
}) {
  const changes: PimAuditChange[] = [];
  const entities: PimAuditEntity[] = [];
  for (const snapshot of input.updatedSnapshots) {
    const active = input.desiredSizeIds.includes(String(snapshot.size_id));
    const after = {
      ...snapshot,
      status: active ? "active" : "inactive",
      is_active: active
    };
    changes.push(...diffPimAuditFields(snapshot, after, SIZE_AUDIT_FIELDS));
    entities.push({
      entityType: "product_variant_sizes",
      entityId: String(snapshot.id),
      entityLabel: String(snapshot.size_name || "Ukuran"),
      productId: input.productId,
      variantId: String(input.variant.id),
      sku: textOrNull(snapshot.sku),
      resultStatus: "COMPLETED"
    });
  }
  for (const row of input.createdRows) {
    changes.push(...diffPimAuditFields(null, row, SIZE_AUDIT_FIELDS));
    entities.push({
      entityType: "product_variant_sizes",
      entityId: String(row.id),
      entityLabel: String(row.size_name || "Ukuran"),
      productId: input.productId,
      variantId: String(input.variant.id),
      sku: textOrNull(row.sku),
      resultStatus: "COMPLETED"
    });
  }
  await recordPimAuditEvent(input.actor.adminClient, {
    eventCode: "VARIANT_SIZE_CHANGED",
    status: "COMPLETED",
    actorId: input.actor.user.id,
    actorRole: input.actor.role,
    actorLabel: actorAuditLabel(input.actor.user),
    requestId: input.identity.requestId,
    operationId: input.identity.operationId,
    idempotencyKey: input.identity.idempotencyKey,
    entityType: "product_variants",
    entityId: String(input.variant.id),
    entityLabel: String(input.variant.name || input.variant.variant_name || "Warna produk"),
    productId: input.productId,
    variantId: String(input.variant.id),
    summary: PIM_AUDIT_EVENT_REGISTRY.VARIANT_SIZE_CHANGED.label,
    changes,
    metadata: {
      checkpoint: "WP-04",
      module: "variants",
      activeSizeIds: input.desiredSizeIds,
      changedFields: [...new Set(changes.map((change) => change.field))]
    },
    entities
  });
}

function parseVariantInput(value: unknown): SaveProductVariantInput {
  const row = requireRecord(value, "Data detail warna tidak valid.");
  const variantId = nullableUuid(row.variantId);
  const colorMasterId = nullableUuid(row.colorMasterId);
  const status = row.status === "inactive" ? "inactive" : "active";
  const sortOrder = Number(row.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new ProductVariantsApiError(422, "Urutan warna wajib integer nol atau lebih.");
  }
  return {
    variantId,
    colorMasterId: colorMasterId || "",
    status,
    isDefault: row.isDefault === true,
    sortOrder,
    expectedUpdatedAt: nullableVersion(row.expectedUpdatedAt),
    expectedDefaultUpdatedAt: nullableVersion(row.expectedDefaultUpdatedAt)
  };
}

function parseSizeInput(value: unknown): SaveProductVariantSizesInput {
  const row = requireRecord(value, "Data ukuran tersedia tidak valid.");
  const variantId = uuid(row.variantId, "Color variant tidak valid.");
  const expectedVariantUpdatedAt = version(row.expectedVariantUpdatedAt, "Versi color variant tidak valid.");
  const activeSizeIds = Array.isArray(row.activeSizeIds)
    ? [...new Set(row.activeSizeIds.map((item) => uuid(item, "Pilihan ukuran tidak valid.")))]
    : [];
  const expectedRowVersions: Record<string, string> = {};
  if (isRecord(row.expectedRowVersions)) {
    for (const [key, value] of Object.entries(row.expectedRowVersions)) {
      if (isUuid(key)) expectedRowVersions[key] = version(value, "Versi ukuran tidak valid.");
    }
  }
  return { variantId, activeSizeIds, expectedVariantUpdatedAt, expectedRowVersions };
}

function mapColorMaster(row: RecordRow): ProductVariantColorMaster {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    ...mapMasterSwatch(row),
    sortOrder: Number(row.sort_order || 0),
    updatedAt: textOrNull(row.updated_at)
  };
}

function mapMasterSwatch(row: RecordRow): ProductColorSwatchValue {
  const colorHex = normalizeHex(row.color_hex) || "#111111";
  return {
    colorType: normalizeProductColorType(row.color_type),
    primaryHex: normalizeHex(row.primary_hex),
    secondaryHex: normalizeHex(row.secondary_hex),
    tertiaryHex: normalizeHex(row.tertiary_hex),
    swatchDirection: normalizeProductSwatchDirection(row.swatch_direction),
    patternImageUrl: textOrNull(row.pattern_image_url),
    colorHex
  };
}

function fallbackVariantSwatch(row: RecordRow): ProductColorSwatchValue {
  const colorHex = normalizeHex(row.hex_code) || normalizeHex(row.color_hex) || "#111111";
  return {
    colorType: "solid",
    primaryHex: colorHex,
    secondaryHex: null,
    tertiaryHex: null,
    swatchDirection: "diagonal",
    patternImageUrl: null,
    colorHex
  };
}

function requireExpectedVersion(expected: unknown, actual: unknown, label: string) {
  const actualText = textOrNull(actual);
  if (!actualText || typeof expected !== "string" || expected !== actualText) {
    throw conflictError(`${label} telah berubah di tempat lain.`);
  }
}

function nextTimestamp(value: unknown) {
  const previous = typeof value === "string" ? Date.parse(value) : 0;
  return new Date(Math.max(Date.now(), Number.isFinite(previous) ? previous + 1 : 0)).toISOString();
}

function conflictError(message: string) {
  return new ProductVariantsApiError(
    409,
    `${message} Muat ulang data terbaru sebelum menyimpan kembali.`
  );
}

function unavailable(message: string, code: string) {
  console.error("Product Variants query failed", { code });
  return new ProductVariantsApiError(503, message);
}

function lifecycle(value: unknown): ProductLifecycle {
  return value === "active" || value === "archived" ? value : "draft";
}

function variantStatus(value: unknown, legacyActive: unknown): ProductVariantStatus {
  return value === "inactive" || legacyActive === false ? "inactive" : "active";
}

async function readBody(request: Request) {
  try {
    const value = await request.json();
    return requireRecord(value, "JSON request tidak valid.");
  } catch (error) {
    if (error instanceof ProductVariantsApiError) throw error;
    throw new ProductVariantsApiError(400, "JSON request tidak valid.");
  }
}

function requireRecord(value: unknown, message: string) {
  if (!isRecord(value)) throw new ProductVariantsApiError(400, message);
  return value;
}

function assertProductId(value: string) {
  if (!isValidProductWorkspaceId(value)) {
    throw new ProductVariantsApiError(400, "ID produk tidak valid.");
  }
}

function uuid(value: unknown, message: string) {
  if (!isUuid(value)) throw new ProductVariantsApiError(400, message);
  return value;
}
function nullableUuid(value: unknown) { return isUuid(value) ? value : null; }
function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function version(value: unknown, message: string) {
  if (typeof value !== "string" || !value || Number.isNaN(Date.parse(value))) {
    throw new ProductVariantsApiError(400, message);
  }
  return value;
}
function nullableVersion(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return version(value, "Versi data varian tidak valid.");
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function textOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function isRecord(value: unknown): value is RecordRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asRecord(value: unknown): RecordRow { return isRecord(value) ? value : {}; }
function rows(value: unknown): RecordRow[] { return Array.isArray(value) ? value.filter(isRecord) : []; }
function groupBy(values: RecordRow[], key: string) {
  const result = new Map<string, RecordRow[]>();
  for (const row of values) {
    const id = String(row[key]);
    result.set(id, [...(result.get(id) || []), row]);
  }
  return result;
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" }
  });
}

class ProductVariantsApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function productVariantsErrorResponse(error: unknown) {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  if (error instanceof ProductVariantsApiError || error instanceof Phase13AuthError) {
    return noStoreJson({ error: error.message }, error.status);
  }
  console.error("Product Variants API failed", {
    error: error instanceof Error ? error.name : "unknown"
  });
  return noStoreJson({ error: "Modul Varian gagal diproses." }, 500);
}
