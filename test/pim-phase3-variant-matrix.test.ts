import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getProductManagerCapabilities } from "@/lib/product-manager";
import {
  applyBulkMatrixValue,
  buildDeterministicSku,
  changedMatrixRows,
  generateVariantMatrix,
  normalizeSellableSku,
  summarizeVariantMatrix,
  validateVariantMatrix,
  type VariantMatrixColorOption,
  type VariantMatrixRow,
  type VariantMatrixSizeOption
} from "@/lib/variant-matrix";

const colors: VariantMatrixColorOption[] = [
  { key: "black", variantId: "11111111-1111-4111-8111-111111111111", colorMasterId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Hitam", slug: "blk", hexCode: "#111111", status: "active", sortOrder: 0 },
  { key: "white", variantId: "22222222-2222-4222-8222-222222222222", colorMasterId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Putih", slug: "wht", hexCode: "#FFFFFF", status: "active", sortOrder: 1 },
  { key: "navy", variantId: "33333333-3333-4333-8333-333333333333", colorMasterId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Navy", slug: "nvy", hexCode: "#10182D", status: "active", sortOrder: 2 }
];
const sizes: VariantMatrixSizeOption[] = ["S", "M", "L", "XL"].map((name, index) => ({ id: `00000000-0000-4000-8000-00000000000${index}`, name, slug: name.toLowerCase(), active: true }));

function matrixRows() {
  return generateVariantMatrix({ productCode: "KCC24", colors, sizes, existingRows: [] });
}

function existingRow(overrides: Partial<VariantMatrixRow> = {}): VariantMatrixRow {
  return {
    key: "row-1",
    id: "44444444-4444-4444-8444-444444444444",
    variantId: colors[0].variantId,
    colorMasterId: colors[0].colorMasterId,
    colorName: "Hitam",
    colorSlug: "blk",
    colorHex: "#111111",
    colorStatus: "active",
    sizeId: sizes[1].id,
    sizeName: "M",
    sizeSlug: "m",
    sku: "KCC24-BLK-M",
    stockQuantity: 7,
    priceAdjustment: 1000,
    status: "active",
    sortOrder: 0,
    original: {
      id: "44444444-4444-4444-8444-444444444444",
      variantId: colors[0].variantId,
      sizeId: sizes[1].id,
      sku: "KCC24-BLK-M",
      stockQuantity: 7,
      priceAdjustment: 1000,
      status: "active",
      sortOrder: 0
    },
    ...overrides
  };
}

describe("PIM Phase 3 Variant Matrix", () => {
  it("generates exact color × size combinations", () => {
    const rows = matrixRows();
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((row) => `${row.variantId}:${row.sizeId}`)).size).toBe(12);
  });

  it("preserves an existing combination and its stable SKU", () => {
    const existing = existingRow();
    const rows = generateVariantMatrix({ productCode: "KCC24", colors: [colors[0]], sizes: [sizes[1]], existingRows: [existing] });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(existing.id);
    expect(rows[0].sku).toBe("KCC24-BLK-M");
  });

  it("normalizes SKU using uppercase safe characters", () => {
    expect(normalizeSellableSku(" kcc24 / blk  m ")).toBe("KCC24-BLK-M");
  });

  it("generates deterministic SKU", () => {
    expect(buildDeterministicSku("KCC24", "blk", "xl")).toBe("KCC24-BLK-XL");
    expect(buildDeterministicSku("KCC24", "blk", "xl")).toBe("KCC24-BLK-XL");
  });

  it("refuses fake SKU when product code is invalid", () => {
    expect(buildDeterministicSku("KCC 24", "blk", "m")).toBeNull();
  });

  it("detects duplicate SKU inside matrix", () => {
    const rows = matrixRows().slice(0, 2).map((row) => ({ ...row, sku: "KCC24-DUP-M" }));
    expect(validateVariantMatrix({ productCode: "KCC24", rows }).some((issue) => issue.message.includes("duplicate SKU"))).toBe(true);
  });

  it("detects duplicate SKU globally but allows the same existing owner", () => {
    const row = existingRow();
    expect(validateVariantMatrix({ productCode: "KCC24", rows: [row], globalSkuOwners: new Map([[row.sku, "other-id"]]) }).some((issue) => issue.message.includes("global"))).toBe(true);
    expect(validateVariantMatrix({ productCode: "KCC24", rows: [row], globalSkuOwners: new Map([[row.sku, row.id!]]) }).some((issue) => issue.message.includes("global"))).toBe(false);
  });

  it("prevents duplicate color-size combinations", () => {
    const row = existingRow();
    const duplicate = { ...row, key: "row-2", id: null, sku: "KCC24-BLK-M-2", original: null };
    expect(validateVariantMatrix({ productCode: "KCC24", rows: [row, duplicate] }).some((issue) => issue.message.includes("Duplicate kombinasi"))).toBe(true);
  });

  it("applies bulk stock to selected rows only", () => {
    const rows = matrixRows().slice(0, 2);
    const next = applyBulkMatrixValue(rows, new Set([rows[0].key]), { stockQuantity: 25 });
    expect(next[0].stockQuantity).toBe(25);
    expect(next[1].stockQuantity).toBe(0);
  });

  it("applies bulk price adjustment", () => {
    const rows = matrixRows().slice(0, 2);
    const next = applyBulkMatrixValue(rows, new Set(rows.map((row) => row.key)), { priceAdjustment: 5000 });
    expect(next.every((row) => row.priceAdjustment === 5000)).toBe(true);
  });

  it("rejects negative or noninteger stock", () => {
    const negative = { ...matrixRows()[0], stockQuantity: -1 };
    const fractional = { ...matrixRows()[1], stockQuantity: 1.5 };
    const issues = validateVariantMatrix({ productCode: "KCC24", rows: [negative, fractional] });
    expect(issues.filter((issue) => issue.message.includes("stok wajib integer")).length).toBe(2);
  });

  it("rejects inactive color and missing active size master", () => {
    const row = { ...matrixRows()[0], colorStatus: "inactive" as const };
    const issues = validateVariantMatrix({ productCode: "KCC24", rows: [row], activeSizeIds: new Set() });
    expect(issues.some((issue) => issue.message.includes("warna tidak aktif"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("size_id"))).toBe(true);
  });

  it("produces accurate dry-run summary", () => {
    const unchanged = existingRow();
    const updated = existingRow({ key: "row-2", id: "55555555-5555-4555-8555-555555555555", stockQuantity: 9 });
    const created = matrixRows()[0];
    const summary = summarizeVariantMatrix([unchanged, updated, created]);
    expect(summary).toMatchObject({ created: 1, updated: 1, unchanged: 1, affected: 2 });
  });

  it("keeps no-change save empty", () => {
    expect(changedMatrixRows([existingRow()])).toEqual([]);
  });

  it("deactivates without deleting the row", () => {
    const row = existingRow({ status: "inactive" });
    const changed = changedMatrixRows([row]);
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({ id: row.id, status: "inactive" });
  });

  it("keeps admin_guest read-only and preserves existing role behavior", () => {
    expect(getProductManagerCapabilities("admin_guest").canManageDependencies).toBe(false);
    expect(getProductManagerCapabilities("admin_guest").canEditDraft).toBe(false);
    expect(getProductManagerCapabilities("superadmin").canManageDependencies).toBe(true);
    expect(getProductManagerCapabilities("admin").canEditDraft).toBe(true);
  });

  it("uses one canonical API with preflight and rollback recovery", () => {
    const route = readFileSync("app/api/admin/products/route.ts", "utf8");
    const server = readFileSync("lib/variant-matrix-server.ts", "utf8");
    const client = readFileSync("components/admin/VariantMatrixEditor.tsx", "utf8");
    expect(route).toContain('body.action === "save_matrix"');
    expect(route).toContain("requireDependencyRole(actor.role)");
    expect(server).toContain("if (blockers.length)");
    expect(server).toContain("rollbackMatrix");
    expect(server).not.toContain("products.stock");
    expect(client).not.toContain("createSupabaseClient");
  });

  it("does not introduce destructive delete as a normal matrix action", () => {
    const server = readFileSync("lib/variant-matrix-server.ts", "utf8");
    expect(server).toContain("createdSellableIds");
    expect(server).toContain("createdVariantIds");
    expect(server).toContain("rollbackMatrix");
    expect(server).not.toContain('action: "delete_matrix"');
  });
});
