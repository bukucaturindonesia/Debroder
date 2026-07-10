import { getProductImage } from "@/lib/fallback-data";
import type { Product, ProductVariant, ProductVariantImage } from "@/lib/types";

export const PRODUCT_GALLERY_LIMIT = 4;

export const PRODUCT_IMAGE_SLOTS = [
  {
    key: "front",
    label: "Foto 1 · Tampak depan",
    shortLabel: "Depan",
    description: "Gambar utama katalog dan keranjang.",
    required: true
  },
  {
    key: "back",
    label: "Foto 2 · Tampak belakang",
    shortLabel: "Belakang",
    description: "Muncul saat hover kartu produk di desktop.",
    required: false
  },
  {
    key: "detail",
    label: "Foto 3 · Detail produk",
    shortLabel: "Detail",
    description: "Kerah, jahitan, tekstur, sablon, atau bordir.",
    required: false
  },
  {
    key: "lifestyle",
    label: "Foto 4 · Lifestyle / samping",
    shortLabel: "Lifestyle",
    description: "Tampak samping atau produk saat digunakan.",
    required: false
  }
] as const;

export type ProductImageSlotKey = (typeof PRODUCT_IMAGE_SLOTS)[number]["key"];

export const PRODUCT_IMAGE_ROLE_ORDER = {
  front: 0,
  back: 1,
  detail: 2,
  lifestyle: 3
} as const;

export type ProductImageRole = keyof typeof PRODUCT_IMAGE_ROLE_ORDER;

export function productImageRoleFromIndex(index: number): ProductImageRole {
  return (["front", "back", "detail", "lifestyle"] as const)[Math.max(0, Math.min(3, index))];
}

function variantImageOrder(image: ProductVariantImage) {
  if (image.image_role && image.image_role in PRODUCT_IMAGE_ROLE_ORDER) {
    return PRODUCT_IMAGE_ROLE_ORDER[image.image_role as ProductImageRole];
  }
  if (image.is_cover) return -1;
  return Number(image.sort_order || 0);
}

export function getVariantGalleryImages(variant?: ProductVariant | null) {
  if (!variant) return [];
  const structured = [...(variant.variant_images || [])]
    .sort((a, b) => variantImageOrder(a) - variantImageOrder(b))
    .map((image) => image.image_url);

  return uniqueImageUrls([
    ...structured,
    variant.image_url,
    ...(variant.images || [])
  ]).slice(0, PRODUCT_GALLERY_LIMIT);
}

export function uniqueImageUrls(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() || "")
        .filter(Boolean)
    )
  );
}

export function getProductGalleryImages(product: Product, variantImages: string[] = []) {
  return uniqueImageUrls([
    getProductImage(product),
    ...(product.gallery_urls || []),
    ...variantImages
  ]).slice(0, PRODUCT_GALLERY_LIMIT);
}

export function getProductCardImages(product: Product) {
  const images = getProductGalleryImages(product);
  return {
    primary: images[0] || getProductImage(product),
    hover: images[1] || null
  };
}

export function productGalleryFromForm(product: Product) {
  return uniqueImageUrls([
    product.image_url || product.gambar_url,
    ...(product.gallery_urls || [])
  ]).slice(0, PRODUCT_GALLERY_LIMIT);
}

export function applyProductGalleryToProduct(product: Product, images: string[]): Product {
  const normalized = uniqueImageUrls(images).slice(0, PRODUCT_GALLERY_LIMIT);
  const primary = normalized[0] || "";
  return {
    ...product,
    image_url: primary,
    gambar_url: primary,
    gallery_urls: normalized.slice(1)
  };
}

export function isFourFiveRatio(width?: number | null, height?: number | null) {
  if (!width || !height) return null;
  const ratio = width / height;
  return Math.abs(ratio - 0.8) <= 0.025;
}

export function mediaDimensionLabel(width?: number | null, height?: number | null) {
  if (!width || !height) return "Dimensi belum terbaca";
  return `${width} × ${height} px`;
}
