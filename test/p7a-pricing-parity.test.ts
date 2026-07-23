import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { sampleProducts } from "@/data/sample-products";
import { validateMinimumOrder } from "@/lib/bulk-ordering";
import { calculateCartTierPrice } from "@/lib/cart-tier-pricing";
import {
  PRICING_PARITY_BLOCKERS,
  resolveReadyStockPricing,
  type ReadyStockPricingInput
} from "@/lib/pricing-policy";
import { calculateUnitPrice } from "@/lib/product-utils";
import {
  MAX_CHECKOUT_LINE_QUANTITY,
  MAX_CHECKOUT_TOTAL_QUANTITY,
  parsePublicCheckoutRequest
} from "@/lib/commerce-checkout";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/client", () => ({
  getPublicSupabaseClient: () => null
}));

const standardTiers = [
  {
    id: "tier-1-11",
    productId: "product-1",
    minQuantity: 1,
    maxQuantity: 11,
    unitPrice: 45_000,
    quoteRequired: false,
    status: "active",
    sortOrder: 1
  },
  {
    id: "tier-12-23",
    productId: "product-1",
    minQuantity: 12,
    maxQuantity: 23,
    unitPrice: 42_000,
    quoteRequired: false,
    status: "active",
    sortOrder: 2
  },
  {
    id: "tier-24-plus",
    productId: "product-1",
    minQuantity: 24,
    maxQuantity: null,
    unitPrice: 40_000,
    quoteRequired: false,
    status: "active",
    sortOrder: 3
  }
] as const;

function pricingInput(
  quantity: number,
  overrides: Partial<ReadyStockPricingInput> = {}
): ReadyStockPricingInput {
  return {
    quantity,
    pricingQuantity: quantity,
    salesMode: "ready_stock",
    pricingMode: "variant_based",
    tierScope: "product",
    productStatus: "active",
    variantStatus: "active",
    variantSizeStatus: "active",
    sizeStatus: "active",
    basePrice: 45_000,
    variantAdjustment: 1_000,
    variantSizeAdjustment: 2_000,
    tiers: standardTiers,
    ...overrides
  };
}

function pickupRequest(items: Array<{ variantSizeId: string; quantity: number }>) {
  return {
    idempotencyKey: "checkout_key_1234567890",
    accessToken: "a".repeat(64),
    confirmationCode: "AB12CD34",
    customer: { name: "Pelanggan Test", phone: "081234567890" },
    fulfillment: {
      method: "pickup",
      paymentMethod: "pay_at_store",
      pickupLocationId: "11111111-1111-4111-8111-111111111111"
    },
    items,
    customProjects: []
  };
}

describe("P7A executable TypeScript pricing parity", () => {
  it.each([
    [1, 48_000, "tier-1-11"],
    [11, 48_000, "tier-1-11"],
    [12, 45_000, "tier-12-23"],
    [23, 45_000, "tier-12-23"],
    [24, 43_000, "tier-24-plus"]
  ] as const)(
    "matches inclusive SQL tier boundary quantity %i",
    (quantity, unitPrice, tierId) => {
      expect(resolveReadyStockPricing(pricingInput(quantity))).toEqual({
        status: "priced",
        code: null,
        pricingQuantity: quantity,
        tierId,
        unitPrice
      });
    }
  );

  it("uses base price when canonical tier_scope is none", () => {
    expect(
      resolveReadyStockPricing(
        pricingInput(24, { tierScope: "none", pricingQuantity: 24 })
      )
    ).toEqual({
      status: "priced",
      code: null,
      pricingQuantity: 24,
      tierId: null,
      unitPrice: 48_000
    });
  });

  it("returns quotation_required without inventing a numeric checkout price", () => {
    expect(
      resolveReadyStockPricing(
        pricingInput(50, {
          tiers: [
            {
              id: "tier-1-49",
              productId: "product-1",
              minQuantity: 1,
              maxQuantity: 49,
              unitPrice: 45_000,
              quoteRequired: false,
              status: "active",
              sortOrder: 1
            },
            {
              id: "tier-50-plus",
              productId: "product-1",
              minQuantity: 50,
              maxQuantity: null,
              unitPrice: null,
              quoteRequired: true,
              status: "active",
              sortOrder: 4
            }
          ]
        })
      )
    ).toEqual({
      status: "quotation_required",
      code: "PRICING_QUOTATION_REQUIRED",
      pricingQuantity: 50,
      tierId: "tier-50-plus",
      unitPrice: null
    });
  });

  it.each([
    [
      { variantSizeStatus: "inactive" } as const,
      "PRICING_VARIANT_UNAVAILABLE"
    ],
    [
      {
        salesMode: "custom",
        pricingMode: "custom_quote",
        tierScope: "none"
      } as const,
      "PRICING_COMMERCE_MODE_MISMATCH"
    ],
    [
      {
        tierScope: "none",
        basePrice: 1_000,
        variantAdjustment: -2_000,
        variantSizeAdjustment: 0
      } as const,
      "PRICING_CANONICAL_AMOUNT_INVALID"
    ]
  ])("fails closed for unavailable canonical input %#", (overrides, code) => {
    expect(resolveReadyStockPricing(pricingInput(1, overrides))).toMatchObject({
      status: "unavailable",
      code,
      unitPrice: null
    });
  });

  it("uses only the sellable variant-size adjustment, never size-master presentation data", () => {
    const product = sampleProducts[0];
    const variant = product.variants[1];
    const variantSize = variant.sizes.find(
      (candidate) => candidate.size.slug === "xxl"
    );

    expect(variantSize).toBeDefined();
    expect(variantSize?.priceAdjustment).toBe(2_000);
    expect(variantSize?.size.priceAdjustment).toBe(3_000);
    expect(
      variantSize
        ? calculateUnitPrice(product, variant, variantSize)
        : null
    ).toBe(47_000);
  });

  it("keeps sample products out of server revalidation when Supabase is unavailable", async () => {
    const { revalidateCartItems } = await import("@/lib/supabase/products");
    const sampleVariantSize = sampleProducts[0].variants[0].sizes[0];

    await expect(
      revalidateCartItems([
        {
          product_id: sampleProducts[0].id,
          product_variant_size_id: sampleVariantSize.id,
          quantity: 1,
          unit_price: 45_000,
          price_tier_id: null
        }
      ])
    ).resolves.toEqual([
      {
        product_variant_size_id: sampleVariantSize.id,
        status: "unavailable",
        error_code: "PRICING_PRODUCT_UNAVAILABLE",
        latest_unit_price: null,
        stock_available: 0,
        message: "Kombinasi produk tidak lagi tersedia."
      }
    ]);
  });
});

