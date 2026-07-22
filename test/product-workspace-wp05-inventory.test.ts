import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canManageProductInventory,
  draftFromInventoryRow,
  inventoryModeLabel,
  inventorySaveChanges,
  parseProductInventoryQuery,
  type ProductInventoryPayload,
  type ProductInventorySelectionRow
} from "@/lib/product-inventory";
import { getProductManagerCapabilities } from "@/lib/product-manager";

const inventoryPage = readFileSync(
  "app/admin/products/[id]/inventory/page.tsx",
  "utf8"
);
const inventoryRoute = readFileSync(
  "app/api/admin/products/[id]/inventory/route.ts",
  "utf8"
);
const inventoryServer = readFileSync(
  "lib/product-inventory-server.ts",
  "utf8"
);
const inventoryPanel = readFileSync(
  "components/admin/products/workspace/ProductInventoryPanel.tsx",
  "utf8"
);

const storeLocation: ProductInventoryPayload["selectedLocation"] = {
  kind: "location",
  id: "11111111-1111-4111-8111-111111111111",
  name: "STORE PETTARANI",
  code: "STORE-A845EDBE",
  locationType: "store",
  editable: true,
  legacy: false
};

const legacyLocation: ProductInventoryPayload["selectedLocation"] = {
  kind: "location",
  id: "22222222-2222-4222-8222-222222222222",
  name: "Stok Sistem Legacy",
  code: "LEGACY-SYSTEM",
  locationType: "legacy",
  editable: false,
  legacy: true
};

const row: ProductInventorySelectionRow = {
  sellableId: "33333333-3333-4333-8333-333333333333",
  variantId: "44444444-4444-4444-8444-444444444444",
  sizeId: "55555555-5555-4555-8555-555555555555",
  sku: "7200-BLACK-M",
  stockQuantity: 0,
  reservedQuantity: 0,
  priceAdjustment: 0,
  status: "active",
  expectedSkuUpdatedAt: "2026-07-22T00:00:00.000Z",
  expectedBalanceUpdatedAt: null
};

