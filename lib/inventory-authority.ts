export type InventoryAvailabilityRow = {
  variantSizeId: string;
  onHand: number;
  reserved: number;
};

export function availableStock(onHand: number, reserved: number) {
  if (
    !Number.isSafeInteger(onHand)
    || !Number.isSafeInteger(reserved)
    || onHand < 0
    || reserved < 0
    || reserved > onHand
  ) {
    return 0;
  }
  return onHand - reserved;
}

export function aggregateAvailableStock(
  rows: readonly InventoryAvailabilityRow[]
) {
  const result = new Map<string, number>();
  for (const row of rows) {
    if (!row.variantSizeId) continue;
    result.set(
      row.variantSizeId,
      (result.get(row.variantSizeId) ?? 0)
        + availableStock(row.onHand, row.reserved)
    );
  }
  return result;
}

export function hasExplicitInventoryMapping(input: {
  variantSizeId: string | null | undefined;
  orderItemSku: string | null | undefined;
  canonicalSku: string | null | undefined;
}) {
  return Boolean(
    input.variantSizeId
    && input.orderItemSku
    && input.canonicalSku
    && input.orderItemSku === input.canonicalSku
  );
}
