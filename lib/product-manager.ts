import type { AdminRole } from "@/lib/access-control";
import type { ValidationIssue } from "@/lib/types";

export const PRODUCT_LIFECYCLE = ["draft", "active", "archived"] as const;
export type ProductLifecycle = (typeof PRODUCT_LIFECYCLE)[number];

export const PRODUCT_VARIANT_STATUS = ["active", "inactive"] as const;
export type ProductVariantStatus = (typeof PRODUCT_VARIANT_STATUS)[number];

export const PRODUCT_IMAGE_ROLES = ["front", "back", "detail", "lifestyle"] as const;
export type ProductImageRole = (typeof PRODUCT_IMAGE_ROLES)[number];

export const PRODUCT_MANAGER_ROLES: readonly AdminRole[] = [
  "owner",
  "superadmin",
  "super_admin",
  "admin",
  "admin_guest"
];

export const PRODUCT_LIFECYCLE_ROLES: readonly AdminRole[] = [
  "owner",
  "superadmin",
  "super_admin"
];

export const PRODUCT_MAINTENANCE_ROLES = PRODUCT_LIFECYCLE_ROLES;

export type ProductManagerCapabilities = {
  canCreateDraft: boolean;
  canEditDraft: boolean;
  canEditPublished: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canManageDependencies: boolean;
  canUseMaintenance: boolean;
};

export function getProductManagerCapabilities(role: string | null | undefined): ProductManagerCapabilities {
  const canUseProductManager = PRODUCT_MANAGER_ROLES.includes(role as AdminRole);
  const canManageLifecycle = PRODUCT_LIFECYCLE_ROLES.includes(role as AdminRole);
  const readOnly = role === "admin_guest";

  return {
    canCreateDraft: canUseProductManager && !readOnly,
    canEditDraft: canUseProductManager && !readOnly,
    canEditPublished: canManageLifecycle,
    canPublish: canManageLifecycle,
    canArchive: canManageLifecycle,
    canManageDependencies: canManageLifecycle,
    canUseMaintenance: canManageLifecycle
  };
}

