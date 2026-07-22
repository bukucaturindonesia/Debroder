"use client";

import { createSupabaseClient } from "@/lib/supabase";
import {
  productMediaQueryString,
  type ProductMediaMutationResult,
  type ProductMediaPayload,
  type ProductMediaQuery,
  type ProductMediaSaveChange
} from "@/lib/product-media";

export class ProductMediaRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function loadProductMedia(
  productId: string,
  query: ProductMediaQuery,
  signal?: AbortSignal
): Promise<ProductMediaPayload> {
  return requestProductMedia<ProductMediaPayload>(
    productId,
    `?${productMediaQueryString(query)}`,
    { method: "GET", signal }
  );
}

export async function saveProductMedia(input: {
  productId: string;
  variantId: string;
  expectedVariantUpdatedAt: string;
  changes: ProductMediaSaveChange[];
}): Promise<ProductMediaMutationResult> {
  return requestProductMedia<ProductMediaMutationResult>(
    input.productId,
    "",
    {
      method: "PATCH",
      body: JSON.stringify({
        action: "save_slots",
        variantId: input.variantId,
        expectedVariantUpdatedAt: input.expectedVariantUpdatedAt,
        changes: input.changes
      }),
      headers: mutationHeaders()
    }
  );
}

async function requestProductMedia<T>(
  productId: string,
  suffix: string,
  init: RequestInit
): Promise<T> {
  const token = await accessToken();
  const response = await fetch(
    `/api/admin/products/${encodeURIComponent(productId)}/media${suffix}`,
    {
      ...init,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.headers || {})
      }
    }
  );
  const payload = await response.json().catch(() => ({})) as {
    error?: string;
  };
  if (!response.ok) {
    throw new ProductMediaRequestError(
      response.status,
      payload.error || "Media produk belum dapat diproses."
    );
  }
  return payload as T;
}

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new ProductMediaRequestError(
      503,
      "Supabase belum dikonfigurasi."
    );
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ProductMediaRequestError(
      401,
      "Sesi admin tidak tersedia."
    );
  }
  return data.session.access_token;
}

function mutationHeaders() {
  return {
    "content-type": "application/json",
    "x-request-id": crypto.randomUUID(),
    "x-operation-id": crypto.randomUUID()
  };
}
