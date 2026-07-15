import type { AdminRole } from "@/lib/access-control";
import type { ValidationIssue } from "@/lib/types";

export const PRODUCT_LIFECYCLE = ["draft", "active", "archived"] as const;
export type ProductLifecycle = (typeof PRODUCT_LIFECYCLE)[number];

export const PRODUCT_MANAGER_ROLES: readonly AdminRole[] = [
  "owner",
  "superadmin",
  "super_admin",
  "admin"
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

  return {
    canCreateDraft: canUseProductManager,
    canEditDraft: canUseProductManager,
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
    status: string;
    hasFrontImage: boolean;
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

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    minimumOrderQty
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

export function lifecycleLabel(status: ProductLifecycle) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
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
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
