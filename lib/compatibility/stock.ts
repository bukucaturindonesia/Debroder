import { readNonNegativeInteger } from "./core";

export type CompatibleStockSource = "stock" | "stock_quantity" | "both";

export type CompatibleStock =
  | {
      status: "known";
      quantity: number;
      source: CompatibleStockSource;
    }
  | {
      status: "unknown";
      quantity: null;
      source: null;
      reason: "absent" | "invalid";
    }
  | {
      status: "conflict";
      quantity: null;
      source: "conflict";
      candidates: {
        stock: number;
        stockQuantity: number;
      };
    };

export type StockCompatibilityInput = {
  stock?: unknown;
  stock_quantity?: unknown;
};

export function mapCompatibleStock(input: StockCompatibilityInput): CompatibleStock {
  const hasStock = input.stock !== undefined && input.stock !== null;
  const hasStockQuantity = input.stock_quantity !== undefined && input.stock_quantity !== null;
  const stock = readNonNegativeInteger(input.stock);
  const stockQuantity = readNonNegativeInteger(input.stock_quantity);

  if (stock !== null && stockQuantity !== null) {
    if (stock !== stockQuantity) {
      return {
        status: "conflict",
        quantity: null,
        source: "conflict",
        candidates: { stock, stockQuantity }
      };
    }
    return { status: "known", quantity: stock, source: "both" };
  }

  if (stock !== null) return { status: "known", quantity: stock, source: "stock" };
  if (stockQuantity !== null) {
    return { status: "known", quantity: stockQuantity, source: "stock_quantity" };
  }

  return {
    status: "unknown",
    quantity: null,
    source: null,
    reason: hasStock || hasStockQuantity ? "invalid" : "absent"
  };
}
