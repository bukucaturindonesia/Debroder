import { categoryPath } from "@/lib/product-category-config";
import { productMatchesRoute, productsForCategoryRoute } from "@/lib/product-route-matching";
import type { PublicNavigationColorViewModel, PublicNavigationFacetsViewModel } from "@/lib/public-shell/model";
import type { Product, ProductCategory } from "@/lib/types";

export type PublicNavigationColor = PublicNavigationColorViewModel;
export type PublicNavigationFacets = PublicNavigationFacetsViewModel;

const canonicalColors: Record<string, PublicNavigationColor> = {
  black: { label: "Hitam", value: "black" },
  hitam: { label: "Hitam", value: "black" },
  white: { label: "Putih", value: "white" },
  putih: { label: "Putih", value: "white" },
  yellow: { label: "Kuning", value: "yellow" },
  kuning: { label: "Kuning", value: "yellow" },
  red: { label: "Merah", value: "red" },
  merah: { label: "Merah", value: "red" },
  blue: { label: "Biru", value: "blue" },
  biru: { label: "Biru", value: "blue" },
  navy: { label: "Navy", value: "navy" },
  "forest-green": { label: "Forest Green", value: "forest-green" },
  "green-forest": { label: "Forest Green", value: "forest-green" },
  "hijau-forest": { label: "Forest Green", value: "forest-green" },
  forest: { label: "Forest Green", value: "forest-green" },
  green: { label: "Hijau", value: "green" },
  hijau: { label: "Hijau", value: "green" },
  gold: { label: "Gold", value: "gold" },
  emas: { label: "Gold", value: "gold" },
  grey: { label: "Abu-abu", value: "gray" },
  gray: { label: "Abu-abu", value: "gray" },
  abu: { label: "Abu-abu", value: "gray" }
};

const supportedCategoryLabels: Record<string, string> = {
  "kaos-polos": "Kaos Polos",
  "jaket-hoodie": "Jaket & Hoodie",
  headwear: "Headwear",
  kemeja: "Kemeja"
};

export function normalizeNavigationValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function productColors(product: Product) {
  const variantColors = (product.variants || [])
    .filter((variant) => (variant.status || (variant.is_active === false ? "inactive" : "active")) === "active")
    .map((variant) => variant.color_name || variant.variant_name || "")
    .filter(Boolean);
  return variantColors.length ? variantColors : (product.color_tags || []);
}

function navigationColors(products: Product[]) {
  const colors = new Map<string, PublicNavigationColor>();
  products.flatMap(productColors).forEach((rawColor) => {
    const normalized = normalizeNavigationValue(rawColor);
    if (!normalized || normalized === "custom-color") return;
    const canonical = canonicalColors[normalized] || {
      label: titleCase(normalized),
      value: normalized
    };
    if (!colors.has(canonical.value)) colors.set(canonical.value, canonical);
  });
  return Array.from(colors.values()).sort((a, b) => a.label.localeCompare(b.label, "id"));
}

function canonicalColorValue(value: string) {
  const normalized = normalizeNavigationValue(value);
  return (canonicalColors[normalized] || { value: normalized }).value;
}

function availability(product: Product) {
  const variantStock = (product.variants || []).reduce(
    (total, variant) => total + (variant.sizes || [])
      .filter((size) => (size.status || (size.is_active === false ? "inactive" : "active")) === "active")
      .reduce((sum, size) => sum + Math.max(0, Number(size.stock_quantity ?? size.stock ?? 0)), 0),
    0
  );
  const readyStock = Math.max(0, Number(product.stock || 0)) > 0 || variantStock > 0;
  const custom = Boolean(
    product.uses_configurator
    || product.product_type === "configurable_product"
    || product.product_type === "production_service"
    || product.pricing_mode === "configurator_based"
    || product.pricing_mode === "custom_quote"
  );
  return { readyStock, custom };
}

export function productMatchesNavigationColor(product: Product, color: string) {
  const selected = canonicalColorValue(color);
  if (!selected || selected === "all") return true;
  return productColors(product).some((item) => canonicalColorValue(item) === selected);
}

export function productMatchesNavigationStatus(product: Product, status: string) {
  if (!status || status === "all") return true;
  const value = availability(product);
  if (status === "ready-stock") return value.readyStock;
  if (status === "custom") return value.custom;
  if (status === "hybrid") return value.readyStock && value.custom;
  return true;
}

export function buildPublicNavigationFacets(products: Product[], categories: ProductCategory[]): PublicNavigationFacets {
  const publicProducts = products.filter((product) => (product.status || (product.status_aktif ? "active" : "archived")) === "active");
  const nonJerseyProducts = publicProducts.filter((product) => !productMatchesRoute(product, "jersey"));
  const productAvailability = nonJerseyProducts.map(availability);

  const categoryLinks = categories
    .filter((category) => category.is_active !== false && Boolean(supportedCategoryLabels[category.slug]))
    .filter((category) => productsForCategoryRoute(nonJerseyProducts, categories, category.slug).length > 0)
    .sort((a, b) => Number(a.collection_section_order ?? a.sort_order ?? 0) - Number(b.collection_section_order ?? b.sort_order ?? 0))
    .map((category) => ({
      label: category.public_label || supportedCategoryLabels[category.slug] || category.name,
      href: categoryPath(category.slug)
    }));

  return {
    colors: navigationColors(nonJerseyProducts),
    categoryColors: {
      "kaos-polos": navigationColors(productsForCategoryRoute(nonJerseyProducts, categories, "kaos-polos")),
      "jaket-hoodie": navigationColors(productsForCategoryRoute(nonJerseyProducts, categories, "jaket-hoodie"))
    },
    categories: categoryLinks,
    availability: {
      readyStock: productAvailability.some((item) => item.readyStock),
      custom: productAvailability.some((item) => item.custom),
      hybrid: productAvailability.some((item) => item.readyStock && item.custom)
    },
    collections: {
      new: nonJerseyProducts.some((product) => product.label_new),
      best: nonJerseyProducts.some((product) => product.label_best_seller),
      popular: nonJerseyProducts.some((product) => Number(product.sales_count || 0) > 0),
      promo: nonJerseyProducts.some((product) => product.label_promo)
    }
  };
}
