"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type {
  ProductVariantsMutationResult,
  ProductVariantsPayload,
  SaveProductVariantInput,
  SaveProductVariantSizesInput
} from "@/lib/product-variants";

export class ProductVariantsRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new ProductVariantsRequestError(503, "Supabase belum dikonfigurasi.");
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ProductVariantsRequestError(401, "Sesi admin tidak tersedia.");
  }
  return data.session.access_token;
}

export async function loadProductVariants(
  productId: string,
  signal?: AbortSignal
): Promise<ProductVariantsPayload> {
  return requestProductVariants<ProductVariantsPayload>(productId, {
    method: "GET",
    signal
  });
}

export async function saveProductVariant(
  productId: string,
  input: SaveProductVariantInput
): Promise<ProductVariantsMutationResult> {
  return requestProductVariants<ProductVariantsMutationResult>(productId, {
    method: "PATCH",
    body: JSON.stringify({ action: "save_variant", input }),
    headers: mutationHeaders()
  });
}

export async function saveProductVariantSizes(
  productId: string,
  input: SaveProductVariantSizesInput
): Promise<ProductVariantsMutationResult> {
  return requestProductVariants<ProductVariantsMutationResult>(productId, {
    method: "PATCH",
    body: JSON.stringify({ action: "save_sizes", input }),
    headers: mutationHeaders()
  });
}

async function requestProductVariants<T>(
  productId: string,
  init: RequestInit
): Promise<T> {
  const token = await accessToken();
  const response = await fetch(
    `/api/admin/products/${encodeURIComponent(productId)}/variants`,
    {
      ...init,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.headers || {})
      }
    }
  );
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    throw new ProductVariantsRequestError(
      response.status,
      payload.error || "Varian produk belum dapat diproses."
    );
  }
  return payload as T;
}

function mutationHeaders() {
  return {
    "content-type": "application/json",
    "x-request-id": crypto.randomUUID(),
    "x-operation-id": crypto.randomUUID()
  };
}