describe("WP-05 Location-aware Inventory", () => {
  it("replaces the read-only inventory shell", () => {
    expect(inventoryPage).toContain("ProductInventoryPanel");
    expect(inventoryPage).not.toContain("ProductWorkspaceReadOnlyModule");
    expect(inventoryPanel).toContain("WP-05 LOCATION-AWARE INVENTORY");
  });

  it("uses frozen pagination and conservative query defaults", () => {
    const query = parseProductInventoryQuery(new URLSearchParams());
    expect(query).toMatchObject({
      locationId: "all",
      mode: "stock",
      q: "",
      status: "all",
      page: 1,
      pageSize: 50
    });
    expect(parseProductInventoryQuery(
      new URLSearchParams("mode=invalid&page=0&pageSize=999")
    )).toMatchObject({
      mode: "stock",
      page: 1,
      pageSize: 50
    });
  });

  it("keeps All Locations and Legacy read-only and preserves role freeze", () => {
    const owner = getProductManagerCapabilities("owner");
    const admin = getProductManagerCapabilities("admin");
    const guest = getProductManagerCapabilities("admin_guest");

    expect(canManageProductInventory(owner, storeLocation)).toBe(true);
    expect(canManageProductInventory(admin, storeLocation)).toBe(false);
    expect(canManageProductInventory(guest, storeLocation)).toBe(false);
    expect(canManageProductInventory(owner, legacyLocation)).toBe(false);
    expect(inventoryPanel).toContain("Semua Lokasi");
    expect(inventoryPanel).toContain("Legacy System visible read-only");
  });

  it("sends only changed row fields", () => {
    const draft = draftFromInventoryRow(row);
    expect(inventorySaveChanges([draft])).toEqual([]);

    const stockChange = { ...draft, stockQuantity: 8 };
    expect(inventorySaveChanges([stockChange])).toEqual([{
      sellableId: row.sellableId,
      stockQuantity: 8,
      expectedSkuUpdatedAt: row.expectedSkuUpdatedAt,
      expectedBalanceUpdatedAt: null
    }]);

    const mixed = {
      ...draft,
      priceAdjustment: 2500,
      status: "inactive" as const
    };
    expect(inventorySaveChanges([mixed])[0]).toMatchObject({
      priceAdjustment: 2500,
      status: "inactive"
    });
  });

  it("loads one product matrix and paginates visible rows", () => {
    expect(inventoryServer).toContain('.eq("product_id", productId)');
    expect(inventoryServer).toContain("orderedRows.slice");
    expect(inventoryServer).toContain("query.pageSize");
    expect(inventoryPanel).toContain("Pilih semua hasil");
    expect(inventoryPanel).toContain("Sebelumnya");
    expect(inventoryPanel).toContain("Berikutnya");
    expect(inventoryPanel).not.toContain("VariantMatrixEditor");
  });

  it("uses explicit store location and never writes legacy compatibility stock", () => {
    expect(inventoryRoute).toContain("locationId");
    expect(inventoryServer).toContain("LEGACY-SYSTEM");
    expect(inventoryServer).toContain("inventory_balances");
    expect(inventoryServer).toContain("inventory_movements");
    expect(inventoryServer).not.toContain("stock_quantity:");
    expect(inventoryServer).not.toContain("stock:");
    expect(inventoryServer).toContain(
      "All Locations dan Legacy System bersifat read-only"
    );
  });

  it("preserves movement ledger, reservation invariant, and recovery", () => {
    expect(inventoryServer).toContain('movement_type: "adjustment"');
    expect(inventoryServer).toContain("targetStock < reserved");
    expect(inventoryServer).toContain("rollbackAppliedRows");
    expect(inventoryServer).toContain("ROLLED_BACK");
    expect(inventoryServer).toContain("recovery tidak lengkap");
  });

  it("implements preview, bulk modes, copy, dirty state, and confirmation", () => {
    expect(inventoryModeLabel("stock")).toBe("Stok");
    expect(inventoryModeLabel("price")).toBe("Tambahan Harga");
    expect(inventoryModeLabel("status")).toBe("Status SKU");
    expect(inventoryPanel).toContain("inventoryModeLabel(item)");

    for (const label of [
      "Salin dari warna",
      "Tinjau",
      "Konfirmasi simpan",
      "Keluar tanpa menyimpan",
      "Tetap di sini",
      "Simpan"
    ]) {
      expect(inventoryPanel).toContain(label);
    }
    for (const state of [
      "clean",
      "dirty",
      "saving",
      "saved",
      "conflict",
      "error"
    ]) {
      expect(inventoryPanel).toContain(state);
    }
  });

  it("uses row-level optimistic concurrency and HTTP 409 semantics", () => {
    expect(inventoryServer).toContain('eq("updated_at"');
    expect(inventoryServer).toContain("expectedSkuUpdatedAt");
    expect(inventoryServer).toContain("expectedBalanceUpdatedAt");
    expect(inventoryServer).toContain("409");
    expect(inventoryPanel).toContain("Konflik versi");
    expect(inventoryPanel).toContain("Muat ulang data terbaru");
  });

  it("does not open WP-06, WP-07, schema, or role changes", () => {
    expect(inventoryRoute).toContain("export async function GET");
    expect(inventoryRoute).toContain("export async function PATCH");
    expect(inventoryRoute).not.toContain("export async function POST");
    expect(inventoryRoute).not.toContain("export async function DELETE");
    expect(inventoryServer.toLowerCase()).not.toContain("create table");
    expect(inventoryServer.toLowerCase()).not.toContain("alter table");
    expect(inventoryPanel).not.toContain("Publish");
    expect(inventoryPanel).not.toContain("Archive");
    expect(inventoryPanel).not.toContain("upload");
  });
});
