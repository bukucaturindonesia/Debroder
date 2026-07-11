import type {
  CartItem,
  CartState,
  PimProduct as Product,
  ServiceAllocation,
  PimProductVariant as ProductVariant,
  PimProductVariantSize as ProductVariantSize,
  ValidationIssue
} from "@/lib/types";
import {
  calculateUnitPrice,
  getSizePriceAdjustment,
  getVariantThumbnail,
  isVariantSizeSellable
} from "@/lib/product-utils";

export const CART_STORAGE_KEY = "debroder_cart_v1";
export const CART_VERSION = 1 as const;

export interface MergeResult {
  items: CartItem[];
  warnings: string[];
}

export function createEmptyCart(): CartState {
  return {
    version: CART_VERSION,
    items: [],
    updated_at: new Date().toISOString()
  };
}

export function createCartItem(
  product: Product,
  variant: ProductVariant,
  variantSize: ProductVariantSize,
  quantity: number,
  options?: {
    unitPrice?: number;
    services?: ServiceAllocation[];
    lineNote?: string;
    requiresReview?: boolean;
  }
): CartItem {
  return {
    product_id: product.id,
    product_variant_id: variant.id,
    product_variant_size_id: variantSize.id,
    nama_produk: product.name,
    product_slug: product.slug,
    warna: variant.name,
    color_slug: variant.slug,
    hex_code: variant.hexCode,
    ukuran: variantSize.size.name,
    sku: variantSize.sku,
    quantity,
    base_price: product.basePrice,
    variant_price_adjustment: variant.priceAdjustment,
    size_price_adjustment: getSizePriceAdjustment(variantSize),
    unit_price: options?.unitPrice ?? calculateUnitPrice(product, variant, variantSize),
    thumbnail: getVariantThumbnail(variant),
    stock_snapshot: variantSize.stockQuantity,
    added_at: new Date().toISOString(),
    services: options?.services,
    line_note: options?.lineNote,
    requires_review: options?.requiresReview
  };
}

export function validateCartQuantity(
  quantity: number,
  stockAvailable: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!Number.isInteger(quantity)) {
    issues.push({
      field: "quantity",
      message: "Quantity wajib berupa bilangan bulat.",
      severity: "error"
    });
  }

  if (quantity < 1) {
    issues.push({
      field: "quantity",
      message: "Quantity minimal 1 pcs.",
      severity: "error"
    });
  }

  if (quantity > stockAvailable) {
    issues.push({
      field: "quantity",
      message: `Stok hanya tersisa ${stockAvailable} pcs.`,
      severity: "error"
    });
  }

  return issues;
}

export function validateSelection(
  variant: ProductVariant,
  variantSize: ProductVariantSize,
  quantity: number
): ValidationIssue[] {
  const issues = validateCartQuantity(quantity, variantSize.stockQuantity);

  if (!isVariantSizeSellable(variant, variantSize)) {
    issues.push({
      field: "variant_size",
      message: `${variant.name} ukuran ${variantSize.size.name} tidak tersedia.`,
      severity: "error"
    });
  }

  return issues;
}

export function mergeCartItems(
  existingItems: CartItem[],
  incomingItems: CartItem[]
): MergeResult {
  const merged = new Map<string, CartItem>();
  const warnings: string[] = [];

  for (const item of existingItems) {
    merged.set(item.product_variant_size_id, { ...item });
  }

  for (const incoming of incomingItems) {
    const existing = merged.get(incoming.product_variant_size_id);

    if (!existing) {
      merged.set(incoming.product_variant_size_id, { ...incoming });
      continue;
    }

    const nextQuantity = existing.quantity + incoming.quantity;
    const cappedQuantity = Math.min(nextQuantity, incoming.stock_snapshot);

    if (cappedQuantity < nextQuantity) {
      warnings.push(
        `Stok ${incoming.warna} ukuran ${incoming.ukuran} hanya tersisa ${incoming.stock_snapshot} pcs.`
      );
    }

    merged.set(incoming.product_variant_size_id, {
      ...incoming,
      quantity: cappedQuantity,
      added_at: existing.added_at
    });
  }

  return { items: [...merged.values()], warnings };
}

export function updateCartItemQuantity(
  items: CartItem[],
  productVariantSizeId: string,
  quantity: number
): MergeResult {
  const warnings: string[] = [];
  const nextItems = items.flatMap((item) => {
    if (item.product_variant_size_id !== productVariantSizeId) {
      return [item];
    }

    if (quantity < 1) {
      return [];
    }

    const cappedQuantity = Math.min(quantity, item.stock_snapshot);
    if (cappedQuantity < quantity) {
      warnings.push(
        `Stok ${item.warna} ukuran ${item.ukuran} hanya tersisa ${item.stock_snapshot} pcs.`
      );
    }

    return [{ ...item, quantity: cappedQuantity }];
  });

  return { items: nextItems, warnings };
}

export function getCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

export function getCartServiceSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const services = item.services ?? [];
    return (
      sum +
      services.reduce(
        (serviceSum, service) =>
          serviceSum +
          (service.unit_price === null ? 0 : service.unit_price * service.quantity) +
          (service.flat_price ?? 0),
        0
      )
    );
  }, 0);
}

export function getCartEstimatedTotal(items: CartItem[]): number {
  return getCartSubtotal(items) + getCartServiceSubtotal(items);
}

export function getCartQuantity(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
