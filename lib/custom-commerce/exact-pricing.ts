import type { CustomProjectPricing } from "@/lib/custom-commerce/types";

export function isFinalExactCustomPricing(pricing: CustomProjectPricing) {
  return pricing.status === "final"
    && pricing.issues.length === 0
    && isPositiveMoney(pricing.finalTotal)
    && pricing.estimatedMinTotal === null
    && pricing.estimatedMaxTotal === null
    && pricing.lines.length > 0
    && pricing.lines.every((line) =>
      line.calculationBasis !== "estimated"
      && line.calculationBasis !== "quotation"
      && isNonNegativeMoney(line.subtotal)
    );
}

export function isOrderFirstCustomPricing(pricing: CustomProjectPricing) {
  return pricing.status === "quotation_required"
    && pricing.issues.length === 0
    && pricing.finalTotal === null
    && pricing.estimatedMinTotal === null
    && pricing.estimatedMaxTotal === null;
}

export function isCheckoutEligibleCustomPricing(pricing: CustomProjectPricing) {
  return isFinalExactCustomPricing(pricing) || isOrderFirstCustomPricing(pricing);
}

export function hasPublicCustomPrice(pricing: CustomProjectPricing) {
  return isFinalExactCustomPricing(pricing);
}

function isPositiveMoney(value: number | null) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeMoney(value: number | null) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