export type ProductRootInput = {
  id?: string | null;
  name: string;
  slug: string;
  productCategoryId: string;
  productSubcategoryId?: string | null;
  basePrice: number;
  description?: string | null;
  sku?: string | null;
  productType?: string | null;
  pricingMode?: string | null;
  minimumOrderQty?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type ProductVariantInput = {
  id?: string | null;
  productId: string;
  colorMasterId?: string | null;
  name: string;
  slug: string;
  hexCode: string;
  sku?: string | null;
  priceAdjustment: number;
  status: ProductVariantStatus;
  sortOrder: number;
};

export type SellableSkuInput = {
  id?: string | null;
  variantId: string;
  sizeId: string;
  sku: string;
  stockQuantity: number;
  priceAdjustment: number;
  status: ProductVariantStatus;
  sortOrder: number;
};

export type VariantImageInput = {
  id?: string | null;
  variantId: string;
  imageRole: ProductImageRole;
  imageUrl: string;
  altText?: string | null;
  objectFit?: "cover" | "contain";
  objectPosition?: string | null;
};

export type ProductPublishSnapshot = {
  id: string;
  name: string;
  slug: string;
  productCategoryId: string | null;
  basePrice: number | null;
  status: ProductLifecycle;
  categoryActive: boolean;
  duplicateSlug: boolean;
  variants: Array<{
    id: string;
    name: string;
    slug?: string;
    hexCode?: string;
    status: string;
    hasFrontImage: boolean;
    imageRoles?: ProductImageRole[];
    sellable: Array<{
      id: string;
      sku: string | null;
      sizeId: string | null;
      sizeActive: boolean;
      stockQuantity: number | null;
      status: string;
      duplicateSku: boolean;
    }>;
  }>;
};

export type ProductWorkflowStepKey =
  | "product"
  | "colors"
  | "sizes"
  | "pricing"
  | "images"
  | "review";

export type ProductWorkflowStepStatus = "incomplete" | "needs_attention" | "complete" | "ready";

export type ProductWorkflowStep = {
  key: ProductWorkflowStepKey;
  label: string;
  status: ProductWorkflowStepStatus;
  detail: string;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function normalizeProductRootInput(value: unknown): ProductRootInput | null {
  if (!isRecord(value)) return null;

  const name = text(value.name);
  const slug = text(value.slug);
  const productCategoryId = text(value.productCategoryId);
  const basePrice = numeric(value.basePrice);
  const minimumOrderQty = nullableInteger(value.minimumOrderQty);

  if (!name || !slug || !productCategoryId || basePrice === null) return null;

  return {
    id: nullableText(value.id),
    name,
    slug,
    productCategoryId,
    productSubcategoryId: nullableText(value.productSubcategoryId),
    basePrice,
    description: nullableText(value.description),
    sku: nullableText(value.sku),
    productType: nullableText(value.productType),
    pricingMode: nullableText(value.pricingMode),
    minimumOrderQty,
    seoTitle: nullableText(value.seoTitle),
    seoDescription: nullableText(value.seoDescription)
  };
}

export function normalizeProductVariantInput(value: unknown): ProductVariantInput | null {
  if (!isRecord(value)) return null;
  const productId = text(value.productId);
  const name = text(value.name);
  const slug = text(value.slug);
  const hexCode = text(value.hexCode);
  const priceAdjustment = numeric(value.priceAdjustment);
  const sortOrder = integer(value.sortOrder, 0);
  const status = variantStatus(value.status);

  if (!productId || !name || !slug || !hexCode || priceAdjustment === null) return null;
  return {
    id: nullableText(value.id),
    productId,
    colorMasterId: nullableText(value.colorMasterId),
    name,
    slug,
    hexCode,
    sku: nullableText(value.sku),
    priceAdjustment,
    status,
    sortOrder
  };
}

export function normalizeSellableSkuInput(value: unknown): SellableSkuInput | null {
  if (!isRecord(value)) return null;
  const variantId = text(value.variantId);
  const sizeId = text(value.sizeId);
  const sku = text(value.sku);
  const stockQuantity = numeric(value.stockQuantity);
  const priceAdjustment = numeric(value.priceAdjustment);
  const sortOrder = integer(value.sortOrder, 0);
  const status = variantStatus(value.status);

  if (!variantId || !sizeId || !sku || stockQuantity === null || priceAdjustment === null) return null;
  return {
    id: nullableText(value.id),
    variantId,
    sizeId,
    sku,
    stockQuantity,
    priceAdjustment,
    status,
    sortOrder
  };
}

export function normalizeVariantImageInput(value: unknown): VariantImageInput | null {
  if (!isRecord(value)) return null;
  const variantId = text(value.variantId);
  const role = PRODUCT_IMAGE_ROLES.includes(value.imageRole as ProductImageRole) ? value.imageRole as ProductImageRole : null;
  const imageUrl = text(value.imageUrl);
  const objectFit = value.objectFit === "contain" ? "contain" : "cover";
  if (!variantId || !role || !imageUrl) return null;
  return {
    id: nullableText(value.id),
    variantId,
    imageRole: role,
    imageUrl,
    altText: nullableText(value.altText),
    objectFit,
    objectPosition: nullableText(value.objectPosition)
  };
}

export function validateProductRootDraft(input: ProductRootInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (input.name.trim().length < 2) {
    issues.push(error("name", "Nama produk wajib diisi minimal 2 karakter."));
  }
  if (!SLUG_PATTERN.test(input.slug)) {
    issues.push(error("slug", "Slug wajib memakai huruf kecil dan format kebab-case."));
  }
  if (!input.productCategoryId) {
    issues.push(error("product_category_id", "Kategori utama wajib dipilih."));
  }
  if (!Number.isInteger(input.basePrice) || input.basePrice < 0) {
    issues.push(error("base_price", "Harga dasar wajib berupa integer dan tidak boleh negatif."));
  }
  if (
    input.minimumOrderQty !== null && input.minimumOrderQty !== undefined &&
    (!Number.isInteger(input.minimumOrderQty) || input.minimumOrderQty < 1)
  ) {
    issues.push(error("minimum_order_qty", "Minimum order wajib integer positif."));
  }

  return issues;
}

export function validateProductVariantDraft(input: ProductVariantInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.productId) issues.push(error("variant.product_id", "Produk wajib dipilih."));
  if (input.name.trim().length < 2) issues.push(error("variant.name", "Nama warna wajib diisi."));
  if (!SLUG_PATTERN.test(input.slug)) issues.push(error("variant.slug", "Slug warna wajib kebab-case."));
  if (!HEX_PATTERN.test(input.hexCode)) issues.push(error("variant.hex_code", "HEX warna wajib format #RRGGBB."));
  if (!Number.isInteger(input.priceAdjustment)) issues.push(error("variant.price_adjustment", "Penyesuaian harga warna wajib integer."));
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) issues.push(error("variant.sort_order", "Urutan warna wajib integer nol atau lebih."));
  return issues;
}

