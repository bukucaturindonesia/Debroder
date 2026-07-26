import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  classifyDashboardOrder,
  normalizeGlobalDashboardFilter,
  projectGlobalAdminDashboard,
  type DashboardRawData
} from "@/lib/global-admin-dashboard/domain";

const now = new Date("2026-07-26T04:00:00.000Z");
const storeA = "11111111-1111-4111-8111-111111111111";
const storeB = "22222222-2222-4222-8222-222222222222";

function raw(overrides: Partial<DashboardRawData> = {}): DashboardRawData {
  return {
    orders: [
      {
        id: "order-current",
        order_number: "DBR-001",
        customer_name: "Pelanggan Aman",
        customer_phone: "SECRET-MUST-NOT-LEAK",
        status: "under_review",
        payment_status: "unpaid",
        pricing_status: "final",
        custom_quote_status: null,
        total_amount: 200_000,
        created_at: "2026-07-26T02:00:00.000Z",
        updated_at: "2026-07-26T02:00:00.000Z",
        archived_at: null,
        custom_project_snapshot: [],
        order_items: [
          { id: "item-1", quantity: 2, sku: "SKU-A", variant_size_id: "size-1", custom_project_id: null, config_snapshot: {}, archived_at: null }
        ]
      },
      {
        id: "order-previous",
        order_number: "DBR-000",
        customer_name: "Pelanggan Lama",
        status: "completed",
        payment_status: "paid",
        pricing_status: "final",
        custom_quote_status: null,
        total_amount: 100_000,
        created_at: "2026-07-25T02:00:00.000Z",
        updated_at: "2026-07-25T02:00:00.000Z",
        archived_at: null,
        custom_project_snapshot: [],
        order_items: [
          { id: "item-0", quantity: 1, sku: "SKU-B", variant_size_id: "size-2", custom_project_id: null, config_snapshot: {}, archived_at: null }
        ]
      },
      {
        id: "order-cancelled",
        order_number: "DBR-X",
        customer_name: "Tidak Dihitung",
        status: "cancelled",
        payment_status: "unpaid",
        pricing_status: "final",
        total_amount: 999_000,
        created_at: "2026-07-26T03:00:00.000Z",
        updated_at: "2026-07-26T03:00:00.000Z",
        archived_at: null,
        custom_project_snapshot: [],
        order_items: [
          { id: "item-x", quantity: 99, sku: "SKU-X", variant_size_id: "size-x", archived_at: null }
        ]
      }
    ],
    payments: [
      { id: "pay-1", order_id: "order-current", status: "verified", amount: 80_000, verified_amount: 75_000, verified_at: "2026-07-26T03:00:00.000Z", archived_at: null },
      { id: "pay-pending", order_id: "order-current", status: "pending", amount: 20_000, verified_amount: null, verified_at: null, archived_at: null },
      { id: "pay-0", order_id: "order-previous", status: "verified", amount: 50_000, verified_amount: 50_000, verified_at: "2026-07-25T03:00:00.000Z", archived_at: null }
    ],
    refunds: [
      { id: "refund-1", order_id: "order-current", status: "sent", amount: 10_000, sent_at: "2026-07-26T03:30:00.000Z" },
      { id: "refund-draft", order_id: "order-current", status: "under_review", amount: 90_000, sent_at: "2026-07-26T03:40:00.000Z" }
    ],
    assignments: [
      { order_id: "order-current", receiving_store_id: storeA },
      { order_id: "order-previous", receiving_store_id: storeA },
      { order_id: "order-cancelled", receiving_store_id: storeB }
    ],
    stores: [
      { id: storeA, nama_store: "Toko A", status_aktif: true, status: "published" },
      { id: storeB, nama_store: "Toko B", status_aktif: true, status: "published" }
    ],
    inventoryLocations: [{ id: "location-a", store_id: storeA, active: true }],
    inventoryBalances: [
      { location_id: "location-a", variant_size_id: "size-1", available_quantity: 0 },
      { location_id: "location-a", variant_size_id: "size-2", available_quantity: 3 }
    ],
    products: [
      {
        id: "product-1",
        sku: null,
        image_url: null,
        gambar_url: null,
        gallery_urls: [],
        base_price: null,
        price: null,
        harga: null,
        status: "active",
        status_aktif: true,
        updated_at: "2026-07-01T00:00:00.000Z",
        product_variants: [{ id: "variant-1", sku: null, is_active: true, product_variant_sizes: [{ id: "size-1", sku: null, is_active: true }] }]
      }
    ],
    jobOrders: [{ id: "job-1", order_id: "order-current", status: "in_progress", target_date: "2026-07-25", archived_at: null }],
    workItems: [{ id: "work-1", job_order_id: "job-1", status: "awaiting_qc", archived_at: null }],
    qualityControls: [{ id: "qc-1", job_order_id: "job-1", status: "draft", archived_at: null }],
    fulfillments: [{ id: "fulfillment-1", order_id: "order-current", status: "ready_to_ship", final_verified_at: null, archived_at: null }],
    issues: [],
    ...overrides
  };
}

function project(inputRaw = raw(), storeId: string | null = null, financialVisible = true) {
  return projectGlobalAdminDashboard({
    raw: inputRaw,
    filter: {
      period: "today",
      start: "2026-07-25T16:00:00.000Z",
      end: "2026-07-26T16:00:00.000Z",
      storeId
    },
    now,
    actor: { displayName: "Owner", roleLabel: "Owner", financialVisible }
  });
}

