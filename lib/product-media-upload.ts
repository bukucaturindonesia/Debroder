"use client";

import { createSupabaseClient } from "@/lib/supabase";
import type { ProductImageRole } from "@/lib/product-manager";
import type { ProductMediaAsset } from "@/lib/product-media";
import { validateMediaContract } from "@/lib/public-media";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_LONG_EDGE = 2500;

export class ProductMediaUploadError extends Error {}

export async function uploadProductMediaAsset(input: {
  file: File;
  variantId: string;
  role: ProductImageRole;
  colorName: string;
}): Promise<{
  asset: ProductMediaAsset;
  ratioWarning: boolean;
}> {
  validateFile(input.file);
  const optimized = await optimizeImage(input.file);
  const dimensions = await imageDimensions(optimized);
  const issues = validateMediaContract({
    slot: "productPrimary",
    mimeType: optimized.type,
    sizeBytes: optimized.size,
    width: dimensions.width,
    height: dimensions.height
  });
  const contractError = issues.find((issue) => issue.severity === "error");
  if (contractError) throw new ProductMediaUploadError(contractError.message);

  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new ProductMediaUploadError("Supabase belum dikonfigurasi.");
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    throw new ProductMediaUploadError("Sesi admin berakhir. Masuk kembali lalu ulangi upload.");
  }

  const form = new FormData();
  form.set("slot", "productPrimary");
  form.set("altText", `${input.colorName} ${roleLabel(input.role)}`);
  form.set("file", optimized);

  const response = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form
  });
  const payload = (await response.json().catch(() => null)) as {
    asset?: Record<string, unknown>;
    error?: string;
  } | null;
  if (!response.ok || !payload?.asset) {
    throw new ProductMediaUploadError(
      payload?.error || "Foto belum dapat diunggah. Periksa file lalu coba lagi."
    );
  }

  return {
    asset: mapAsset(payload.asset),
    ratioWarning: false
  };
}

function validateFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ProductMediaUploadError("Gunakan JPG, PNG, atau WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new ProductMediaUploadError("Ukuran foto maksimal 10 MB.");
  }
}

async function optimizeImage(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85)
    );
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: "image/webp"
    });
  } catch {
    return file;
  }
}

async function imageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  } catch {
    return { width: null, height: null };
  }
}

function roleLabel(role: ProductImageRole) {
  if (role === "front") return "Front";
  if (role === "back") return "Back";
  if (role === "detail") return "Detail";
  return "Lifestyle";
}

function mapAsset(row: Record<string, unknown>): ProductMediaAsset {
  return {
    id: String(row.id),
    name: String(row.name),
    publicUrl: String(row.public_url),
    altText: typeof row.alt_text === "string" ? row.alt_text : "",
    folder: typeof row.folder === "string" ? row.folder : "products",
    width: finiteNumber(row.width),
    height: finiteNumber(row.height),
    updatedAt: String(row.updated_at || "")
  };
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