export function validateSellableSkuDraft(input: SellableSkuInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.variantId) issues.push(error("variant_size.variant_id", "Color variant wajib dipilih."));
  if (!input.sizeId) issues.push(error("variant_size.size_id", "Ukuran wajib memakai size master."));
  if (!input.sku.trim()) issues.push(error("variant_size.sku", "Sellable SKU wajib diisi."));
  if (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0) {
    issues.push(error("variant_size.stock_quantity", "Stok wajib integer dan tidak boleh negatif."));
  }
  if (!Number.isInteger(input.priceAdjustment)) {
    issues.push(error("variant_size.price_adjustment", "Penyesuaian harga SKU wajib integer."));
  }
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    issues.push(error("variant_size.sort_order", "Urutan SKU wajib integer nol atau lebih."));
  }
  return issues;
}

export function validateVariantImageDraft(input: VariantImageInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.variantId) issues.push(error("variant_image.variant_id", "Color variant wajib dipilih."));
  if (!PRODUCT_IMAGE_ROLES.includes(input.imageRole)) issues.push(error("variant_image.role", "Role gambar tidak valid."));
  if (!/^https?:\/\//i.test(input.imageUrl)) issues.push(error("variant_image.url", "URL gambar wajib berupa URL publik HTTPS/HTTP."));
  return issues;
}

export function validateProductPublishSnapshot(snapshot: ProductPublishSnapshot): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!snapshot.name.trim()) issues.push(error("name", "Nama produk wajib diisi."));
  if (!SLUG_PATTERN.test(snapshot.slug)) issues.push(error("slug", "Slug wajib valid dan unik."));
  if (snapshot.duplicateSlug) issues.push(error("slug", "Slug sudah dipakai produk lain."));
  if (!snapshot.productCategoryId || !snapshot.categoryActive) {
    issues.push(error("product_category_id", "Kategori produk tidak valid atau tidak aktif."));
  }
  if (snapshot.basePrice === null || !Number.isInteger(snapshot.basePrice) || snapshot.basePrice < 0) {
    issues.push(error("base_price", "Harga dasar wajib berupa integer dan tidak boleh negatif."));
  }
  if (snapshot.status !== "draft") {
    issues.push(error("status", "Hanya produk Draft yang dapat dipublish."));
  }

  const activeVariants = snapshot.variants.filter((variant) => variant.status === "active");
  if (!activeVariants.length) {
    issues.push(error("variants", "Minimal satu color variant aktif wajib tersedia."));
  }

  const localSkus = new Set<string>();
  for (const variant of activeVariants) {
    if (!variant.name.trim()) {
      issues.push(error(`variant.${variant.id}.name`, "Nama color variant wajib diisi."));
    }
    if (variant.slug !== undefined && !SLUG_PATTERN.test(variant.slug)) {
      issues.push(error(`variant.${variant.id}.slug`, "Slug color variant wajib kebab-case."));
    }
    if (variant.hexCode !== undefined && !HEX_PATTERN.test(variant.hexCode)) {
      issues.push(error(`variant.${variant.id}.hex_code`, "HEX color variant wajib format #RRGGBB."));
    }
    if (!variant.hasFrontImage) {
      issues.push(error(`variant.${variant.id}.images`, "Color variant aktif wajib memiliki gambar front."));
    }

    const activeSellable = variant.sellable.filter((item) => item.status === "active");
    if (!activeSellable.length) {
      issues.push(error(`variant.${variant.id}.sizes`, "Color variant aktif wajib memiliki sellable SKU aktif."));
    }

    for (const sellable of activeSellable) {
      const sku = sellable.sku?.trim() || "";
      if (!sku) {
        issues.push(error(`variant_size.${sellable.id}.sku`, "Sellable SKU wajib diisi."));
      } else if (localSkus.has(sku) || sellable.duplicateSku) {
        issues.push(error(`variant_size.${sellable.id}.sku`, "Sellable SKU duplikat."));
      } else {
        localSkus.add(sku);
      }

      if (!sellable.sizeId || !sellable.sizeActive) {
        issues.push(error(`variant_size.${sellable.id}.size_id`, "Ukuran wajib memakai size master aktif."));
      }
      if (
        sellable.stockQuantity === null ||
        !Number.isInteger(sellable.stockQuantity) ||
        sellable.stockQuantity < 0
      ) {
        issues.push(error(`variant_size.${sellable.id}.stock_quantity`, "Stok wajib integer dan tidak boleh negatif."));
      }
    }
  }

  return deduplicateIssues(issues);
}

