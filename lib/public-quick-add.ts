import type { CartProductInput } from "@/components/CartProvider";
import type { Product, ProductVariant, ProductVariantSize } from "@/lib/types";

export type PublicQuickAddDecision =
  | { mode: "add"; product: CartProductInput }
  | { mode: "options"; reason: "multiple_options" | "custom_product" | "missing_canonical_sku" }
  | { mode: "unavailable"; reason: "inactive" | "out_of_stock" };

function numeric(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function variantName(variant: ProductVariant) {
  return variant.name || variant.color_name || variant.variant_name || "Default";
}

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
  input: {
    detailHref: string;
    imageUrl: string;
    imageAlt: string;
    priceLabel?: string;
  }
): PublicQuickAddDecision {
  if (product.status !== "active" || product.status_aktif === false) {
    return { mode: "unavailable", reason: "inactive" };
  }

  if (
    product.uses_configurator
    || product.product_type === "configurable_product"
    || product.pricing_mode === "configurator_based"
    || product.pricing_mode === "custom_quote"
  ) {
    return { mode: "options", reason: "custom_product" };
  }

  const candidates = activeVariants(product).flatMap((variant) =>
    activeSizes(variant)
      .filter((size) => availableStock(size) > 0)
      .map((size) => ({ variant, size }))
  );

  if (candidates.length === 0) {
    return activeVariants(product).some((variant) => activeSizes(variant).length > 0)
      ? { mode: "unavailable", reason: "out_of_stock" }
      : { mode: "options", reason: "missing_canonical_sku" };
  }

  if (candidates.length !== 1) {
    return { mode: "options", reason: "multiple_options" };
  }

  const [{ variant, size }] = candidates;
  if (!product.id || !variant.id || !size.id || !size.sku) {
    return { mode: "options", reason: "missing_canonical_sku" };
  }

  const basePrice = numeric(product.base_price ?? product.price ?? product.harga);
  const variantAdjustment = numeric(variant.price_adjustment) + numeric(size.price_adjustment);
  const unitPrice = Math.max(0, basePrice + variantAdjustment);
  const stock = availableStock(size);
  const selectedVariantName = variantName(variant);

  return {
    mode: "add",
    product: {
      id: product.id,
      name: product.nama,
      category: product.kategori,
      priceLabel: input.priceLabel,
      priceValue: unitPrice || undefined,
      href: input.detailHref,
      imageUrl: input.imageUrl,
      imageAlt: input.imageAlt,
      sku: size.sku,
      defaultColor: variant.color_name || selectedVariantName,
      defaultColorHex: variant.color_hex || variant.hex_code || undefined,
      defaultSize: size.size_name,
      defaultQuantity: 1,
      variantId: variant.id,
      variantSizeId: size.id,
      variantName: selectedVariantName,
      variantSku: size.sku,
      stockLabel: `Stok ${stock}`,
      stockAvailable: stock,
      variantSnapshot: {
        product_id: product.id,
        variant_id: variant.id,
        variant_name: selectedVariantName,
        color_name: variant.color_name || selectedVariantName,
        color_hex: variant.color_hex || variant.hex_code || null,
        size_id: size.id,
        size_name: size.size_name,
        sku: size.sku,
        stock,
        base_product_price: basePrice,
        variant_adjustment: variantAdjustment,
        selected_quantity: 1,
        pricing_quantity: 1,
        unit_price: unitPrice || null,
        subtotal: unitPrice || null
      }
    }
  };
}
