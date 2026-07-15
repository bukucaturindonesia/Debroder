"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type {
  ProductLifecycle,
  ProductManagerCapabilities,
  ProductRootInput
} from "@/lib/product-manager";
import type { ValidationIssue } from "@/lib/types";

export type ProductManagerCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ProductManagerItem = {
  id: string;
  name: string;
  slug: string;
  productCategoryId: string | null;
  productSubcategoryId: string | null;
  categoryName: string;
  basePrice: number;
  description: string | null;
  sku: string | null;
  status: ProductLifecycle;
  productType: string;
  pricingMode: string;
  minimumOrderQty: number;
  imageUrl: string | null;
  variantCount: number;
  sellableCount: number;
  imageCount: number;
  validationIssues: ValidationIssue[];
  updatedAt: string | null;
};

export type ProductManagerPayload = {
  role: string;
  capabilities: ProductManagerCapabilities;
  categories: ProductManagerCategory[];
  products: ProductManagerItem[];
};

export type ProductManagerAction =
  | "save_draft"
  | "duplicate"
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
}) {
  return requestJson<{
    ok: boolean;
    productId?: string;
    issues?: ValidationIssue[];
    message?: string;
  }>({ method: "POST", body: JSON.stringify(input) });
}
