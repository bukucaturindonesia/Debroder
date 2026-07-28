import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/url";

function cleanText(value: string | null | undefined) {
  const text = value?.trim();
  return text || "";
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueLabels(values: Array<string | null | undefined>) {
  const labels = new Map<string, string>();

  values.forEach((value) => {
    const label = cleanText(value);
    if (!label) return;
    const key = normalizeKey(label) || label.toLowerCase();
    if (!labels.has(key)) labels.set(key, label);
  });

  return Array.from(labels.values());
}

export function productCardColors(product: Product) {
  const variants = product.variants || [];

  if (variants.length) {
    return uniqueLabels(
      variants
        .filter((variant) => variant.is_active !== false)
        .map((variant) => variant.color_name || variant.variant_name)
    );
  }

  return uniqueLabels(product.color_tags || []);
}

export function productCardCategory(product: Product) {
  return cleanText(product.kategori);
}

export function productCardMetadata(product: Product) {
  const category = productCardCategory(product);
  const colorCount = productCardColors(product).length;
  const parts = [category, colorCount ? `${colorCount} warna` : ""].filter(Boolean);
  return parts.join(" · ");
}

export function productCardHasPriceVariation(product: Product) {
  if (
    product.pricing_mode === "variant_based"
    || product.pricing_mode === "configurator_based"
    || product.pricing_mode === "custom_quote"
  ) {
    return true;
  }

  return (product.variants || []).some(
    (variant) =>
      Number(variant.price_adjustment || 0) !== 0
      || (variant.sizes || []).some(
        (size) => Number(size.price_adjustment || 0) !== 0
      )
  );
}

function exactMoneyValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!/^(?:Rp\s*)?\d+(?:[.,]\d{3})*$/i.test(normalized)) return null;
  const amount = Number(normalized.replace(/[^\d]/g, ""));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function productCardPrice(product: Product) {
  if (
    product.pricing_mode === "configurator_based"
    || product.pricing_mode === "custom_quote"
    || product.uses_configurator
  ) {
    return "Harga setelah konfigurasi";
  }

  if (productCardHasPriceVariation(product)) {
    return "Pilih opsi untuk harga pasti";
  }

  const priceValue = exactMoneyValue(product.price ?? product.harga ?? product.base_price);
  return priceValue === null ? "" : formatRupiah(priceValue);
}
