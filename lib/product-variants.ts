import type {
  ProductLifecycle,
  ProductManagerCapabilities,
  ProductVariantStatus
} from "@/lib/product-manager";

export const PRODUCT_COLOR_TYPES = ["solid", "combination", "pattern"] as const;
export type ProductColorType = (typeof PRODUCT_COLOR_TYPES)[number];

export const PRODUCT_SWATCH_DIRECTIONS = ["diagonal", "horizontal", "vertical"] as const;
export type ProductSwatchDirection = (typeof PRODUCT_SWATCH_DIRECTIONS)[number];

export const PRODUCT_VARIANT_SAVE_STATES = [
  "clean",
  "dirty",
  "saving",
  "saved",
  "conflict",
  "error"
] as const;
export type ProductVariantSaveState = (typeof PRODUCT_VARIANT_SAVE_STATES)[number];

export type ProductColorSwatchValue = {
  colorType: ProductColorType;
  primaryHex: string | null;
  secondaryHex: string | null;
  tertiaryHex: string | null;
  swatchDirection: ProductSwatchDirection;
  patternImageUrl: string | null;
  colorHex: string;
};

export type ProductVariantColorMaster = ProductColorSwatchValue & {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  updatedAt: string | null;
};

export type ProductVariantSizeMaster = {
  id: string;
  name: string;
  slug: string;
  sizeGroup: string;
  sortOrder: number;
};

export type ProductVariantSizeAvailability = {
  sizeId: string;
  sizeName: string;
  sizeSlug: string;
  sizeGroup: string;
  masterSortOrder: number;
  active: boolean;
  sellableId: string | null;
  sku: string | null;
  status: ProductVariantStatus;
  stockQuantity: number;
  priceAdjustment: number;
  sortOrder: number;
  updatedAt: string | null;
};

export type ProductWorkspaceVariant = ProductColorSwatchValue & {
  id: string;
  productId: string;
  colorMasterId: string | null;
  colorMasterName: string | null;
  name: string;
  slug: string;
  sku: string | null;
  priceAdjustment: number;
  status: ProductVariantStatus;
  isDefault: boolean;
  sortOrder: number;
  frontImageComplete: boolean;
  activeSizeCount: number;
  activeSkuCount: number;
  updatedAt: string;
  sizes: ProductVariantSizeAvailability[];
};

export type ProductVariantsPayload = {
  role: string;
  capabilities: ProductManagerCapabilities;
  product: {
    id: string;
    name: string;
    sku: string | null;
    status: ProductLifecycle;
  };
  variants: ProductWorkspaceVariant[];
  colorMasters: ProductVariantColorMaster[];
  sizeMaster: ProductVariantSizeMaster[];
};

export type ProductVariantSettingsForm = {
  colorMasterId: string;
  status: ProductVariantStatus;
  isDefault: boolean;
  sortOrder: number;
};

export type SaveProductVariantInput = ProductVariantSettingsForm & {
  variantId: string | null;
  expectedUpdatedAt: string | null;
  expectedDefaultUpdatedAt: string | null;
};

export type SaveProductVariantSizesInput = {
  variantId: string;
  activeSizeIds: string[];
  expectedVariantUpdatedAt: string;
  expectedRowVersions: Record<string, string>;
};

export type ProductVariantsMutationResult = {
  ok: true;
  message: string;
  variantId: string;
  payload: ProductVariantsPayload;
};

export function canManageProductVariants(capabilities: ProductManagerCapabilities) {
  return capabilities.canManageDependencies;
}

export function productVariantFormFromItem(
  variant: ProductWorkspaceVariant
): ProductVariantSettingsForm {
  return {
    colorMasterId: variant.colorMasterId || "",
    status: variant.status,
    isDefault: variant.isDefault,
    sortOrder: variant.sortOrder
  };
}

export function emptyProductVariantForm(input: {
  firstVariant: boolean;
  sortOrder: number;
}): ProductVariantSettingsForm {
  return {
    colorMasterId: "",
    status: "active",
    isDefault: input.firstVariant,
    sortOrder: input.sortOrder
  };
}

export function sameProductVariantForm(
  left: ProductVariantSettingsForm,
  right: ProductVariantSettingsForm
) {
  return left.colorMasterId === right.colorMasterId &&
    left.status === right.status &&
    left.isDefault === right.isDefault &&
    Number(left.sortOrder) === Number(right.sortOrder);
}

export function activeProductVariantSizeIds(variant: ProductWorkspaceVariant) {
  return variant.sizes.filter((item) => item.active).map((item) => item.sizeId);
}

export function sameSizeSelection(left: Iterable<string>, right: Iterable<string>) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function normalizeProductColorType(value: unknown): ProductColorType {
  return PRODUCT_COLOR_TYPES.includes(value as ProductColorType)
    ? value as ProductColorType
    : "solid";
}

export function normalizeProductSwatchDirection(value: unknown): ProductSwatchDirection {
  return PRODUCT_SWATCH_DIRECTIONS.includes(value as ProductSwatchDirection)
    ? value as ProductSwatchDirection
    : "diagonal";
}

export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

export function fallbackSwatchHex(value: ProductColorSwatchValue) {
  return value.primaryHex || normalizeHex(value.colorHex) || "#111111";
}

export function safePatternImageUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
