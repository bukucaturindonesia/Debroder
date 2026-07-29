import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTRACT_VERSIONS } from "@/lib/contracts";
import { parsePublicCheckoutRequest } from "@/lib/commerce-checkout";

const PRODUCT_ID = "10000000-0000-4000-8000-000000001010";
const FINGERPRINT = "a".repeat(64);

function configuredCheckout() {
  return {
    idempotencyKey: "configured-checkout-0001",
    accessToken: "a".repeat(64),
    confirmationCode: "ABC12345",
    customer: {
      name: "Configured Customer",
      phone: "081234567890"
    },
    fulfillment: {
      method: "pickup",
      pickupLocationId: "20000000-0000-4000-8000-000000001010",
      paymentMethod: "bank_transfer"
    },
    items: [],
    customProjects: [],
    configuredItems: [{
      lineId: "configured-line-1",
      productId: PRODUCT_ID,
      snapshotId: "configured-snapshot-1",
      inputFingerprint: FINGERPRINT,
      draft: {
        contractVersion: CONTRACT_VERSIONS.configuredProduct,
        id: "configured-draft-1",
        definitionId: PRODUCT_ID,
        definitionVersion: "jersey-v1-fixture",
        quantity: 6,
        selections: [],
        allocations: [{
          id: "allocation-s",
          dimensions: { size: "S" },
          quantity: 6
        }],
        services: [],
        uploads: [],
        createdAt: "2026-07-29T00:00:00.000Z",
        updatedAt: "2026-07-29T00:00:00.000Z"
      }
    }]
  };
}

describe("Bab 9 configured Jersey checkout closure", () => {
  it("accepts one configured mode without accepting any client monetary field", () => {
    const input = configuredCheckout();
    const parsed = parsePublicCheckoutRequest(input);

    expect(parsed?.items).toEqual([]);
    expect(parsed?.customProjects).toEqual([]);
    expect(parsed?.configuredItems).toHaveLength(1);
    expect(JSON.stringify(parsed?.configuredItems)).not.toMatch(
      /unitPrice|unit_price|subtotal|grandTotal|base_price/
    );

    expect(parsePublicCheckoutRequest({
      ...input,
      configuredItems: [{
        ...input.configuredItems[0],
        price: 1
      }]
    })).toBeNull();
    expect(parsePublicCheckoutRequest({
      ...input,
      items: [{
        variantSizeId: "30000000-0000-4000-8000-000000001010",
        quantity: 1
      }]
    })).toBeNull();
  });

  it("revalidates the draft and exact fingerprint on the server before the configured RPC", () => {
    const route = read("app/api/checkout/route.ts");
    const client = read("components/checkout/CheckoutClient.tsx");

    expect(route).toContain("readJerseyConfiguredProductDefinition");
    expect(route).toContain("validateJerseyConsumerDraft");
    expect(route).toContain("resolveConfiguredProductOnServer");
    expect(route).toContain("priceJerseyConfiguredProduct");
    expect(route).toContain(
      "resolved.pricingInput.inputFingerprint !== entry.inputFingerprint"
    );
    expect(route).toContain('"create_public_configured_checkout_order"');
    expect(client).not.toContain(
      "cart.checkoutDecision.allowed || configuredItems.length > 0"
    );
    expect(client).toContain("configuredItems: configuredItems");
  });

  it("creates an unpaid idempotent order first and persists immutable configured/pricing snapshots", () => {
    const migration = read(
      "supabase/migrations/20260729033931_configured_jersey_checkout_v1.sql"
    ).toLowerCase();
    const payment = read(
      "supabase/migrations/20260719140000_payment_verification_and_fulfillment.sql"
    ).toLowerCase();

    expect(migration).toContain(
      "create or replace function public.create_public_configured_checkout_order"
    );
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("'unpaid'");
    expect(migration).toContain(
      "'configured_product',snapshot_value"
    );
    expect(migration).toContain("snapshot_value->'pricing'");
    expect(migration).toContain(
      "item_subtotal <> (snapshot_value#>>'{pricing,totals,grandtotal,amount}')::bigint"
    );
    expect(migration).not.toContain("insert into public.order_payments");
    expect(migration).toContain(
      "revoke all on function public.create_public_configured_checkout_order"
    );
    expect(migration).toContain("to service_role");

    expect(payment).toContain("p_idempotency_key text");
    expect(payment).toContain(
      "where submission_idempotency_key=p_idempotency_key"
    );
    expect(payment).toContain("result_payment.order_id<>link_row.order_id");
    expect(payment).toContain(
      "update public.orders\n  set payment_status='pending_verification'"
    );
  });

  it("records nine nonempty provisional primary-image assets without web hotlinks", () => {
    const manifest = JSON.parse(
      read("data/provisional-product-image-mappings.json")
    ) as {
      summary: {
        expected: number;
        assigned: number;
        provisional: number;
        webSourced: number;
      };
      mappings: Array<{
        destination: string;
        publicUrl: string;
        altText: string;
      }>;
    };

    expect(manifest.summary).toEqual({
      expected: 9,
      assigned: 9,
      provisional: 9,
      webSourced: 0
    });
    expect(manifest.mappings).toHaveLength(9);
    for (const mapping of manifest.mappings) {
      expect(mapping.publicUrl).toMatch(/^\/products\//);
      expect(mapping.publicUrl).not.toMatch(/^\/public\//);
      expect(mapping.altText.trim().length).toBeGreaterThan(0);
      expect(statSync(join(process.cwd(), mapping.destination)).size).toBeGreaterThan(0);
    }
  });

  it("resolves trigger record fields by table without removing the service guard", () => {
    const migration = read(
      "supabase/migrations/20260729045016_ready_stock_fulfillment_trigger_record_fix_v1.sql"
    ).toLowerCase();

    expect(migration).toContain("if tg_table_name = 'orders' then");
    expect(migration).toContain("target_order_id := new.id");
    expect(migration).toContain(
      "elsif tg_table_name in ('order_items', 'stock_reservations') then"
    );
    expect(migration).toContain("target_order_id := new.order_id");
    expect(migration).not.toContain("target_order_id := case");
    expect(migration).toContain("jsonb_array_length");
  });
});

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}
