import {
  GLOBAL_DASHBOARD_PERIODS,
  type DashboardAlert,
  type DashboardLatestOrder,
  type DashboardMetric,
  type DashboardOrderType,
  type DashboardQueueItem,
  type DashboardStoreSummary,
  type DashboardTrendPoint,
  type GlobalAdminDashboardReadModel,
  type GlobalDashboardFilter,
  type GlobalDashboardPeriod
} from "@/lib/global-admin-dashboard/contracts";

type JsonRecord = Record<string, unknown>;

export type DashboardRawData = {
  orders: unknown[];
  payments: unknown[];
  refunds: unknown[];
  assignments: unknown[];
  stores: unknown[];
  inventoryLocations: unknown[];
  inventoryBalances: unknown[];
  products: unknown[];
  jobOrders: unknown[];
  workItems: unknown[];
  qualityControls: unknown[];
  fulfillments: unknown[];
  issues: GlobalAdminDashboardReadModel["issues"];
};

const TERMINAL_INVALID_ORDER_STATUSES = new Set([
  "cancelled",
  "dibatalkan",
  "expired",
  "failed",
  "void"
]);
const TERMINAL_ORDER_STATUSES = new Set([
  ...TERMINAL_INVALID_ORDER_STATUSES,
  "completed",
  "selesai",
  "picked_up"
]);
const VERIFIED_PAYMENT_STATUSES = new Set(["verified"]);
const FINAL_REFUND_STATUSES = new Set(["sent", "confirmed"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;
const MAKASSAR_OFFSET_MS = 8 * 60 * 60 * 1000;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  const normalized = text(value).trim();
  return normalized ? normalized : null;
}

function amount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function integer(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function dateValue(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function makassarDateKey(value: Date): string {
  return new Date(value.getTime() + MAKASSAR_OFFSET_MS).toISOString().slice(0, 10);
}

function startOfMakassarDate(key: string): Date {
  return new Date(`${key}T00:00:00.000+08:00`);
}

function validDateKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(startOfMakassarDate(value).getTime());
}

export function normalizeGlobalDashboardFilter(
  input: { period?: string | null; start?: string | null; end?: string | null; store?: string | null },
  now = new Date()
): GlobalDashboardFilter {
  const period: GlobalDashboardPeriod = GLOBAL_DASHBOARD_PERIODS.includes(input.period as GlobalDashboardPeriod)
    ? input.period as GlobalDashboardPeriod
    : "today";
  const todayKey = makassarDateKey(now);
  let startKey = todayKey;
  let endKey = todayKey;

  if (period === "7d") {
    startKey = makassarDateKey(new Date(startOfMakassarDate(todayKey).getTime() - 6 * DAY_MS));
  } else if (period === "30d") {
    startKey = makassarDateKey(new Date(startOfMakassarDate(todayKey).getTime() - 29 * DAY_MS));
  } else if (period === "custom") {
    const requestedStart = input.start ?? null;
    const requestedEnd = input.end ?? null;
    startKey = validDateKey(requestedStart) ? requestedStart : todayKey;
    endKey = validDateKey(requestedEnd) ? requestedEnd : startKey;
    if (startKey > endKey) [startKey, endKey] = [endKey, startKey];
    const startTime = startOfMakassarDate(startKey).getTime();
    const endTime = startOfMakassarDate(endKey).getTime();
    if (endTime - startTime > 89 * DAY_MS) {
      endKey = makassarDateKey(new Date(startTime + 89 * DAY_MS));
    }
  }

  const start = startOfMakassarDate(startKey);
  const end = new Date(startOfMakassarDate(endKey).getTime() + DAY_MS);
  return {
    period,
    start: start.toISOString(),
    end: end.toISOString(),
    storeId: input.store && UUID_PATTERN.test(input.store) ? input.store : null
  };
}

function previousFilter(filter: GlobalDashboardFilter): { start: Date; end: Date } {
  const start = new Date(filter.start);
  const end = new Date(filter.end);
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: start
  };
}

function inRange(value: unknown, start: Date, end: Date): boolean {
  const date = dateValue(value);
  return Boolean(date && date >= start && date < end);
}

function orderIsValid(order: JsonRecord): boolean {
  return !TERMINAL_INVALID_ORDER_STATUSES.has(text(order.status).toLowerCase())
    && nullableText(order.archived_at) === null
    && amount(order.total_amount) > 0;
}

function receivingStoreByOrder(assignments: unknown[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const raw of assignments) {
    const row = record(raw);
    const orderId = nullableText(row.order_id);
    const storeId = nullableText(row.receiving_store_id);
    if (orderId && storeId) result.set(orderId, storeId);
  }
  return result;
}

function itemRows(order: JsonRecord): JsonRecord[] {
  return array(order.order_items)
    .map(record)
    .filter((item) => nullableText(item.archived_at) === null);
}

export function classifyDashboardOrder(orderValue: unknown): DashboardOrderType["key"] {
  const order = record(orderValue);
  const items = itemRows(order);
  if (array(order.custom_project_snapshot).length > 0 || items.some((item) => nullableText(item.custom_project_id))) {
    return "custom_project";
  }
  if (items.some((item) => Object.keys(record(record(item.config_snapshot).instant_custom)).length > 0)) {
    return "instant_custom";
  }
  if (items.some((item) => {
    const snapshot = record(item.config_snapshot);
    return nullableText(snapshot.definitionId) !== null || nullableText(snapshot.definition_id) !== null;
  })) {
    return "configured_product";
  }
  if (items.length > 0 && items.every((item) => nullableText(item.variant_size_id) && nullableText(item.sku))) {
    return "ready_stock";
  }
  return "legacy_unsupported";
}

function aggregateMetric(current: number, previous: number, visible = true): DashboardMetric {
  return {
    value: visible ? current : null,
    visible,
    changePercent: visible && previous > 0 ? ((current - previous) / previous) * 100 : null,
    comparisonLabel: "dari periode sebelumnya"
  };
}

function verifiedPaymentAmount(payment: JsonRecord): number {
  if (!VERIFIED_PAYMENT_STATUSES.has(text(payment.status).toLowerCase())) return 0;
  return amount(payment.verified_amount) || amount(payment.amount);
}

function finalRefundAmount(refund: JsonRecord): number {
  return FINAL_REFUND_STATUSES.has(text(refund.status).toLowerCase()) ? amount(refund.amount) : 0;
}

function selectedOrders(
  rows: unknown[],
  filter: GlobalDashboardFilter,
  storeByOrder: Map<string, string>,
  start: Date,
  end: Date
): JsonRecord[] {
  return rows.map(record).filter((order) => {
    if (!inRange(order.created_at, start, end)) return false;
    if (filter.storeId && storeByOrder.get(text(order.id)) !== filter.storeId) return false;
    return true;
  });
}

function selectedRelatedRows(
  rows: unknown[],
  orderIds: Set<string>,
  dateField: string,
  start: Date,
  end: Date
): JsonRecord[] {
  return rows.map(record).filter((row) => orderIds.has(text(row.order_id)) && inRange(row[dateField], start, end));
}

function formatDayLabel(key: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Makassar"
  }).format(startOfMakassarDate(key));
}

