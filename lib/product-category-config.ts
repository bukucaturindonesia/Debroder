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
    subcategories: ["Kaos Cotton Combed", "Kaos Oversize", "Kaos Lengan Panjang", "Kaos Anak"],
    intentTags: ["kaos-polos", "sablon-dtf", "bordir", "komunitas", "brand-apparel"],
    collectionTags: ["kaos-polos", "basic"],
    materialTags: ["cotton-combed-24s", "cotton-combed-30s"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["hitam", "putih", "navy", "abu"]
  },
  {
    name: "Jersey",
    slug: "jersey",
    subcategories: ["Jersey Futsal", "Jersey Sepak Bola", "Jersey Basket", "Jersey Voli", "Jersey Badminton", "Jersey Esports"],
    intentTags: ["jersey", "cetak-sublim", "sublim", "dtf", "tim", "nama-nomor"],
    collectionTags: ["jersey", "custom"],
    materialTags: ["dryfit", "milano", "polyester"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["custom-color"]
  },
  {
    name: "Jaket & Hoodie",
    slug: "jaket-hoodie",
    subcategories: ["Hoodie", "Crewneck", "Jaket Bomber", "Jaket Varsity", "Jaket Coach", "Jaket Windbreaker"],
    intentTags: ["jaket-hoodie", "sablon-dtf", "bordir", "komunitas", "organisasi", "brand-apparel"],
    collectionTags: ["jaket-hoodie", "premium"],
    materialTags: ["fleece", "baby-terry", "taslan", "drill"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["hitam", "navy", "abu", "army"]
  },
  {
    name: "Polo Shirt",
    slug: "polo-shirt",
    subcategories: ["Polo Lacoste", "Polo CVC", "Polo Dry Fit", "Polo Custom"],
    intentTags: ["polo-shirt", "bordir", "sablon-dtf", "seragam-kantor", "komunitas"],
    collectionTags: ["polo-shirt", "seragam"],
    materialTags: ["lacoste", "cvc", "dryfit"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["hitam", "putih", "navy", "forest-green"]
  },
  {
    name: "Headwear / Topi",
    slug: "headwear",
    subcategories: ["Topi Trucker", "Topi Baseball", "Snapback", "Bucket Hat", "Topi Bordir"],
    intentTags: ["headwear", "topi", "bordir", "merchandise", "event", "komunitas"],
    collectionTags: ["headwear", "merchandise"],
    materialTags: ["drill", "canvas"],
    sizeTags: ["all-size"],
    colorTags: ["hitam", "putih", "navy", "army"]
  },
  {
    name: "Kemeja",
    slug: "kemeja",
    subcategories: ["Kemeja PDH", "Kemeja PDL", "Kemeja Kantor", "Kemeja Komunitas"],
    intentTags: ["kemeja", "bordir", "seragam-kantor", "instansi", "komunitas"],
    collectionTags: ["kemeja", "seragam"],
    materialTags: ["drill", "oxford", "american-drill"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["putih", "hitam", "navy", "khaki"]
  },
  {
    name: "Aksesori Lainnya",
    slug: "aksesori-lainnya",
    subcategories: ["Patch / Emblem", "Lanyard", "Hang Tag / Label", "Aksesori Apparel", "Merchandise Custom"],
    intentTags: ["aksesori-lainnya", "merchandise", "event", "brand-apparel", "bordir", "patch", "emblem", "lanyard", "label"],
    collectionTags: ["aksesori-lainnya", "merchandise"],
    materialTags: ["polyester", "drill", "woven", "custom-material"],
    sizeTags: ["custom-size"],
    colorTags: ["custom-color"]
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
  "kaos-cotton-combed": { categorySlug: "kaos-polos", subcategory: "Kaos Cotton Combed" },
  "cotton-combed": { categorySlug: "kaos-polos", subcategory: "Kaos Cotton Combed" },
  "new-state-apparel": { categorySlug: "kaos-polos", subcategory: "New State Apparel" },
  nsa: { categorySlug: "kaos-polos", subcategory: "New State Apparel" },
  "polo-shirt": { categorySlug: "polo-shirt", subcategory: "Polo Custom" },
  polo: { categorySlug: "polo-shirt", subcategory: "Polo Custom" },
  "polo-lacoste": { categorySlug: "polo-shirt", subcategory: "Polo Lacoste" },
  "polo-cvc": { categorySlug: "polo-shirt", subcategory: "Polo CVC" },
  "polo-dry-fit": { categorySlug: "polo-shirt", subcategory: "Polo Dry Fit" },
  "kaos-polos-anak": { categorySlug: "kaos-polos", subcategory: "Kaos Polos Anak" },
  "kaos-anak": { categorySlug: "kaos-polos", subcategory: "Kaos Polos Anak" },
  "kids-t-shirt": { categorySlug: "kaos-polos", subcategory: "Kaos Polos Anak" },
  jacket: { categorySlug: "jaket-hoodie", subcategory: "Jaket Bomber" },
  jaket: { categorySlug: "jaket-hoodie", subcategory: "Jaket Bomber" },
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
  "baseball-cap": { categorySlug: "headwear", subcategory: "Topi Baseball" },
  "trucker-cap": { categorySlug: "headwear", subcategory: "Topi Trucker" },
  snapback: { categorySlug: "headwear", subcategory: "Snapback" },
  "bucket-hat": { categorySlug: "headwear", subcategory: "Bucket Hat" },
  "dad-hat": { categorySlug: "headwear", subcategory: "Dad Hat" },
  visor: { categorySlug: "headwear", subcategory: "Visor" },
  beanie: { categorySlug: "headwear", subcategory: "Beanie" },
  kupluk: { categorySlug: "headwear", subcategory: "Beanie" },
  "jersey-futsal": { categorySlug: "jersey", subcategory: "Jersey Futsal" },
  futsal: { categorySlug: "jersey", subcategory: "Jersey Futsal" },
  "jersey-sepak-bola": { categorySlug: "jersey", subcategory: "Jersey Sepak Bola" },
  "sepak-bola": { categorySlug: "jersey", subcategory: "Jersey Sepak Bola" },
  "jersey-esports": { categorySlug: "jersey", subcategory: "Jersey Esports" },
  esports: { categorySlug: "jersey", subcategory: "Jersey Esports" },
  "jersey-basket": { categorySlug: "jersey", subcategory: "Jersey Basket" },
  basket: { categorySlug: "jersey", subcategory: "Jersey Basket" },
  "jersey-sepeda": { categorySlug: "jersey", subcategory: "Sepeda" },
  sepeda: { categorySlug: "jersey", subcategory: "Sepeda" },
  "jersey-badminton": { categorySlug: "jersey", subcategory: "Jersey Badminton" },
  badminton: { categorySlug: "jersey", subcategory: "Jersey Badminton" },
  "jersey-voli": { categorySlug: "jersey", subcategory: "Jersey Voli" },
  voli: { categorySlug: "jersey", subcategory: "Jersey Voli" },
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
  meteran: { categorySlug: "kaos-polos", subcategory: "Kaos Cotton Combed" },
  kemeja: { categorySlug: "kemeja", subcategory: "Kemeja Kantor" },
  "kemeja-pdh": { categorySlug: "kemeja", subcategory: "Kemeja PDH" },
  "kemeja-pdl": { categorySlug: "kemeja", subcategory: "Kemeja PDL" },
  "kemeja-kantor": { categorySlug: "kemeja", subcategory: "Kemeja Kantor" },
  "patch-emblem": { categorySlug: "aksesori-lainnya", subcategory: "Patch / Emblem" },
  patch: { categorySlug: "aksesori-lainnya", subcategory: "Patch / Emblem" },
  emblem: { categorySlug: "aksesori-lainnya", subcategory: "Patch / Emblem" },
  lanyard: { categorySlug: "aksesori-lainnya", subcategory: "Lanyard" },
  "hang-tag": { categorySlug: "aksesori-lainnya", subcategory: "Hang Tag / Label" },
  label: { categorySlug: "aksesori-lainnya", subcategory: "Hang Tag / Label" },
  "aksesori-apparel": { categorySlug: "aksesori-lainnya", subcategory: "Aksesori Apparel" },
  "merchandise-custom": { categorySlug: "aksesori-lainnya", subcategory: "Merchandise Custom" },
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
