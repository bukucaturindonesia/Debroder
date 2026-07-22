import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProductManagerCapabilities,
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
  type ProductInventoryCopyRow,
  type ProductInventoryLocation,
  type ProductInventoryMutationResult,
  type ProductInventoryMutationSummary,
  type ProductInventoryPayload,
  type ProductInventoryQuery,
  type ProductInventorySaveChange,
  type ProductInventorySelectionRow
} from "@/lib/product-inventory";

type RecordRow = Record<string, unknown>;
export type ProductInventoryActor = Pick<
  Phase13Actor,
  "user" | "role" | "adminClient"
>;

type PlannedInventoryRow = {
  change: ProductInventorySaveChange;
  sellable: RecordRow;
  balance: RecordRow | null;
  allBalances: RecordRow[];
  stockChanged: boolean;
  priceChanged: boolean;
  statusChanged: boolean;
  targetStock: number;
  targetPrice: number;
  targetStatus: ProductVariantStatus;
};

type InventoryMutationPlan = {
  location: RecordRow;
  rows: PlannedInventoryRow[];
  summary: ProductInventoryMutationSummary;
};

type AppliedInventoryRow = {
  sellableBefore: RecordRow | null;
  sellableAfter: RecordRow | null;
  balanceBefore: RecordRow | null;
  balanceAfter: RecordRow | null;
  balanceCreated: boolean;
  movement: RecordRow | null;
};

const ALLOWED_LOCATION_NAMES = new Set([
  "STORE PETTARANI",
  "STORE LANDAK",
  "STORE TELLO",
  "STORE PAREPARE"
]);
const LEGACY_CODE = "LEGACY-SYSTEM";
const MAX_CHANGED_ROWS = 250;

const PRODUCT_FIELDS = "id,name,nama,sku,status,base_price";
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
  "sort_order"
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
const LOCATION_FIELDS = [
  "id",
  "code",
  "name",
  "location_type",
  "active",
  "is_pickup_enabled",
  "updated_at"
].join(",");
const BALANCE_FIELDS = [
  "location_id",
  "variant_size_id",
  "on_hand_quantity",
  "reserved_quantity",
  "available_quantity",
  "updated_at",
  "updated_by"
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
  "sort_order"
].join(",");
const SIZE_MASTER_FIELDS = "id,name,slug,size_group,is_active,sort_order";

