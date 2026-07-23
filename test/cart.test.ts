import { describe, expect, it } from "vitest";
import { sampleProducts } from "@/data/sample-products";
import {
  createCartItem,
  mergeCartItems,
  validateSelection
} from "@/lib/cart/operations";
import { calculateUnitPrice } from "@/lib/product-utils";

describe("v1.0 cart operations", () => {
  const product = sampleProducts[0];
  const blackVariant = product.variants[0];
  const blackMedium = blackVariant.sizes.find((size) => size.size.slug === "m");
  const blackLarge = blackVariant.sizes.find((size) => size.size.slug === "l");
  const whiteVariant = product.variants[1];
  const whiteXxl = whiteVariant.sizes.find((size) => size.size.slug === "xxl");

  it("merges identical product, color, and size combinations", () => {
    expect(blackMedium).toBeDefined();
    if (!blackMedium) {
      return;
    }

    const first = createCartItem(product, blackVariant, blackMedium, 5);
    const second = createCartItem(product, blackVariant, blackMedium, 3);

    const result = mergeCartItems([first], [second]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.quantity).toBe(8);
  });

  it("caps merged quantity at available stock", () => {
    expect(blackMedium).toBeDefined();
    if (!blackMedium) {
      return;
    }

    const first = createCartItem(product, blackVariant, blackMedium, 18);
    const second = createCartItem(product, blackVariant, blackMedium, 5);

    const result = mergeCartItems([first], [second]);

    expect(result.items[0]?.quantity).toBe(blackMedium.stockQuantity);
    expect(result.warnings).toHaveLength(1);
  });

  it("rejects an out-of-stock size", () => {
    expect(blackLarge).toBeDefined();
    if (!blackLarge) {
      return;
    }

    const issues = validateSelection(blackVariant, blackLarge, 1);

    expect(issues.some((issue) => issue.field === "variant_size")).toBe(true);
  });

  it("calculates unit price from base, variant, and size adjustments", () => {
    expect(whiteXxl).toBeDefined();
    if (!whiteXxl) {
      return;
    }

    expect(calculateUnitPrice(product, whiteVariant, whiteXxl)).toBe(47000);
  });
});

