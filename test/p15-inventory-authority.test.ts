import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  aggregateAvailableStock,
  availableStock,
  hasExplicitInventoryMapping
} from "@/lib/inventory-authority";

const migration = readFileSync(
  "supabase/migrations/20260724041102_p15_inventory_authority_stock_ownership_v1.sql",
  "utf8"
);
const productLoader = readFileSync("lib/supabase/products.ts", "utf8");

function functionBody(name: string, nextName: string) {
  return migration.slice(
    migration.indexOf(`create or replace function public.${name}`),
    migration.indexOf(`create or replace function public.${nextName}`)
  );
}

describe("P15 inventory authority and stock ownership", () => {
  it("computes available stock exclusively as on_hand minus reserved", () => {
    expect(availableStock(20, 0)).toBe(20);
    expect(availableStock(20, 7)).toBe(13);
    expect(availableStock(5, 5)).toBe(0);
    expect(availableStock(4, 5)).toBe(0);
    expect(availableStock(-1, 0)).toBe(0);
    expect(availableStock(2.5, 1)).toBe(0);

    expect(aggregateAvailableStock([
      { variantSizeId: "sku-a", onHand: 20, reserved: 4 },
      { variantSizeId: "sku-a", onHand: 10, reserved: 3 },
      { variantSizeId: "sku-b", onHand: 5, reserved: 5 }
    ])).toEqual(new Map([
      ["sku-a", 23],
      ["sku-b", 0]
    ]));
  });

  it("requires an exact canonical SKU mapping before Custom can touch inventory", () => {
    expect(hasExplicitInventoryMapping({
      variantSizeId: "variant-size",
      orderItemSku: "DBR-SKU-1",
      canonicalSku: "DBR-SKU-1"
    })).toBe(true);
    expect(hasExplicitInventoryMapping({
      variantSizeId: null,
      orderItemSku: "DBR-SKU-1",
      canonicalSku: "DBR-SKU-1"
    })).toBe(false);
    expect(hasExplicitInventoryMapping({
      variantSizeId: "variant-size",
      orderItemSku: "CUSTOM-SNAPSHOT",
      canonicalSku: "DBR-SKU-1"
    })).toBe(false);
  });

  it("creates location-owned reservations without overwriting real balances", () => {
    expect(migration).toContain(
      "add column if not exists location_id uuid"
    );
    expect(migration).toContain(
      "stock_reservations_active_item_location_unique"
    );
    expect(migration).toContain(
      "location.location_type <> 'legacy'"
    );
    expect(migration).toContain(
      "on conflict(location_id, variant_size_id) do nothing"
    );
    expect(migration).toContain(
      "'P15 provisional demo stock; missing balance only'"
    );
    expect(migration).not.toMatch(
      /update\s+public\.inventory_balances[\s\S]{0,180}set\s+on_hand_quantity\s*=\s*20/i
    );
    expect(migration).not.toMatch(
      /delete\s+from\s+public\.(inventory_balances|inventory_movements|stock_reservations)/i
    );
  });

  it("makes reserve, release, consume, and restore atomic and idempotent", () => {
    const reserve = functionBody(
      "reserve_public_order_stock",
      "release_public_order_stock"
    );
    const release = functionBody(
      "release_public_order_stock",
      "consume_paid_order_stock"
    );
    const consume = functionBody(
      "consume_paid_order_stock",
      "restore_refunded_order_stock_v1"
    );
    const restore = functionBody(
      "restore_refunded_order_stock_v1",
      "reserve_pickup_stock_v1"
    );

    for (const body of [reserve, release, consume, restore]) {
      expect(body).toContain("for update");
      expect(body).toContain("public.inventory_balances");
      expect(body).toContain("public.stock_reservations");
      expect(body).toContain("public.inventory_movements");
    }
    expect(reserve).toContain("order by item.variant_size_id, item.id");
    expect(reserve).toContain("order by balance.location_id");
    expect(release).toContain(
      "format('stock-reservation:%s:release', reservation_value.id)"
    );
    expect(consume).toContain(
      "format('stock-reservation:%s:consume', reservation_value.id)"
    );
    expect(consume).toContain("return 0");
    expect(consume).not.toContain("update public.product_variant_sizes");
    expect(restore).toContain(
      "format('stock-reservation:%s:restore', reservation_value.id)"
    );
    expect(restore).toContain("status = 'restored'");
    expect(restore).not.toContain("update public.product_variant_sizes");
  });

  it("reserves Ready Stock at checkout and prevents pickup double deduction", () => {
    expect(migration).toContain(
      "create trigger reserve_checkout_stock_on_creation_v1"
    );
    expect(migration).toContain(
      "perform public.reserve_public_order_stock("
    );
    expect(migration).toContain(
      "public.inventory_order_item_is_mapped_v1(item.id)"
    );
    const pickup = functionBody(
      "complete_pickup_handover_v1",
      "expire_public_commerce_orders"
    );
    expect(pickup).toContain(
      "perform public.consume_paid_order_stock(order_value.id)"
    );
    expect(pickup).not.toMatch(
      /set\s+on_hand_quantity\s*=\s*on_hand_quantity\s*-/i
    );
  });

  it("projects public stock from location balances and keeps privileged tables server-only", () => {
    expect(productLoader).toContain("applyInventoryAvailability");
    expect(productLoader).toContain('from("inventory_balances")');
    expect(productLoader).toContain(
      '.neq("inventory_locations.location_type", "legacy")'
    );
    expect(productLoader).toContain("getAdminSupabaseClient");
    expect(migration).toContain(
      "alter table public.inventory_balances enable row level security"
    );
    expect(migration).toContain(
      "revoke all on function public.reserve_public_order_stock("
    );
    expect(migration).toContain(
      "to service_role"
    );
  });
});
