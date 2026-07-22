import type {
  ProductLifecycle,
  ProductManagerCapabilities,
  ProductRootInput
} from "@/lib/product-manager";
import type { ProductWorkspaceProduct } from "@/lib/product-workspace";

export const PRODUCT_INFORMATION_SAVE_STATES = [
  "clean",
  "dirty",
  "saving",
  "saved",
  "conflict",
  "error"
] as const;

export type ProductInformationSaveState =
  (typeof PRODUCT_INFORMATION_SAVE_STATES)[number];

export type ProductInformationCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ProductInformationSubcategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
};

export type ProductInformationProduct = {
  id: string;
  name: string;
  slug: string;
  status: ProductLifecycle;
  productCategoryId: string;
  productSubcategoryId: string | null;
  categoryName: string;
  subcategoryName: string;
  basePrice: number;
  description: string | null;
  sku: string | null;
  productType: string;
  pricingMode: string;
  minimumOrderQty: number;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  updatedAt: string | null;
};

export type ProductInformationPayload = {
  role: string;
  capabilities: ProductManagerCapabilities;
  product: ProductInformationProduct;
  categories: ProductInformationCategory[];
  subcategories: ProductInformationSubcategory[];
};

export type ProductInformationMutationPayload = {
  ok: true;
  message: string;
  product: ProductInformationProduct;
};

export type ProductInformationFormValue = {
  name: string;
  slug: string;
  productCategoryId: string;
  productSubcategoryId: string | null;
  basePrice: number;
  description: string;
  sku: string;
  productType: string;
  pricingMode: string;
  minimumOrderQty: number;
  seoTitle: string;
  seoDescription: string;
};

export function productInformationFormFromProduct(
  product: ProductInformationProduct
): ProductInformationFormValue {
  return {
    name: product.name,
    slug: product.slug,
    productCategoryId: product.productCategoryId,
    productSubcategoryId: product.productSubcategoryId,
    basePrice: product.basePrice,
    description: product.description || "",
    sku: product.sku || "",
    productType: product.productType || "standard_product",
    pricingMode: product.pricingMode || "fixed_price",
    minimumOrderQty: Math.max(1, product.minimumOrderQty || 1),
    seoTitle: product.seoTitle || "",
    seoDescription: product.seoDescription || ""
  };
}

export function productInformationInput(
  productId: string,
  value: ProductInformationFormValue
): ProductRootInput {
  return {
    id: productId,
    name: value.name.trim(),
    slug: value.slug.trim(),
    productCategoryId: value.productCategoryId,
    productSubcategoryId: value.productSubcategoryId || null,
    basePrice: Number(value.basePrice),
    description: nullableText(value.description),
    sku: nullableText(value.sku),
    productType: value.productType || "standard_product",
    pricingMode: value.pricingMode || "fixed_price",
    minimumOrderQty: Number(value.minimumOrderQty),
    seoTitle: nullableText(value.seoTitle),
    seoDescription: nullableText(value.seoDescription)
  };
}

export function canEditProductInformation(
  capabilities: ProductManagerCapabilities,
  status: ProductLifecycle
) {
  return status === "draft"
    ? capabilities.canEditDraft
    : capabilities.canEditPublished;
}

export function sameProductInformation(
  left: ProductInformationFormValue,
  right: ProductInformationFormValue
) {
  return JSON.stringify(canonicalForm(left)) === JSON.stringify(canonicalForm(right));
}

export function workspaceProductFromInformation(
  product: ProductInformationProduct
): ProductWorkspaceProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    categoryId: product.productCategoryId || null,
    categoryName: product.categoryName,
    basePrice: product.basePrice,
    sku: product.sku,
    imageUrl: product.imageUrl,
    updatedAt: product.updatedAt
  };
}

export function slugifyProductInformation(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalForm(value: ProductInformationFormValue) {
  return {
    name: value.name.trim(),
    slug: value.slug.trim(),
    productCategoryId: value.productCategoryId,
    productSubcategoryId: value.productSubcategoryId || null,
    basePrice: Number(value.basePrice),
    description: value.description.trim(),
    sku: value.sku.trim(),
    productType: value.productType || "standard_product",
    pricingMode: value.pricingMode || "fixed_price",
    minimumOrderQty: Number(value.minimumOrderQty),
    seoTitle: value.seoTitle.trim(),
    seoDescription: value.seoDescription.trim()
  };
}

function nullableText(value: string) {
  const normalized = value.trim();
  return normalized || null;
}