function buildTrend(
  orders: JsonRecord[],
  payments: JsonRecord[],
  filter: GlobalDashboardFilter
): DashboardTrendPoint[] {
  const start = new Date(filter.start);
  const end = new Date(filter.end);
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));
  const bucketSize = durationDays > 14 ? 5 : 1;
  const buckets: DashboardTrendPoint[] = [];

  for (let offset = 0; offset < durationDays; offset += bucketSize) {
    const bucketStart = new Date(start.getTime() + offset * DAY_MS);
    const bucketEnd = new Date(Math.min(end.getTime(), bucketStart.getTime() + bucketSize * DAY_MS));
    const key = makassarDateKey(bucketStart);
    buckets.push({
      key,
      label: bucketSize === 1 ? formatDayLabel(key) : `${formatDayLabel(key)}–${formatDayLabel(makassarDateKey(new Date(bucketEnd.getTime() - 1)))}`,
      orderValue: orders.filter((order) => orderIsValid(order) && inRange(order.created_at, bucketStart, bucketEnd))
        .reduce((sum, order) => sum + amount(order.total_amount), 0),
      paymentValue: payments.filter((payment) => inRange(payment.verified_at, bucketStart, bucketEnd))
        .reduce((sum, payment) => sum + verifiedPaymentAmount(payment), 0)
    });
  }
  return buckets;
}

