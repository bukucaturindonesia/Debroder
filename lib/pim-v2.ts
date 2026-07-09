import type { PricingMode, ProductType } from "@/lib/types";

export const pimV2ProductTypes: Array<{ value: ProductType; label: string }> = [
  { value: "standard_product", label: "Produk Standar" },
  { value: "configurable_product", label: "Produk Konfigurasi" },
  { value: "production_service", label: "Layanan Produksi" }
];

export const pimV2PricingModes: Array<{ value: PricingMode; label: string }> = [
  { value: "fixed_price", label: "Harga Tetap" },
  { value: "variant_based", label: "Berdasarkan Varian" },
  { value: "configurator_based", label: "Berdasarkan Konfigurator" },
  { value: "custom_quote", label: "Penawaran Khusus" }
];

export const pimV2ProductCategories = [
  { name: "Kaos Polos", slug: "kaos-polos" },
  { name: "Jaket & Hoodie", slug: "jaket-hoodie" },
  { name: "Jersey", slug: "jersey" },
  { name: "Headwear", slug: "headwear" }
] as const;

export const pimV2ProductionServices = [
  { name: "Sablon DTF", slug: "sablon-dtf" },
  { name: "Bordir Komputer", slug: "bordir-komputer" },
  { name: "Cetak Sublim", slug: "cetak-sublim" },
  { name: "Maklon DTF", slug: "maklon-dtf" }
] as const;

export const pimV2DefaultColors = [
  { name: "Black", slug: "black", hex: "#111111" },
  { name: "White", slug: "white", hex: "#F7F7F4" },
  { name: "Sport Grey", slug: "sport-grey", hex: "#BFC2C5" },
  { name: "Charcoal", slug: "charcoal", hex: "#3A3A3A" },
  { name: "Navy", slug: "navy", hex: "#1F2A44" },
  { name: "Royal Blue", slug: "royal-blue", hex: "#1D4ED8" },
  { name: "Sky Blue", slug: "sky-blue", hex: "#8EC5E8" },
  { name: "Forest Green", slug: "forest-green", hex: "#063D24" },
  { name: "Army Green", slug: "army-green", hex: "#4B5320" },
  { name: "Mint Green", slug: "mint-green", hex: "#A7E8C4" },
  { name: "Red", slug: "red", hex: "#DC2626" },
  { name: "Maroon", slug: "maroon", hex: "#6F1D1B" },
  { name: "Orange", slug: "orange", hex: "#F97316" },
  { name: "Yellow", slug: "yellow", hex: "#FACC15" },
  { name: "Mustard", slug: "mustard", hex: "#D97706" },
  { name: "Cream", slug: "cream", hex: "#EADFCB" },
  { name: "Beige", slug: "beige", hex: "#D6C4A5" },
  { name: "Brown", slug: "brown", hex: "#7C4A32" },
  { name: "Purple", slug: "purple", hex: "#6D28D9" },
  { name: "Pink", slug: "pink", hex: "#E7A7C8" },
  { name: "Turquoise", slug: "turquoise", hex: "#40E0D0" },
  { name: "Silver", slug: "silver", hex: "#D1D5DB" }
] as const;

export const pimV2DefaultApparelSizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;

export function isConfigurableProductType(value?: string | null) {
  return value === "configurable_product";
}

export function isVariantPricingMode(value?: string | null) {
  return value === "variant_based";
}

export function isConfiguratorPricingMode(value?: string | null) {
  return value === "configurator_based";
}

export function normalizePimSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
