import { resolvePriceTier } from "@/lib/bulk-ordering";
import type { ProductPriceTier } from "@/lib/types";

type StoredPriceTier = {
  id: string;
  product_id?: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number | null;
  quote_required: boolean;
  status?: string;
  sort_order?: number;
};

export type CartTierPrice = {
  activeTier: StoredPriceTier | null;
  quoteRequired: boolean;
  unitPrice: number;
  subtotal: number;
};

function finiteNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function readStoredTier(value: unknown, index: number): StoredPriceTier | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const tier = value as Record<string, unknown>;
  const minQuantity = finiteNumber(tier.min_quantity);
  const maxQuantity = tier.max_quantity === null ? null : finiteNumber(tier.max_quantity);
  const unitPrice = tier.unit_price === null ? null : finiteNumber(tier.unit_price);

  if (
    typeof tier.id !== "string" ||
    minQuantity === null ||
    (tier.max_quantity !== null && maxQuantity === null) ||
    (tier.unit_price !== null && unitPrice === null)
  ) {
    return null;
  }

  return {
    id: tier.id,
    product_id: typeof tier.product_id === "string" ? tier.product_id : undefined,
    min_quantity: minQuantity,
    max_quantity: maxQuantity,
    unit_price: unitPrice,
    quote_required: tier.quote_required === true,
    status: typeof tier.status === "string" ? tier.status : "active",
    sort_order: finiteNumber(tier.sort_order) ?? index
  };
}

function toCanonicalTier(tier: StoredPriceTier): ProductPriceTier {
  return {
    id: tier.id,
    productId: tier.product_id || "cart-snapshot",
    minQuantity: tier.min_quantity,
    maxQuantity: tier.max_quantity,
    unitPrice: tier.unit_price,
    quoteRequired: tier.quote_required,
    status: tier.status === "active" ? "active" : "inactive",
    sortOrder: tier.sort_order ?? 0
  };
}

function toStoredTier(tier: ProductPriceTier): StoredPriceTier {
  return {
    id: tier.id,
    product_id: tier.productId === "cart-snapshot" ? undefined : tier.productId,
    min_quantity: tier.minQuantity,
    max_quantity: tier.maxQuantity,
    unit_price: tier.unitPrice,
    quote_required: tier.quoteRequired,
    status: tier.status,
    sort_order: tier.sortOrder
  };
}

export function calculateCartTierPrice(
  variantSnapshot: Record<string, unknown> | undefined,
  quantity: number
): CartTierPrice | null {
  if (!variantSnapshot || !Array.isArray(variantSnapshot.pricing_tiers)) return null;

  const basePrice = finiteNumber(variantSnapshot.base_product_price);
  const variantAdjustment = finiteNumber(variantSnapshot.variant_adjustment) ?? 0;
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const tiers = variantSnapshot.pricing_tiers
    .map(readStoredTier)
    .filter((tier): tier is StoredPriceTier => tier !== null)
    .map(toCanonicalTier);

  if (basePrice === null || tiers.length === 0) return null;

  const activeTier = resolvePriceTier(tiers, normalizedQuantity);
  const quotationQuantity = finiteNumber(variantSnapshot.quotation_quantity);
  const quoteRequired =
    Boolean(activeTier?.quoteRequired) ||
    Boolean(quotationQuantity && normalizedQuantity >= quotationQuantity);
  const tierBasePrice =
    activeTier && !activeTier.quoteRequired && activeTier.unitPrice !== null
      ? activeTier.unitPrice
      : basePrice;
  const unitPrice = quoteRequired ? 0 : tierBasePrice + variantAdjustment;

  return {
    activeTier: activeTier ? toStoredTier(activeTier) : null,
    quoteRequired,
    unitPrice,
    subtotal: unitPrice * normalizedQuantity
  };
}