function buildQueues(
  orders: JsonRecord[],
  payments: JsonRecord[],
  jobOrders: JsonRecord[],
  workItems: JsonRecord[],
  qualityControls: JsonRecord[],
  fulfillments: JsonRecord[],
  now: Date
): DashboardQueueItem[] {
  const activeOrders = orders.filter((order) => !TERMINAL_ORDER_STATUSES.has(text(order.status).toLowerCase()));
  const activeOrderIds = new Set(activeOrders.map((order) => text(order.id)));
  const uniquePendingPayments = new Set(payments
    .filter((payment) => text(payment.status) === "pending")
    .map((payment) => text(payment.order_id))
    .filter(Boolean));
  const awaitingService = activeOrders.filter((order) =>
    text(order.pricing_status) !== "final"
    || ["draft", "sent", "revision_requested"].includes(text(order.custom_quote_status))
  );
  const activeProduction = jobOrders.filter((row) =>
    activeOrderIds.has(text(row.order_id))
    && ["released", "in_progress", "on_hold"].includes(text(row.status))
    && nullableText(row.archived_at) === null
  );
  const activeJobOrderIds = new Set(jobOrders
    .filter((row) => activeOrderIds.has(text(row.order_id)))
    .map((row) => text(row.id)));
  const awaitingQcIds = new Set(workItems.filter((row) =>
    activeJobOrderIds.has(text(row.job_order_id))
    && ["awaiting_qc", "rework"].includes(text(row.status))
    && nullableText(row.archived_at) === null
  ).map((row) => text(row.job_order_id)));
  for (const row of qualityControls) {
    if (
      activeJobOrderIds.has(text(row.job_order_id))
      && ["draft", "in_review"].includes(text(row.status))
      && nullableText(row.archived_at) === null
    ) {
      awaitingQcIds.add(text(row.job_order_id));
    }
  }
  const activeFulfillments = fulfillments.filter((row) => activeOrderIds.has(text(row.order_id)) && nullableText(row.archived_at) === null);
  const lateOrders = new Set(jobOrders.filter((row) => {
    const target = dateValue(row.target_date);
    return activeOrderIds.has(text(row.order_id))
      && target
      && target < now
      && !["completed", "cancelled"].includes(text(row.status))
      && nullableText(row.archived_at) === null;
  }).map((row) => text(row.order_id)));

  return [
    { key: "awaiting_payment", label: "Menunggu Pembayaran", count: activeOrders.filter((row) => ["unpaid", "belum_bayar"].includes(text(row.payment_status))).length, href: "/admin/orders", tone: "amber" },
    { key: "payment_verification", label: "Perlu Verifikasi", count: uniquePendingPayments.size, href: "/admin/payments", tone: "blue" },
    { key: "new_orders", label: "Pesanan Baru", count: activeOrders.filter((row) => ["new", "baru", "under_review", "pending_confirmation"].includes(text(row.status))).length, href: "/admin/orders", tone: "green" },
    { key: "awaiting_service", label: "Menunggu Layanan", count: awaitingService.length, href: "/admin/orders", tone: "violet" },
    { key: "production", label: "Sedang Diproduksi", count: activeProduction.length, href: "/admin/production", tone: "amber" },
    { key: "quality_control", label: "Menunggu QC", count: awaitingQcIds.size, href: "/admin/quality-control", tone: "amber" },
    { key: "ready_to_ship", label: "Siap Dikirim", count: activeFulfillments.filter((row) => text(row.status) === "ready_to_ship").length, href: "/admin/fulfillments", tone: "green" },
    { key: "pickup_waiting", label: "Pickup Menunggu", count: activeFulfillments.filter((row) => text(row.status) === "ready_for_pickup").length, href: "/admin/fulfillments", tone: "blue" },
    { key: "shipping_incomplete", label: "Pengiriman Belum Lengkap", count: activeFulfillments.filter((row) => text(row.status) === "problem" || (text(row.status) === "ready_to_ship" && nullableText(row.final_verified_at) === null)).length, href: "/admin/fulfillments", tone: "red" },
    { key: "overdue_orders", label: "Pesanan Terlambat", count: lateOrders.size, href: "/admin/job-orders", tone: "red" }
  ];
}

