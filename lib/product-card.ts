import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/url";
import {
  productAllowsCustomOrder,
  productAllowsReadyStock
} from "@/lib/jersey-commerce";

const APPAREL_SIZE_ORDER = new Map([
  ["xxs", 0],
  ["xs", 1],
  ["s", 2],
  ["m", 3],
  ["l", 4],
  ["xl", 5],
  ["xxl", 6],
  ["2xl", 6],
  ["xxxl", 7],
  ["3xl", 7],
  ["4xl", 8],
  ["5xl", 9],
  ["6xl", 10],
  ["7xl", 11]
]);

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
        .map((variant) => variant.color_name || variant.variant_name || variant.name)
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

function canonicalHex(value: string | null | undefined) {
  const hex = cleanText(value);
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toUpperCase() : "";
}

export function productCardSwatches(product: Product) {
  const swatches = new Map<string, { label: string; hex: string }>();

  (product.variants || [])
    .filter((variant) => variant.is_active !== false)
    .forEach((variant) => {
      const label = cleanText(
        variant.color_name || variant.variant_name || variant.name
      );
      const hex = canonicalHex(variant.hex_code || variant.color_hex);
      if (!label || !hex) return;
      const key = normalizeKey(label) || label.toLowerCase();
      if (!swatches.has(key)) swatches.set(key, { label, hex });
    });

  return Array.from(swatches.values());
}

function apparelSizeRank(value: string) {
  return APPAREL_SIZE_ORDER.get(normalizeKey(value)) ?? null;
}

export function productCardSizeRange(product: Product) {
  const sizes = productCardSizes(product);
  if (!sizes.length) return "";
  if (sizes.length === 1) return sizes[0];

  const ranked = sizes.map((label) => ({
    label,
    rank: apparelSizeRank(label)
  }));
  if (ranked.every((item) => item.rank !== null)) {
    const ordered = Array.from(
      new Map(
        ranked
          .sort((a, b) => Number(a.rank) - Number(b.rank))
          .map((item) => [item.rank, item.label] as const)
      ).values()
    );
    return ordered.length === 1
      ? ordered[0]
      : `${ordered[0]}–${ordered[ordered.length - 1]}`;
  }

  return sizes.length <= 3 ? sizes.join(" / ") : "";
}

export function productCardMaterial(product: Product) {
  return uniqueLabels(product.material_tags || [])[0] || "";
}

export function productCardMetadata(product: Product) {
  const colorCount = productCardColors(product).length;
  const sizeRange = productCardSizeRange(product);
  const material = productCardMaterial(product);
  const parts = [
    colorCount ? `${colorCount} warna` : "",
    sizeRange,
    material
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

function compactRupiah(value: number) {
  return formatRupiah(value).replace(/^Rp\s+/, "Rp");
}

export function productCardPriceState(product: Product) {
  const amount = exactMoneyValue(product.base_price);
  if (amount === null) {
    return {
      status: "unavailable" as const,
      amount: null,
      label: "Harga belum tersedia"
    };
  }

  return {
    status: "available" as const,
    amount,
    label: compactRupiah(amount)
  };
}

export function productCardPrice(product: Product) {
  return productCardPriceState(product).label;
}
