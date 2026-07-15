"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type {
  ProductImageRole,
  ProductLifecycle,
  ProductManagerCapabilities,
  ProductRootInput,
  ProductVariantInput,
  ProductVariantStatus,
  ProductWorkflowStep,
  SellableSkuInput,
  VariantImageInput
} from "@/lib/product-manager";
import type { ValidationIssue } from "@/lib/types";

export type ProductManagerCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ProductManagerSubcategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
};

export type ProductManagerColorMaster = {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
};

export type ProductManagerSizeMaster = {
  id: string;
  name: string;
  slug: string;
  sizeGroup: string;
};

export type ProductManagerMediaAsset = {
  id: string;
  name: string;
  publicUrl: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type ProductManagerVariantImage = {
  id: string;
  variantId: string;
  imageRole: ProductImageRole;
  imageUrl: string;
  altText: string | null;
  objectFit: "cover" | "contain";
  objectPosition: string;
  targetRatio: string;
  sortOrder: number;
};

export type ProductManagerSellable = {
  id: string;
  variantId: string;
  sizeId: string | null;
  sizeName: string;
  sku: string;
  stockQuantity: number;
  priceAdjustment: number;
  status: ProductVariantStatus;
  sortOrder: number;
};

export type ProductManagerVariant = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  hexCode: string;
  sku: string | null;
  priceAdjustment: number;
  status: ProductVariantStatus;
  isDefault: boolean;
  sortOrder: number;
  sellable: ProductManagerSellable[];
  images: ProductManagerVariantImage[];
};

export type ProductManagerItem = {
  id: string;
  name: string;
  slug: string;
  productCategoryId: string | null;
  productSubcategoryId: string | null;
  categoryName: string;
  subcategoryName: string;
  basePrice: number;
  description: string | null;
  sku: string | null;
  status: ProductLifecycle;
  productType: string;
  pricingMode: string;
  minimumOrderQty: number;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  variantCount: number;
  sellableCount: number;
  imageCount: number;
  variants: ProductManagerVariant[];
  validationIssues: ValidationIssue[];
  workflow: ProductWorkflowStep[];
  updatedAt: string | null;
};

export type ProductManagerPayload = {
  role: string;
  capabilities: ProductManagerCapabilities;
  categories: ProductManagerCategory[];
  subcategories: ProductManagerSubcategory[];
  colorMaster: ProductManagerColorMaster[];
  sizeMaster: ProductManagerSizeMaster[];
  mediaAssets: ProductManagerMediaAsset[];
  products: ProductManagerItem[];
};

export type ProductManagerAction =
  | "save_draft"
  | "duplicate"
  | "save_variant"
  | "save_sellable"
  | "save_image"
  | "remove_image"
  | "validate_publish"
  | "publish"
  | "archive";

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Sesi admin tidak tersedia.");
  return data.session.access_token;
}

async function requestJson<T>(init?: RequestInit): Promise<T> {
  const token = await accessToken();
  const response = await fetch("/api/admin/products", {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "Operasi Product Manager gagal.");
  return payload as T;
}

export function loadProductManager() {
  return requestJson<ProductManagerPayload>();
}

export function runProductManagerAction(input: {
  action: ProductManagerAction;
  productId?: string;
  product?: ProductRootInput;
  variant?: ProductVariantInput;
  sellable?: SellableSkuInput;
  image?: VariantImageInput;
  imageId?: string;
}) {
  return requestJson<{
    ok: boolean;
    productId?: string;
    variantId?: string;
    sellableId?: string;
    imageId?: string;
    issues?: ValidationIssue[];
    message?: string;
  }>({ method: "POST", body: JSON.stringify(input) });
}
