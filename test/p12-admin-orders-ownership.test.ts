import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdminOrderReadModelError,
  projectAdminOrderDetailReadModel,
  projectAdminOrderListReadModel
} from "@/lib/admin-orders/read-model";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("P12 Admin Orders ownership", () => {
  it("projects the list through a typed server read model and ignores cancelled fulfillment", () => {
    const model = projectAdminOrderListReadModel([{
      id: "order-1",
      order_number: "ORD-DEB-2026-0001",
      customer_name: "Customer",
      company_name: null,
      status: "processing",
      pricing_status: "final",
      payment_status: "paid",
      total_amount: "150000",
      created_at: "2026-07-20T00:00:00.000Z",
      updated_at: "2026-07-21T00:00:00.000Z",
      fulfillments: [
        { status: "cancelled", created_at: "2026-07-23T00:00:00.000Z", archived_at: null },
        { status: "in_transit", created_at: "2026-07-22T00:00:00.000Z", archived_at: null }
      ]
    }], "2026-07-24T00:00:00.000Z");

    expect(model).toEqual({
      orders: [{
        id: "order-1",
        order_number: "ORD-DEB-2026-0001",
        customer_name: "Customer",
        company_name: null,
        status: "processing",
        pricing_status: "final",
        payment_status: "paid",
        fulfillment_status: "in_transit",
        total_amount: 150000,
        created_at: "2026-07-20T00:00:00.000Z",
        updated_at: "2026-07-21T00:00:00.000Z"
      }],
      projected_at: "2026-07-24T00:00:00.000Z"
    });
  });

  it("selects one consistent order/payment/fulfillment/tracking/pricing projection", () => {
    const orderSourceSnapshot = { checkout: { version: 5 } };
    const linePricingSnapshot = { currency: "IDR", unitPrice: 150000, source: "server" };
    const graph = {
      id: "order-1",
      order_number: "ORD-DEB-2026-0001",
      quotation_id: null,
      customer_name: "Customer",
      company_name: null,
      customer_phone: "081234567890",
      customer_email: null,
      shipping_address: "Makassar",
      delivery_method: "delivery",
      customer_notes: "",
      admin_notes: "",
      status: "completed",
      pricing_status: "final",
      custom_quote_status: null,
      custom_project_snapshot: [],
      source_snapshot: orderSourceSnapshot,
      subtotal_amount: 150000,
      total_amount: 150000,
      payment_required_amount: 150000,
      payment_effective_total: 150000,
      payment_balance: 0,
      payment_method: "bank_transfer",
      payment_status: "paid",
      payment_production_eligible: true,
      payment_requirement_met: true,
      currency: "IDR",
      converted_at: null,
      archived_at: null,
      checkout_source: "public_checkout",
      whatsapp_confirmed_at: "2026-07-20T01:00:00.000Z",
      created_at: "2026-07-20T00:00:00.000Z",
      updated_at: "2026-07-23T00:00:00.000Z",
      order_items: [
        {
          id: "item-1",
          product_name: "Snapshot Product",
          variant_name: "Snapshot Variant",
          color: "Black",
          size: "L",
          sku: "SNAP-L",
          quantity: 1,
          unit_price: 150000,
          subtotal: 150000,
          notes: "",
          config_snapshot: {},
          required_services: [],
          estimated_total: null,
          pricing_status: "confirmed",
          custom_project_id: null,
          custom_project_item_id: null,
          pricing_snapshot: linePricingSnapshot,
          created_at: "2026-07-20T00:01:00.000Z",
          archived_at: null
        },
        {
          id: "archived-item",
          product_name: "Archived",
          quantity: 1,
          unit_price: 1,
          subtotal: 1,
          pricing_status: "final",
          created_at: "2026-07-20T00:00:00.000Z",
          archived_at: "2026-07-21T00:00:00.000Z"
        }
      ],
      order_payments: [
        {
          id: "payment-old",
          payment_number: "PAY-OLD",
          amount: 100000,
          verified_amount: 100000,
          status: "verified",
          review_outcome: "verified",
          updated_at: "2026-07-21T00:00:00.000Z",
          created_at: "2026-07-21T00:00:00.000Z",
          archived_at: null
        },
        {
          id: "payment-latest",
          payment_number: "PAY-LATEST",
          amount: 50000,
          verified_amount: 50000,
          status: "verified",
          review_outcome: "verified",
          updated_at: "2026-07-22T00:00:00.000Z",
          created_at: "2026-07-22T00:00:00.000Z",
          archived_at: null
        }
      ],
      fulfillments: [
        {
          id: "fulfillment-1",
          method: "shipping",
          status: "in_transit",
          courier: "JNE",
          tracking_number: "JNE-123",
          final_verified_at: null,
          updated_at: "2026-07-24T00:00:00.000Z",
          created_at: "2026-07-23T00:00:00.000Z",
          archived_at: null
        }
      ],
      job_orders: [{
        id: "job-1",
        status: "completed",
        updated_at: "2026-07-22T00:00:00.000Z",
        created_at: "2026-07-21T00:00:00.000Z",
        archived_at: null,
        qc_records: [{
          id: "qc-1",
          status: "completed",
          result: "pass",
          updated_at: "2026-07-22T12:00:00.000Z",
          created_at: "2026-07-22T12:00:00.000Z",
          archived_at: null
        }]
      }]
    };

    const model = projectAdminOrderDetailReadModel(graph, "2026-07-24T01:00:00.000Z");

    expect(model).not.toBeNull();
    expect(model?.latest_payment?.id).toBe("payment-latest");
    expect(model?.fulfillment).toMatchObject({
      status: "in_transit",
      courier: "JNE",
      tracking_number: "JNE-123"
    });
    expect(model?.items).toHaveLength(1);
    expect(model?.items[0]).toMatchObject({
      pricing_status: "confirmed",
      pricing_snapshot: linePricingSnapshot
    });
    expect(model?.order.source_snapshot).toEqual(orderSourceSnapshot);
    expect(model?.active_stage.activeStage).toBe("shipping");
    expect(model?.active_stage.warning).toContain("fulfillment belum delivered");
    expect(model?.revision).toBe("2026-07-24T00:00:00.000Z");
    expect(graph.order_items[0].pricing_snapshot).toEqual(linePricingSnapshot);
  });

  it("fails closed for an unknown order pricing status", () => {
    expect(() => projectAdminOrderListReadModel([{
      id: "order-1",
      order_number: "ORD-1",
      customer_name: "Customer",
      status: "processing",
      pricing_status: "legacy_guess",
      total_amount: 1,
      created_at: "2026-07-20T00:00:00.000Z",
      updated_at: "2026-07-20T00:00:00.000Z",
      fulfillments: []
    }])).toThrow(AdminOrderReadModelError);
  });

  it("keeps database reads and commands behind authenticated server boundaries", () => {
    const listClient = read("components/admin/OrderListAdmin.tsx");
    const commandCenter = read("components/admin/OrderCommandCenterAdmin.tsx");
    const detailClient = read("components/admin/OrderDetailAdmin.tsx");
    const listRoute = read("app/api/admin/orders/route.ts");
    const detailRoute = read("app/api/admin/orders/[id]/route.ts");
    const dataAccess = read("lib/admin-orders/data-access.ts");

    for (const client of [listClient, commandCenter, detailClient]) {
      expect(client).not.toContain("createSupabaseClient");
      expect(client).not.toContain('.from("orders")');
      expect(client).not.toContain('.from("order_items")');
    }
    expect(listRoute).toContain('requirePhase13Actor(request, "order.read")');
    expect(detailRoute).toContain('requirePhase13Actor(request, "order.read")');
    expect(detailRoute).toContain('requirePhase13Actor(request, "order.edit")');
    expect(listRoute).toContain("loadAdminOrderListPage(actor.client)");
    expect(detailRoute).toContain("loadAdminOrderDetailPage(actor.client, id)");
    expect(listRoute).not.toContain("actor.adminClient");
    expect(detailRoute).not.toContain("actor.adminClient");
    expect(dataAccess).toContain('import "server-only"');
    expect(dataAccess).toContain("pricing_snapshot");
    expect(dataAccess).toContain("source_snapshot");
    expect(dataAccess).not.toContain("public_access_token_hash");
    expect(dataAccess).not.toContain("proof_path");
  });
});
