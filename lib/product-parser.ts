import type {
  ImageRole,
  PimProduct as Product,
  PimProductCategory as ProductCategory,
  ProductMinimumRule,
  ProductPriceTier,
  ProductSize,
  PimProductVariant as ProductVariant,
  PimProductVariantImage as ProductVariantImage,
  PimProductVariantSize as ProductVariantSize,
  SizeStatus,
  VariantStatus
} from "@/lib/types";

export function parseProductPayload(value: unknown): Product | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: readString(value.id),
    name: readString(value.name),
    slug: readString(value.slug),
    productCategoryId: readString(value.productCategoryId),
    category: parseCategory(value.category),
    basePrice: readNumber(value.basePrice),
    description: readNullableString(value.description),
    status: readProductStatus(value.status),
    sku: readNullableString(value.sku),
    variants: readRecordArray(value.variants).map(parseVariant),
    priceTiers: readRecordArray(value.priceTiers).map(parsePriceTier),
    minimumRule: parseMinimumRule(value.minimumRule)
  };
}

function parsePriceTier(value: Record<string, unknown>): ProductPriceTier {
  return {
    id: readString(value.id),
    productId: readString(value.productId),
    minQuantity: readNumber(value.minQuantity),
    maxQuantity: readNullableNumber(value.maxQuantity),
    unitPrice: readNullableNumber(value.unitPrice),
    quoteRequired: value.quoteRequired === true,
    status: readLifecycleStatus(value.status),
    sortOrder: readNumber(value.sortOrder)
  };
}

function parseMinimumRule(value: unknown): ProductMinimumRule | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: readString(value.id),
    productId: readString(value.productId),
    minimumQuantity: readNumber(value.minimumQuantity),
    minimumForTierQuantity: readNullableNumber(value.minimumForTierQuantity),
    quotationQuantity: readNullableNumber(value.quotationQuantity),
    status: readLifecycleStatus(value.status)
  };
}

function parseCategory(value: unknown): ProductCategory | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: readString(value.id),
    name: readString(value.name),
    slug: readString(value.slug),
    description: readNullableString(value.description),
    status: value.status === "inactive" ? "inactive" : "active",
    sortOrder: readNumber(value.sortOrder)
  };
}

function parseVariant(value: Record<string, unknown>): ProductVariant {
  return {
    id: readString(value.id),
    productId: readString(value.productId),
    name: readString(value.name),
    slug: readString(value.slug),
    hexCode: readString(value.hexCode),
    sku: readString(value.sku),
    sortOrder: readNumber(value.sortOrder),
    isDefault: value.isDefault === true,
    status: readVariantStatus(value.status),
    priceAdjustment: readNumber(value.priceAdjustment),
    images: readRecordArray(value.images).map(parseImage),
    sizes: readRecordArray(value.sizes).map(parseVariantSize)
  };
}

function parseImage(value: Record<string, unknown>): ProductVariantImage {
  return {
    id: readString(value.id),
    variantId: readString(value.variantId),
    imageUrl: readString(value.imageUrl),
    imageRole: readImageRole(value.imageRole),
    sortOrder: readNumber(value.sortOrder),
    altText: readNullableString(value.altText)
  };
}

function parseVariantSize(value: Record<string, unknown>): ProductVariantSize {
  return {
    id: readString(value.id),
    variantId: readString(value.variantId),
    sizeId: readString(value.sizeId),
    sku: readString(value.sku),
    stockQuantity: readNumber(value.stockQuantity),
    priceAdjustment: readNumber(value.priceAdjustment),
    status: readVariantStatus(value.status),
    size: parseSize(value.size)
  };
}

function parseSize(value: unknown): ProductSize {
  if (!isRecord(value)) {
    return {
      id: "",
      name: "",
      slug: "",
      sortOrder: 0,
      status: "inactive",
      priceAdjustment: 0
    };
  }

  return {
    id: readString(value.id),
    name: readString(value.name),
    slug: readString(value.slug),
    sortOrder: readNumber(value.sortOrder),
    status: readSizeStatus(value.status),
    priceAdjustment: readNumber(value.priceAdjustment)
  };
}

function readProductStatus(value: unknown): Product["status"] {
  if (value === "draft" || value === "archived") {
    return value;
  }

  return "active";
}

function readVariantStatus(value: unknown): VariantStatus {
  if (value === "inactive" || value === "out_of_stock") {
    return value;
  }

  return "active";
}

function readSizeStatus(value: unknown): SizeStatus {
  return value === "inactive" ? "inactive" : "active";
}

function readLifecycleStatus(value: unknown): "active" | "inactive" | "archived" {
  if (value === "inactive" || value === "archived") {
    return value;
  }

  return "active";
}

function readImageRole(value: unknown): ImageRole {
  if (value === "back" || value === "detail" || value === "lifestyle") {
    return value;
  }

  return "front";
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
