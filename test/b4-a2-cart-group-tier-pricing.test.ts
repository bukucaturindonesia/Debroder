import { describe, expect, it } from "vitest";
import {
  cartTierProductKey,
  cartTierQuantityByProduct,
  repriceCartItemsByProduct
} from "@/lib/cart-group-tier-pricing";

const pricingTiers = [
  {
    id: "tier-1-11",
    product_id: "product-kaos",
    min_quantity: 1,
    max_quantity: 11,
    unit_price: 45000,
    quote_required: false,
    status: "active",
    sort_order: 1
  },
  {
    id: "tier-12-23",
    product_id: "product-kaos",
    min_quantity: 12,
    max_quantity: 23,
    unit_price: 42000,
    quote_required: false,
    status: "active",
    sort_order: 2
  },
  {
    id: "tier-24-plus",
    product_id: "product-kaos",
    min_quantity: 24,
    max_quantity: null,
    unit_price: 40000,
    quote_required: false,
    status: "active",
    sort_order: 3
  }
];

function line(input: {
  id?: string;
  quantity: number;
  variantAdjustment?: number;
  productId?: string;
  tierProductId?: string;
}) {
  return {
    id: input.id || "product-kaos",
    quantity: input.quantity,
    priceLabel: "Rp45.000",
    priceValue: 45000,
    variantSnapshot: {
      ...(input.productId ? { product_id: input.productId } : {}),
      base_product_price: 45000,
      variant_adjustment: input.variantAdjustment || 0,
      pricing_tiers: pricingTiers.map((tier) => ({
        ...tier,
        product_id: input.tierProductId || tier.product_id
      }))
    }
  };
}

describe("B4-A2 canonical cart tier grouping", () => {
  it("groups different colors and sizes by canonical product id", () => {
    const items = [
      line({ quantity: 6 }),
      line({ quantity: 6, variantAdjustment: 2000 })
    ];

    expect(cartTierQuantityByProduct(items).get("product-kaos")).toBe(12);

    const repriced = repriceCartItemsByProduct(items);
    expect(repriced[0]).toMatchObject({
      priceValue: 42000,
      variantSnapshot: {
        pricing_quantity: 12,
        selected_quantity: 6,
        subtotal: 252000,
        applied_tier: { id: "tier-12-23" }
      }
    });
    expect(repriced[1]).toMatchObject({
      priceValue: 44000,
      variantSnapshot: {
        pricing_quantity: 12,
        selected_quantity: 6,
        subtotal: 264000,
        applied_tier: { id: "tier-12-23" }
      }
    });
  });

  it("uses top-level canonical product_id when available", () => {
    const item = line({
      id: "legacy-display-id",
      quantity: 12,
      productId: "canonical-product",
      tierProductId: "canonical-product"
    });

    expect(cartTierProductKey(item)).toBe("canonical-product");
    expect(repriceCartItemsByProduct([item])[0]).toMatchObject({
      priceValue: 42000,
      variantSnapshot: {
        product_id: "canonical-product",
        pricing_quantity: 12
      }
    });
  });

  it("keeps unrelated products on independent tiers", () => {
    const repriced = repriceCartItemsByProduct([
      line({
        id: "product-a",
        quantity: 6,
        productId: "product-a",
        tierProductId: "product-a"
      }),
      line({
        id: "product-b",
        quantity: 6,
        productId: "product-b",
        tierProductId: "product-b"
      })
    ]);

    expect(repriced[0].priceValue).toBe(45000);
    expect(repriced[1].priceValue).toBe(45000);
    expect(repriced[0].variantSnapshot).toMatchObject({
      pricing_quantity: 6,
      applied_tier: { id: "tier-1-11" }
    });
    expect(repriced[1].variantSnapshot).toMatchObject({
      pricing_quantity: 6,
      applied_tier: { id: "tier-1-11" }
    });
  });

  it("returns to base tier when a grouped line is removed", () => {
    const first = line({ quantity: 6 });
    const second = line({ quantity: 6 });

    expect(repriceCartItemsByProduct([first, second])[0].priceValue).toBe(42000);

    const afterRemoval = repriceCartItemsByProduct([first]);
    expect(afterRemoval[0]).toMatchObject({
      priceValue: 45000,
      variantSnapshot: {
        pricing_quantity: 6,
        subtotal: 270000,
        applied_tier: { id: "tier-1-11" }
      }
    });
  });

  it("survives JSON persistence", () => {
    const persisted = JSON.parse(
      JSON.stringify([line({ quantity: 6 }), line({ quantity: 6 })])
    );

    expect(repriceCartItemsByProduct(persisted)[0]).toMatchObject({
      priceValue: 42000,
      variantSnapshot: {
        pricing_quantity: 12,
        selected_quantity: 6,
        subtotal: 252000
      }
    });
  });

  it("does not mix Custom Projects into Ready Stock tier quantities", () => {
    const readyStock = line({ quantity: 6 });
    const customProject = {
      id: "product-kaos",
      quantity: 20,
      customProject: {
        id: "custom-project-01",
        version: 1
      }
    };

    expect(cartTierProductKey(customProject)).toBeNull();
    expect(
      cartTierQuantityByProduct([readyStock, customProject]).get("product-kaos")
    ).toBe(6);
  });
});
