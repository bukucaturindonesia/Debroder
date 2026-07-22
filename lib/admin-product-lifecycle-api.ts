"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type { ProductReviewPayload } from "@/lib/product-review";

export type ProductLifecycleMaintenanceAction = "archive_draft" | "restore";

export class ProductLifecycleRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function runProductLifecycleAction(input: {
  productId: string;
  action: ProductLifecycleMaintenanceAction;
  expectedUpdatedAt: string | null;
}): Promise<{
  ok: true;
  message: string;
  payload: ProductReviewPayload;
}> {
  const token = await accessToken();
  const response = await fetch(
    `/api/admin/products/${encodeURIComponent(input.productId)}/lifecycle`,
    {
      method: "PATCH",
      cache: "no-store",
      body: JSON.stringify({
        action: input.action,
        expectedUpdatedAt: input.expectedUpdatedAt
      }),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-request-id": crypto.randomUUID(),
        "x-operation-id": crypto.randomUUID()
      }
    }
  );
  const payload = await response.json().catch(() => ({})) as {
    error?: string;
  };
  if (!response.ok) {
    throw new ProductLifecycleRequestError(
      response.status,
      payload.error || "Perubahan lifecycle belum dapat diproses."
    );
  }
  return payload as {
    ok: true;
    message: string;
    payload: ProductReviewPayload;
  };
}

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new ProductLifecycleRequestError(503, "Supabase belum dikonfigurasi.");
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ProductLifecycleRequestError(401, "Sesi admin tidak tersedia.");
  }
  return data.session.access_token;
}
