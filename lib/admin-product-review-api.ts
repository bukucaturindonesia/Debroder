"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type {
  ProductReviewAction,
  ProductReviewPayload
} from "@/lib/product-review";

export class ProductReviewRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function loadProductReview(
  productId: string,
  signal?: AbortSignal
): Promise<ProductReviewPayload> {
  return requestProductReview<ProductReviewPayload>(productId, {
    method: "GET",
    signal
  });
}

export async function runProductReviewAction(input: {
  productId: string;
  action: ProductReviewAction;
  expectedUpdatedAt: string | null;
  expectedReviewVersion: string;
}): Promise<{
  ok: true;
  message: string;
  payload: ProductReviewPayload;
}> {
  return requestProductReview(input.productId, {
    method: "PATCH",
    body: JSON.stringify({
      action: input.action,
      expectedUpdatedAt: input.expectedUpdatedAt,
      expectedReviewVersion: input.expectedReviewVersion
    }),
    headers: mutationHeaders()
  });
}

async function requestProductReview<T>(
  productId: string,
  init: RequestInit
): Promise<T> {
  const token = await accessToken();
  const response = await fetch(
    `/api/admin/products/${encodeURIComponent(productId)}/review`,
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
    throw new ProductReviewRequestError(
      response.status,
      payload.error || "Review & Publish belum dapat diproses."
    );
  }
  return payload as T;
}

async function accessToken() {
  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new ProductReviewRequestError(503, "Supabase belum dikonfigurasi.");
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ProductReviewRequestError(401, "Sesi admin tidak tersedia.");
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
