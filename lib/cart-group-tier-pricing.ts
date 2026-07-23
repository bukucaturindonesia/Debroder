import { calculateCartTierPrice } from "@/lib/cart-tier-pricing";
import { formatRupiah } from "@/lib/url";

type CustomProjectIdentity = {
  id?: string;
  version?: number;
};

export type CartTierGroupItem = {
  id?: string;
  quantity: number;
  priceLabel?: string;
  priceValue?: number;
  variantSnapshot?: Record<string, unknown>;
  customProject?: CustomProjectIdentity;
};

function positiveQuantity(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isCustomProject(item: CartTierGroupItem) {
  return Boolean(item.customProject?.id && item.customProject.version === 1);
}

function tierProductId(snapshot: Record<string, unknown> | undefined) {
  if (!snapshot) return null;

  const direct = stringValue(snapshot.product_id);
  if (direct) return direct;

  if (!Array.isArray(snapshot.pricing_tiers)) return null;
  for (const value of snapshot.pricing_tiers) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const productId = stringValue((value as Record<string, unknown>).product_id);
    if (productId) return productId;
  }

  return null;
}

export function cartTierProductKey(item: CartTierGroupItem) {
  if (isCustomProject(item)) return null;
  return tierProductId(item.variantSnapshot) || stringValue(item.id);
}

export function cartTierQuantityByProduct(items: CartTierGroupItem[]) {
  const quantities = new Map<string, number>();

  for (const item of items) {
    const productKey = cartTierProductKey(item);
    if (!productKey) continue;
    quantities.set(
      productKey,
      (quantities.get(productKey) || 0) + positiveQuantity(item.quantity)
    );
  }

  return quantities;
}

export function repriceCartItemsByProduct<T extends CartTierGroupItem>(
  items: T[]
): T[] {
  const quantities = cartTierQuantityByProduct(items);

  return items.map((item) => {
    const productKey = cartTierProductKey(item);
    if (!productKey) return item;

    const selectedQuantity = positiveQuantity(item.quantity);
    const pricingQuantity = quantities.get(productKey) || selectedQuantity;
    const tierPrice = calculateCartTierPrice(
      item.variantSnapshot,
      pricingQuantity
    );

    if (!tierPrice) return item;

    const lineSubtotal = tierPrice.quoteRequired
      ? null
      : tierPrice.unitPrice * selectedQuantity;

    return {
      ...item,
      priceLabel: tierPrice.quoteRequired
        ? "Minta penawaran"
        : formatRupiah(tierPrice.unitPrice),
      priceValue: tierPrice.quoteRequired ? undefined : tierPrice.unitPrice,
      variantSnapshot: {
        ...item.variantSnapshot,
        product_id: productKey,
        selected_quantity: selectedQuantity,
        pricing_quantity: pricingQuantity,
        applied_tier: tierPrice.activeTier,
        quote_required: tierPrice.quoteRequired,
        unit_price: tierPrice.quoteRequired ? null : tierPrice.unitPrice,
        subtotal: lineSubtotal
      }
    } as T;
  });
}