function buildOrderTypes(orders: JsonRecord[]): DashboardOrderType[] {
  const config: Array<Omit<DashboardOrderType, "count">> = [
    { key: "ready_stock", label: "Ready Stock", color: "#2f8cff" },
    { key: "instant_custom", label: "Custom Instan", color: "#35c879" },
    { key: "configured_product", label: "Produk Terkonfigurasi", color: "#ffbd45" },
    { key: "custom_project", label: "Full Custom", color: "#d8529d" },
    { key: "legacy_unsupported", label: "Legacy / Belum Terklasifikasi", color: "#7868d9" }
  ];
  return config.map((item) => ({
    ...item,
    count: orders.filter((order) => classifyDashboardOrder(order) === item.key).length
  }));
}

function inventoryCountsByStore(raw: DashboardRawData): Map<string, { out: number }> {
  const locationToStore = new Map<string, string>();
  for (const source of raw.inventoryLocations) {
    const location = record(source);
    const id = nullableText(location.id);
    const storeId = nullableText(location.store_id);
    if (id && storeId && location.active !== false) locationToStore.set(id, storeId);
  }
  const result = new Map<string, { out: number }>();
  for (const source of raw.inventoryBalances) {
    const balance = record(source);
    const storeId = locationToStore.get(text(balance.location_id));
    if (!storeId) continue;
    const current = result.get(storeId) ?? { out: 0 };
    if (Number(balance.available_quantity) === 0) current.out += 1;
    result.set(storeId, current);
  }
  return result;
}

function buildStoreSummaries(
  raw: DashboardRawData,
  orders: JsonRecord[],
  storeByOrder: Map<string, string>
): DashboardStoreSummary[] {
  const storeNames = new Map<string, string>();
  const stores = raw.stores.map(record).map((store) => {
    const id = text(store.id);
    const name = text(store.nama_store) || "Toko";
    storeNames.set(id, name);
    return { id, name, active: store.status_aktif !== false && text(store.status) !== "archived" };
  });
  const inventory = inventoryCountsByStore(raw);
  const fulfillments = raw.fulfillments.map(record);

  const summarize = (id: string | null, name: string, active: boolean): DashboardStoreSummary => {
    const scoped = orders.filter((order) => (storeByOrder.get(text(order.id)) ?? null) === id);
    const scopedIds = new Set(scoped.map((order) => text(order.id)));
    return {
      id,
      name,
      active,
      orderValue: scoped.filter(orderIsValid).reduce((sum, order) => sum + amount(order.total_amount), 0),
      activeOrders: scoped.filter((order) => !TERMINAL_ORDER_STATUSES.has(text(order.status))).length,
      itemsSold: scoped.filter(orderIsValid).reduce((sum, order) => sum + itemRows(order).reduce((itemSum, item) => itemSum + integer(item.quantity), 0), 0),
      pickupWaiting: fulfillments.filter((row) => scopedIds.has(text(row.order_id)) && text(row.status) === "ready_for_pickup").length,
      lowStock: null,
      outOfStock: id ? (inventory.get(id)?.out ?? 0) : 0,
      problemOrders: fulfillments.filter((row) => scopedIds.has(text(row.order_id)) && text(row.status) === "problem").length,
      href: id ? `/admin/store?store=${encodeURIComponent(id)}` : "/admin/orders"
    };
  };

  return [
    ...stores.map((store) => summarize(store.id, store.name, store.active)),
    summarize(null, "Belum Dialokasikan", true)
  ];
}

