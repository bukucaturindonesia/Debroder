import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  projectCustomerOrderServerReadModel,
  toCustomerOrderConfirmationReadModel,
  toCustomerOrderTrackingReadModel
} from "@/lib/customer-orders/read-model";
import {
  customerOrderPollDelay,
  CUSTOMER_ORDER_POLL_INTERVAL_MS,
  CUSTOMER_ORDER_POLL_MAX_INTERVAL_MS,
  shouldPollCustomerOrder
} from "@/lib/customer-orders/polling";

const read = (path: string) => readFileSync(path, "utf8");

function graph(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    order_number: "ORD-DEB-2026-0001",
    customer_name: "Pelanggan Test",
    customer_phone: "6281234567890",
    status: "awaiting_payment",
    payment_status: "unpaid",
    delivery_method: "shipping",
    payment_method: "bank_transfer",
    shipping_address: "Jalan Contoh 123, Makassar",
    subtotal_amount: 200_000,
    shipping_cost: 25_000,
    shipping_courier: "Kurir Test",
    shipping_service: "Reguler",
    shipping_estimate: "2-3 hari",
    total_amount: 225_000,
    payment_effective_total: 0,
    payment_balance: 225_000,
    payment_requirement_met: false,
    payment_production_eligible: false,
    public_access_token_hash: "sensitive-token-hash",
    public_access_token_expires_at: "2026-10-22T00:00:00.000Z",
    whatsapp_confirmation_expires_at: "2026-07-24T02:00:00.000Z",
    whatsapp_confirmed_at: "2026-07-24T01:00:00.000Z",
    reservation_expires_at: "2026-07-25T01:00:00.000Z",
    final_total_approved_at: "2026-07-24T01:00:00.000Z",
    pricing_status: "final",
    custom_project_snapshot: [],
    custom_quote_version: null,
    custom_quote_status: null,
    custom_quote_locked_at: null,
    custom_quote_locked_total: null,
    created_at: "2026-07-24T00:00:00.000Z",
    updated_at: "2026-07-24T01:00:00.000Z",
    archived_at: null,
    order_items: [{
      id: "22222222-2222-4222-8222-222222222222",
      product_name: "Produk Snapshot",
      variant_name: "Varian Snapshot",
      color: "Hitam",
      size: "L",
      sku: "SKU-SNAPSHOT",
      quantity: 2,
      unit_price: 100_000,
      subtotal: 200_000,
      custom_project_id: null,
      pricing_status: "confirmed",
      created_at: "2026-07-24T00:00:00.000Z",
      updated_at: "2026-07-24T00:00:00.000Z",
      archived_at: null
    }],
    stock_reservations: [],
    order_shipping_quotes: [{
      id: "33333333-3333-4333-8333-333333333333",
      version: 1,
      courier: "Kurir Test",
      service: "Reguler",
      cost: 25_000,
      estimate: "2-3 hari",
      total_snapshot: 225_000,
      status: "approved",
      created_at: "2026-07-24T00:30:00.000Z",
      approved_at: "2026-07-24T01:00:00.000Z"
    }],
    custom_order_quotation_versions: [],
    fulfillments: [],
    order_payments: [],
    pickup_preparations: [],
    order_cancellation_requests: [],
    refund_cases: [],
    job_orders: [],
    ...overrides
  };
}

const payment = {
  url: "/payment/example",
  expiresAt: "2026-07-25T00:00:00.000Z",
  unavailableReason: null
};

