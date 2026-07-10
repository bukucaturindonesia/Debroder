"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getVariantGalleryImages, uniqueImageUrls } from "@/lib/product-gallery";
import type { ProductVariant } from "@/lib/types";

type ProductVariantGalleryContextValue = {
  selectedVariantId: string | null;
  selectedVariant: ProductVariant | null;
  galleryImages: string[];
  selectVariant: (variantId?: string | null) => void;
};

const ProductVariantGalleryContext = createContext<ProductVariantGalleryContextValue | null>(null);

export function ProductVariantGalleryProvider({
  baseImages,
  variants = [],
  children
}: {
  baseImages: string[];
  variants?: ProductVariant[];
  children: ReactNode;
}) {
  const activeVariants = useMemo(
    () => variants.filter((variant) => variant.is_active !== false),
    [variants]
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    activeVariants[0]?.id || null
  );

  const selectedVariant = useMemo(
    () => activeVariants.find((variant) => variant.id === selectedVariantId) || activeVariants[0] || null,
    [activeVariants, selectedVariantId]
  );

  const galleryImages = useMemo(() => {
    const variantGallery = getVariantGalleryImages(selectedVariant || undefined);
    return variantGallery.length ? variantGallery : uniqueImageUrls(baseImages).slice(0, 4);
  }, [baseImages, selectedVariant]);

  const value = useMemo<ProductVariantGalleryContextValue>(() => ({
    selectedVariantId: selectedVariant?.id || null,
    selectedVariant,
    galleryImages,
    selectVariant: (variantId) => setSelectedVariantId(variantId || activeVariants[0]?.id || null)
  }), [activeVariants, galleryImages, selectedVariant]);

  return (
    <ProductVariantGalleryContext.Provider value={value}>
      {children}
    </ProductVariantGalleryContext.Provider>
  );
}

export function useOptionalProductVariantGallery() {
  return useContext(ProductVariantGalleryContext);
}
