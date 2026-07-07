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
    subcategories: ["Cotton Combed", "New State Apparel", "Polo Shirt", "Kaos Polos Anak"],
    intentTags: ["kaos-polos", "sablon-dtf", "komunitas", "brand-apparel"],
    collectionTags: ["kaos-polos", "basic"],
    materialTags: ["cotton-combed-24s", "cotton-combed-30s"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["hitam", "putih", "navy", "abu"]
  },
  {
    name: "Jaket & Hoodie",
    slug: "jaket-hoodie",
    subcategories: ["Jaket", "Hoodie", "Crewneck", "Bomber Jacket", "Windbreaker", "Zip Hoodie", "Pullover Hoodie"],
    intentTags: ["jaket-hoodie", "sablon-dtf", "bordir", "komunitas", "organisasi", "brand-apparel"],
    collectionTags: ["jaket-hoodie", "premium"],
    materialTags: ["fleece", "baby-terry", "taslan", "drill"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["hitam", "navy", "abu", "army"]
  },
  {
    name: "Headwear",
    slug: "headwear",
    subcategories: ["Topi", "Baseball Cap", "Trucker Cap", "Snapback", "Bucket Hat", "Dad Hat", "Visor", "Beanie"],
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
    subcategories: ["Futsal", "Sepak Bola", "Esports", "Basket", "Sepeda", "Badminton", "Voli", "Running", "Fishing", "Touring", "Komunitas", "Event"],
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

export type ProductSubcategoryMatch = {
  categorySlug: string;
  subcategory: string;
};

export function normalizeCategoryToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const subcategoryAliases: Record<string, ProductSubcategoryMatch> = {
  "kaos-cotton-combed": { categorySlug: "kaos-polos", subcategory: "Cotton Combed" },
  "cotton-combed": { categorySlug: "kaos-polos", subcategory: "Cotton Combed" },
  "new-state-apparel": { categorySlug: "kaos-polos", subcategory: "New State Apparel" },
  nsa: { categorySlug: "kaos-polos", subcategory: "New State Apparel" },
  "polo-shirt": { categorySlug: "kaos-polos", subcategory: "Polo Shirt" },
  polo: { categorySlug: "kaos-polos", subcategory: "Polo Shirt" },
  "kaos-polos-anak": { categorySlug: "kaos-polos", subcategory: "Kaos Polos Anak" },
  "kaos-anak": { categorySlug: "kaos-polos", subcategory: "Kaos Polos Anak" },
  "kids-t-shirt": { categorySlug: "kaos-polos", subcategory: "Kaos Polos Anak" },
  jacket: { categorySlug: "jaket-hoodie", subcategory: "Jaket" },
  jaket: { categorySlug: "jaket-hoodie", subcategory: "Jaket" },
  hoodie: { categorySlug: "jaket-hoodie", subcategory: "Hoodie" },
  hooded: { categorySlug: "jaket-hoodie", subcategory: "Hoodie" },
  crewneck: { categorySlug: "jaket-hoodie", subcategory: "Crewneck" },
  crewnek: { categorySlug: "jaket-hoodie", subcategory: "Crewneck" },
  "bomber-jacket": { categorySlug: "jaket-hoodie", subcategory: "Bomber Jacket" },
  windbreaker: { categorySlug: "jaket-hoodie", subcategory: "Windbreaker" },
  "zip-hoodie": { categorySlug: "jaket-hoodie", subcategory: "Zip Hoodie" },
  "pullover-hoodie": { categorySlug: "jaket-hoodie", subcategory: "Pullover Hoodie" },
  topi: { categorySlug: "headwear", subcategory: "Topi" },
  cap: { categorySlug: "headwear", subcategory: "Baseball Cap" },
  "baseball-cap": { categorySlug: "headwear", subcategory: "Baseball Cap" },
  "trucker-cap": { categorySlug: "headwear", subcategory: "Trucker Cap" },
  snapback: { categorySlug: "headwear", subcategory: "Snapback" },
  "bucket-hat": { categorySlug: "headwear", subcategory: "Bucket Hat" },
  "dad-hat": { categorySlug: "headwear", subcategory: "Dad Hat" },
  visor: { categorySlug: "headwear", subcategory: "Visor" },
  beanie: { categorySlug: "headwear", subcategory: "Beanie" },
  kupluk: { categorySlug: "headwear", subcategory: "Beanie" },
  "jersey-futsal": { categorySlug: "jersey", subcategory: "Futsal" },
  futsal: { categorySlug: "jersey", subcategory: "Futsal" },
  "jersey-sepak-bola": { categorySlug: "jersey", subcategory: "Sepak Bola" },
  "sepak-bola": { categorySlug: "jersey", subcategory: "Sepak Bola" },
  "jersey-esports": { categorySlug: "jersey", subcategory: "Esports" },
  esports: { categorySlug: "jersey", subcategory: "Esports" },
  "jersey-basket": { categorySlug: "jersey", subcategory: "Basket" },
  basket: { categorySlug: "jersey", subcategory: "Basket" },
  "jersey-sepeda": { categorySlug: "jersey", subcategory: "Sepeda" },
  sepeda: { categorySlug: "jersey", subcategory: "Sepeda" },
  "jersey-badminton": { categorySlug: "jersey", subcategory: "Badminton" },
  badminton: { categorySlug: "jersey", subcategory: "Badminton" },
  "jersey-voli": { categorySlug: "jersey", subcategory: "Voli" },
  voli: { categorySlug: "jersey", subcategory: "Voli" },
  "jersey-running": { categorySlug: "jersey", subcategory: "Running" },
  running: { categorySlug: "jersey", subcategory: "Running" },
  "jersey-fishing": { categorySlug: "jersey", subcategory: "Fishing" },
  fishing: { categorySlug: "jersey", subcategory: "Fishing" },
  "jersey-touring": { categorySlug: "jersey", subcategory: "Touring" },
  touring: { categorySlug: "jersey", subcategory: "Touring" },
  "jersey-komunitas": { categorySlug: "jersey", subcategory: "Komunitas" },
  komunitas: { categorySlug: "jersey", subcategory: "Komunitas" },
  "jersey-event": { categorySlug: "jersey", subcategory: "Event" },
  event: { categorySlug: "jersey", subcategory: "Event" },
  "dtf-a4": { categorySlug: "sablon-dtf", subcategory: "A4" },
  a4: { categorySlug: "sablon-dtf", subcategory: "A4" },
  "dtf-a3": { categorySlug: "sablon-dtf", subcategory: "A3" },
  a3: { categorySlug: "sablon-dtf", subcategory: "A3" },
  "dtf-meteran": { categorySlug: "sablon-dtf", subcategory: "Meteran" },
  meteran: { categorySlug: "sablon-dtf", subcategory: "Meteran" }
};

productCategoryPresets.forEach((preset) => {
  preset.subcategories.forEach((subcategory) => {
    const normalized = normalizeCategoryToken(subcategory);
    if (!subcategoryAliases[normalized]) {
      subcategoryAliases[normalized] = {
        categorySlug: preset.slug,
        subcategory
      };
    }
  });
});

export function subcategoryMatch(value: string): ProductSubcategoryMatch | null {
  return subcategoryAliases[normalizeCategoryToken(value)] || null;
}

export function isMainProductCategory(value: string) {
  const normalized = normalizeCategoryToken(value);
  return productCategoryPresets.some((preset) => preset.slug === normalized || normalizeCategoryToken(preset.name) === normalized);
}

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