function buildLatestOrders(
  orders: JsonRecord[],
  payments: JsonRecord[],
  storeByOrder: Map<string, string>,
  stores: unknown[],
  financialVisible: boolean
): DashboardLatestOrder[] {
  const storeNames = new Map(stores.map(record).map((store) => [text(store.id), text(store.nama_store) || "Toko"]));
  const paidByOrder = new Map<string, number>();
  for (const payment of payments) {
    const orderId = text(payment.order_id);
    paidByOrder.set(orderId, (paidByOrder.get(orderId) ?? 0) + verifiedPaymentAmount(payment));
  }
  const typeLabels: Record<DashboardOrderType["key"], string> = {
    ready_stock: "Ready Stock",
    instant_custom: "Custom Instan",
    configured_product: "Produk Terkonfigurasi",
    custom_project: "Full Custom",
    legacy_unsupported: "Belum Terklasifikasi"
  };
  return [...orders]
    .sort((left, right) => (dateValue(right.created_at)?.getTime() ?? 0) - (dateValue(left.created_at)?.getTime() ?? 0))
    .slice(0, 5)
    .map((order) => {
      const storeId = storeByOrder.get(text(order.id));
      return {
        id: text(order.id),
        orderNumber: text(order.order_number) || "—",
        customerName: text(order.customer_name) || "Pelanggan",
        storeName: storeId ? (storeNames.get(storeId) ?? "Toko") : "Belum dialokasikan",
        typeLabel: typeLabels[classifyDashboardOrder(order)],
        total: financialVisible ? amount(order.total_amount) : null,
        paid: financialVisible ? (paidByOrder.get(text(order.id)) ?? 0) : null,
        paymentStatus: text(order.payment_status),
        orderStatus: text(order.status),
        createdAt: text(order.created_at),
        href: `/admin/orders/${encodeURIComponent(text(order.id))}`
      };
    });
}

function productHasImage(product: JsonRecord): boolean {
  return Boolean(
    nullableText(product.image_url)
    || nullableText(product.gambar_url)
    || array(product.gallery_urls).some((value) => nullableText(value))
  );
}

function buildAlerts(raw: DashboardRawData): DashboardAlert[] {
  const products = raw.products.map(record);
  const activeProducts = products.filter((row) =>
    row.status_aktif !== false && !["archived", "inactive"].includes(text(row.status))
  );
  const draftBefore = Date.now() - 7 * DAY_MS;
  const outOfStock = raw.inventoryBalances.map(record)
    .filter((row) => Number(row.available_quantity) === 0).length;
  let variantMissingPrice = 0;
  for (const product of activeProducts) {
    const baseAvailable = [product.base_price, product.price, product.harga].some((value) =>
      value !== null
      && typeof value !== "undefined"
      && value !== ""
      && Number.isFinite(Number(value))
      && Number(value) >= 0
    );
    for (const variant of array(product.product_variants).map(record)) {
      for (const size of array(variant.product_variant_sizes).map(record)) {
        if (size.is_active !== false && !baseAvailable) variantMissingPrice += 1;
      }
    }
  }
  return [
    { key: "low_stock", label: "Stok Menipis", count: null, note: "Ambang stok rendah belum memiliki authority canonical.", href: "/admin/inventory-operations", tone: "warning" },
    { key: "variant_without_price", label: "Varian Tanpa Harga", count: variantMissingPrice, note: null, href: "/admin/products", tone: "warning" },
    { key: "out_of_stock", label: "Stok Habis", count: outOfStock, note: null, href: "/admin/inventory-operations", tone: "danger" },
    { key: "product_without_photo", label: "Produk Tanpa Foto", count: activeProducts.filter((row) => !productHasImage(row)).length, note: null, href: "/admin/products", tone: "warning" },
    { key: "product_without_sku", label: "Produk Tanpa SKU", count: activeProducts.filter((row) => {
      if (nullableText(row.sku)) return false;
      return !array(row.product_variants).map(record).some((variant) =>
        nullableText(variant.sku)
        || array(variant.product_variant_sizes).map(record).some((size) => nullableText(size.sku))
      );
    }).length, note: null, href: "/admin/products", tone: "warning" },
    { key: "stale_draft", label: "Produk Draft > 7 Hari", count: products.filter((row) => text(row.status) === "draft" && (dateValue(row.updated_at)?.getTime() ?? Date.now()) < draftBefore).length, note: null, href: "/admin/products", tone: "warning" }
  ];
}

