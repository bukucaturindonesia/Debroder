import type { ProductVariantSizeRow } from "./source";

export function projectVariantSizeInventoryAvailability(
  rows: readonly ProductVariantSizeRow[],
  availability: ReadonlyMap<string, number>
): ProductVariantSizeRow[] {
  return rows.map((row) => {
    const canonicalAvailable = availability.get(row.id) ?? 0;
    return {
      ...row,
      stock: canonicalAvailable,
      stock_quantity: canonicalAvailable
    };
  });
}
