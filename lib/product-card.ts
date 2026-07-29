import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/url";
import {
  productAllowsCustomOrder,
  productAllowsReadyStock
} from "@/lib/jersey-commerce";

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

export function productCardSizes(product: Product) {
  const variants = product.variants || [];

  if (variants.length) {
    return uniqueLabels(
      variants
        .filter((variant) => variant.is_active !== false)
        .flatMap((variant) =>
          (variant.sizes || [])
            .filter((size) => size.is_active !== false)
            .map((size) => size.size_name)
        )
    );
  }

  return uniqueLabels(product.size_tags || []);
}

export function productCardSummary(product: Product) {
  return cleanText(
    product.short_detail
    || product.public_description
    || product.description
    || product.deskripsi
  );
}

export function productCardCategory(product: Product) {
  return cleanText(product.kategori);
}

export function productCardMetadata(product: Product) {
  const category = productCardCategory(product);
  const colorCount = productCardColors(product).length;
  const sizeCount = productCardSizes(product).length;
  const parts = [
    category,
    colorCount ? `${colorCount} warna` : "",
    sizeCount ? `${sizeCount} ukuran` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

export function productCommerceBadges(product: Product) {
  const readyStock = productAllowsReadyStock(product);
  const custom = productAllowsCustomOrder(product);
  const primary = readyStock && custom
    ? "Ready Stock + Custom"
    : readyStock
      ? "Ready Stock"
      : custom
        ? "Custom Available"
        : "";

  const activeSizes = (product.variants || [])
    .filter((variant) => variant.is_active !== false)
    .flatMap((variant) =>
      (variant.sizes || []).filter((size) => size.is_active !== false)
    );
  const soldOut = readyStock
    && (
      activeSizes.length
        ? activeSizes.every((size) => Number(size.stock_quantity ?? size.stock ?? 0) <= 0)
        : typeof product.stock === "number" && product.stock <= 0
    );
  const pimSecondary = ["Sold Out", "Coming Soon", "Low Stock", "New"].includes(
    cleanText(product.badge)
  )
    ? cleanText(product.badge)
    : "";
  const secondary = soldOut
    ? "Sold Out"
    : pimSecondary || (product.label_new ? "New" : "");

  return uniqueLabels([primary, secondary]);
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
    || product.uses_configurator
  ) {
    return "Lengkapi pilihan untuk harga pasti";
  }

  if (product.pricing_mode === "custom_quote") {
    return "Perlu konsultasi";
  }

  if (productCardHasPriceVariation(product)) {
    return "Pilih opsi untuk harga pasti";
  }

  const priceValue = exactMoneyValue(product.price ?? product.harga ?? product.base_price);
  return priceValue === null ? "" : formatRupiah(priceValue);
}