export class ProductInventoryApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function loadProductInventoryPayload(
  client: SupabaseClient,
  role: string,
  productId: string,
  query: ProductInventoryQuery
): Promise<ProductInventoryPayload> {
  const [productResult, variantsResult, locationsResult, sizeMasterResult] =
    await Promise.all([
      client
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("id", productId)
        .maybeSingle(),
      client
        .from("product_variants")
        .select(VARIANT_FIELDS)
        .eq("product_id", productId)
        .order("sort_order"),
      client
        .from("inventory_locations")
        .select(LOCATION_FIELDS)
        .eq("active", true)
        .order("name"),
      client
        .from("product_size_master")
        .select(SIZE_MASTER_FIELDS)
        .eq("is_active", true)
        .order("sort_order")
    ]);

  const loadError = productResult.error ||
    variantsResult.error ||
    locationsResult.error ||
    sizeMasterResult.error;
  if (loadError) {
    console.error("Product Inventory module load failed", {
      code: loadError.code
    });
    throw new ProductInventoryApiError(
      503,
      "Harga dan stok produk belum dapat dimuat."
    );
  }
  if (!productResult.data || typeof productResult.data !== "object") {
    throw new ProductInventoryApiError(404, "Produk tidak ditemukan.");
  }

  const product = asRecord(productResult.data);
  const variants = records(variantsResult.data);
  const variantIds = variants.map((row) => String(row.id));
  const variantSlugs = variants
    .map((row) => textOrNull(row.slug))
    .filter(Boolean) as string[];

  const [sellableRows, colorMasterRows] = await Promise.all([
    selectInChunks(
      client,
      "product_variant_sizes",
      SELLABLE_FIELDS,
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

  const sellableIds = sellableRows.map((row) => String(row.id));
  const balances = await selectInChunks(
    client,
    "inventory_balances",
    BALANCE_FIELDS,
    "variant_size_id",
    sellableIds
  );

  const capabilities = getProductManagerCapabilities(role);
  const locations = records(locationsResult.data).filter(isWorkspaceLocation);
  const selectedLocation = resolveSelectedLocation(
    locations,
    query.locationId,
    capabilities.canManageDependencies
  );
  const locationSummary = summarizeLocations(locations, balances);
  const allSummary = summarizeBalanceRows(balances);
  const sizeMaster = records(sizeMasterResult.data);
  const sizeById = new Map(sizeMaster.map((row) => [String(row.id), row]));
  const variantById = new Map(variants.map((row) => [String(row.id), row]));
  const colorBySlug = new Map(
    colorMasterRows.map((row) => [String(row.slug), row])
  );
  const balanceByKey = new Map(
    balances.map((row) => [
      `${String(row.location_id)}:${String(row.variant_size_id)}`,
      row
    ])
  );
  const balancesBySellable = new Map<string, RecordRow[]>();
  for (const balance of balances) {
    const key = String(balance.variant_size_id);
    const own = balancesBySellable.get(key) || [];
    own.push(balance);
    balancesBySellable.set(key, own);
  }

  const allRows = sellableRows
    .map((sellable) => {
      const variant = variantById.get(String(sellable.variant_id)) || null;
      return mapInventorySourceRow({
        sellable,
        variant,
        size: sizeById.get(String(sellable.size_id)) || null,
        colorMaster: colorBySlug.get(String(variant?.slug || "")) || null,
        selectedLocation,
        balanceByKey,
        balancesBySellable,
        basePrice: finiteNumber(product.base_price) || 0
      });
    })
    .sort(compareInventoryRows);
  const orderedRows = allRows.filter((row) => matchesInventoryQuery(row, query));

  const matchingRowIds = orderedRows.map((row) => row.sellableId);
  const selectionRows = orderedRows.map(selectionRowFromInventoryRow);
  const pageCount = Math.max(1, Math.ceil(orderedRows.length / query.pageSize));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * query.pageSize;
  const visibleRows = orderedRows.slice(start, start + query.pageSize);
  const copySourceRows = query.copyFromVariantId
    ? allRows
      .filter((row) => row.variantId === query.copyFromVariantId)
      .map<ProductInventoryCopyRow>((row) => ({
        sizeId: row.sizeId,
        stockQuantity: row.stockQuantity,
        priceAdjustment: row.priceAdjustment,
        status: row.status
      }))
    : [];

  const legacyLocation = locations.find(
    (row) => String(row.code) === LEGACY_CODE
  ) || null;
  const legacyDriftCount = legacyLocation
    ? sellableRows.filter((sellable) => {
      const legacyBalance = balanceByKey.get(
        `${String(legacyLocation.id)}:${String(sellable.id)}`
      );
      const compatibility = Math.max(
        0,
        finiteNumber(sellable.stock_quantity ?? sellable.stock) || 0
      );
      const ledger = Math.max(
        0,
        finiteNumber(legacyBalance?.on_hand_quantity) || 0
      );
      return compatibility !== ledger;
    }).length
    : sellableRows.length;

  return {
    role,
    capabilities,
    product: {
      id: String(product.id),
      name: String(product.name || product.nama || ""),
      sku: textOrNull(product.sku),
      status: lifecycle(product.status),
      basePrice: finiteNumber(product.base_price) || 0
    },
    query: { ...query, page },
    selectedLocation,
    locations: locations.map<ProductInventoryLocation>((location) => {
      const id = String(location.id);
      const legacy = String(location.code) === LEGACY_CODE ||
        String(location.location_type) === "legacy";
      return {
        id,
        code: String(location.code),
        name: String(location.name),
        locationType: String(location.location_type),
        active: location.active !== false,
        editable: capabilities.canManageDependencies &&
          !legacy &&
          String(location.location_type) === "store",
        legacy,
        summary: locationSummary.get(id) || emptySummary()
      };
    }),
    rows: visibleRows,
    selectionRows,
    matchingRowIds,
    copySourceRows,
    filters: {
      colors: variants.map((variant) => ({
        id: String(variant.id),
        name: String(
          variant.name ||
          variant.variant_name ||
          variant.color_name ||
          "Warna"
        )
      })),
      sizes: sizeMaster.map((size) => ({
        id: String(size.id),
        name: String(size.name)
      }))
    },
    pagination: {
      page,
      pageSize: query.pageSize,
      total: orderedRows.length,
      pageCount
    },
    summary: selectedLocation.kind === "all"
      ? allSummary
      : locationSummary.get(selectedLocation.id || "") || emptySummary(),
    legacyDriftCount
  };
}

export async function previewProductInventoryMutation(
  actor: ProductInventoryActor,
  productId: string,
  input: {
    locationId: string;
    changes: ProductInventorySaveChange[];
    reason: string;
  }
): Promise<ProductInventoryMutationResult> {
  const plan = await planInventoryMutation(actor, productId, input);
  return {
    ok: true,
    preview: true,
    message: `${plan.summary.changedRows} row siap diproses.`,
    summary: plan.summary
  };
}

export async function commitProductInventoryMutation(
  actor: ProductInventoryActor,
  request: Request,
  productId: string,
  input: {
    locationId: string;
    changes: ProductInventorySaveChange[];
    reason: string;
  }
): Promise<ProductInventoryMutationResult> {
  const plan = await planInventoryMutation(actor, productId, input);
  const identity = createPimAuditIdentity(
    request,
    "workspace-location-inventory"
  );
  const applied: AppliedInventoryRow[] = [];

  try {
    for (const row of plan.rows) {
      const state: AppliedInventoryRow = {
        sellableBefore: null,
        sellableAfter: null,
        balanceBefore: null,
        balanceAfter: null,
        balanceCreated: false,
        movement: null
      };
      applied.push(state);
      await applyInventoryRow({
        actor,
        location: plan.location,
        row,
        reason: input.reason,
        operationId: identity.operationId,
        state
      });
    }

    await recordInventoryAudit({
      actor,
      identity,
      productId,
      location: plan.location,
      rows: plan.rows,
      summary: plan.summary,
      status: "COMPLETED"
    });

    return {
      ok: true,
      preview: false,
      message: "Perubahan harga dan stok berhasil disimpan.",
      summary: plan.summary
    };
  } catch (error) {
    const recovered = await rollbackAppliedRows(actor.adminClient, applied);
    try {
      await recordInventoryAudit({
        actor,
        identity,
        productId,
        location: plan.location,
        rows: plan.rows,
        summary: plan.summary,
        status: recovered ? "ROLLED_BACK" : "INCOMPLETE",
        failureCode: error instanceof Error
          ? error.name
          : "INVENTORY_MUTATION_FAILED"
      });
    } catch {
      // Preserve the original mutation failure.
    }

    if (!recovered) {
      throw new ProductInventoryApiError(
        500,
        "Penyimpanan inventory gagal dan recovery tidak lengkap. Hentikan operasi dan periksa audit database."
      );
    }
    if (error instanceof ProductInventoryApiError) throw error;
    throw new ProductInventoryApiError(
      409,
      "Penyimpanan inventory gagal dan seluruh perubahan berhasil dipulihkan. Muat ulang lalu coba lagi."
    );
  }
}

async function planInventoryMutation(
  actor: ProductInventoryActor,
  productId: string,
  input: {
    locationId: string;
    changes: ProductInventorySaveChange[];
    reason: string;
  }
): Promise<InventoryMutationPlan> {
  if (!getProductManagerCapabilities(actor.role).canManageDependencies) {
    throw new ProductInventoryApiError(
      403,
      "Harga dan stok Product Workspace hanya dapat diubah oleh Owner atau Super Admin."
    );
  }
  if (!isUuid(input.locationId)) {
    throw new ProductInventoryApiError(
      400,
      "locationId store wajib dikirim secara eksplisit."
    );
  }
  if (!Array.isArray(input.changes) ||
      input.changes.length < 1 ||
      input.changes.length > MAX_CHANGED_ROWS) {
    throw new ProductInventoryApiError(
      400,
      `Changed-row save wajib berisi 1 sampai ${MAX_CHANGED_ROWS} row.`
    );
  }
  const reason = String(input.reason || "").trim();
  if (!reason || reason.length > 240) {
    throw new ProductInventoryApiError(
      422,
      "Alasan perubahan wajib diisi maksimal 240 karakter."
    );
  }

  const [productResult, locationResult, variantsResult] = await Promise.all([
    actor.adminClient
      .from("products")
      .select("id,name,nama,status")
      .eq("id", productId)
      .maybeSingle(),
    actor.adminClient
      .from("inventory_locations")
      .select(LOCATION_FIELDS)
      .eq("id", input.locationId)
      .maybeSingle(),
    actor.adminClient
      .from("product_variants")
      .select("id,product_id")
      .eq("product_id", productId)
  ]);

  const planError = productResult.error ||
    locationResult.error ||
    variantsResult.error;
  if (planError) {
    console.error("Product Inventory mutation preflight failed", {
      code: planError.code
    });
    throw new ProductInventoryApiError(503, "Inventory belum dapat diperiksa.");
  }
  if (!productResult.data) {
    throw new ProductInventoryApiError(404, "Produk tidak ditemukan.");
  }
  if (!locationResult.data) {
    throw new ProductInventoryApiError(404, "Lokasi inventory tidak ditemukan.");
  }

  const location = asRecord(locationResult.data);
  if (!isWorkspaceLocation(location) ||
      String(location.location_type) !== "store" ||
      String(location.code) === LEGACY_CODE) {
    throw new ProductInventoryApiError(
      403,
      "All Locations dan Legacy System bersifat read-only. Pilih store resmi."
    );
  }

  const duplicateIds = new Set<string>();
  const sellableIds: string[] = [];
  for (const change of input.changes) {
    if (!isUuid(change.sellableId)) {
      throw new ProductInventoryApiError(400, "Sellable SKU ID tidak valid.");
    }
    if (duplicateIds.has(change.sellableId)) {
      throw new ProductInventoryApiError(
        400,
        "Satu SKU tidak boleh muncul dua kali dalam changed-row save."
      );
    }
    duplicateIds.add(change.sellableId);
    sellableIds.push(change.sellableId);
  }

  const variantIds = records(variantsResult.data).map((row) => String(row.id));
  const [sellableRows, locationBalances, allBalances] = await Promise.all([
    selectInChunks(
      actor.adminClient,
      "product_variant_sizes",
      SELLABLE_FIELDS,
      "id",
      sellableIds
    ),
    selectBalancesForLocation(
      actor.adminClient,
      input.locationId,
      sellableIds
    ),
    selectInChunks(
      actor.adminClient,
      "inventory_balances",
      BALANCE_FIELDS,
      "variant_size_id",
      sellableIds
    )
  ]);

  const sellableById = new Map(
    sellableRows
      .filter((row) => variantIds.includes(String(row.variant_id)))
      .map((row) => [String(row.id), row])
  );
  const balanceBySellable = new Map(
    locationBalances.map((row) => [String(row.variant_size_id), row])
  );
  const allBalancesBySellable = new Map<string, RecordRow[]>();
  for (const balance of allBalances) {
    const key = String(balance.variant_size_id);
    const own = allBalancesBySellable.get(key) || [];
    own.push(balance);
    allBalancesBySellable.set(key, own);
  }

  const rows: PlannedInventoryRow[] = [];
  for (const change of input.changes) {
    const sellable = sellableById.get(change.sellableId);
    if (!sellable) {
      throw new ProductInventoryApiError(
        404,
        "Sellable SKU tidak ditemukan pada produk ini."
      );
    }
    const balance = balanceBySellable.get(change.sellableId) || null;
    const stockChanged = change.stockQuantity !== undefined;
    const priceChanged = change.priceAdjustment !== undefined;
    const statusChanged = change.status !== undefined;
    if (!stockChanged && !priceChanged && !statusChanged) {
      throw new ProductInventoryApiError(400, "Row tidak memiliki perubahan.");
    }

    const currentStock = Math.max(
      0,
      finiteNumber(balance?.on_hand_quantity) || 0
    );
    const currentPrice = finiteNumber(sellable.price_adjustment) || 0;
    const currentStatus = variantStatus(sellable.status, sellable.is_active);
    const targetStock = stockChanged
      ? finiteInteger(change.stockQuantity)
      : currentStock;
    const targetPrice = priceChanged
      ? finiteInteger(change.priceAdjustment)
      : currentPrice;
    const targetStatus = statusChanged
      ? parseStatus(change.status)
      : currentStatus;

    if (targetStock < 0) {
      throw new ProductInventoryApiError(
        422,
        `${String(sellable.sku)}: stok wajib integer non-negatif.`
      );
    }
    const reserved = Math.max(
      0,
      finiteNumber(balance?.reserved_quantity) || 0
    );
    if (targetStock < reserved) {
      throw new ProductInventoryApiError(
        422,
        `${String(sellable.sku)}: stok tidak boleh lebih kecil dari reservasi aktif (${reserved}).`
      );
    }

    if (priceChanged || statusChanged) {
      requireVersion(
        change.expectedSkuUpdatedAt,
        sellable.updated_at,
        `${String(sellable.sku)} data SKU`
      );
    }
    if (stockChanged) {
      if (balance) {
        requireVersion(
          change.expectedBalanceUpdatedAt,
          balance.updated_at,
          `${String(sellable.sku)} saldo lokasi`
        );
      } else if (change.expectedBalanceUpdatedAt !== null) {
        throw conflict(
          `${String(sellable.sku)} saldo lokasi telah dibuat oleh proses lain.`
        );
      }
    }

    const ownBalances = allBalancesBySellable.get(change.sellableId) || [];
    const totalReserved = ownBalances.reduce(
      (total, row) => total + Math.max(
        0,
        finiteNumber(row.reserved_quantity) || 0
      ),
      0
    );
    if (statusChanged && targetStatus === "inactive" && totalReserved > 0) {
      throw new ProductInventoryApiError(
        422,
        `${String(sellable.sku)} memiliki ${totalReserved} unit reservasi aktif dan belum dapat dinonaktifkan.`
      );
    }

    rows.push({
      change,
      sellable,
      balance,
      allBalances: ownBalances,
      stockChanged,
      priceChanged,
      statusChanged,
      targetStock,
      targetPrice,
      targetStatus
    });
  }

  const summary: ProductInventoryMutationSummary = {
    changedRows: rows.length,
    stockRows: rows.filter((row) => row.stockChanged).length,
    priceRows: rows.filter((row) => row.priceChanged).length,
    statusRows: rows.filter((row) => row.statusChanged).length,
    totalStockDelta: rows.reduce(
      (total, row) => total + (
        row.stockChanged
          ? row.targetStock - Math.max(
            0,
            finiteNumber(row.balance?.on_hand_quantity) || 0
          )
          : 0
      ),
      0
    ),
    deactivatedRows: rows.filter(
      (row) => row.statusChanged && row.targetStatus === "inactive"
    ).length,
    locationId: String(location.id),
    locationName: String(location.name)
  };

  return { location, rows, summary };
}

async function applyInventoryRow(input: {
  actor: ProductInventoryActor;
  location: RecordRow;
  row: PlannedInventoryRow;
  reason: string;
  operationId: string;
  state: AppliedInventoryRow;
}) {
  const { actor, location, row, state } = input;

  if (row.priceChanged || row.statusChanged) {
    const payload: RecordRow = {
      updated_at: nextTimestamp(row.sellable.updated_at)
    };
    if (row.priceChanged) payload.price_adjustment = row.targetPrice;
    if (row.statusChanged) {
      payload.status = row.targetStatus;
      payload.is_active = row.targetStatus === "active";
    }
    state.sellableBefore = row.sellable;
    const { data, error } = await actor.adminClient
      .from("product_variant_sizes")
      .update(payload)
      .eq("id", String(row.sellable.id))
      .eq("updated_at", String(row.sellable.updated_at))
      .select(SELLABLE_FIELDS)
      .maybeSingle();
    if (error || !data) {
      throw conflict(`${String(row.sellable.sku)} telah berubah di tempat lain.`);
    }
    state.sellableAfter = asRecord(data);
  }

  if (!row.stockChanged) return;
  const beforeStock = Math.max(
    0,
    finiteNumber(row.balance?.on_hand_quantity) || 0
  );
  const delta = row.targetStock - beforeStock;
  if (delta === 0) return;

  if (row.balance) {
    state.balanceBefore = row.balance;
    const nextUpdatedAt = nextTimestamp(row.balance.updated_at);
    const { data, error } = await actor.adminClient
      .from("inventory_balances")
      .update({
        on_hand_quantity: row.targetStock,
        updated_at: nextUpdatedAt,
        updated_by: actor.user.id
      })
      .eq("location_id", String(location.id))
      .eq("variant_size_id", String(row.sellable.id))
      .eq("updated_at", String(row.balance.updated_at))
      .select(BALANCE_FIELDS)
      .maybeSingle();
    if (error || !data) {
      throw conflict(`${String(row.sellable.sku)} saldo store telah berubah.`);
    }
    state.balanceAfter = asRecord(data);
  } else {
    const now = new Date().toISOString();
    const { data, error } = await actor.adminClient
      .from("inventory_balances")
      .insert({
        location_id: String(location.id),
        variant_size_id: String(row.sellable.id),
        on_hand_quantity: row.targetStock,
        reserved_quantity: 0,
        updated_at: now,
        updated_by: actor.user.id
      })
      .select(BALANCE_FIELDS)
      .maybeSingle();
    if (error || !data) {
      throw new ProductInventoryApiError(
        error?.code === "23505" ? 409 : 422,
        error?.code === "23505"
          ? `${String(row.sellable.sku)} saldo store telah dibuat oleh proses lain.`
          : `${String(row.sellable.sku)} saldo store belum dapat dibuat.`
      );
    }
    state.balanceAfter = asRecord(data);
    state.balanceCreated = true;
  }

  const movementKey = [
    "workspace-inventory",
    input.operationId,
    String(location.id),
    String(row.sellable.id)
  ].join(":");
  const { data: movement, error: movementError } = await actor.adminClient
    .from("inventory_movements")
    .insert({
      idempotency_key: movementKey,
      variant_size_id: String(row.sellable.id),
      location_id: String(location.id),
      movement_type: "adjustment",
      quantity_delta: delta,
      balance_after: row.targetStock,
      reason: input.reason,
      created_by: actor.user.id
    })
    .select("id,idempotency_key,variant_size_id,location_id")
    .maybeSingle();
  if (movementError || !movement) {
    throw new ProductInventoryApiError(
      409,
      `${String(row.sellable.sku)} movement ledger belum dapat dicatat.`
    );
  }
  state.movement = asRecord(movement);
}

async function rollbackAppliedRows(
  client: SupabaseClient,
  applied: AppliedInventoryRow[]
) {
  try {
    for (const item of [...applied].reverse()) {
      if (item.movement?.id) {
        const { error } = await client
          .from("inventory_movements")
          .delete()
          .eq("id", String(item.movement.id));
        if (error) return false;
      }

      if (item.balanceAfter) {
        if (item.balanceCreated) {
          const { error } = await client
            .from("inventory_balances")
            .delete()
            .eq("location_id", String(item.balanceAfter.location_id))
            .eq("variant_size_id", String(item.balanceAfter.variant_size_id))
            .eq("updated_at", String(item.balanceAfter.updated_at));
          if (error) return false;
        } else if (item.balanceBefore) {
          const { data, error } = await client
            .from("inventory_balances")
            .update({
              on_hand_quantity: finiteNumber(
                item.balanceBefore.on_hand_quantity
              ) || 0,
              updated_at: nextTimestamp(item.balanceAfter.updated_at),
              updated_by: item.balanceBefore.updated_by || null
            })
            .eq("location_id", String(item.balanceAfter.location_id))
            .eq("variant_size_id", String(item.balanceAfter.variant_size_id))
            .eq("updated_at", String(item.balanceAfter.updated_at))
            .select("location_id")
            .maybeSingle();
          if (error || !data) return false;
        }
      }

      if (item.sellableAfter && item.sellableBefore) {
        const previousStatus = variantStatus(
          item.sellableBefore.status,
          item.sellableBefore.is_active
        );
        const { data, error } = await client
          .from("product_variant_sizes")
          .update({
            price_adjustment: finiteNumber(
              item.sellableBefore.price_adjustment
            ) || 0,
            status: previousStatus,
            is_active: previousStatus === "active",
            updated_at: nextTimestamp(item.sellableAfter.updated_at)
          })
          .eq("id", String(item.sellableAfter.id))
          .eq("updated_at", String(item.sellableAfter.updated_at))
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

async function recordInventoryAudit(input: {
  actor: ProductInventoryActor;
  identity: ReturnType<typeof createPimAuditIdentity>;
  productId: string;
  location: RecordRow;
  rows: PlannedInventoryRow[];
  summary: ProductInventoryMutationSummary;
  status: "COMPLETED" | "ROLLED_BACK" | "INCOMPLETE";
  failureCode?: string;
}) {
  const entities: PimAuditEntity[] = input.rows.map((row) => ({
    entityType: "product_variant_sizes",
    entityId: String(row.sellable.id),
    entityLabel: String(row.sellable.sku),
    productId: input.productId,
    variantId: String(row.sellable.variant_id),
    sku: String(row.sellable.sku),
    resultStatus: input.status
  }));
  await recordPimAuditEvent(input.actor.adminClient, {
    eventCode: "VARIANT_MATRIX_UPDATED",
    status: input.status,
    actorId: input.actor.user.id,
    actorRole: input.actor.role,
    actorLabel: actorAuditLabel(input.actor.user),
    requestId: input.identity.requestId,
    operationId: input.identity.operationId,
    idempotencyKey: input.identity.idempotencyKey,
    entityType: "product_inventory_workspace",
    entityId: input.productId,
    entityLabel: PIM_AUDIT_EVENT_REGISTRY.VARIANT_MATRIX_UPDATED.label,
    productId: input.productId,
    summary: `WP-05 ${input.summary.changedRows} row pada ${String(input.location.name)}`,
    failureCode: input.failureCode || null,
    metadata: {
      checkpoint: "WP-05",
      module: "inventory",
      locationId: String(input.location.id),
      locationCode: String(input.location.code),
      ...input.summary
    },
    entities
  });
}

function mapInventorySourceRow(input: {
  sellable: RecordRow;
  variant: RecordRow | null;
  size: RecordRow | null;
  colorMaster: RecordRow | null;
  selectedLocation: ProductInventoryPayload["selectedLocation"];
  balanceByKey: Map<string, RecordRow>;
  balancesBySellable: Map<string, RecordRow[]>;
  basePrice: number;
}) {
  const sellableId = String(input.sellable.id);
  const variantId = String(input.variant?.id || input.sellable.variant_id);
  const balances = input.balancesBySellable.get(sellableId) || [];
  const selectedBalance = input.selectedLocation.kind === "all"
    ? null
    : input.balanceByKey.get(
      `${input.selectedLocation.id}:${sellableId}`
    ) || null;
  const quantity = input.selectedLocation.kind === "all"
    ? summarizeBalanceRows(balances)
    : {
      onHand: Math.max(
        0,
        finiteNumber(selectedBalance?.on_hand_quantity) || 0
      ),
      reserved: Math.max(
        0,
        finiteNumber(selectedBalance?.reserved_quantity) || 0
      ),
      available: Math.max(
        0,
        finiteNumber(selectedBalance?.available_quantity) || 0
      )
    };
  const variantPrice = finiteNumber(input.variant?.price_adjustment) || 0;
  const skuPrice = finiteNumber(input.sellable.price_adjustment) || 0;
  const swatch = mapSwatch(input.variant, input.colorMaster);

  return {
    sellableId,
    variantId,
    colorName: String(
      input.variant?.name ||
      input.variant?.variant_name ||
      input.variant?.color_name ||
      "Warna"
    ),
    colorSlug: String(input.variant?.slug || ""),
    sizeId: String(input.sellable.size_id || input.size?.id || ""),
    sizeName: String(input.size?.name || input.sellable.size_name || ""),
    sizeSlug: String(input.size?.slug || ""),
    sku: String(input.sellable.sku || ""),
    status: variantStatus(input.sellable.status, input.sellable.is_active),
    priceAdjustment: skuPrice,
    variantPriceAdjustment: variantPrice,
    basePrice: input.basePrice,
    finalPrice: input.basePrice + variantPrice + skuPrice,
    stockQuantity: quantity.onHand,
    reservedQuantity: quantity.reserved,
    availableQuantity: quantity.available,
    expectedSkuUpdatedAt: String(input.sellable.updated_at),
    expectedBalanceUpdatedAt: selectedBalance
      ? String(selectedBalance.updated_at)
      : null,
    ...swatch,
    variantSortOrder: finiteNumber(input.variant?.sort_order) || 0,
    sizeSortOrder: finiteNumber(input.size?.sort_order) || 0
  };
}

function selectionRowFromInventoryRow(
  row: ReturnType<typeof mapInventorySourceRow>
): ProductInventorySelectionRow {
  return {
    sellableId: row.sellableId,
    variantId: row.variantId,
    sizeId: row.sizeId,
    sku: row.sku,
    stockQuantity: row.stockQuantity,
    reservedQuantity: row.reservedQuantity,
    priceAdjustment: row.priceAdjustment,
    status: row.status,
    expectedSkuUpdatedAt: row.expectedSkuUpdatedAt,
    expectedBalanceUpdatedAt: row.expectedBalanceUpdatedAt
  };
}

function matchesInventoryQuery(
  row: ReturnType<typeof mapInventorySourceRow>,
  query: ProductInventoryQuery
) {
  const needle = query.q.toLowerCase();
  return (
    (!needle || `${row.sku} ${row.colorName} ${row.sizeName}`
      .toLowerCase()
      .includes(needle)) &&
    (!query.colorId || row.variantId === query.colorId) &&
    (!query.sizeId || row.sizeId === query.sizeId) &&
    (query.status === "all" || row.status === query.status)
  );
}

function compareInventoryRows(
  left: ReturnType<typeof mapInventorySourceRow>,
  right: ReturnType<typeof mapInventorySourceRow>
) {
  return left.variantSortOrder - right.variantSortOrder ||
    left.sizeSortOrder - right.sizeSortOrder ||
    left.sku.localeCompare(right.sku);
}

function mapSwatch(
  variant: RecordRow | null,
  master: RecordRow | null
) {
  const colorHex = normalizeHex(
    master?.color_hex || variant?.hex_code || variant?.color_hex
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

function resolveSelectedLocation(
  locations: RecordRow[],
  token: string,
  canManage: boolean
): ProductInventoryPayload["selectedLocation"] {
  if (!token || token === "all") {
    return {
      kind: "all",
      id: null,
      name: "Semua Lokasi",
      code: "ALL",
      locationType: "summary",
      editable: false,
      legacy: false
    };
  }
  const location = locations.find((row) => String(row.id) === token);
  if (!location) {
    return {
      kind: "all",
      id: null,
      name: "Semua Lokasi",
      code: "ALL",
      locationType: "summary",
      editable: false,
      legacy: false
    };
  }
  const legacy = String(location.code) === LEGACY_CODE ||
    String(location.location_type) === "legacy";
  return {
    kind: "location",
    id: String(location.id),
    name: String(location.name),
    code: String(location.code),
    locationType: String(location.location_type),
    editable: canManage &&
      !legacy &&
      String(location.location_type) === "store",
    legacy
  };
}

function summarizeLocations(
  locations: RecordRow[],
  balances: RecordRow[]
) {
  const result = new Map<string, ProductInventoryLocation["summary"]>();
  for (const location of locations) {
    const id = String(location.id);
    result.set(
      id,
      summarizeBalanceRows(
        balances.filter((row) => String(row.location_id) === id)
      )
    );
  }
  return result;
}

function summarizeBalanceRows(rows: RecordRow[]) {
  return rows.reduce(
    (summary, row) => ({
      onHand: summary.onHand + Math.max(
        0,
        finiteNumber(row.on_hand_quantity) || 0
      ),
      reserved: summary.reserved + Math.max(
        0,
        finiteNumber(row.reserved_quantity) || 0
      ),
      available: summary.available + Math.max(
        0,
        finiteNumber(row.available_quantity) || 0
      )
    }),
    emptySummary()
  );
}

function emptySummary() {
  return { onHand: 0, reserved: 0, available: 0 };
}

function isWorkspaceLocation(row: RecordRow) {
  return row.active !== false && (
    String(row.code) === LEGACY_CODE ||
    (
      String(row.location_type) === "store" &&
      ALLOWED_LOCATION_NAMES.has(String(row.name))
    )
  );
}

async function selectBalancesForLocation(
  client: SupabaseClient,
  locationId: string,
  sellableIds: string[]
) {
  if (!sellableIds.length) return [];
  const rows: RecordRow[] = [];
  for (const chunk of chunks(sellableIds, 100)) {
    const { data, error } = await client
      .from("inventory_balances")
      .select(BALANCE_FIELDS)
      .eq("location_id", locationId)
      .in("variant_size_id", chunk);
    if (error) {
      throw new ProductInventoryApiError(
        503,
        "Saldo lokasi belum dapat dimuat."
      );
    }
    rows.push(...records(data));
  }
  return rows;
}

async function selectInChunks(
  client: SupabaseClient,
  table: string,
  columns: string,
  field: string,
  ids: string[]
) {
  if (!ids.length) return [];
  const rows: RecordRow[] = [];
  for (const chunk of chunks(ids, 100)) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .in(field, chunk);
    if (error) {
      console.error("Product Inventory chunk load failed", {
        table,
        code: error.code
      });
      throw new ProductInventoryApiError(
        503,
        "Data matrix inventory belum dapat dimuat."
      );
    }
    rows.push(...records(data));
  }
  return rows;
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
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
  return new ProductInventoryApiError(
    409,
    `${message} Muat ulang sebelum menyimpan kembali.`
  );
}

function parseStatus(value: unknown): ProductVariantStatus {
  if (value !== "active" && value !== "inactive") {
    throw new ProductInventoryApiError(422, "Status SKU tidak valid.");
  }
  return value;
}

function finiteInteger(value: unknown) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new ProductInventoryApiError(
      422,
      "Nilai matrix wajib berupa integer."
    );
  }
  return number;
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function variantStatus(
  value: unknown,
  legacyActive: unknown
): ProductVariantStatus {
  return value === "inactive" || legacyActive === false
    ? "inactive"
    : "active";
}

function lifecycle(value: unknown): ProductLifecycle {
  return value === "active" || value === "archived" ? value : "draft";
}

function nextTimestamp(value: unknown) {
  const previous = typeof value === "string" ? Date.parse(value) : 0;
  return new Date(Math.max(Date.now(), previous + 1)).toISOString();
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  return typeof value === "string" && value ? value : null;
}
