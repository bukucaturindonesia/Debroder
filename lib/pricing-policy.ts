import type {
  PricingMode,
  ProductPriceTier,
  SizeStatus,
  VariantStatus
} from "@/lib/types";

export const READY_STOCK_PRICING_ERROR_CODES = [
  "PRICING_INPUT_INVALID",
  "PRICING_PRODUCT_UNAVAILABLE",
  "PRICING_COMMERCE_MODE_MISMATCH",
  "PRICING_VARIANT_UNAVAILABLE",
  "PRICING_QUOTATION_REQUIRED",
  "PRICING_CANONICAL_AMOUNT_INVALID"
] as const;

export type ReadyStockPricingErrorCode =
  (typeof READY_STOCK_PRICING_ERROR_CODES)[number];

export type ReadyStockPricingInput = {
  quantity: number;
  pricingQuantity: number;
  salesMode: "ready_stock" | "custom" | "both" | null;
  pricingMode: PricingMode | null;
  tierScope: "none" | "product" | null;
  productStatus: "draft" | "active" | "archived";
  variantStatus: VariantStatus;
  variantSizeStatus: VariantStatus;
  sizeStatus: SizeStatus;
  basePrice: number;
  variantAdjustment: number;
  variantSizeAdjustment: number;
  tiers: readonly ProductPriceTier[];
};

export type ReadyStockPricingDecision =
  | {
      status: "priced";
      code: null;
      pricingQuantity: number;
      tierId: string | null;
      unitPrice: number;
    }
  | {
      status: "quotation_required";
      code: "PRICING_QUOTATION_REQUIRED";
      pricingQuantity: number;
      tierId: string;
      unitPrice: null;
    }
  | {
      status: "unavailable";
      code: Exclude<
        ReadyStockPricingErrorCode,
        "PRICING_QUOTATION_REQUIRED"
      >;
      pricingQuantity: number;
      tierId: string | null;
      unitPrice: null;
    };

export function resolveReadyStockPricing(
  input: ReadyStockPricingInput
): ReadyStockPricingDecision {
  const pricingQuantity =
    input.tierScope === "product" ? input.pricingQuantity : input.quantity;

  if (
    !isPositiveInteger(input.quantity) ||
    !isPositiveInteger(pricingQuantity)
  ) {
    return unavailable("PRICING_INPUT_INVALID", pricingQuantity);
  }

  if (input.productStatus !== "active") {
    return unavailable("PRICING_PRODUCT_UNAVAILABLE", pricingQuantity);
  }

  if (
    input.salesMode === null ||
    input.pricingMode === null ||
    input.tierScope === null ||
    !["ready_stock", "both"].includes(input.salesMode) ||
    ["configurator_based", "custom_quote"].includes(input.pricingMode)
  ) {
    return unavailable("PRICING_COMMERCE_MODE_MISMATCH", pricingQuantity);
  }

  if (
    input.variantStatus !== "active" ||
    input.variantSizeStatus !== "active" ||
    input.sizeStatus !== "active"
  ) {
    return unavailable("PRICING_VARIANT_UNAVAILABLE", pricingQuantity);
  }

  const tier =
    input.tierScope === "product"
      ? resolveCanonicalTier(input.tiers, pricingQuantity)
      : null;

  if (tier?.quoteRequired) {
    return {
      status: "quotation_required",
      code: "PRICING_QUOTATION_REQUIRED",
      pricingQuantity,
      tierId: tier.id,
      unitPrice: null
    };
  }

  const unitPrice =
    (tier?.unitPrice ?? input.basePrice) +
    input.variantAdjustment +
    input.variantSizeAdjustment;

  if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) {
    return unavailable(
      "PRICING_CANONICAL_AMOUNT_INVALID",
      pricingQuantity,
      tier?.id ?? null
    );
  }

  return {
    status: "priced",
    code: null,
    pricingQuantity,
    tierId: tier?.id ?? null,
    unitPrice
  };
}

export function resolveCanonicalTier(
  tiers: readonly ProductPriceTier[],
  pricingQuantity: number
): ProductPriceTier | null {
  return (
    [...tiers]
      .filter(
        (tier) =>
          tier.status === "active" &&
          pricingQuantity >= tier.minQuantity &&
          (tier.maxQuantity === null ||
            pricingQuantity <= tier.maxQuantity)
      )
      .sort(
        (left, right) =>
          right.minQuantity - left.minQuantity ||
          right.sortOrder - left.sortOrder
      )[0] ?? null
  );
}

function unavailable(
  code: Exclude<
    ReadyStockPricingErrorCode,
    "PRICING_QUOTATION_REQUIRED"
  >,
  pricingQuantity: number,
  tierId: string | null = null
): ReadyStockPricingDecision {
  return {
    status: "unavailable",
    code,
    pricingQuantity,
    tierId,
    unitPrice: null
  };
}

function isPositiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

export type PricingParityAlignment = {
  id: "P7A-B01" | "P7A-B02";
  status: "RESOLVED";
  resolvedBy: "P7B";
  authority: string;
  databaseEnforcement: string;
  migration: "20260723193533_p7b_policy_database_alignment_v1.sql";
};

export const PRICING_PARITY_ALIGNMENTS: readonly PricingParityAlignment[] = [
  {
    id: "P7A-B01",
    status: "RESOLVED",
    resolvedBy: "P7B",
    authority: "OD-07: 50 lines, 100 units per line, 500 units total",
    databaseEnforcement:
      "order_items trigger rejects more than 50 Ready Stock lines, more than 100 units per line, or more than 500 total units",
    migration: "20260723193533_p7b_policy_database_alignment_v1.sql"
  },
  {
    id: "P7A-B02",
    status: "RESOLVED",
    resolvedBy: "P7B",
    authority:
      "PIM product_minimum_rules and OD-08 quotation interpretation",
    databaseEnforcement:
      "deferred order policy trigger evaluates active minimum_quantity and quotation_quantity against aggregate product quantity",
    migration: "20260723193533_p7b_policy_database_alignment_v1.sql"
  }
] as const;
