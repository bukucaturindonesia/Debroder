import { describe, expect, it } from "vitest";
import { calculateCartTierPrice } from "@/lib/cart-tier-pricing";

const pricingSnapshot = {
  base_product_price: 45000,
  variant_adjustment: 0,
  quotation_quantity: null,
  pricing_tiers: [
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
  ]
};

function result(quantity: number) {
  return calculateCartTierPrice(pricingSnapshot, quantity);
}

describe("side cart tier repricing", () => {
  it.each([
    [10, 45000, 450000, "tier-1-11"],
    [11, 45000, 495000, "tier-1-11"],
    [12, 42000, 504000, "tier-12-23"],
    [13, 42000, 546000, "tier-12-23"],
    [15, 42000, 630000, "tier-12-23"],
    [23, 42000, 966000, "tier-12-23"],
    [24, 40000, 960000, "tier-24-plus"]
  ])(
    "recalculates quantity %i to unit price %i and subtotal %i",
    (quantity, unitPrice, subtotal, tierId) => {
      expect(result(quantity)).toMatchObject({
        unitPrice,
        subtotal,
        activeTier: { id: tierId }
      });
    }
  );

  it("returns from the 12 pcs tier to the base tier at 11 pcs", () => {
    expect(result(12)?.unitPrice).toBe(42000);
    expect(result(11)).toMatchObject({ unitPrice: 45000, subtotal: 495000 });
  });

  it("keeps every requested plus/minus transition on the current tier", () => {
    const transitions = [
      [10, 11, 45000, 495000],
      [11, 12, 42000, 504000],
      [12, 13, 42000, 546000],
      [13, 15, 42000, 630000],
      [15, 11, 45000, 495000],
      [23, 24, 40000, 960000],
      [24, 23, 42000, 966000]
    ];

    for (const [from, to, unitPrice, subtotal] of transitions) {
      expect(result(from)).not.toBeNull();
      expect(result(to)).toMatchObject({ unitPrice, subtotal });
    }
  });

  it("keeps the selected variant adjustment on every tier", () => {
    expect(
      calculateCartTierPrice(
        { ...pricingSnapshot, variant_adjustment: 2000 },
        12
      )
    ).toMatchObject({ unitPrice: 44000, subtotal: 528000 });
  });

  it("survives the same JSON serialization used by localStorage", () => {
    const rehydrated = JSON.parse(JSON.stringify(pricingSnapshot)) as Record<string, unknown>;
    expect(calculateCartTierPrice(rehydrated, 13)).toMatchObject({
      unitPrice: 42000,
      subtotal: 546000,
      activeTier: { id: "tier-12-23" }
    });
  });

  it("does not overwrite legacy cart pricing without a complete tier snapshot", () => {
    expect(calculateCartTierPrice({ applied_tier: pricingSnapshot.pricing_tiers[0] }, 12)).toBeNull();
  });
});
