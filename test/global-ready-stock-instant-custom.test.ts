import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createInstantCustomSnapshot,
  priceInstantServices,
  type InstantServiceDefinition
} from "@/lib/instant-custom";
import {
  applyReadyStockRevalidation,
  createReadyStockCartItem,
  getCartCheckoutDecision,
  readPersistedCartV5,
  serializeCartV5
} from "@/lib/cart-v5";
import { parsePublicCheckoutRequest } from "@/lib/commerce-checkout";

const service: InstantServiceDefinition = {
  id: "220730fd-f627-4153-bc85-8df8f33d4094",
  code: "tambah-nama",
  name: "Tambah nama",
  description: null,
  pricingType: "fixed_per_item",
  basePrice: 10_000,
  minimumQuantity: 1,
  maximumQuantity: null,
  requiresUpload: false,
  requiresNotes: true,
  inputSchema: [{
    key: "name",
    label: "Nama yang dicetak",
    type: "text",
    required: true,
    maxLength: 80
  }],
  sortOrder: 1,
  updatedAt: "2026-07-26T00:00:00.000Z",
  pricingRules: []
};

const selection = {
  serviceId: service.id,
  inputs: { name: "DEBRODER" },
  uploadIds: [],
  note: "Cetak di bagian belakang"
};

describe("global Ready Stock and Instant Custom contract", () => {
  it("prices reusable service per item and rejects missing required input", () => {
    const priced = priceInstantServices([service], [selection], 3);
    expect(priced).toMatchObject({ ok: true, serviceTotal: 30_000 });
    expect(priceInstantServices([service], [{ ...selection, inputs: {} }], 3)).toMatchObject({
      ok: false,
      code: "INSTANT_SERVICE_INPUT_REQUIRED"
    });
  });

  it("requires a private upload reference when the service requires a file", () => {
    const uploadService = { ...service, requiresUpload: true };
    expect(priceInstantServices([uploadService], [selection], 1)).toMatchObject({
      ok: false,
      code: "INSTANT_SERVICE_UPLOAD_REQUIRED"
    });
  });

  it("serializes and restores an Instant Custom snapshot inside Cart v5", () => {
    const priced = priceInstantServices([service], [selection], 2);
    if (!priced.ok) throw new Error(priced.message);
    const instantCustom = createInstantCustomSnapshot([selection], priced, "2026-07-26T00:00:00.000Z");
    const item = createReadyStockCartItem({
      lineId: "line-1",
      quantity: 2,
      productId: "11111111-1111-4111-8111-111111111111",
      variantId: "22222222-2222-4222-8222-222222222222",
      variantSizeId: "33333333-3333-4333-8333-333333333333",
      sku: "QA-SKU",
      display: { title: "QA product" },
      ui: { name: "QA product", color: "Black", size: "M", priceValue: 100_000 },
      instantCustom
    });
    const restored = readPersistedCartV5(serializeCartV5([item]));
    expect(restored?.cart.lines[0]).toMatchObject({
      lineType: "ready_stock",
      instantCustom: { version: 1, requiresService: true, serviceTotal: 20_000 }
    });
    expect(getCartCheckoutDecision(restored?.cart.lines ?? [])).toMatchObject({
      allowed: false,
      code: "CART_REVALIDATION_REQUIRED"
    });
    const validated = applyReadyStockRevalidation(restored?.cart.lines ?? [], [{
      product_variant_size_id: "33333333-3333-4333-8333-333333333333",
      status: "ok",
      error_code: null,
      latest_unit_price: 100_000,
      stock_available: 5,
      message: null,
      instant_custom_snapshot: instantCustom
    }], "2026-07-26T00:01:00.000Z");
    expect(getCartCheckoutDecision(validated.lines)).toMatchObject({
      allowed: true,
      mode: "ready_stock"
    });
  });

  it("accepts service selections in checkout but never accepts a client price", () => {
    const parsed = parsePublicCheckoutRequest({
      idempotencyKey: "checkout_key_123456",
      accessToken: "a".repeat(32),
      confirmationCode: "ABC12345",
      customer: { name: "QA Owner", phone: "08123456789" },
      fulfillment: {
        method: "pickup",
        pickupLocationId: "44444444-4444-4444-8444-444444444444",
        paymentMethod: "bank_transfer"
      },
      items: [{
        variantSizeId: "33333333-3333-4333-8333-333333333333",
        quantity: 2,
        services: [{ ...selection, price: 1 }]
      }]
    });
    expect(parsed?.items[0].services?.[0]).toEqual(selection);
    expect(parsed?.items[0].services?.[0]).not.toHaveProperty("price");
  });

  it("keeps Full Custom separate and uses a server-only checkout RPC", () => {
    const page = readFileSync("app/produk/[slug]/page.tsx", "utf8");
    const api = readFileSync("app/api/checkout/route.ts", "utf8");
    const migration = readFileSync(
      "supabase/migrations/20260726160000_global_ready_stock_instant_custom_v1.sql",
      "utf8"
    );
    expect(page).toContain("Full Custom Jersey melalui Configurator");
    expect(api).toContain("create_public_instant_checkout_order");
    expect(migration).toMatch(/pricing_snapshot\s*=\s*jsonb_build_object/);
    expect(migration).toContain("revoke all on function public.create_public_instant_checkout_order");
    expect(migration).not.toContain("disable row level security");
  });

  it("wires service-bearing orders into operations and protects public stock aggregation", () => {
    const operationsMigration = readFileSync(
      "supabase/migrations/20260726162000_instant_custom_operations_alignment_v1.sql",
      "utf8"
    );
    const inventoryMigration = readFileSync(
      "supabase/migrations/20260726164000_public_canonical_inventory_availability_v1.sql",
      "utf8"
    );
    expect(operationsMigration).toContain("order_item_services");
    expect(operationsMigration).toContain("must enter the existing Job Order / Work Item path");
    expect(operationsMigration).toContain("jsonb_array_length(coalesce(oi.required_services");
    expect(inventoryMigration).toContain("sum(balance.on_hand_quantity - balance.reserved_quantity)");
    expect(inventoryMigration).toContain("returns table(variant_size_id uuid, available integer)");
    expect(inventoryMigration).not.toContain("service_role_key");
    expect(inventoryMigration).not.toContain("disable row level security");
  });
});
