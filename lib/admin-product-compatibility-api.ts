"use client";

import { createSupabaseClient } from "@/lib/supabase";

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Sesi admin tidak tersedia.");
  return data.session.access_token;
}

export async function duplicateProductAsDraft(
  productId: string,
  expectedUpdatedAt: string | null
) {
  const token = await accessToken();
  const response = await fetch(
    `/api/admin/products/${encodeURIComponent(productId)}/duplicate`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "x-request-id": crypto.randomUUID(),
        "x-operation-id": crypto.randomUUID()
      },
      body: JSON.stringify({ expectedUpdatedAt })
    }
  );
  const payload = await response.json().catch(() => ({})) as {
    error?: string;
    message?: string;
    productId?: string;
  };
  if (!response.ok) {
    throw new ProductCompatibilityRequestError(
      response.status,
      payload.error || "Produk belum berhasil diduplikasi sebagai Draft."
    );
  }
  if (!payload.productId) {
    throw new ProductCompatibilityRequestError(
      500,
      "ID Draft hasil duplikasi tidak tersedia."
    );
  }
  return {
    productId: payload.productId,
    message: payload.message || "Produk berhasil diduplikasi sebagai Draft."
  };
}

export class ProductCompatibilityRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}
