"use client";

import { createSupabaseClient, WEBSITE_IMAGES_BUCKET } from "@/lib/supabase";
import type { ProductImageRole } from "@/lib/product-manager";
import type { ProductMediaAsset } from "@/lib/product-media";

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
  const supabase = createSupabaseClient();
  if (!supabase) {
    throw new ProductMediaUploadError("Supabase belum dikonfigurasi.");
  }

  const originalHash = await hashFile(input.file);
  const { data: duplicate, error: duplicateError } = await supabase
    .from("media_assets")
    .select("id,name,public_url,alt_text,folder,width,height,updated_at")
    .eq("content_hash", originalHash)
    .eq("media_type", "image")
    .eq("status_aktif", true)
    .limit(1)
    .maybeSingle();
  if (duplicateError) {
    throw new ProductMediaUploadError(
      "Pemeriksaan duplicate media belum dapat dijalankan."
    );
  }
  if (duplicate) {
    const asset = mapAsset(duplicate);
    return {
      asset,
      ratioWarning: !isFourFive(asset.width, asset.height)
    };
  }

  const optimized = await optimizeImage(input.file);
  const dimensions = await imageDimensions(optimized);
  const { data: session } = await supabase.auth.getSession();
  const path = [
    "product-variant",
    input.variantId,
    `${Date.now()}-${input.role}-${safeFileName(optimized.name)}`
  ].join("/");
  const { error: uploadError } = await supabase.storage
    .from(WEBSITE_IMAGES_BUCKET)
    .upload(path, optimized, {
      cacheControl: "3600",
      contentType: optimized.type,
      upsert: false
    });
  if (uploadError) {
    throw new ProductMediaUploadError(
      "Foto belum dapat diunggah. Periksa file lalu coba lagi."
    );
  }

  const publicUrl = supabase.storage
    .from(WEBSITE_IMAGES_BUCKET)
    .getPublicUrl(path).data.publicUrl;
  const altText = `${input.colorName} ${roleLabel(input.role)}`;
  const { data: inserted, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      name: input.file.name,
      storage_path: path,
      bucket_id: WEBSITE_IMAGES_BUCKET,
      public_url: publicUrl,
      media_type: "image",
      mime_type: optimized.type,
      size_bytes: optimized.size,
      width: dimensions.width,
      height: dimensions.height,
      alt_text: altText,
      tags: ["product", "variant", input.role],
      content_hash: originalHash,
      folder: "products",
      uploaded_by: session.session?.user.id || null,
      status_aktif: true,
      updated_at: new Date().toISOString()
    })
    .select("id,name,public_url,alt_text,folder,width,height,updated_at")
    .maybeSingle();

  if (insertError || !inserted) {
    await supabase.storage.from(WEBSITE_IMAGES_BUCKET).remove([path]);
    throw new ProductMediaUploadError(
      "File terunggah tetapi Media Library gagal mencatat aset. Upload dibatalkan."
    );
  }

  return {
    asset: mapAsset(inserted),
    ratioWarning: !isFourFive(dimensions.width, dimensions.height)
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

async function hashFile(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer()
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeFileName(value: string) {
  const parts = value.toLowerCase().split(".");
  const extension = parts.length > 1 ? `.${parts.pop()}` : "";
  const base = parts.join(".")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "image";
  return `${base}${extension}`;
}

function roleLabel(role: ProductImageRole) {
  if (role === "front") return "Front";
  if (role === "back") return "Back";
  if (role === "detail") return "Detail";
  return "Lifestyle";
}

function isFourFive(width: number | null, height: number | null) {
  if (!width || !height) return false;
  return Math.abs(width / height - 0.8) <= 0.025;
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
    updatedAt: typeof row.updated_at === "string"
      ? row.updated_at
      : new Date().toISOString()
  };
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
