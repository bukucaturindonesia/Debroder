import { describe, expect, it } from "vitest";
import { sampleProducts } from "@/data/sample-products";
import { validatePublishProduct } from "@/lib/product-validation";

describe("v1.0 product publish validation", () => {
  it("accepts the sample product foundation", () => {
    const issues = validatePublishProduct(sampleProducts[0]);

    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });

  it("rejects duplicate sellable SKUs", () => {
    const product = structuredClone(sampleProducts[0]);
    product.variants[1].sizes[0].sku = product.variants[0].sizes[0].sku;

    const issues = validatePublishProduct(product);

    expect(
      issues.some((issue) => issue.message === "Sellable SKU duplikat.")
    ).toBe(true);
  });

  it("rejects more than one default variant", () => {
    const product = structuredClone(sampleProducts[0]);
    product.variants[1].isDefault = true;

    const issues = validatePublishProduct(product);

    expect(
      issues.some((issue) => issue.field === "variants.default")
    ).toBe(true);
  });
});