export function projectGlobalAdminDashboard(input: {
  raw: DashboardRawData;
  filter: GlobalDashboardFilter;
  now?: Date;
  actor: { displayName: string; roleLabel: string; financialVisible: boolean; storeScopeLocked?: boolean };
}): GlobalAdminDashboardReadModel {
  const now = input.now ?? new Date();
  const currentStart = new Date(input.filter.start);
  const currentEnd = new Date(input.filter.end);
  const previous = previousFilter(input.filter);
  const storeByOrder = receivingStoreByOrder(input.raw.assignments);
  const currentOrders = selectedOrders(input.raw.orders, input.filter, storeByOrder, currentStart, currentEnd);
  const previousOrders = selectedOrders(input.raw.orders, input.filter, storeByOrder, previous.start, previous.end);
  const allScopedOrders = [...currentOrders, ...previousOrders];
  const currentIds = new Set(currentOrders.map((order) => text(order.id)));
  const previousIds = new Set(previousOrders.map((order) => text(order.id)));
  const allIds = new Set(allScopedOrders.map((order) => text(order.id)));
  const currentPayments = selectedRelatedRows(input.raw.payments, currentIds, "verified_at", currentStart, currentEnd);
  const previousPayments = selectedRelatedRows(input.raw.payments, previousIds, "verified_at", previous.start, previous.end);
  const currentRefunds = selectedRelatedRows(input.raw.refunds, currentIds, "sent_at", currentStart, currentEnd);
  const previousRefunds = selectedRelatedRows(input.raw.refunds, previousIds, "sent_at", previous.start, previous.end);
  const financial = input.actor.financialVisible;

  const validCurrentOrders = currentOrders.filter(orderIsValid);
  const validPreviousOrders = previousOrders.filter(orderIsValid);
  const currentOrderValue = validCurrentOrders.reduce((sum, order) => sum + amount(order.total_amount), 0);
  const previousOrderValue = validPreviousOrders.reduce((sum, order) => sum + amount(order.total_amount), 0);
  const currentPaymentValue = currentPayments.reduce((sum, payment) => sum + verifiedPaymentAmount(payment), 0);
  const previousPaymentValue = previousPayments.reduce((sum, payment) => sum + verifiedPaymentAmount(payment), 0);
  const currentRefundValue = currentRefunds.reduce((sum, refund) => sum + finalRefundAmount(refund), 0);
  const previousRefundValue = previousRefunds.reduce((sum, refund) => sum + finalRefundAmount(refund), 0);
  const currentItems = validCurrentOrders.reduce((sum, order) => sum + itemRows(order).reduce((itemSum, item) => itemSum + integer(item.quantity), 0), 0);
  const previousItems = validPreviousOrders.reduce((sum, order) => sum + itemRows(order).reduce((itemSum, item) => itemSum + integer(item.quantity), 0), 0);
  const operationalRows = (rows: unknown[]) => rows.map(record).filter((row) => allIds.has(text(row.order_id)));

  return {
    projectedAt: now.toISOString(),
    actor: { displayName: input.actor.displayName, roleLabel: input.actor.roleLabel },
    filter: input.filter,
    availableStores: input.raw.stores.map(record).map((store) => ({
      id: text(store.id),
      name: text(store.nama_store) || "Toko",
      active: store.status_aktif !== false && text(store.status) !== "archived"
    })).filter((store) => store.id && (
      !input.actor.storeScopeLocked || store.id === input.filter.storeId
    )),
    kpis: {
      orderValue: aggregateMetric(currentOrderValue, previousOrderValue, financial),
      paymentReceived: aggregateMetric(currentPaymentValue, previousPaymentValue, financial),
      remainingPayment: aggregateMetric(Math.max(0, currentOrderValue - currentPaymentValue - currentRefundValue), Math.max(0, previousOrderValue - previousPaymentValue - previousRefundValue), financial),
      orderCount: aggregateMetric(validCurrentOrders.length, validPreviousOrders.length),
      averageOrder: aggregateMetric(validCurrentOrders.length ? currentOrderValue / validCurrentOrders.length : 0, validPreviousOrders.length ? previousOrderValue / validPreviousOrders.length : 0, financial),
      itemsSold: aggregateMetric(currentItems, previousItems)
    },
    queues: buildQueues(
      currentOrders,
      input.raw.payments.map(record).filter((row) => currentIds.has(text(row.order_id))),
      operationalRows(input.raw.jobOrders),
      input.raw.workItems.map(record),
      input.raw.qualityControls.map(record),
      operationalRows(input.raw.fulfillments),
      now
    ),
    trend: buildTrend(currentOrders, currentPayments, input.filter),
    orderTypes: buildOrderTypes(validCurrentOrders),
    storeSummaries: buildStoreSummaries(input.raw, currentOrders, storeByOrder),
    latestOrders: buildLatestOrders(currentOrders, input.raw.payments.map(record), storeByOrder, input.raw.stores, financial),
    alerts: buildAlerts(input.raw),
    issues: input.raw.issues
  };
}
