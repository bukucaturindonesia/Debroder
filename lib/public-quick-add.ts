import type { Product, ProductVariant, ProductVariantSize } from "@/lib/types";

export type PublicQuickAddContext = Readonly<{
  imageUrl: string;
}>;

export type PublicQuickAddDecision =
  | {
      mode: "options";
      reason:
        | "multiple_options"
        | "custom_product"
        | "missing_canonical_sku"
        | "missing_canonical_media"
        | "server_pricing_required";
    }
  | { mode: "unavailable"; reason: "inactive" | "out_of_stock" };

function activeVariants(product: Product) {
  return (product.variants || []).filter(
    (variant) => variant.is_active !== false && (variant.status ?? "active") === "active"
  );
}

function activeSizes(variant: ProductVariant) {
  return (variant.sizes || []).filter(
    (size) => size.is_active !== false && (size.status ?? "active") === "active"
  );
}

function availableStock(size: ProductVariantSize) {
  const value = size.stock_quantity ?? size.stock;
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}

export function resolvePublicQuickAdd(
  product: Product,
  context?: PublicQuickAddContext
): PublicQuickAddDecision {
  if (product.status !== "active" || product.status_aktif === false) {
    return { mode: "unavailable", reason: "inactive" };
  }

  // Preserve the canonical card-media handoff at the quick-add boundary.
  // Exact Public Pricing still routes the active single-SKU path through the PDP,
  // so this context must never be used to construct a client-side price.
  if (context && !context.imageUrl.trim()) {
    return { mode: "options", reason: "missing_canonical_media" };
  }

  if (
    product.uses_configurator
    || product.product_type === "configurable_product"
    || product.pricing_mode === "configurator_based"
    || product.pricing_mode === "custom_quote"
  ) {
    return { mode: "options", reason: "custom_product" };
  }

  const variants = activeVariants(product);
  const activeCanonicalSizes = variants.flatMap((variant) => activeSizes(variant));
  const inStock = activeCanonicalSizes.filter((size) => availableStock(size) > 0);

  if (inStock.length === 0) {
    return activeCanonicalSizes.length > 0
      ? { mode: "unavailable", reason: "out_of_stock" }
      : { mode: "options", reason: "missing_canonical_sku" };
  }

  if (inStock.length > 1) {
    return { mode: "options", reason: "multiple_options" };
  }

  // Even a single SKU must be repriced by the server after quantity and
  // service selections are known. Public cards never construct a price.
  return { mode: "options", reason: "server_pricing_required" };
}
