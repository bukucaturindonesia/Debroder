"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type { ProductImageRole } from "@/lib/product-manager";
import type { ProductMediaAsset } from "@/lib/product-media";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_LONG_EDGE = 2500;

export class ProductMediaUploadError extends Error {}

export async function uploadProductMediaAsset(input: {
  file: File;
  productId: string;
  variantId: string;
  role: ProductImageRole;
  colorName: string;
}): Promise<{
  asset: ProductMediaAsset;
  ratioWarning: boolean;
}> {
  validateFile(input.file);
  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new ProductMediaUploadError("Supabase belum dikonfigurasi.");
  }

  const optimized = await optimizeImage(input.file);
  const dimensions = await imageDimensions(optimized);
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.access_token) {
    throw new ProductMediaUploadError("Sesi admin tidak tersedia.");
  }
  const form = new FormData();
  form.append("file", optimized, optimized.name);
  form.append("variantId", input.variantId);
  form.append("role", input.role);
  form.append("colorName", input.colorName);
  form.append("width", String(dimensions.width || ""));
  form.append("height", String(dimensions.height || ""));
  const response = await fetch(
    `/api/admin/products/${encodeURIComponent(input.productId)}/media/upload`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${session.session.access_token}` },
      body: form,
      cache: "no-store"
    }
  );
  const payload = await response.json().catch(() => ({})) as {
    asset?: ProductMediaAsset;
    ratioWarning?: boolean;
    error?: string;
  };
  if (!response.ok || !payload.asset) {
    throw new ProductMediaUploadError(
      payload.error || "Foto belum dapat diunggah. Periksa file lalu coba lagi."
    );
  }
  return {
    asset: payload.asset,
    ratioWarning: payload.ratioWarning === true
  };
}

function validateFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ProductMediaUploadError(
      "Gunakan JPG, PNG, atau WebP."
    );
  }
  if (file.size > MAX_BYTES) {
    throw new ProductMediaUploadError(
      "Ukuran foto maksimal 10 MB."
    );
  }
}

async function optimizeImage(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(
      bitmap,
      0,
      0,
      canvas.width,
      canvas.height
    );
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85)
    );
    if (!blob) return file;
    return new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, "")}.webp`,
      { type: "image/webp" }
    );
  } catch {
    return file;
  }
}

async function imageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const result = {
      width: bitmap.width,
      height: bitmap.height
    };
    bitmap.close();
    return result;
  } catch {
    return { width: null, height: null };
  }
}
