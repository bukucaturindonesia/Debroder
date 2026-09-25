import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import { PRODUCT_MANAGER_ROLES, type ProductImageRole } from "@/lib/product-manager";
import type { ProductMediaAsset } from "@/lib/product-media";
import { isValidProductWorkspaceId } from "@/lib/product-workspace";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { WEBSITE_IMAGES_BUCKET } from "@/lib/supabase";
import {
  Phase13AuthError,
  requirePhase13Actor
} from "@/lib/phase13-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;
const ROLES = new Set<ProductImageRole>(["front", "back", "detail", "lifestyle"]);

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requirePhase13Actor(request, "product.manage");
    if (!PRODUCT_MANAGER_ROLES.includes(actor.role)) {
      throw new Phase13AuthError(403, "Role ini tidak memiliki akses Media Produk.");
    }
    const { id: productId } = await context.params;
    if (!isValidProductWorkspaceId(productId)) {
      throw new UploadError(400, "ID produk tidak valid.");
    }
    const form = await request.formData();
    const file = form.get("file");
    const variantId = text(form.get("variantId"));
    const role = text(form.get("role"));
    const colorName = text(form.get("colorName")) || "Warna";
    const width = finiteNumber(form.get("width"));
    const height = finiteNumber(form.get("height"));
    if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type)) {
      throw new UploadError(422, "Gunakan JPG, PNG, atau WebP.");
    }
    if (file.size > MAX_BYTES) {
      throw new UploadError(422, "Ukuran foto maksimal 10 MB.");
    }
    if (!isUuid(variantId) || !ROLES.has(role as ProductImageRole)) {
      throw new UploadError(422, "Variant atau role media tidak valid.");
    }
    const { data: variant, error: variantError } = await actor.adminClient
      .from("product_variants")
      .select("id,product_id")
      .eq("id", variantId)
      .eq("product_id", productId)
      .maybeSingle();
    if (variantError) throw new UploadError(503, "Color variant belum dapat diperiksa.");
    if (!variant) throw new UploadError(404, "Color variant tidak ditemukan pada produk ini.");

    const adminClient = getAdminSupabaseClient();
    if (!adminClient) throw new UploadError(503, "Supabase admin belum dikonfigurasi.");
    const path = [
      "product-variant",
      variantId,
      `${Date.now()}-${role}-${safeFileName(file.name)}`
    ].join("/");
    const upload = await adminClient.storage
      .from(WEBSITE_IMAGES_BUCKET)
      .upload(path, new Blob([await file.arrayBuffer()], { type: file.type }), {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });
    if (upload.error) {
      throw new UploadError(502, "Foto belum dapat diunggah. Periksa file lalu coba lagi.");
    }
    const publicUrl = adminClient.storage
      .from(WEBSITE_IMAGES_BUCKET)
      .getPublicUrl(path).data.publicUrl;
    const asset: ProductMediaAsset = {
      id: "",
      name: file.name,
      publicUrl,
      altText: `${colorName} ${roleLabel(role as ProductImageRole)}`,
      folder: "products",
      width,
      height,
      updatedAt: new Date().toISOString()
    };
    return Response.json({
      asset,
      ratioWarning: !isFourFive(width, height)
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const guest = adminGuestErrorResponse(error);
    if (guest) return guest;
    const status = error instanceof UploadError || error instanceof Phase13AuthError
      ? error.status
      : 500;
    const message = error instanceof UploadError || error instanceof Phase13AuthError
      ? error.message
      : "Upload media belum berhasil.";
    return Response.json({ error: message }, { status });
  }
}

class UploadError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeFileName(value: string) {
  const parts = value.toLowerCase().split(".");
  const extension = parts.length > 1 ? `.${parts.pop()}` : ".bin";
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
