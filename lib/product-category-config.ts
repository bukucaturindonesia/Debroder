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
    subcategories: ["Kaos Cotton Combed", "Kaos Lengan Panjang", "Kaos Anak", "Polo Shirt NSA"],
    intentTags: ["kaos-polos", "polo-shirt-nsa", "sablon-dtf", "bordir", "komunitas", "brand-apparel"],
    collectionTags: ["kaos-polos", "basic", "polo-shirt-nsa"],
    materialTags: ["cotton-combed-24s", "cotton-combed-30s", "polo-nsa"],
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
    subcategories: ["Hoodie", "Crewneck", "Jaket Bomber", "Jaket Varsity", "Jaket Coach"],
    intentTags: ["jaket-hoodie", "sablon-dtf", "bordir", "komunitas", "organisasi", "brand-apparel"],
    collectionTags: ["jaket-hoodie", "premium"],
    materialTags: ["fleece", "baby-terry", "taslan", "drill"],
    sizeTags: ["s", "m", "l", "xl", "xxl"],
    colorTags: ["hitam", "navy", "abu", "army"]
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
    name: "Headwear",
    slug: "headwear",
    subcategories: ["Topi Trucker", "Topi Baseball", "Snapback", "Bucket Hat"],
    intentTags: ["headwear", "topi", "bordir", "merchandise", "event", "komunitas"],
    collectionTags: ["headwear", "merchandise"],
    materialTags: ["drill", "canvas"],
    sizeTags: ["all-size"],
    colorTags: ["hitam", "putih", "navy", "army"]
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
  "new-state-apparel": { categorySlug: "kaos-polos", subcategory: "Kaos Cotton Combed" },
  nsa: { categorySlug: "kaos-polos", subcategory: "Kaos Cotton Combed" },
  "kaos-lengan-panjang": { categorySlug: "kaos-polos", subcategory: "Kaos Lengan Panjang" },
  "kaos-polos-anak": { categorySlug: "kaos-polos", subcategory: "Kaos Anak" },
  "kaos-anak": { categorySlug: "kaos-polos", subcategory: "Kaos Anak" },
  "kids-t-shirt": { categorySlug: "kaos-polos", subcategory: "Kaos Anak" },
  "polo-shirt": { categorySlug: "kaos-polos", subcategory: "Polo Shirt NSA" },
  "polo-shirt-nsa": { categorySlug: "kaos-polos", subcategory: "Polo Shirt NSA" },
  polo: { categorySlug: "kaos-polos", subcategory: "Polo Shirt NSA" },
  "polo-nsa": { categorySlug: "kaos-polos", subcategory: "Polo Shirt NSA" },
  "polo-lacoste": { categorySlug: "kaos-polos", subcategory: "Polo Shirt NSA" },
  "polo-cvc": { categorySlug: "kaos-polos", subcategory: "Polo Shirt NSA" },
  "polo-dry-fit": { categorySlug: "kaos-polos", subcategory: "Polo Shirt NSA" },

  jacket: { categorySlug: "jaket-hoodie", subcategory: "Jaket Bomber" },
  jaket: { categorySlug: "jaket-hoodie", subcategory: "Jaket Bomber" },
  hoodie: { categorySlug: "jaket-hoodie", subcategory: "Hoodie" },
  hooded: { categorySlug: "jaket-hoodie", subcategory: "Hoodie" },
  crewneck: { categorySlug: "jaket-hoodie", subcategory: "Crewneck" },
  crewnek: { categorySlug: "jaket-hoodie", subcategory: "Crewneck" },
  "bomber-jacket": { categorySlug: "jaket-hoodie", subcategory: "Jaket Bomber" },
  "jaket-bomber": { categorySlug: "jaket-hoodie", subcategory: "Jaket Bomber" },
  "jaket-varsity": { categorySlug: "jaket-hoodie", subcategory: "Jaket Varsity" },
  "jaket-coach": { categorySlug: "jaket-hoodie", subcategory: "Jaket Coach" },

  topi: { categorySlug: "headwear", subcategory: "Topi Trucker" },
  cap: { categorySlug: "headwear", subcategory: "Topi Baseball" },
  "baseball-cap": { categorySlug: "headwear", subcategory: "Topi Baseball" },
  "topi-baseball": { categorySlug: "headwear", subcategory: "Topi Baseball" },
  "trucker-cap": { categorySlug: "headwear", subcategory: "Topi Trucker" },
  "topi-trucker": { categorySlug: "headwear", subcategory: "Topi Trucker" },
  snapback: { categorySlug: "headwear", subcategory: "Snapback" },
  "bucket-hat": { categorySlug: "headwear", subcategory: "Bucket Hat" },

  "jersey-futsal": { categorySlug: "jersey", subcategory: "Jersey Futsal" },
  futsal: { categorySlug: "jersey", subcategory: "Jersey Futsal" },
  "jersey-sepak-bola": { categorySlug: "jersey", subcategory: "Jersey Sepak Bola" },
  "sepak-bola": { categorySlug: "jersey", subcategory: "Jersey Sepak Bola" },
  "jersey-esports": { categorySlug: "jersey", subcategory: "Jersey Esports" },
  esports: { categorySlug: "jersey", subcategory: "Jersey Esports" },
  "jersey-basket": { categorySlug: "jersey", subcategory: "Jersey Basket" },
  basket: { categorySlug: "jersey", subcategory: "Jersey Basket" },
  "jersey-badminton": { categorySlug: "jersey", subcategory: "Jersey Badminton" },
  badminton: { categorySlug: "jersey", subcategory: "Jersey Badminton" },
  "jersey-voli": { categorySlug: "jersey", subcategory: "Jersey Voli" },
  voli: { categorySlug: "jersey", subcategory: "Jersey Voli" },

  kemeja: { categorySlug: "kemeja", subcategory: "Kemeja Kantor" },
  "kemeja-pdh": { categorySlug: "kemeja", subcategory: "Kemeja PDH" },
  "kemeja-pdl": { categorySlug: "kemeja", subcategory: "Kemeja PDL" },
  "kemeja-kantor": { categorySlug: "kemeja", subcategory: "Kemeja Kantor" },
  "kemeja-komunitas": { categorySlug: "kemeja", subcategory: "Kemeja Komunitas" },

  "dtf-a4": { categorySlug: "sablon-dtf", subcategory: "A4" },
  a4: { categorySlug: "sablon-dtf", subcategory: "A4" },
  "dtf-a3": { categorySlug: "sablon-dtf", subcategory: "A3" },
  a3: { categorySlug: "sablon-dtf", subcategory: "A3" },
  "dtf-meteran": { categorySlug: "sablon-dtf", subcategory: "Meteran" },
  bordir: { categorySlug: "bordir", subcategory: "Bordir Komputer" },
  "bordir-komputer": { categorySlug: "bordir", subcategory: "Bordir Komputer" },
  "sublim-printing": { categorySlug: "cetak-sublim", subcategory: "Sublim Printing" },
  "cetak-sublim": { categorySlug: "cetak-sublim", subcategory: "Sublim Printing" },
  "maklon-dtf": { categorySlug: "maklon-dtf", subcategory: "Maklon DTF" },

  "kaos-oversize": { categorySlug: "kaos-polos", subcategory: "Kaos Cotton Combed" },
  "aksesori-lainnya": { categorySlug: "headwear", subcategory: "Topi Trucker" },
  "tas-aksesori": { categorySlug: "headwear", subcategory: "Topi Trucker" }
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