describe("P7A explicitly classified SQL blockers", () => {
  it("records each unresolved mismatch under the P7B owner package", () => {
    expect(PRICING_PARITY_BLOCKERS).toEqual([
      expect.objectContaining({
        id: "P7A-B01",
        status: "BLOCKED",
        ownerPackage: "P7B"
      }),
      expect.objectContaining({
        id: "P7A-B02",
        status: "BLOCKED",
        ownerPackage: "P7B"
      })
    ]);
  });

  it("proves the TypeScript boundary rejects 101 units per line and 501 total", () => {
    expect(MAX_CHECKOUT_LINE_QUANTITY).toBe(100);
    expect(MAX_CHECKOUT_TOTAL_QUANTITY).toBe(500);
    expect(
      parsePublicCheckoutRequest(
        pickupRequest([
          {
            variantSizeId: "11111111-1111-4111-8111-111111111111",
            quantity: 101
          }
        ])
      )
    ).toBeNull();

    const items = Array.from({ length: 6 }, (_, index) => ({
      variantSizeId: `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
      quantity: index === 5 ? 1 : 100
    }));
    expect(parsePublicCheckoutRequest(pickupRequest(items))).toBeNull();
  });

  it("proves the existing TypeScript policy interprets minimum and quotation thresholds", () => {
    expect(validateMinimumOrder(sampleProducts[0], 1)).toEqual([
      expect.objectContaining({
        field: "minimum_quantity",
        severity: "error"
      })
    ]);
    expect(
      calculateCartTierPrice(
        {
          base_product_price: 45_000,
          variant_adjustment: 0,
          quotation_quantity: 50,
          pricing_tiers: standardTiers.map((tier) => ({
            id: tier.id,
            product_id: tier.productId,
            min_quantity: tier.minQuantity,
            max_quantity: tier.maxQuantity,
            unit_price: tier.unitPrice,
            quote_required: tier.quoteRequired,
            status: tier.status,
            sort_order: tier.sortOrder
          }))
        },
        50
      )
    ).toMatchObject({
      quoteRequired: true,
      unitPrice: 0,
      subtotal: 0
    });
  });

  it("keeps the SQL fixture read-only and covers every executable pricing vector", () => {
    const sql = readFileSync(
      "test/fixtures/p7a-pricing-parity.sql",
      "utf8"
    );

    expect(sql).toContain("tier_scope_none");
    expect(sql).toContain("quotation_tier");
    expect(sql).toContain("inactive_sku");
    expect(sql).toContain("negative_amount");
    expect(sql).not.toMatch(
      /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke)\b/i
    );
  });

  it("keeps quotation_required eligible for the quotation-draft path", () => {
    const route = readFileSync("app/api/quotation-drafts/route.ts", "utf8");

    expect(route).toContain(
      'result.status !== "ok" && result.status !== "quotation_required"'
    );
  });
});
