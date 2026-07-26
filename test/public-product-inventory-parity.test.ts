import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { projectVariantSizeInventoryAvailability } from "@/lib/product-read/inventory";
import type { ProductVariantSizeRow } from "@/lib/product-read/source";

const productReadDataAccess = readFileSync(
  "lib/product-read/data-access.ts",
  "utf8"
);

const legacySizeRow: ProductVariantSizeRow = {
  id: "variant-size-a",
  variant_id: "variant-a",
  size_name: "S",
  sku: "DBR-SKU-A-S",
  stock: 80,
  stock_quantity: 80,
  size_id: "size-s",
  status: "active",
  price_adjustment: 0,
  is_active: true,
  sort_order: 1
};

describe("public product inventory parity", () => {
  it("replaces legacy variant stock with canonical available inventory", () => {
    const projected = projectVariantSizeInventoryAvailability(
      [legacySizeRow],
      new Map([["variant-size-a", 23]])
    );

    expect(projected[0]).toMatchObject({
      stock: 23,
      stock_quantity: 23
    });
  });

  it("fails closed when a sellable size has no canonical inventory balance", () => {
    const projected = projectVariantSizeInventoryAvailability(
      [legacySizeRow],
      new Map()
    );

    expect(projected[0]).toMatchObject({
      stock: 0,
      stock_quantity: 0
    });
  });

  it("routes the page-owned product read model through inventory authority", () => {
    expect(productReadDataAccess).toContain(
      "readInventoryAvailabilityByVariantSizeIds"
    );
    expect(productReadDataAccess).toContain(
      "projectVariantSizeInventoryAvailability"
    );
  });
});