describe("Global Admin Dashboard domain", () => {
  it("normalizes Makassar date ranges and rejects unsafe store input", () => {
    expect(normalizeGlobalDashboardFilter({ period: "today", store: "not-a-uuid" }, now)).toEqual({
      period: "today",
      start: "2026-07-25T16:00:00.000Z",
      end: "2026-07-26T16:00:00.000Z",
      storeId: null
    });
    const custom = normalizeGlobalDashboardFilter({
      period: "custom",
      start: "2026-01-01",
      end: "2026-12-31",
      store: storeA
    }, now);
    expect(custom.storeId).toBe(storeA);
    expect((new Date(custom.end).getTime() - new Date(custom.start).getTime()) / 86_400_000).toBe(90);
  });

  it("uses canonical verified payments and final refunds for KPIs", () => {
    const model = project();
    expect(model.kpis.orderValue.value).toBe(200_000);
    expect(model.kpis.paymentReceived.value).toBe(75_000);
    expect(model.kpis.remainingPayment.value).toBe(115_000);
    expect(model.kpis.orderCount.value).toBe(1);
    expect(model.kpis.averageOrder.value).toBe(200_000);
    expect(model.kpis.itemsSold.value).toBe(2);
  });

  it("filters by receiving-store authority and excludes another store", () => {
    const modelA = project(raw(), storeA);
    const modelB = project(raw(), storeB);
    expect(modelA.kpis.orderValue.value).toBe(200_000);
    expect(modelB.kpis.orderValue.value).toBe(0);
    expect(modelB.latestOrders).toHaveLength(1);
    expect(modelB.latestOrders[0]?.orderNumber).toBe("DBR-X");
  });

  it("classifies orders only from canonical discriminators", () => {
    expect(classifyDashboardOrder(raw().orders[0])).toBe("ready_stock");
    expect(classifyDashboardOrder({
      order_items: [{ sku: "SKU", variant_size_id: "size", config_snapshot: { instant_custom: { version: 1 } }, archived_at: null }]
    })).toBe("instant_custom");
    expect(classifyDashboardOrder({
      order_items: [{ config_snapshot: { definitionId: "definition" }, archived_at: null }]
    })).toBe("configured_product");
    expect(classifyDashboardOrder({
      custom_project_snapshot: [{ id: "project" }],
      order_items: []
    })).toBe("custom_project");
    expect(classifyDashboardOrder({ order_items: [{ config_snapshot: {}, archived_at: null }] })).toBe("legacy_unsupported");
  });

  it("maps action queues from canonical statuses", () => {
    const queues = new Map(project().queues.map((queue) => [queue.key, queue.count]));
    expect(queues.get("awaiting_payment")).toBe(1);
    expect(queues.get("payment_verification")).toBe(1);
    expect(queues.get("production")).toBe(1);
    expect(queues.get("quality_control")).toBe(1);
    expect(queues.get("shipping_incomplete")).toBe(1);
    expect(queues.get("overdue_orders")).toBe(1);
  });

  it("hides financial values by role without leaking private fields", () => {
    const model = project(raw(), null, false);
    expect(model.kpis.orderValue).toMatchObject({ value: null, visible: false });
    expect(model.latestOrders[0]).toMatchObject({ total: null, paid: null });
    expect(JSON.stringify(model)).not.toContain("SECRET-MUST-NOT-LEAK");
  });

  it("keeps low-stock unavailable until a canonical threshold exists", () => {
    const model = project();
    expect(model.alerts.find((alert) => alert.key === "low_stock")).toMatchObject({
      count: null,
      note: "Ambang stok rendah belum memiliki authority canonical."
    });
    expect(model.alerts.find((alert) => alert.key === "out_of_stock")?.count).toBe(1);
    expect(model.alerts.find((alert) => alert.key === "variant_without_price")?.count).toBe(1);
    expect(model.alerts.find((alert) => alert.key === "product_without_photo")?.count).toBe(1);
    expect(model.alerts.find((alert) => alert.key === "product_without_sku")?.count).toBe(1);
  });

  it("keeps data access server-only and protects the API with canonical permission", () => {
    const dataAccess = readFileSync("lib/global-admin-dashboard/data-access.ts", "utf8");
    const useCase = readFileSync("lib/global-admin-dashboard/page-use-case.ts", "utf8");
    const client = readFileSync("components/admin/GlobalAdminDashboard.tsx", "utf8");
    const api = readFileSync("app/api/admin/global-dashboard/route.ts", "utf8");
    expect(dataAccess).toContain('import "server-only"');
    expect(useCase).toContain('import "server-only"');
    expect(client).not.toContain("global-admin-dashboard/data-access");
    expect(client).not.toContain("global-admin-dashboard/page-use-case");
    expect(client).not.toContain("getAdminSupabaseClient");
    expect(api).toContain('requirePhase13Actor(request, "order.read")');
    expect(api).toContain('"cache-control": "private, no-store"');
  });

  it("owns the required responsive and accessible presentation contracts", () => {
    const component = readFileSync("components/admin/GlobalAdminDashboard.tsx", "utf8");
    const styles = readFileSync("app/admin/global-dashboard.css", "utf8");
    expect(styles).toContain("@media (max-width: 1439px)");
    expect(styles).toContain("@media (max-width: 1199px)");
    expect(styles).toContain("@media (max-width: 767px)");
    expect(styles).toContain("@media (max-width: 389px)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(component).toContain('aria-label="KPI utama"');
    expect(component).toContain('aria-labelledby="gad-trend-title gad-trend-desc"');
    expect(component).toContain("<caption>Data tren penjualan dan pembayaran</caption>");
    expect(component).toContain('role="alert"');
  });
});
