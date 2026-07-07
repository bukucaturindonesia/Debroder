import type { Product, ProductCategory } from "@/lib/types";

export type ProductCategoryPreset = {
  name: string;
  slug: string;
  subcategories: string[];
  intentTags: string[];
  collectionTags: string[];
  materialTags: string[];
  sizeTags: string[];
  colorTags: string[];
};

export const productCategoryPresets: ProductCategoryPreset[] = [
  {
    name: "Kaos Polos",
    slug: "kaos-polos",
    subcategories: ["Cotton Combed", "New State Apparel", "Polo Shirt"],
    intentTags: ["kaos-polos", "sablon-dtf", "komunitas", "brand-apparel"],
    collectionTags: ["kaos-polos", "basic"],
    materialTags: ["cotton-combed-24s", "cotton-combed-30s"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["hitam", "putih", "navy", "abu"]
  },
  {
    name: "Jaket & Hoodie",
    slug: "jaket-hoodie",
    subcategories: ["Jaket", "Hoodie", "Crewneck"],
    intentTags: ["jaket-hoodie", "sablon-dtf", "bordir", "komunitas", "organisasi", "brand-apparel"],
    collectionTags: ["jaket-hoodie", "premium"],
    materialTags: ["fleece", "baby-terry", "taslan", "drill"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["hitam", "navy", "abu", "army"]
  },
  {
    name: "Headwear",
    slug: "headwear",
    subcategories: ["Topi", "Cap"],
    intentTags: ["headwear", "bordir", "merchandise", "event", "komunitas"],
    collectionTags: ["headwear", "merchandise"],
    materialTags: ["drill", "canvas"],
    sizeTags: ["all-size"],
    colorTags: ["hitam", "putih", "navy", "army"]
  },
  {
    name: "Sablon DTF",
    slug: "sablon-dtf",
    subcategories: ["A4", "A3", "Meteran"],
    intentTags: ["sablon-dtf", "kaos-polos", "desain-custom", "tanpa-minimum"],
    collectionTags: ["sablon-dtf", "tanpa-minimum"],
    materialTags: ["dtf"],
    sizeTags: ["a4", "a3", "meteran"],
    colorTags: ["full-color"]
  },
  {
    name: "Jersey",
    slug: "jersey",
    subcategories: ["Futsal", "Sepak Bola", "Esports", "Basket", "Sepeda", "Komunitas"],
    intentTags: ["jersey", "cetak-sublim", "sublim", "tim", "nama-nomor"],
    collectionTags: ["jersey", "custom"],
    materialTags: ["dryfit", "milano", "polyester"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["custom-color"]
  },
  {
    name: "Cetak Sublim",
    slug: "cetak-sublim",
    subcategories: ["Jersey", "Apparel Custom"],
    intentTags: ["cetak-sublim", "sublim", "jersey", "tim", "partai-besar"],
    collectionTags: ["cetak-sublim", "jersey"],
    materialTags: ["dryfit", "polyester"],
    sizeTags: ["custom-size"],
    colorTags: ["custom-color"]
  },
  {
    name: "Maklon DTF",
    slug: "maklon-dtf",
    subcategories: ["Brand Apparel", "Reseller", "Produksi Massal"],
    intentTags: ["maklon-dtf", "reseller", "brand-apparel", "partai-besar"],
    collectionTags: ["maklon-dtf", "brand-apparel"],
    materialTags: ["dtf"],
    sizeTags: ["custom-size"],
    colorTags: ["full-color"]
  }
];

export function categoryPath(slug: string) {
  return `/${slug}`;
}

export function categoryPreset(slugOrName: string) {
  const value = slugOrName.toLowerCase();
  return productCategoryPresets.find((item) => item.slug === value || item.name.toLowerCase() === value);
}

export function categoryBySlug(categories: ProductCategory[], slug: string) {
  return categories.find((category) => category.slug === slug) || productCategoryPresets.find((category) => category.slug === slug);
}

export function categoryForProduct(product: Product, categories: ProductCategory[]) {
  return categories.find((category) => product.product_category_id && category.id === product.product_category_id)
    || categories.find((category) => category.name === product.kategori)
    || categories.find((category) => category.slug && product.link_url === categoryPath(category.slug))
    || null;
}

export function collectionLimit(category: ProductCategory) {
  const value = Number(category.collection_limit || 0);
  return Number.isFinite(value) && value > 0 ? value : 8;
}

export function collectionOrder(category: ProductCategory) {
  return Number(category.collection_section_order ?? category.sort_order ?? 0);
}