describe("P13 customer order read model and polling", () => {
  it("projects one typed snapshot for confirmation and tracking without sensitive fields", () => {
    const projection = projectCustomerOrderServerReadModel(
      graph(),
      "2026-07-24T01:05:00.000Z"
    );
    expect(projection).not.toBeNull();
    if (!projection) return;

    const confirmation = toCustomerOrderConfirmationReadModel(projection, payment);
    const tracking = toCustomerOrderTrackingReadModel(projection, payment);

    expect(confirmation).toMatchObject({
      kind: "confirmation",
      terminal: false,
      order: {
        orderNumber: "ORD-DEB-2026-0001",
        customerName: "Pelanggan Test",
        maskedPhone: "6281***890"
      },
      items: [{
        productName: "Produk Snapshot",
        pricingStatus: "confirmed"
      }]
    });
    expect(tracking).toMatchObject({
      kind: "tracking",
      order: {
        maskedPhone: "6281***890",
        maskedAddress: "Jalan Cont***, Makassar"
      },
      shippingQuote: {
        version: 1,
        total: 225_000
      }
    });
    const publicPayload = JSON.stringify({ confirmation, tracking });
    expect(publicPayload).not.toContain("sensitive-token-hash");
    expect(publicPayload).not.toContain("6281234567890");
    expect(publicPayload).not.toContain("Jalan Contoh 123, Makassar");
  });

  it("fails closed for unknown transaction-critical pricing state", () => {
    expect(() => projectCustomerOrderServerReadModel(
      graph({ pricing_status: "mystery_price" })
    )).toThrow("Status harga order pelanggan tidak dikenali.");
  });

  it("polls only a visible online non-terminal order and backs off after failure", () => {
    expect(shouldPollCustomerOrder({
      terminal: false,
      visible: true,
      online: true
    })).toBe(true);
    expect(shouldPollCustomerOrder({
      terminal: true,
      visible: true,
      online: true
    })).toBe(false);
    expect(shouldPollCustomerOrder({
      terminal: false,
      visible: false,
      online: true
    })).toBe(false);
    expect(shouldPollCustomerOrder({
      terminal: false,
      visible: true,
      online: false
    })).toBe(false);
    expect(customerOrderPollDelay(0)).toBe(CUSTOMER_ORDER_POLL_INTERVAL_MS);
    expect(customerOrderPollDelay(1)).toBe(60_000);
    expect(customerOrderPollDelay(8)).toBe(CUSTOMER_ORDER_POLL_MAX_INTERVAL_MS);
  });

  it("keeps authorization server-side and exposes explicit loading, retry, stale and not-found states", () => {
    const confirmationRoute = read("app/api/public/orders/[token]/route.ts");
    const trackingRoute = read("app/api/public/order-tracking/route.ts");
    const dataAccess = read("lib/customer-orders/data-access.ts");
    const polling = read("components/customer-order/useCustomerOrderPolling.ts");
    const feedback = read("components/customer-order/CustomerOrderReadFeedback.tsx");
    const confirmation = read("components/checkout/OrderConfirmationClient.tsx");
    const tracking = read("components/tracking/GuestOrderTracking.tsx");

    expect(dataAccess).toContain('import "server-only"');
    expect(confirmationRoute).toContain("validTrackingToken");
    expect(confirmationRoute).toContain("sha256(token)");
    expect(trackingRoute).toContain("authorizeGuestTracking");
    expect(trackingRoute).toContain("CUSTOMER_ORDER_ACCESS_DENIED");
    expect(confirmationRoute).toContain("CUSTOMER_ORDER_NOT_FOUND");
    expect(dataAccess).not.toContain("proof_path");
    expect(dataAccess).not.toContain("admin_notes");

    expect(polling).toContain('document.addEventListener("visibilitychange"');
    expect(polling).toContain('window.addEventListener("online"');
    expect(polling).toContain("navigator.onLine");
    expect(polling).toContain("current.terminal");
    expect(polling).not.toContain("setInterval");
    expect(polling).toContain("snapshot terakhir");
    expect(feedback).toContain("Pesanan tidak ditemukan");
    expect(feedback).toContain("Coba Lagi");
    expect(confirmation).toContain("<CustomerOrderStaleWarning");
    expect(tracking).toContain("<CustomerOrderStaleWarning");
  });

  it("uses one nested graph and avoids suspicious-access counting for valid polling", () => {
    const confirmationRoute = read("app/api/public/orders/[token]/route.ts");
    const trackingRoute = read("app/api/public/order-tracking/route.ts");
    const dataAccess = read("lib/customer-orders/data-access.ts");
    expect(dataAccess).toContain("order_items(");
    expect(dataAccess).toContain("order_payments(");
    expect(dataAccess).toContain("fulfillments(");
    expect(dataAccess).toContain("job_orders(");
    expect(trackingRoute.indexOf("authorizeGuestTracking")).toBeLessThan(
      trackingRoute.indexOf("denyTrackingAccess({")
    );
    expect(trackingRoute).not.toContain('rpc("resolve_order_active_stage_v1"');
    expect(confirmationRoute.indexOf("isExpired(projection.authorization")).toBeLessThan(
      confirmationRoute.indexOf("completeCustomerOrderConfirmationPage(client, projection)")
    );
  });
});
