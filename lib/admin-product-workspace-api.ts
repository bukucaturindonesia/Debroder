"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type { ProductWorkspacePayload } from "@/lib/product-workspace";

export class ProductWorkspaceRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) throw new ProductWorkspaceRequestError(503, "Supabase belum dikonfigurasi.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ProductWorkspaceRequestError(401, "Sesi admin tidak tersedia.");
  }
  return data.session.access_token;
}

export async function loadProductWorkspace(
  productId: string,
  signal?: AbortSignal
): Promise<ProductWorkspacePayload> {
  const token = await accessToken();
  const response = await fetch(
    `/api/admin/products/${encodeURIComponent(productId)}/workspace`,
    {
      cache: "no-store",
      signal,
      headers: { authorization: `Bearer ${token}` }
    }
  );
  const payload = await response.json().catch(() => ({})) as ProductWorkspacePayload & { error?: string };
  if (!response.ok) {
    throw new ProductWorkspaceRequestError(
      response.status,
      payload.error || "Product Workspace belum dapat dimuat."
    );
  }
  return payload;
}
