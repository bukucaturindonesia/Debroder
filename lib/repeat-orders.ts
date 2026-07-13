import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminRole } from "@/lib/access-control";

export const REPEAT_ORDER_ELIGIBLE_STATUSES = [
  "siap_diambil",
  "siap_dikirim",
  "selesai"
] as const;

export const REPEAT_ORDER_CREATE_ROLES: readonly AdminRole[] = [
  "owner",
  "superadmin",
  "super_admin",
  "admin",
  "sales_admin"
];

export type RepeatOrderEligibleStatus = (typeof REPEAT_ORDER_ELIGIBLE_STATUSES)[number];

export type RepeatOrderSource = {
  id: string;
  order_number: string;
  quotation_id: string | null;
  customer_name: string;
  company_name: string | null;
  customer_phone: string;
  customer_email: string | null;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  archived_at: string | null;
};

export type RepeatOrderSourceItem = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  variant_size_id: string | null;
  product_name: string;
  variant_name: string | null;
  color: string;
  size: string;
  sku: string | null;
  quantity: number;
  source_unit_price: number;
  current_unit_price: number | null;
  source_subtotal: number;
  current_subtotal: number | null;
  stock_available: number | null;
  availability: "available" | "stock_changed" | "unavailable" | "manual_review";
  message: string | null;
  notes: string;
  base_price: number | null;
  tier_price: number | null;
  variant_adjustment: number;
  size_adjustment: number;
};

export type RepeatOrderService = {
  id: string;
  order_item_id: string;
  service_name: string;
  quantity: number;
  position: string | null;
  source_subtotal: number | null;
  notes: string | null;
};

export type RepeatOrderHistoryRow = {
  id: string;
  source_order_id: string;
  source_quotation_id: string | null;
  new_quotation_id: string;
  repeat_reason: string | null;
  created_by: string | null;
  created_at: string;
  idempotency_key: string;
};

export type RepeatOrderPreview = {
  source: RepeatOrderSource;
  eligible: boolean;
  items: RepeatOrderSourceItem[];
  services: RepeatOrderService[];
  sourceMockupCount: number;
  warnings: string[];
  history: RepeatOrderHistoryRow[];
};

export type CreateRepeatOrderInput = {
  sourceOrderId: string;
  reason: string;
  idempotencyKey: string;
};

export function canCreateRepeatOrder(role: string | null | undefined): role is AdminRole {
  return REPEAT_ORDER_CREATE_ROLES.includes(role as AdminRole);
}

export function validateCreateRepeatOrderInput(value: unknown): {
  input: CreateRepeatOrderInput | null;
  errors: string[];
} {
  if (!isRecord(value)) return { input: null, errors: ["Payload tidak valid."] };

  const sourceOrderId = text(value.sourceOrderId);
  const reason = text(value.reason);
  const idempotencyKey = text(value.idempotencyKey);
  const errors: string[] = [];

  if (!isUuid(sourceOrderId)) errors.push("Source order tidak valid.");
  if (reason.length < 3) errors.push("Alasan repeat order minimal 3 karakter.");
  if (reason.length > 500) errors.push("Alasan repeat order maksimal 500 karakter.");
  if (idempotencyKey.length < 12 || idempotencyKey.length > 160) {
    errors.push("Idempotency key tidak valid.");
  }

  return {
    input: errors.length ? null : { sourceOrderId, reason, idempotencyKey },
    errors
  };
}

export async function listEligibleRepeatOrderSources(
  client: SupabaseClient,
  query = ""
): Promise<RepeatOrderSource[]> {
  let request = client
    .from("orders")
    .select(
      "id,order_number,quotation_id,customer_name,company_name,customer_phone,customer_email,status,total_amount,currency,created_at,archived_at"
    )
    .in("status", [...REPEAT_ORDER_ELIGIBLE_STATUSES])
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const normalized = query.trim().replace(/[,%()]/g, " ");
  if (normalized) {
    request = request.or(
      `order_number.ilike.%${normalized}%,customer_name.ilike.%${normalized}%,company_name.ilike.%${normalized}%,customer_phone.ilike.%${normalized}%`
    );
  }

  const { data, error } = await request;
  if (error) throw new Error(`Daftar order lama gagal dimuat: ${error.message}`);
  return records(data).map(mapSource);
}

