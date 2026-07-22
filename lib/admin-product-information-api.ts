"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type { ProductRootInput } from "@/lib/product-manager";
import type {
  ProductInformationMutationPayload,
  ProductInformationPayload
} from "@/lib/product-information";
import type { ValidationIssue } from "@/lib/types";

export class ProductInformationRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues: ValidationIssue[] = []
  ) {
    super(message);
  }
}

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new ProductInformationRequestError(503, "Supabase belum dikonfigurasi.");
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ProductInformationRequestError(401, "Sesi admin tidak tersedia.");
  }
  return data.session.access_token;
}

export async function loadProductInformation(
  productId: string,
  signal?: AbortSignal
): Promise<ProductInformationPayload> {
  return requestProductInformation<ProductInformationPayload>(
    productId,
    { method: "GET", signal }
  );
}

export async function saveProductInformation(
  productId: string,
  product: ProductRootInput,
  expectedUpdatedAt: string | null
): Promise<ProductInformationMutationPayload> {
  return requestProductInformation<ProductInformationMutationPayload>(
    productId,
    {
      method: "PATCH",
      body: JSON.stringify({ product, expectedUpdatedAt }),
      headers: {
        "content-type": "application/json",
        "x-request-id": crypto.randomUUID(),
        "x-operation-id": crypto.randomUUID()
      }
    }
  );
}

async function requestProductInformation<T>(
  productId: string,
  init: RequestInit
): Promise<T> {
  const token = await accessToken();
  const response = await fetch(
    `/api/admin/products/${encodeURIComponent(productId)}/information`,
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
    issues?: ValidationIssue[];
  };
  if (!response.ok) {
    throw new ProductInformationRequestError(
      response.status,
      payload.error || "Informasi produk belum dapat diproses.",
      payload.issues || []
    );
  }
  return payload as T;
}
