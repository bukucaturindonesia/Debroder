import { getVariantGalleryImages } from "@/lib/product-gallery";
import type { ProductVariant, ProductVariantSize } from "@/lib/types";
import { formatRupiah } from "@/lib/url";

export type PdpColorOption = Readonly<{
  name: string;
  variantId: string;
  imageUrl: string | null;
  hex: string | null;
  disabled: boolean;
  variant: ProductVariant;
}>;

export type PdpSizeOption = Readonly<{
  name: string;
  variantSizeId: string;
  sku: string | null;
  stock: number;
  disabled: boolean;
  size: ProductVariantSize;
}>;

export type PdpPricingTier = Readonly<{
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number | null;
  quoteRequired: boolean;
}>;

function normalizedStock(size: ProductVariantSize) {
  const stock = Number(size.stock_quantity ?? size.stock);
  return Number.isSafeInteger(stock) && stock > 0 ? stock : 0;
}

function validHex(value?: string | null) {
  const normalized = value?.trim() || "";
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : null;
}

function activeSizes(variant: ProductVariant) {
  return [...(variant.sizes || [])]
    .filter((size) => size.is_active !== false && size.status !== "inactive")
    .sort((left, right) =>
      Number(left.sort_order || 0) - Number(right.sort_order || 0)
      || left.size_name.localeCompare(right.size_name)
    );
}

export function pdpColorOptions(variants: readonly ProductVariant[]) {
  return variants
    .filter((variant) =>
      Boolean(variant.id)
      && variant.is_active !== false
      && variant.status !== "inactive"
    )
    .sort((left, right) =>
      Number(left.sort_order || 0) - Number(right.sort_order || 0)
    )
    .map<PdpColorOption>((variant) => {
      const sizes = activeSizes(variant);
      return {
        name: variant.name
          || variant.variant_name
          || variant.color_name
          || "Warna belum dinamai",
        variantId: variant.id as string,
        imageUrl: getVariantGalleryImages(variant)[0] || null,
        hex: validHex(variant.color_hex || variant.hex_code),
        disabled: variant.status === "out_of_stock"
          || !sizes.some((size) => normalizedStock(size) > 0),
        variant
      };
    });
}

export function pdpSizeOptions(variant?: ProductVariant | null) {
  if (!variant) return [];
  const names = new Set<string>();
  return activeSizes(variant).flatMap<PdpSizeOption>((size) => {
    const name = size.size_name.trim();
    if (!name || !size.id || names.has(name.toLocaleLowerCase("id-ID"))) {
      return [];
    }
    names.add(name.toLocaleLowerCase("id-ID"));
    const stock = normalizedStock(size);
    return [{
      name,
      variantSizeId: size.id,
      sku: size.sku?.trim() || null,
      stock,
      disabled: size.status === "out_of_stock" || stock <= 0,
      size
    }];
  });
}

export function formatPdpRupiah(value?: string | number | null) {
  return formatRupiah(value).replace(/^Rp\s+/, "Rp");
}

export function nextPdpPricingTier(
  tiers: readonly PdpPricingTier[],
  pricingQuantity: number
) {
  return [...tiers]
    .filter((tier) => tier.minQuantity > pricingQuantity)
    .sort((left, right) => left.minQuantity - right.minQuantity)[0] || null;
}
