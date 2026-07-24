import type { CurrencyCode } from "../contracts/core";
import type { CompatibilityIssue, CompatibilityResult } from "./core";
import {
  compatibilityFailure,
  compatibilitySuccess,
  readNonEmptyString,
  readNonNegativeMoney
} from "./core";
import { mapCompatibleStock, type CompatibleStock } from "./stock";

export type CompatiblePrice =
  | {
      status: "known";
      currency: CurrencyCode;
      amount: number;
      source: "price" | "harga" | "base_price" | "pim_base_price";
    }
  | {
      status: "unknown";
      currency: CurrencyCode;
      amount: null;
      source: null;
      reason: "absent" | "invalid";
    }
  | {
      status: "conflict";
      currency: CurrencyCode;
      amount: null;
      source: "conflict";
      candidates: Readonly<Record<string, number>>;
    };

export type FocusedProductReadModel = {
  source: "legacy_product";
  productId: string;
  name: string;
  slug: string;
  categoryLabel: string | null;
  description: string | null;
  status: "draft" | "active" | "archived" | "inactive" | "unknown";
  sku: string | null;
  image: {
    src: string;
    alt: string;
  } | null;
  pricing: CompatiblePrice;
  stock: CompatibleStock;
};

export type CanonicalSellableReadModel = {
  variantId: string;
  variantSizeId: string;
  colorName: string;
  sizeName: string;
  sku: string;
  stock: CompatibleStock;
  variantPriceAdjustment: number;
  sizePriceAdjustment: number;
  status: "active" | "inactive" | "out_of_stock";
};

export type CanonicalProductReadModel = {
  source: "pim_product";
  productId: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string | null;
  description: string | null;
  status: "draft" | "active" | "archived";
  sku: string | null;
  pricing: CompatiblePrice;
  sellables: readonly CanonicalSellableReadModel[];
};

export type LegacyProductInput = {
  id?: unknown;
  name?: unknown;
  nama?: unknown;
  slug?: unknown;
  kategori?: unknown;
  description?: unknown;
  deskripsi?: unknown;
  status?: unknown;
  status_aktif?: unknown;
  sku?: unknown;
  image_url?: unknown;
  gambar_url?: unknown;
  image_alt?: unknown;
  price?: unknown;
  harga?: unknown;
  base_price?: unknown;
  stock?: unknown;
  stock_quantity?: unknown;
};

export type PimProductInput = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  productCategoryId?: unknown;
  category?: {
    name?: unknown;
  } | null;
  basePrice?: unknown;
  description?: unknown;
  status?: unknown;
  sku?: unknown;
  variants?: readonly PimVariantInput[];
};

export type PimVariantInput = {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  priceAdjustment?: unknown;
  sizes?: readonly PimVariantSizeInput[];
};

export type PimVariantSizeInput = {
  id?: unknown;
  sku?: unknown;
  stockQuantity?: unknown;
  priceAdjustment?: unknown;
  status?: unknown;
  size?: {
    name?: unknown;
  } | null;
};

function readLegacyProductStatus(
  status: unknown,
  activeFlag: unknown
): FocusedProductReadModel["status"] {
  if (status === "draft" || status === "active" || status === "archived") return status;
  if (activeFlag === true) return "active";
  if (activeFlag === false) return "inactive";
  return "unknown";
}

function readPimProductStatus(value: unknown): CanonicalProductReadModel["status"] | null {
  return value === "draft" || value === "active" || value === "archived" ? value : null;
}

function readVariantStatus(value: unknown): CanonicalSellableReadModel["status"] | null {
  return value === "active" || value === "inactive" || value === "out_of_stock" ? value : null;
}

function readOptionalString(value: unknown) {
  return readNonEmptyString(value);
}

function readLegacyPrice(input: LegacyProductInput): CompatiblePrice {
  const candidates = [
    ["price", input.price],
    ["harga", input.harga],
    ["base_price", input.base_price]
  ] as const;
  const present = candidates.filter(([, value]) => value !== undefined && value !== null);
  const valid = present
    .map(([key, value]) => [key, readNonNegativeMoney(value)] as const)
    .filter((entry): entry is readonly ["price" | "harga" | "base_price", number] => entry[1] !== null);

  if (!present.length) {
    return { status: "unknown", currency: "IDR", amount: null, source: null, reason: "absent" };
  }
  if (!valid.length) {
    return { status: "unknown", currency: "IDR", amount: null, source: null, reason: "invalid" };
  }

  const distinctValues = new Set(valid.map(([, value]) => value));
  if (distinctValues.size > 1) {
    return {
      status: "conflict",
      currency: "IDR",
      amount: null,
      source: "conflict",
      candidates: Object.fromEntries(valid)
    };
  }

  const [source, amount] = valid[0];
  return { status: "known", currency: "IDR", amount, source };
}

