import type {
  PimProduct as Product,
  PimProductVariant as ProductVariant,
  PimProductVariantImage as ProductVariantImage,
  PimProductVariantSize as ProductVariantSize
} from "@/lib/types";

export function getActiveVariants(product: Product): ProductVariant[] {
  return product.variants
    .filter((variant) => variant.status === "active")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getDefaultVariant(
  product: Product,
  colorSlug?: string | null
): ProductVariant | null {
  const activeVariants = getActiveVariants(product);

  if (colorSlug) {
    const fromQuery = activeVariants.find((variant) => variant.slug === colorSlug);
    if (fromQuery) {
      return fromQuery;
    }
  }

  return (
    activeVariants.find((variant) => variant.isDefault) ??
    activeVariants[0] ??
    null
  );
}

export function sortVariantImages(
  images: ProductVariantImage[]
): ProductVariantImage[] {
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getVariantThumbnail(variant: ProductVariant): string | null {
  const ordered = sortVariantImages(variant.images);
  return (
    ordered.find((image) => image.imageRole === "front")?.imageUrl ??
    ordered[0]?.imageUrl ??
    null
  );
}

export function getActiveVariantSizes(
  variant: ProductVariant
): ProductVariantSize[] {
  return [...variant.sizes]
    .filter((variantSize) => variantSize.status === "active")
    .sort((a, b) => a.size.sortOrder - b.size.sortOrder);
}

export function getSizePriceAdjustment(
  variantSize: ProductVariantSize
): number {
  return variantSize.priceAdjustment;
}

export function calculateUnitPrice(
  product: Product,
  variant: ProductVariant,
  variantSize: ProductVariantSize
): number {
  return (
    product.basePrice +
    variant.priceAdjustment +
    getSizePriceAdjustment(variantSize)
  );
}

export function isVariantSizeSellable(
  variant: ProductVariant,
  variantSize: ProductVariantSize
): boolean {
  return (
    variant.status === "active" &&
    variantSize.status === "active" &&
    variantSize.size.status === "active" &&
    variantSize.stockQuantity > 0
  );
}

export function isVariantOutOfStock(variant: ProductVariant): boolean {
  return getActiveVariantSizes(variant).every(
    (variantSize) => variantSize.stockQuantity <= 0
  );
}
