import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProductManagerCapabilities,
  PRODUCT_IMAGE_ROLES,
  type ProductImageRole,
  type ProductLifecycle,
  type ProductVariantStatus
} from "@/lib/product-manager";
import {
  PIM_AUDIT_EVENT_REGISTRY,
  type PimAuditEntity
} from "@/lib/pim-audit";
import {
  actorAuditLabel,
  createPimAuditIdentity,
  recordPimAuditEvent
} from "@/lib/pim-audit-server";
import {
  normalizeHex,
  normalizeProductColorType,
  normalizeProductSwatchDirection
} from "@/lib/product-variants";
import type { Phase13Actor } from "@/lib/phase13-auth";
import {
  type ProductMediaAsset,
  type ProductMediaMutationResult,
  type ProductMediaPayload,
  type ProductMediaQuery,
  type ProductMediaSaveChange,
  type ProductMediaSlot,
  type ProductMediaVariant
} from "@/lib/product-media";

export type ProductMediaActor = Pick<
  Phase13Actor,
  "user" | "role" | "adminClient"
>;

type RecordRow = Record<string, unknown>;

type PlannedSlotChange = {
  input: ProductMediaSaveChange;
  existing: RecordRow | null;
  asset: RecordRow | null;
  remove: boolean;
  nextUrl: string | null;
};

type AppliedSlotChange = {
  before: RecordRow | null;
  after: RecordRow | null;
  inserted: boolean;
  deleted: boolean;
};

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
  "status",
  "is_active",
  "sort_order",
  "image_url",
  "updated_at"
].join(",");
const IMAGE_SUMMARY_FIELDS =
  "variant_id,image_role,is_cover,sort_order";