export function adaptLegacyProductToFocusedReadModel(
  input: LegacyProductInput
): CompatibilityResult<FocusedProductReadModel> {
  const productId = readNonEmptyString(input.id);
  if (!productId) {
    return compatibilityFailure(
      "legacy_product.missing_product_id",
      "Legacy product cannot be adapted without its existing product ID.",
      "id"
    );
  }

  const name = readNonEmptyString(input.name) ?? readNonEmptyString(input.nama);
  if (!name) {
    return compatibilityFailure(
      "legacy_product.missing_name",
      "Legacy product cannot be adapted without an existing name.",
      "name"
    );
  }

  const slug = readNonEmptyString(input.slug);
  if (!slug) {
    return compatibilityFailure(
      "legacy_product.missing_slug",
      "Legacy product cannot be adapted without its existing slug.",
      "slug"
    );
  }

  const pricing = readLegacyPrice(input);
  const stock = mapCompatibleStock({ stock: input.stock, stock_quantity: input.stock_quantity });
  const issues: CompatibilityIssue[] = [];
  if (pricing.status === "conflict") {
    issues.push({
      code: "legacy_product.price_conflict",
      message: "Legacy price fields conflict; no canonical amount was selected.",
      severity: "warning",
      field: "price"
    });
  } else if (pricing.status === "unknown" && pricing.reason === "invalid") {
    issues.push({
      code: "legacy_product.invalid_price",
      message: "Legacy price is invalid; no canonical amount was created.",
      severity: "warning",
      field: "price"
    });
  }
  if (stock.status === "conflict") {
    issues.push({
      code: "legacy_product.stock_conflict",
      message: "Legacy stock fields conflict; no canonical stock quantity was selected.",
      severity: "warning",
      field: "stock"
    });
  }

  const imageSrc = readOptionalString(input.image_url) ?? readOptionalString(input.gambar_url);
  return compatibilitySuccess({
    source: "legacy_product",
    productId,
    name,
    slug,
    categoryLabel: readOptionalString(input.kategori),
    description: readOptionalString(input.description) ?? readOptionalString(input.deskripsi),
    status: readLegacyProductStatus(input.status, input.status_aktif),
    sku: readOptionalString(input.sku),
    image: imageSrc
      ? { src: imageSrc, alt: readOptionalString(input.image_alt) ?? name }
      : null,
    pricing,
    stock
  }, issues);
}

export function adaptPimProductToCanonicalReadModel(
  input: PimProductInput
): CompatibilityResult<CanonicalProductReadModel> {
  const productId = readNonEmptyString(input.id);
  const name = readNonEmptyString(input.name);
  const slug = readNonEmptyString(input.slug);
  const categoryId = readNonEmptyString(input.productCategoryId);
  const missing = [
    ["id", productId],
    ["name", name],
    ["slug", slug],
    ["productCategoryId", categoryId]
  ].find(([, value]) => !value);
  if (missing) {
    return compatibilityFailure(
      `pim_product.missing_${missing[0]}`,
      `PIM product cannot be adapted without existing ${missing[0]}.`,
      String(missing[0])
    );
  }

  const basePrice = readNonNegativeMoney(input.basePrice);
  if (basePrice === null) {
    return compatibilityFailure(
      "pim_product.invalid_base_price",
      "PIM product base price must be an existing non-negative integer amount.",
      "basePrice"
    );
  }

  const productStatus = readPimProductStatus(input.status);
  if (!productStatus) {
    return compatibilityFailure(
      "pim_product.invalid_status",
      "PIM product status must be an existing canonical status.",
      "status"
    );
  }

  const sellables: CanonicalSellableReadModel[] = [];
  const issues: CompatibilityIssue[] = [];
  for (const [variantIndex, variant] of (input.variants ?? []).entries()) {
    const variantId = readNonEmptyString(variant.id);
    const colorName = readNonEmptyString(variant.name);
    const variantAdjustment = readNonNegativeMoney(variant.priceAdjustment);
    if (!variantId || !colorName || variantAdjustment === null) {
      issues.push({
        code: "pim_product.unsupported_variant",
        message: `Variant at index ${variantIndex} was excluded because required canonical fields are missing or invalid.`,
        severity: "warning",
        field: `variants[${variantIndex}]`
      });
      continue;
    }

    for (const [sizeIndex, size] of (variant.sizes ?? []).entries()) {
      const variantSizeId = readNonEmptyString(size.id);
      const sku = readNonEmptyString(size.sku);
      const sizeName = readNonEmptyString(size.size?.name);
      const sizeAdjustment = readNonNegativeMoney(size.priceAdjustment);
      const stock = mapCompatibleStock({ stock_quantity: size.stockQuantity });
      const sellableStatus = readVariantStatus(size.status ?? variant.status);
      if (!variantSizeId || !sku || !sizeName || sizeAdjustment === null || stock.status !== "known" || !sellableStatus) {
        issues.push({
          code: "pim_product.unsupported_sellable",
          message: `Sellable at variants[${variantIndex}].sizes[${sizeIndex}] was excluded because canonical ID, SKU, size, adjustment, or stock is unavailable.`,
          severity: "warning",
          field: `variants[${variantIndex}].sizes[${sizeIndex}]`
        });
        continue;
      }

      sellables.push({
        variantId,
        variantSizeId,
        colorName,
        sizeName,
        sku,
        stock,
        variantPriceAdjustment: variantAdjustment,
        sizePriceAdjustment: sizeAdjustment,
        status: sellableStatus
      });
    }
  }

  return compatibilitySuccess({
    source: "pim_product",
    productId: productId as string,
    name: name as string,
    slug: slug as string,
    categoryId: categoryId as string,
    categoryName: readOptionalString(input.category?.name),
    description: readOptionalString(input.description),
    status: productStatus,
    sku: readOptionalString(input.sku),
    pricing: {
      status: "known",
      currency: "IDR",
      amount: basePrice,
      source: "pim_base_price"
    },
    sellables
  }, issues);
}
