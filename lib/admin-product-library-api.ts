"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type { ProductLibraryPayload, ProductLibraryQuery } from "@/lib/product-library";

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Sesi admin tidak tersedia.");
  return data.session.access_token;
}

export async function loadProductLibrary(
  query: ProductLibraryQuery,
  signal?: AbortSignal
): Promise<ProductLibraryPayload> {
  const token = await accessToken();
  const searchParams = new URLSearchParams({
    q: query.q,
    status: query.status,
    categoryId: query.categoryId,
    sort: query.sort,
    page: String(query.page),
    pageSize: String(query.pageSize)
  });
  const response = await fetch(`/api/admin/products/library?${searchParams.toString()}`, {
    cache: "no-store",
    signal,
    headers: { authorization: `Bearer ${token}` }
  });
  const payload = await response.json().catch(() => ({})) as ProductLibraryPayload & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Product Library belum dapat dimuat.");
  return payload;
}
