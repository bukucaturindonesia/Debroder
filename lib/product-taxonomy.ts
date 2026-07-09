import type { Product } from "@/lib/types";

export type ProductTypeOption = {
  label: string;
  value: string;
  keywords: string[];
};

export const kaosTypeOptions: ProductTypeOption[] = [
  { label: "Soft Tee", value: "soft-tee", keywords: ["soft tee", "soft-tee"] },
  { label: "Premium Cotton", value: "premium-cotton", keywords: ["premium cotton", "premium", "7200"] },
  { label: "Premium Youth", value: "premium-youth", keywords: ["premium youth", "youth", "72y00", "kids"] },
  { label: "Heavyweight", value: "heavyweight", keywords: ["heavyweight", "heavy weight", "5400"] },
  { label: "Long Sleeve", value: "long-sleeve", keywords: ["long sleeve", "longsleeve", "7280"] },
  { label: "Heavyweight Long Sleeve", value: "heavyweight-long-sleeve", keywords: ["heavyweight long sleeve", "9480"] },
  { label: "Raglan", value: "raglan", keywords: ["raglan", "7260"] },
  { label: "Ringer", value: "ringer", keywords: ["ringer", "7250"] },
  { label: "Active", value: "active", keywords: ["active", "201", "2/01"] },
  { label: "Cotton Combed", value: "cotton-combed", keywords: ["cotton combed", "combed", "30s"] },
  { label: "Polo", value: "polo", keywords: ["polo", "8100"] }
];

export const jacketTypeOptions: ProductTypeOption[] = [
  { label: "Bomber Jacket", value: "bomber-jacket", keywords: ["bomber jacket", "bomber"] },
  { label: "Pullover Hooded", value: "pullover-hooded", keywords: ["pullover hooded", "pullover hoodie", "pullover"] },
  { label: "Zip Hooded", value: "zip-hooded", keywords: ["zip hooded", "zip hoodie", "zip hoodies", "zip"] },
  { label: "Crewneck", value: "crewneck", keywords: ["crewneck", "crew neck"] },
  { label: "Windbreaker", value: "windbreaker", keywords: ["windbreaker", "wind breaker"] }
];

export function productTypeValue(value: string | undefined, options: ProductTypeOption[]) {
  return options.some((option) => option.value === value) ? value : "all";
}

export function productTypeText(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory,
    product.brand,
    product.slug,
    product.link_url,
    ...(product.collection_tags || []),
    ...(product.material_tags || []),
    ...(product.color_tags || []),
    ...(product.size_tags || [])
  ].filter(Boolean).join(" ").toLowerCase();
}

export function matchesProductType(product: Product, selectedType: string, options: ProductTypeOption[]) {
  if (selectedType === "all") return true;
  const option = options.find((item) => item.value === selectedType);
  if (!option) return true;
  const value = productTypeText(product);
  return option.keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}