const IMAGE_FIELDS = [
  "id",
  "variant_id",
  "image_role",
  "image_url",
  "alt_text",
  "object_fit",
  "object_position",
  "focal_x",
  "focal_y",
  "focal_zoom",
  "target_ratio",
  "is_cover",
  "sort_order",
  "created_at",
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
const MEDIA_FIELDS =
  "id,name,public_url,alt_text,folder,width,height,updated_at";
const MAX_SLOT_CHANGES = 4;

export class ProductMediaApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function loadProductMediaPayload(
  client: SupabaseClient,
  role: string,
  productId: string,
  query: ProductMediaQuery
): Promise<ProductMediaPayload> {
  const [productResult, variantsResult] = await Promise.all([
    client
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("id", productId)
      .maybeSingle(),
    client
      .from("product_variants")
      .select(VARIANT_FIELDS)
      .eq("product_id", productId)
      .order("sort_order")
  ]);
  const loadError = productResult.error || variantsResult.error;
  if (loadError) {
    console.error("Product Media base load failed", {
      code: loadError.code
    });
    throw new ProductMediaApiError(
      503,
      "Media produk belum dapat dimuat."
    );
  }
  if (!productResult.data) {
    throw new ProductMediaApiError(404, "Produk tidak ditemukan.");
  }

  const product = asRecord(productResult.data);
  const variantRows = records(variantsResult.data);
  const variantIds = variantRows.map((row) => String(row.id));
  const slugs = variantRows
    .map((row) => textOrNull(row.slug))
    .filter(Boolean) as string[];
  const [summaryRows, colorMasters] = await Promise.all([
    selectInChunks(
      client,
      "product_variant_images",
      IMAGE_SUMMARY_FIELDS,
      "variant_id",
      variantIds
    ),
    selectInChunks(
      client,
      "product_color_master",
      COLOR_MASTER_FIELDS,
      "slug",
      slugs
    )
  ]);
  const colorBySlug = new Map(
    colorMasters.map((row) => [String(row.slug), row])
  );
  const summariesByVariant = groupImageRows(summaryRows);
  const variants = variantRows
    .map<ProductMediaVariant>((row) => {
      const ownImages = summariesByVariant.get(String(row.id)) || [];
      const roles = new Set(
        normalizeImageRows(ownImages).map((image) => image.role)
      );
      return {
        id: String(row.id),
        name: String(
          row.name ||
          row.variant_name ||
          row.color_name ||
          "Warna"
        ),
        slug: String(row.slug || ""),
        status: variantStatus(row.status, row.is_active),
        sortOrder: finiteNumber(row.sort_order) || 0,
        imageCount: roles.size,
        hasFrontImage: roles.has("front"),
        updatedAt: String(row.updated_at),
        ...mapSwatch(row, colorBySlug.get(String(row.slug)) || null)
      };
    })
    .sort((left, right) =>
      left.sortOrder - right.sortOrder ||
      left.name.localeCompare(right.name)
    );

  const selectedVariant = variants.find(
    (variant) => variant.id === query.variantId
  ) || variants.find((variant) => variant.status === "active") || variants[0] || null;
  const selectedRows = selectedVariant
    ? await loadSelectedVariantImages(client, selectedVariant.id)
    : [];
  const library = query.includeLibrary
    ? await loadMediaLibrary(client, query)
    : {
      assets: [] as ProductMediaAsset[],
      total: 0,
      page: 1,
      pageCount: 1
    };

  return {
    role,
    capabilities: getProductManagerCapabilities(role),
    product: {
      id: String(product.id),
      name: String(product.name || product.nama || ""),
      sku: textOrNull(product.sku),
      status: lifecycle(product.status)
    },
    variants,
    selectedVariantId: selectedVariant?.id || null,
    slots: mapSelectedSlots(selectedRows),
    mediaAssets: library.assets,
    library: {
      included: query.includeLibrary,
      query: query.q,
      page: library.page,
      pageSize: query.pageSize,
      total: library.total,
      pageCount: library.pageCount
    }
  };
}

export async function saveProductMediaSlots(input: {
  actor: ProductMediaActor;
  request: Request;
  productId: string;
  variantId: string;
  expectedVariantUpdatedAt: string;
  changes: ProductMediaSaveChange[];
}): Promise<ProductMediaMutationResult> {
  const { actor } = input;
  if (!getProductManagerCapabilities(actor.role).canManageDependencies) {
    throw new ProductMediaApiError(
      403,
      "Media Product Workspace hanya dapat diubah oleh Owner atau Super Admin."
    );
  }
  assertUuid(input.variantId, "Color variant");
  if (!input.expectedVariantUpdatedAt) {
    throw new ProductMediaApiError(
      400,
      "Versi color variant wajib dikirim."
    );
  }
  if (
    !Array.isArray(input.changes) ||
    input.changes.length < 1 ||
    input.changes.length > MAX_SLOT_CHANGES
  ) {
    throw new ProductMediaApiError(
      400,
      "Perubahan media wajib berisi 1 sampai 4 slot."
    );
  }

  const roles = new Set<ProductImageRole>();
  for (const change of input.changes) {
    if (!PRODUCT_IMAGE_ROLES.includes(change.role)) {
      throw new ProductMediaApiError(422, "Role gambar tidak valid.");
    }
    if (roles.has(change.role)) {
      throw new ProductMediaApiError(
        400,
        "Satu role media tidak boleh dikirim dua kali."
      );
    }
    roles.add(change.role);
    validateSlotChange(change);
  }

  const { data: variantData, error: variantError } = await actor.adminClient
    .from("product_variants")
    .select(VARIANT_FIELDS)
    .eq("id", input.variantId)
    .eq("product_id", input.productId)
    .maybeSingle();
  if (variantError) {
    throw new ProductMediaApiError(
      503,
      "Color variant belum dapat diperiksa."
    );
  }
  if (!variantData) {
    throw new ProductMediaApiError(
      404,
      "Color variant tidak ditemukan pada produk ini."
    );
  }
  const variant = asRecord(variantData);
  requireVersion(
    input.expectedVariantUpdatedAt,
    variant.updated_at,
    "Color variant"
  );

  const { data: existingData, error: existingError } = await actor.adminClient
    .from("product_variant_images")
    .select(IMAGE_FIELDS)
    .eq("variant_id", input.variantId);
  if (existingError) {
    throw new ProductMediaApiError(
      503,
      "Slot media belum dapat diperiksa."
    );
  }
  const existingRows = normalizeImageRows(records(existingData));
  const existingByRole = new Map(
    existingRows.map((item) => [item.role, item.row])
  );

  const assetIds = input.changes
    .map((change) => change.mediaAssetId)
    .filter((value): value is string => Boolean(value));
  const assetRows = await selectInChunks(
    actor.adminClient,
    "media_assets",
    `${MEDIA_FIELDS},media_type,status_aktif`,
    "id",
    assetIds
  );
  const assetById = new Map(
    assetRows.map((row) => [String(row.id), row])
  );

  const plan = input.changes.map<PlannedSlotChange>((change) => {
    const existing = existingByRole.get(change.role) || null;
    if (existing) {
      requireVersion(
        change.expectedImageUpdatedAt,
        existing.updated_at,
        `${change.role} image`
      );
    } else if (change.expectedImageUpdatedAt !== null) {
      throw conflict(`${change.role} image telah dibuat oleh proses lain.`);
    }

    const remove = !change.mediaAssetId && !change.imageUrl;
    let asset: RecordRow | null = null;
    let nextUrl: string | null = null;
    if (!remove && change.mediaAssetId) {
      assertUuid(change.mediaAssetId, "Media asset");
      asset = assetById.get(change.mediaAssetId) || null;
      if (
        !asset ||
        asset.status_aktif === false ||
        asset.media_type !== "image"
      ) {
        throw new ProductMediaApiError(
          422,
          "Media asset tidak valid atau tidak aktif."
        );
      }
      nextUrl = String(asset.public_url);
    } else if (!remove && existing && change.imageUrl === existing.image_url) {
      nextUrl = String(existing.image_url);
    } else if (!remove) {
      throw new ProductMediaApiError(
        422,
        "Slot wajib memakai aset dari Media Library."
      );
    }

    return { input: change, existing, asset, remove, nextUrl };
  });

  const applied: AppliedSlotChange[] = [];
  let variantAfter: RecordRow | null = null;
  const identity = createPimAuditIdentity(
    input.request,
    "workspace-product-media"
  );

  try {
    for (const item of plan) {
      applied.push(await applySlotChange(
        actor.adminClient,
        input.variantId,
        item
      ));
    }

    const finalFrontUrl = projectedFrontUrl(
      existingByRole,
      plan
    );
    const nextVariantUpdatedAt = nextTimestamp(variant.updated_at);
    const { data: updatedVariant, error: updateVariantError } =
      await actor.adminClient
        .from("product_variants")
        .update({
          image_url: finalFrontUrl,
          updated_at: nextVariantUpdatedAt
        })
        .eq("id", input.variantId)
        .eq("product_id", input.productId)
        .eq("updated_at", input.expectedVariantUpdatedAt)
        .select(VARIANT_FIELDS)
        .maybeSingle();
    if (updateVariantError || !updatedVariant) {
      throw conflict(
        "Color variant berubah ketika media disimpan."
      );
    }
    variantAfter = asRecord(updatedVariant);

    const entities: PimAuditEntity[] = plan.map((item) => ({
      entityType: "product_variant_images",
      entityId: String(
        applied.find((state) =>
          state.after?.image_role === item.input.role ||
          state.before?.image_role === item.input.role
        )?.after?.id ||
        applied.find((state) =>
          state.before?.image_role === item.input.role
        )?.before?.id ||
        `${input.variantId}:${item.input.role}`
      ),
      entityLabel: `${item.input.role} image`,
      productId: input.productId,
      variantId: input.variantId,
      resultStatus: "COMPLETED"
    }));
    await recordPimAuditEvent(actor.adminClient, {
      eventCode: "PRODUCT_COLOR_UPDATED",
      status: "COMPLETED",
      actorId: actor.user.id,
      actorRole: actor.role,
      actorLabel: actorAuditLabel(actor.user),
      requestId: identity.requestId,
      operationId: identity.operationId,
      idempotencyKey: identity.idempotencyKey,
      entityType: "product_media_workspace",
      entityId: input.variantId,
      entityLabel: PIM_AUDIT_EVENT_REGISTRY.PRODUCT_COLOR_UPDATED.label,
      productId: input.productId,
      variantId: input.variantId,
      summary: `WP-06 ${plan.length} slot media diperbarui`,
      metadata: {
        checkpoint: "WP-06",
        module: "media",
        roles: plan.map((item) => item.input.role),
        changedFields: plan.map((item) => `image.${item.input.role}`)
      },
      entities
    });
  } catch (error) {
    const variantRecovered = variantAfter
      ? await rollbackVariant(actor.adminClient, variantAfter, variant)
      : true;
    const slotsRecovered = await rollbackSlotChanges(
      actor.adminClient,
      applied
    );
    if (!variantRecovered || !slotsRecovered) {
      throw new ProductMediaApiError(
        500,
        "Penyimpanan media gagal dan recovery tidak lengkap. Hentikan operasi dan periksa audit database."
      );
    }
    if (error instanceof ProductMediaApiError) throw error;
    throw new ProductMediaApiError(
      409,
      "Penyimpanan media gagal dan seluruh perubahan berhasil dipulihkan. Muat ulang lalu coba lagi."
    );
  }

  const payload = await loadProductMediaPayload(
    actor.adminClient,
    actor.role,
    input.productId,
    {
      variantId: input.variantId,
      includeLibrary: false,
      q: "",
      page: 1,
      pageSize: 24
    }
  );
  return {
    ok: true,
    message: "Media warna berhasil disimpan.",
    payload
  };
}

async function applySlotChange(
  client: SupabaseClient,
  variantId: string,
  item: PlannedSlotChange
): Promise<AppliedSlotChange> {
  if (item.remove) {
    if (!item.existing) {
      return {
        before: null,
        after: null,
        inserted: false,
        deleted: false
      };
    }
    const { data, error } = await client
      .from("product_variant_images")
      .delete()
      .eq("id", String(item.existing.id))
      .eq("updated_at", String(item.existing.updated_at))
      .select(IMAGE_FIELDS)
      .maybeSingle();
    if (error || !data) {
      throw conflict(`${item.input.role} image telah berubah.`);
    }
    return {
      before: item.existing,
      after: null,
      inserted: false,
      deleted: true
    };
  }

  const payload = slotPayload(variantId, item);
  if (item.existing) {
    const { data, error } = await client
      .from("product_variant_images")
      .update(payload)
      .eq("id", String(item.existing.id))
      .eq("updated_at", String(item.existing.updated_at))
      .select(IMAGE_FIELDS)
      .maybeSingle();
    if (error || !data) {
      throw conflict(`${item.input.role} image telah berubah.`);
    }
    return {
      before: item.existing,
      after: asRecord(data),
      inserted: false,
      deleted: false
    };
  }

  const { data, error } = await client
    .from("product_variant_images")
    .insert(payload)
    .select(IMAGE_FIELDS)
    .maybeSingle();
  if (error || !data) {
    throw new ProductMediaApiError(
      error?.code === "23505" ? 409 : 422,
      error?.code === "23505"
        ? `${item.input.role} image telah dibuat oleh proses lain.`
        : `${item.input.role} image belum dapat dibuat.`
    );
  }
  return {
    before: null,
    after: asRecord(data),
    inserted: true,
    deleted: false
  };
}

function slotPayload(
  variantId: string,
  item: PlannedSlotChange
) {
  const role = item.input.role;
  return {
    variant_id: variantId,
    image_role: role,
    image_url: item.nextUrl,
    alt_text: item.input.altText ||
      textOrNull(item.asset?.alt_text) ||
      `${role} image`,
    object_fit: item.input.objectFit,
    object_position: item.input.objectPosition || "center center",
    focal_x: item.input.focalX,
    focal_y: item.input.focalY,
    focal_zoom: item.input.focalZoom,
    target_ratio: "4:5",
    is_cover: role === "front",
    sort_order: PRODUCT_IMAGE_ROLES.indexOf(role),
    updated_at: nextTimestamp(item.existing?.updated_at)
  };
}

async function rollbackVariant(
  client: SupabaseClient,
  after: RecordRow,
  before: RecordRow
) {
  const { data, error } = await client
    .from("product_variants")
    .update({
      image_url: before.image_url || null,
      updated_at: nextTimestamp(after.updated_at)
    })
    .eq("id", String(after.id))
    .eq("updated_at", String(after.updated_at))
    .select("id")
    .maybeSingle();
  return !error && Boolean(data);
}

async function rollbackSlotChanges(
  client: SupabaseClient,
  applied: AppliedSlotChange[]
) {
  try {
    for (const state of [...applied].reverse()) {
      if (state.inserted && state.after) {
        const { error } = await client
          .from("product_variant_images")
          .delete()
          .eq("id", String(state.after.id))
          .eq("updated_at", String(state.after.updated_at));
        if (error) return false;
      } else if (state.deleted && state.before) {
        const { error } = await client
          .from("product_variant_images")
          .insert(restorableImagePayload(state.before, true));
        if (error) return false;
      } else if (state.before && state.after) {
        const { data, error } = await client
          .from("product_variant_images")
          .update(restorableImagePayload(state.before, false))
          .eq("id", String(state.after.id))
          .eq("updated_at", String(state.after.updated_at))
          .select("id")
          .maybeSingle();
        if (error || !data) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function restorableImagePayload(
  row: RecordRow,
  includeId: boolean
) {
  const payload: RecordRow = {
    variant_id: row.variant_id,
    image_role: row.image_role,
    image_url: row.image_url,
    alt_text: row.alt_text || "",
    object_fit: row.object_fit || "cover",
    object_position: row.object_position || "center center",
    focal_x: finiteNumber(row.focal_x) ?? 50,
    focal_y: finiteNumber(row.focal_y) ?? 50,
    focal_zoom: finiteNumber(row.focal_zoom) ?? 1,
    target_ratio: row.target_ratio || "4:5",
    is_cover: Boolean(row.is_cover),
    sort_order: finiteNumber(row.sort_order) || 0,
    updated_at: new Date().toISOString()
  };
  if (includeId) payload.id = row.id;
  return payload;
}

function projectedFrontUrl(
  existingByRole: Map<ProductImageRole, RecordRow>,
  plan: PlannedSlotChange[]
) {
  const frontChange = plan.find((item) => item.input.role === "front");
  if (frontChange) return frontChange.remove ? null : frontChange.nextUrl;
  return textOrNull(existingByRole.get("front")?.image_url);
}

async function loadSelectedVariantImages(
  client: SupabaseClient,
  variantId: string
) {
  const { data, error } = await client
    .from("product_variant_images")
    .select(IMAGE_FIELDS)
    .eq("variant_id", variantId)
    .order("sort_order");
  if (error) {
    throw new ProductMediaApiError(
      503,
      "Slot media warna belum dapat dimuat."
    );
  }
  return records(data);
}

async function loadMediaLibrary(
  client: SupabaseClient,
  query: ProductMediaQuery
) {
  let request = client
    .from("media_assets")
    .select(MEDIA_FIELDS, { count: "exact" })
    .eq("status_aktif", true)
    .eq("media_type", "image")
    .order("created_at", { ascending: false });
  if (query.q) {
    const token = `%${query.q}%`;
    request = request.or(
      `name.ilike.${token},alt_text.ilike.${token},folder.ilike.${token}`
    );
  }
  const start = (query.page - 1) * query.pageSize;
  const { data, error, count } = await request.range(
    start,
    start + query.pageSize - 1
  );
  if (error) {
    throw new ProductMediaApiError(
      503,
      "Media Library belum dapat dimuat."
    );
  }
  const total = Number(count || 0);
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, pageCount);
  return {
    assets: records(data).map<ProductMediaAsset>((row) => ({
      id: String(row.id),
      name: String(row.name),
      publicUrl: String(row.public_url),
      altText: textOrNull(row.alt_text) || "",
      folder: textOrNull(row.folder) || "products",
      width: finiteNumber(row.width),
      height: finiteNumber(row.height),
      updatedAt: String(row.updated_at)
    })),
    total,
    page,
    pageCount
  };
}

function mapSelectedSlots(rows: RecordRow[]): ProductMediaSlot[] {
  return normalizeImageRows(rows).map(({ role, row }) => ({
    id: String(row.id),
    role,
    imageUrl: textOrNull(row.image_url),
    altText: textOrNull(row.alt_text) || "",
    objectFit: row.object_fit === "contain" ? "contain" : "cover",
    objectPosition: textOrNull(row.object_position) || "center center",
    focalX: finiteNumber(row.focal_x) ?? 50,
    focalY: finiteNumber(row.focal_y) ?? 50,
    focalZoom: finiteNumber(row.focal_zoom) ?? 1,
    targetRatio: "4:5",
    isCover: role === "front",
    sortOrder: PRODUCT_IMAGE_ROLES.indexOf(role),
    updatedAt: textOrNull(row.updated_at)
  }));
}

function normalizeImageRows(rows: RecordRow[]) {
  const result = new Map<ProductImageRole, RecordRow>();
  [...rows]
    .sort((left, right) =>
      Number(Boolean(right.is_cover)) - Number(Boolean(left.is_cover)) ||
      (finiteNumber(left.sort_order) || 0) -
        (finiteNumber(right.sort_order) || 0)
    )
    .forEach((row, index) => {
      const role = imageRole(row, index);
      if (!result.has(role)) result.set(role, row);
    });
  return [...result.entries()].map(([role, row]) => ({ role, row }));
}

function imageRole(row: RecordRow, fallbackIndex: number): ProductImageRole {
  if (PRODUCT_IMAGE_ROLES.includes(row.image_role as ProductImageRole)) {
    return row.image_role as ProductImageRole;
  }
  if (row.is_cover) return "front";
  return PRODUCT_IMAGE_ROLES[
    Math.min(PRODUCT_IMAGE_ROLES.length - 1, Math.max(0, fallbackIndex))
  ];
}

function groupImageRows(rows: RecordRow[]) {
  const result = new Map<string, RecordRow[]>();
  for (const row of rows) {
    const key = String(row.variant_id);
    const own = result.get(key) || [];
    own.push(row);
    result.set(key, own);
  }
  return result;
}

function mapSwatch(variant: RecordRow, master: RecordRow | null) {
  const colorHex = normalizeHex(
    master?.color_hex || variant.hex_code || variant.color_hex
  ) || "#111111";
  return {
    colorType: normalizeProductColorType(master?.color_type),
    primaryHex: normalizeHex(master?.primary_hex) || colorHex,
    secondaryHex: normalizeHex(master?.secondary_hex),
    tertiaryHex: normalizeHex(master?.tertiary_hex),
    swatchDirection: normalizeProductSwatchDirection(
      master?.swatch_direction
    ),
    patternImageUrl: textOrNull(master?.pattern_image_url),
    colorHex
  };
}

async function selectInChunks(
  client: SupabaseClient,
  table: string,
  columns: string,
  field: string,
  values: string[]
) {
  if (!values.length) return [];
  const rows: RecordRow[] = [];
  for (let index = 0; index < values.length; index += 100) {
    const chunk = values.slice(index, index + 100);
    const { data, error } = await client
      .from(table)
      .select(columns)
      .in(field, chunk);
    if (error) {
      console.error("Product Media chunk load failed", {
        table,
        code: error.code
      });
      throw new ProductMediaApiError(
        503,
        "Dependency media belum dapat dimuat."
      );
    }
    rows.push(...records(data));
  }
  return rows;
}

function validateSlotChange(change: ProductMediaSaveChange) {
  if (change.mediaAssetId !== null && typeof change.mediaAssetId !== "string") {
    throw new ProductMediaApiError(422, "Media asset tidak valid.");
  }
  if (change.imageUrl !== null && typeof change.imageUrl !== "string") {
    throw new ProductMediaApiError(422, "URL media tidak valid.");
  }
  if (change.objectFit !== "cover" && change.objectFit !== "contain") {
    throw new ProductMediaApiError(422, "Object fit tidak valid.");
  }
  if (change.altText.length > 180) {
    throw new ProductMediaApiError(422, "Alt text maksimal 180 karakter.");
  }
  if (
    !inRange(change.focalX, 0, 100) ||
    !inRange(change.focalY, 0, 100) ||
    !inRange(change.focalZoom, 1, 3)
  ) {
    throw new ProductMediaApiError(422, "Focal point media tidak valid.");
  }
}

function requireVersion(
  expected: string | null | undefined,
  current: unknown,
  label: string
) {
  const currentValue = textOrNull(current);
  if (!expected || expected !== currentValue) {
    throw conflict(`${label} telah berubah di tempat lain.`);
  }
}

function conflict(message: string) {
  return new ProductMediaApiError(
    409,
    `${message} Muat ulang sebelum menyimpan kembali.`
  );
}

function assertUuid(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new ProductMediaApiError(400, `${label} tidak valid.`);
  }
}

function inRange(value: unknown, minimum: number, maximum: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}

function nextTimestamp(value: unknown) {
  const previous = typeof value === "string" ? Date.parse(value) : 0;
  return new Date(Math.max(Date.now(), previous + 1)).toISOString();
}

function lifecycle(value: unknown): ProductLifecycle {
  return value === "active" || value === "archived" ? value : "draft";
}

function variantStatus(
  value: unknown,
  legacyActive: unknown
): ProductVariantStatus {
  return value === "inactive" || legacyActive === false
    ? "inactive"
    : "active";
}

function records(value: unknown): RecordRow[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asRecord(value: unknown): RecordRow {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is RecordRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