export async function listRepeatOrderHistory(
  client: SupabaseClient,
  sourceOrderId?: string
): Promise<RepeatOrderHistoryRow[]> {
  let request = client
    .from("repeat_order_history")
    .select(
      "id,source_order_id,source_quotation_id,new_quotation_id,repeat_reason,created_by,created_at,idempotency_key"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (sourceOrderId) request = request.eq("source_order_id", sourceOrderId);
  const { data, error } = await request;
  if (error) throw new Error(`Riwayat repeat order gagal dimuat: ${error.message}`);
  return records(data).map(mapHistory);
}

export async function getRepeatOrderSource(
  client: SupabaseClient,
  sourceOrderId: string
): Promise<RepeatOrderSource> {
  if (!isUuid(sourceOrderId)) throw new Error("Source order tidak valid.");

  const { data, error } = await client
    .from("orders")
    .select(
      "id,order_number,quotation_id,customer_name,company_name,customer_phone,customer_email,status,total_amount,currency,created_at,archived_at"
    )
    .eq("id", sourceOrderId)
    .maybeSingle();
  if (error) throw new Error(`Source order gagal dimuat: ${error.message}`);
  if (!data) throw new Error("Source order tidak ditemukan.");
  return mapSource(data as Record<string, unknown>);
}

export async function getRepeatOrderPreview(
  client: SupabaseClient,
  sourceOrderId: string
): Promise<RepeatOrderPreview> {
  if (!isUuid(sourceOrderId)) throw new Error("Source order tidak valid.");

  const [sourceResult, itemResult, history] = await Promise.all([
    client
      .from("orders")
      .select(
        "id,order_number,quotation_id,customer_name,company_name,customer_phone,customer_email,status,total_amount,currency,created_at,archived_at"
      )
      .eq("id", sourceOrderId)
      .maybeSingle(),
    client
      .from("order_items")
      .select(
        "id,product_id,variant_id,variant_size_id,product_name,variant_name,color,size,sku,quantity,unit_price,subtotal,notes,created_at"
      )
      .eq("order_id", sourceOrderId)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    listRepeatOrderHistory(client, sourceOrderId)
  ]);

  if (sourceResult.error) throw new Error(`Source order gagal dimuat: ${sourceResult.error.message}`);
  if (!sourceResult.data) throw new Error("Source order tidak ditemukan.");
  if (itemResult.error) throw new Error(`Item source order gagal dimuat: ${itemResult.error.message}`);

  const source = mapSource(sourceResult.data as Record<string, unknown>);
  const rawItems = records(itemResult.data);
  const productIds = unique(rawItems.map((row) => nullableText(row.product_id)));
  const variantIds = unique(rawItems.map((row) => nullableText(row.variant_id)));
  const sizeIds = unique(rawItems.map((row) => nullableText(row.variant_size_id)));
  const itemIds = unique(rawItems.map((row) => text(row.id)));

  const [products, variants, sizes, tiers, serviceResult, mockupCountResult] = await Promise.all([
    productIds.length
      ? client.from("products").select("id,name,status,base_price").in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    variantIds.length
      ? client
          .from("product_variants")
          .select("id,product_id,name,status,price_adjustment")
          .in("id", variantIds)
      : Promise.resolve({ data: [], error: null }),
    sizeIds.length
      ? client
          .from("product_variant_sizes")
          .select("id,variant_id,stock_quantity,status,price_adjustment,size_id")
          .in("id", sizeIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? client
          .from("product_price_tiers")
          .select("id,product_id,min_quantity,max_quantity,unit_price,quote_required,status,sort_order")
          .in("product_id", productIds)
          .eq("status", "active")
          .order("min_quantity", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    itemIds.length
      ? client
          .from("order_item_services")
          .select("id,order_item_id,service_name,quantity,position,subtotal,notes,created_at")
          .in("order_item_id", itemIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    source.quotation_id
      ? client
          .from("mockup_sets")
          .select("id", { count: "exact", head: true })
          .eq("quotation_id", source.quotation_id)
          .eq("status", "approved")
          .is("archived_at", null)
      : Promise.resolve({ count: 0, error: null })
  ]);

  for (const result of [products, variants, sizes, tiers, serviceResult]) {
    if (result.error) throw new Error(`Data repeat order belum lengkap: ${result.error.message}`);
  }
  if (mockupCountResult.error) {
    throw new Error(`Referensi desain gagal diperiksa: ${mockupCountResult.error.message}`);
  }

  const productMap = mapById(records(products.data));
  const variantMap = mapById(records(variants.data));
  const sizeMap = mapById(records(sizes.data));
  const tiersByProduct = new Map<string, Record<string, unknown>[]>();
  for (const tier of records(tiers.data)) {
    const productId = text(tier.product_id);
    tiersByProduct.set(productId, [...(tiersByProduct.get(productId) ?? []), tier]);
  }

  const quantityByProduct = new Map<string, number>();
  for (const row of rawItems) {
    const productId = nullableText(row.product_id);
    if (productId) quantityByProduct.set(productId, (quantityByProduct.get(productId) ?? 0) + integer(row.quantity));
  }

  const warnings: string[] = [];
  const items = rawItems.map((row): RepeatOrderSourceItem => {
    const productId = nullableText(row.product_id);
    const variantId = nullableText(row.variant_id);
    const sizeId = nullableText(row.variant_size_id);
    const product = productId ? productMap.get(productId) : undefined;
    const variant = variantId ? variantMap.get(variantId) : undefined;
    const size = sizeId ? sizeMap.get(sizeId) : undefined;
    const quantity = integer(row.quantity);
    const sourceUnitPrice = number(row.unit_price);
    const basePrice = product ? number(product.base_price) : null;
    const variantAdjustment = variant ? number(variant.price_adjustment) : 0;
    const sizeAdjustment = size ? number(size.price_adjustment) : 0;
    const productQuantity = productId ? quantityByProduct.get(productId) ?? quantity : quantity;
    const tier = productId ? activeTier(tiersByProduct.get(productId) ?? [], productQuantity) : null;
    const tierPrice = tier && tier.unit_price !== null ? number(tier.unit_price) : null;
    const quoteRequired = Boolean(tier?.quote_required) && tier?.unit_price === null;

    let currentUnitPrice: number | null = null;
    const stockAvailable: number | null = size ? integer(size.stock_quantity) : null;
    let availability: RepeatOrderSourceItem["availability"] = "manual_review";
    let message: string | null = null;

    if (!productId || !product || !variantId || !variant || !sizeId || !size) {
      message = "Produk/varian lama membutuhkan pemeriksaan manual.";
    } else if (text(product.status) !== "active" || text(variant.status) !== "active" || text(size.status) !== "active") {
      availability = "unavailable";
      message = "Produk, varian, atau ukuran sudah tidak aktif.";
    } else if (quoteRequired || basePrice === null) {
      message = "Harga aktif membutuhkan penawaran manual.";
    } else {
      currentUnitPrice = (tierPrice ?? basePrice) + variantAdjustment + sizeAdjustment;
      if (stockAvailable !== null && quantity > stockAvailable) {
        availability = "stock_changed";
        message = `Stok aktif hanya ${stockAvailable} pcs, sedangkan order lama ${quantity} pcs.`;
      } else {
        availability = "available";
        if (currentUnitPrice !== sourceUnitPrice) message = "Harga aktif berbeda dari harga order lama.";
      }
    }

    if (message) warnings.push(`${text(row.product_name)}: ${message}`);

    return {
      id: text(row.id),
      product_id: productId,
      variant_id: variantId,
      variant_size_id: sizeId,
      product_name: text(row.product_name),
      variant_name: nullableText(row.variant_name),
      color: text(row.color),
      size: text(row.size),
      sku: nullableText(row.sku),
      quantity,
      source_unit_price: sourceUnitPrice,
      current_unit_price: currentUnitPrice,
      source_subtotal: number(row.subtotal),
      current_subtotal: currentUnitPrice === null ? null : currentUnitPrice * quantity,
      stock_available: stockAvailable,
      availability,
      message,
      notes: text(row.notes),
      base_price: basePrice,
      tier_price: tierPrice,
      variant_adjustment: variantAdjustment,
      size_adjustment: sizeAdjustment
    };
  });

  const services = records(serviceResult.data).map((row): RepeatOrderService => ({
    id: text(row.id),
    order_item_id: text(row.order_item_id),
    service_name: text(row.service_name),
    quantity: integer(row.quantity),
    position: nullableText(row.position),
    source_subtotal: nullableNumber(row.subtotal),
    notes: nullableText(row.notes)
  }));

  if (services.length) warnings.push("Harga layanan dan kesiapan file desain wajib diperiksa ulang pada quotation baru.");
  if ((mockupCountResult.count ?? 0) > 0) {
    warnings.push("Desain lama dipertahankan sebagai referensi source order; approval baru tetap mengikuti lifecycle quotation.");
  }

  return {
    source,
    eligible:
      REPEAT_ORDER_ELIGIBLE_STATUSES.includes(source.status as RepeatOrderEligibleStatus) &&
      !source.archived_at &&
      items.length > 0,
    items,
    services,
    sourceMockupCount: mockupCountResult.count ?? 0,
    warnings: [...new Set(warnings)],
    history
  };
}

export async function applyActiveProductPricingToRepeatQuotation(
  client: SupabaseClient,
  quotationId: string,
  preview: RepeatOrderPreview
): Promise<void> {
  const { data, error } = await client
    .from("quotation_items")
    .select("id,product_id,product_variant_id,product_variant_size_id,quantity,created_at")
    .eq("quotation_id", quotationId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Item quotation baru gagal dimuat: ${error.message}`);

  const candidates = records(data);
  const used = new Set<string>();

  for (const item of preview.items) {
    if (item.availability !== "available" || item.current_unit_price === null) continue;
    const target = candidates.find((row) => {
      const id = text(row.id);
      if (used.has(id)) return false;
      return (
        nullableText(row.product_id) === item.product_id &&
        nullableText(row.product_variant_id) === item.variant_id &&
        nullableText(row.product_variant_size_id) === item.variant_size_id &&
        integer(row.quantity) === item.quantity
      );
    });
    if (!target) continue;
    used.add(text(target.id));

    const { error: updateError } = await client
      .from("quotation_items")
      .update({
        base_price_snapshot: item.base_price,
        tier_price_snapshot: item.tier_price,
        variant_adjustment_snapshot: item.variant_adjustment,
        size_adjustment_snapshot: item.size_adjustment,
        unit_price: item.current_unit_price,
        pricing_status: "confirmed",
        subtotal: item.current_subtotal,
        updated_at: new Date().toISOString()
      })
      .eq("id", text(target.id))
      .eq("quotation_id", quotationId)
      .is("archived_at", null);
    if (updateError) throw new Error(`Harga aktif gagal diterapkan: ${updateError.message}`);
  }

  const { error: totalError } = await client.rpc("refresh_quotation_totals", {
    p_quotation_id: quotationId
  });
  if (totalError) throw new Error(`Total quotation gagal diperbarui: ${totalError.message}`);
}

export async function listCustomerOrderHistory(
  client: SupabaseClient,
  source: RepeatOrderSource
): Promise<RepeatOrderSource[]> {
  const filters: string[] = [];
  if (source.customer_phone.trim()) filters.push(`customer_phone.eq.${source.customer_phone.trim()}`);
  if (source.customer_email?.trim()) filters.push(`customer_email.eq.${source.customer_email.trim()}`);
  if (!filters.length) return [source];

  const { data, error } = await client
    .from("orders")
    .select(
      "id,order_number,quotation_id,customer_name,company_name,customer_phone,customer_email,status,total_amount,currency,created_at,archived_at"
    )
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Riwayat pelanggan gagal dimuat: ${error.message}`);
  return records(data).map(mapSource);
}

function activeTier(tiers: Record<string, unknown>[], quantity: number) {
  return tiers.find((tier) => {
    const min = integer(tier.min_quantity);
    const max = nullableNumber(tier.max_quantity);
    return quantity >= min && (max === null || quantity <= max);
  }) ?? null;
}

function mapSource(row: Record<string, unknown>): RepeatOrderSource {
  return {
    id: text(row.id),
    order_number: text(row.order_number),
    quotation_id: nullableText(row.quotation_id),
    customer_name: text(row.customer_name),
    company_name: nullableText(row.company_name),
    customer_phone: text(row.customer_phone),
    customer_email: nullableText(row.customer_email),
    status: text(row.status),
    total_amount: number(row.total_amount),
    currency: text(row.currency) || "IDR",
    created_at: text(row.created_at),
    archived_at: nullableText(row.archived_at)
  };
}

function mapHistory(row: Record<string, unknown>): RepeatOrderHistoryRow {
  return {
    id: text(row.id),
    source_order_id: text(row.source_order_id),
    source_quotation_id: nullableText(row.source_quotation_id),
    new_quotation_id: text(row.new_quotation_id),
    repeat_reason: nullableText(row.repeat_reason),
    created_by: nullableText(row.created_by),
    created_at: text(row.created_at),
    idempotency_key: text(row.idempotency_key)
  };
}

function mapById(rows: Record<string, unknown>[]) {
  return new Map(rows.map((row) => [text(row.id), row]));
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const result = text(value);
  return result || null;
}

function number(value: unknown): number {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const result = number(value);
  return Number.isFinite(result) ? result : null;
}

function integer(value: unknown): number {
  return Math.max(0, Math.floor(number(value)));
}

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
