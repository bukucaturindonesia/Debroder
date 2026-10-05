export type BrochureProduct = {
  slug: "nsa-premium" | "cotton-combed-24s";
  name: string;
  description: string;
  detail: string;
  image: string;
  imageAlt: string;
  imageCaption: string;
  priceFrom?: number;
  basePrice: number | null;
  sku: string | null;
  materialTags: string[];
  gsm: number | null;
  variants: BrochureProductVariant[];
  isPublished: boolean;
};

export type BrochureProductVariant = {
  id: string;
  name: string;
  colorHex: string | null;
  imageUrl: string | null;
  sizes: string[];
};

export type BrochureProductRecord = {
  name: string | null;
  nama: string | null;
  description: string | null;
  deskripsi: string | null;
  image_url: string | null;
  gambar_url: string | null;
  image_alt: string | null;
  base_price: number | string | null;
  sku: string | null;
  material_tags: string[] | null;
  gsm: number | null;
};

// Owner's zero-product release contract. Product presentation stays empty
// until a separately approved publication decision is made.
export const brochureProducts: readonly BrochureProduct[] = [];

export function getBrochureProduct(slug: string) {
  return brochureProducts.find((product) => product.slug === slug);
}

export function brochureProductWithPim(
  fallback: BrochureProduct,
  row: BrochureProductRecord | null,
  variants: BrochureProductVariant[] = []
): BrochureProduct {
  if (!row) return fallback;

  const basePrice = finiteNumber(row.base_price);
  const image = nonEmptyText(row.image_url) || nonEmptyText(row.gambar_url);
  const name = nonEmptyText(row.name) || nonEmptyText(row.nama) || fallback.name;

  return {
    ...fallback,
    name,
    description: nonEmptyText(row.description) || nonEmptyText(row.deskripsi) || fallback.description,
    detail: fallback.detail,
    image: image || fallback.image,
    imageAlt: image ? nonEmptyText(row.image_alt) || name : fallback.imageAlt,
    imageCaption: image ? "Foto produk DEBRODER" : fallback.imageCaption,
    basePrice: basePrice !== null && basePrice > 0 ? basePrice : null,
    sku: nonEmptyText(row.sku),
    materialTags: (row.material_tags || []).map((tag) => tag.trim()).filter(Boolean),
    gsm: Number.isInteger(row.gsm) && Number(row.gsm) > 0 ? Number(row.gsm) : null,
    variants,
    isPublished: true
  };
}

function finiteNumber(value: number | string | null) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonEmptyText(value: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}
