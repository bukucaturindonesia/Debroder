"use client";

import { createSupabaseClient } from "@/lib/supabase";
import {
  productInventoryQueryString,
  type ProductInventoryMutationResult,
  type ProductInventoryPayload,
  type ProductInventoryQuery,
  type ProductInventorySaveChange
} from "@/lib/product-inventory";

export class ProductInventoryRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function loadProductInventory(
  productId: string,
  query: ProductInventoryQuery,
  signal?: AbortSignal
): Promise<ProductInventoryPayload> {
  return requestProductInventory<ProductInventoryPayload>(
    productId,
    `?${productInventoryQueryString(query)}`,
    { method: "GET", signal }
  );
}

export async function mutateProductInventory(input: {
  productId: string;
  action: "preview" | "commit";
  locationId: string;
  changes: ProductInventorySaveChange[];
  reason: string;
}): Promise<ProductInventoryMutationResult> {
  return requestProductInventory<ProductInventoryMutationResult>(
    input.productId,
    "",
    {
      method: "PATCH",
      body: JSON.stringify({
        action: input.action,
        locationId: input.locationId,
        changes: input.changes,
        reason: input.reason
      }),
      headers: {
        "content-type": "application/json",
        "x-request-id": crypto.randomUUID(),
        "x-operation-id": crypto.randomUUID()
      }
    }
  );
}

async function requestProductInventory<T>(
  productId: string,
  suffix: string,
  init: RequestInit
): Promise<T> {
  const token = await accessToken();
  const response = await fetch(
    `/api/admin/products/${encodeURIComponent(productId)}/inventory${suffix}`,
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
    throw new ProductInventoryRequestError(
      response.status,
      payload.error || "Harga dan stok belum dapat diproses."
    );
  }
  return payload as T;
}

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new ProductInventoryRequestError(
      503,
      "Supabase belum dikonfigurasi."
    );
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ProductInventoryRequestError(
      401,
      "Sesi admin tidak tersedia."
    );
  }
  return data.session.access_token;
}