export function getProductWorkflowProgress(snapshot: ProductPublishSnapshot): ProductWorkflowStep[] {
  const issues = validateProductPublishSnapshot(snapshot);
  const activeVariants = snapshot.variants.filter((variant) => variant.status === "active");
  const activeSellable = activeVariants.flatMap((variant) => variant.sellable.filter((item) => item.status === "active"));
  const rootInvalid = issues.some((issue) => ["name", "slug", "product_category_id", "base_price"].includes(issue.field));
  const colorInvalid = issues.some((issue) => issue.field === "variants" || issue.field.startsWith("variant.") && !issue.field.includes(".images") && !issue.field.includes(".sizes"));
  const sizeInvalid = issues.some((issue) => issue.field.includes(".sizes") || issue.field.endsWith(".sku") || issue.field.endsWith(".size_id"));
  const stockInvalid = issues.some((issue) => issue.field.endsWith(".stock_quantity"));
  const imageInvalid = issues.some((issue) => issue.field.endsWith(".images"));
  const allFourImages = activeVariants.length > 0 && activeVariants.every((variant) => new Set(variant.imageRoles || []).size === PRODUCT_IMAGE_ROLES.length);

  return [
    {
      key: "product",
      label: "Informasi Produk",
      status: rootInvalid ? "needs_attention" : "complete",
      detail: rootInvalid ? "Nama, slug, kategori, atau harga dasar perlu diperbaiki." : "Identitas product root lengkap."
    },
    {
      key: "colors",
      label: "Warna",
      status: activeVariants.length === 0 ? "incomplete" : colorInvalid ? "needs_attention" : "complete",
      detail: activeVariants.length === 0 ? "Belum ada color variant aktif." : colorInvalid ? "Data color variant perlu diperbaiki." : `${activeVariants.length} color variant aktif.`
    },
    {
      key: "sizes",
      label: "Ukuran & SKU",
      status: activeSellable.length === 0 ? "incomplete" : sizeInvalid ? "needs_attention" : "complete",
      detail: activeSellable.length === 0 ? "Belum ada sellable SKU aktif." : sizeInvalid ? "SKU atau relasi size master perlu diperbaiki." : `${activeSellable.length} sellable SKU aktif.`
    },
    {
      key: "pricing",
      label: "Harga & Stok",
      status: activeSellable.length === 0 ? "incomplete" : stockInvalid ? "needs_attention" : "complete",
      detail: activeSellable.length === 0 ? "Harga dan stok SKU belum tersedia." : stockInvalid ? "Nilai stok perlu diperbaiki." : "Harga canonical dan stok sellable lengkap."
    },
    {
      key: "images",
      label: "Gambar",
      status: imageInvalid ? "needs_attention" : allFourImages ? "complete" : "incomplete",
      detail: imageInvalid ? "Setiap warna aktif wajib memiliki gambar front." : allFourImages ? "Empat image role lengkap pada seluruh warna aktif." : "Gambar front tersedia; slot lainnya belum lengkap."
    },
    {
      key: "review",
      label: "Review & Publish",
      status: issues.filter((issue) => issue.severity === "error").length === 0 ? "ready" : "needs_attention",
      detail: issues.filter((issue) => issue.severity === "error").length === 0 ? "Siap Publish." : `${issues.filter((issue) => issue.severity === "error").length} blocker harus diselesaikan.`
    }
  ];
}

export function lifecycleLabel(status: ProductLifecycle) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

export function workflowStatusLabel(status: ProductWorkflowStepStatus) {
  if (status === "ready") return "Siap Publish";
  if (status === "complete") return "Lengkap";
  if (status === "needs_attention") return "Perlu diperbaiki";
  return "Belum lengkap";
}

function deduplicateIssues(issues: ValidationIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.field}|${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function error(field: string, message: string): ValidationIssue {
  return { field, message, severity: "error" };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function nullableText(value: unknown) {
  const valueText = text(value);
  return valueText || null;
}
function numeric(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}
function nullableInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = numeric(value);
  return number !== null ? number : null;
}
function integer(value: unknown, fallback: number) {
  const number = numeric(value);
  return number !== null && Number.isInteger(number) ? number : fallback;
}
function variantStatus(value: unknown): ProductVariantStatus {
  return value === "inactive" ? "inactive" : "active";
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
