import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";
import {
  isPublicMediaSlot,
  mediaSlotContract,
  validateMediaContract,
  type PublicMediaMimeType,
  type PublicMediaSlot
} from "@/lib/public-media";
import { WEBSITE_IMAGES_BUCKET } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const formSchema = z.object({
  slot: z.string().min(1).max(80),
  altText: z.string().trim().max(180).optional(),
  replaceAssetId: z.string().uuid().optional()
});

const SLOT_FOLDERS: Record<PublicMediaSlot, string> = {
  productPrimary: "products",
  productGallery: "products",
  categoryPortrait: "categories",
  trendingPortrait: "homepage/trending",
  homepageHeroDesktop: "homepage/hero",
  homepageHeroMobile: "homepage/hero",
  homepageFeaturedDesktop: "homepage/featured",
  homepageFeaturedMobile: "homepage/featured",
  homepageCampaignDesktop: "homepage/campaign",
  homepageCampaignMobile: "homepage/campaign",
  instagramBannerDesktop: "homepage/instagram-banner",
  instagramBannerMobile: "homepage/instagram-banner",
  pageHeroDesktop: "page-hero",
  pageHeroMobile: "page-hero",
  serviceDetailLandscape: "services/detail",
  storeLandscape: "store",
  aboutHomepageLandscape: "about/homepage",
  aboutPagePortrait: "about/page",
  editorialPortrait: "editorial",
  customHeroDesktop: "custom/hero",
  customHeroMobile: "custom/hero",
  customPathway: "custom/pathway",
  customInspiration: "custom/inspiration",
  customPreset: "custom/preset",
  openGraph: "social"
};

export async function POST(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "content.manage");
    const form = await request.formData();
    const parsed = formSchema.parse({
      slot: form.get("slot"),
      altText: form.get("altText") || undefined,
      replaceAssetId: form.get("replaceAssetId") || undefined
    });
    if (!isPublicMediaSlot(parsed.slot)) {
      return Response.json({ error: "Slot media tidak valid." }, { status: 422 });
    }

    const slot: PublicMediaSlot = parsed.slot;
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "File gambar wajib dipilih." }, { status: 422 });
    }

    const contract = mediaSlotContract(slot);
    if (file.size <= 0 || file.size > contract.technicalMaxBytes) {
      return Response.json(
        { error: `Ukuran file maksimal ${Math.round(contract.technicalMaxBytes / (1024 * 1024))} MB untuk slot ini.` },
        { status: 422 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const metadata = inspectImage(bytes);
    if (!metadata) {
      return Response.json(
        { error: "File gambar rusak atau format sebenarnya tidak didukung." },
        { status: 422 }
      );
    }

    const issues = validateMediaContract({
      slot,
      mimeType: metadata.mimeType,
      sizeBytes: bytes.byteLength,
      width: metadata.width,
      height: metadata.height
    });
    const error = issues.find((issue) => issue.severity === "error");
    if (error) return Response.json({ error: error.message, issues }, { status: 422 });

    const hash = createHash("sha256").update(bytes).digest("hex");

    if (parsed.replaceAssetId) {
      const { data: existing, error: existingError } = await actor.adminClient
        .from("media_assets")
        .select("id,name,storage_path,bucket_id,public_url,folder,media_type,status_aktif")
        .eq("id", parsed.replaceAssetId)
        .eq("media_type", "image")
        .eq("status_aktif", true)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) {
        return Response.json({ error: "Media yang akan diganti tidak ditemukan." }, { status: 404 });
      }
      if (existing.bucket_id !== WEBSITE_IMAGES_BUCKET || !safeStoragePath(existing.storage_path)) {
        return Response.json({ error: "Lokasi media lama tidak aman untuk diganti." }, { status: 422 });
      }
      if (!folderMatchesSlot(existing.folder, slot)) {
        return Response.json(
          { error: "Slot pengganti tidak sesuai dengan folder media lama." },
          { status: 422 }
        );
      }

      const { error: replaceError } = await actor.adminClient.storage
        .from(WEBSITE_IMAGES_BUCKET)
        .upload(existing.storage_path, bytes, {
          cacheControl: "0",
          contentType: metadata.mimeType,
          upsert: true
        });
      if (replaceError) throw replaceError;

      const { data: updated, error: updateError } = await actor.adminClient
        .from("media_assets")
        .update({
          name: safeDisplayName(file.name),
          mime_type: metadata.mimeType,
          size_bytes: bytes.byteLength,
          width: metadata.width,
          height: metadata.height,
          alt_text: parsed.altText || safeDisplayName(file.name).replace(/\.[^.]+$/, ""),
          tags: ["public-media", slot],
          content_hash: hash,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select("id,name,public_url,alt_text,folder,width,height,mime_type,size_bytes,updated_at")
        .single();
      if (updateError || !updated) throw updateError || new Error("Media asset update failed");
      return Response.json({ asset: updated, duplicate: false, replaced: true, issues });
    }

    const { data: duplicate, error: duplicateError } = await actor.adminClient
      .from("media_assets")
      .select("id,name,public_url,alt_text,folder,width,height,mime_type,size_bytes,updated_at")
      .eq("content_hash", hash)
      .eq("media_type", "image")
      .eq("status_aktif", true)
      .limit(1)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return Response.json({ asset: duplicate, duplicate: true, issues });
    }

    const extension = extensionFor(metadata.mimeType);
    const folder = SLOT_FOLDERS[slot];
    const path = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await actor.adminClient.storage
      .from(WEBSITE_IMAGES_BUCKET)
      .upload(path, bytes, {
        cacheControl: "31536000",
        contentType: metadata.mimeType,
        upsert: false
      });
    if (uploadError) throw uploadError;

    const publicUrl = actor.adminClient.storage
      .from(WEBSITE_IMAGES_BUCKET)
      .getPublicUrl(path).data.publicUrl;
    const { data: inserted, error: insertError } = await actor.adminClient
      .from("media_assets")
      .insert({
        name: safeDisplayName(file.name),
        storage_path: path,
        bucket_id: WEBSITE_IMAGES_BUCKET,
        public_url: publicUrl,
        media_type: "image",
        mime_type: metadata.mimeType,
        size_bytes: bytes.byteLength,
        width: metadata.width,
        height: metadata.height,
        alt_text: parsed.altText || safeDisplayName(file.name).replace(/\.[^.]+$/, ""),
        tags: ["public-media", slot],
        content_hash: hash,
        folder,
        uploaded_by: actor.user.id,
        status_aktif: true,
        updated_at: new Date().toISOString()
      })
      .select("id,name,public_url,alt_text,folder,width,height,mime_type,size_bytes,updated_at")
      .single();

    if (insertError || !inserted) {
      await actor.adminClient.storage.from(WEBSITE_IMAGES_BUCKET).remove([path]);
      throw insertError || new Error("Media asset insert failed");
    }

    return Response.json({ asset: inserted, duplicate: false, issues }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Input upload media tidak valid." }, { status: 422 });
    }
    return phase13ErrorResponse(error, request);
  }
}

type ImageMetadata = {
  mimeType: PublicMediaMimeType;
  width: number;
  height: number;
};

function inspectImage(bytes: Uint8Array): ImageMetadata | null {
  return inspectPng(bytes) || inspectJpeg(bytes) || inspectWebp(bytes);
}

function inspectPng(bytes: Uint8Array): ImageMetadata | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || !signature.every((value, index) => bytes[index] === value)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return validDimensions(width, height) ? { mimeType: "image/png", width, height } : null;
}

function inspectJpeg(bytes: Uint8Array): ImageMetadata | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x00 || marker === 0xff) {
      offset += 1;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if (sof.has(marker)) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      return validDimensions(width, height) ? { mimeType: "image/jpeg", width, height } : null;
    }
    offset += 2 + length;
  }
  return null;
}

function inspectWebp(bytes: Uint8Array): ImageMetadata | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WEBP") return null;
  const chunk = ascii(bytes, 12, 16);
  let width = 0;
  let height = 0;
  if (chunk === "VP8X") {
    width = 1 + readUint24LE(bytes, 24);
    height = 1 + readUint24LE(bytes, 27);
  } else if (chunk === "VP8L" && bytes[20] === 0x2f) {
    width = 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]);
    height = 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6));
  } else if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
  }
  return validDimensions(width, height) ? { mimeType: "image/webp", width, height } : null;
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function readUint24LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function validDimensions(width: number, height: number) {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= 30000 && height <= 30000;
}

function extensionFor(mimeType: PublicMediaMimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

function safeDisplayName(value: string) {
  return value.trim().replace(/[\\/\0]/g, "-").slice(0, 180) || "media";
}

function safeStoragePath(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.startsWith("/") || value.includes("\\") || value.includes("\0")) return false;
  return !value.split("/").includes("..");
}

function folderMatchesSlot(folder: unknown, slot: PublicMediaSlot) {
  if (typeof folder !== "string" || !folder.trim()) return false;
  const normalized = folder.trim().replace(/^\/+|\/+$/g, "");
  const canonical = SLOT_FOLDERS[slot];
  const legacyAliases: Partial<Record<PublicMediaSlot, readonly string[]>> = {
    productPrimary: ["products", "fresh-drop"],
    productGallery: ["products"],
    categoryPortrait: ["categories"],
    editorialPortrait: ["services", "jersey", "benefits", "editorial"],
    trendingPortrait: ["trending", "homepage/trending"],
    homepageHeroDesktop: ["hero", "homepage/hero"],
    homepageHeroMobile: ["hero-mobile", "homepage/hero"],
    homepageFeaturedDesktop: ["featured", "homepage/featured"],
    homepageFeaturedMobile: ["featured", "homepage/featured"],
    homepageCampaignDesktop: ["homepage/campaign"],
    homepageCampaignMobile: ["homepage/campaign"],
    instagramBannerDesktop: ["banner", "homepage/instagram-banner"],
    instagramBannerMobile: ["banner", "homepage/instagram-banner"],
    pageHeroDesktop: ["page-hero"],
    pageHeroMobile: ["page-hero"],
    storeLandscape: ["store"],
    aboutHomepageLandscape: ["about", "about/homepage"],
    openGraph: ["social", "social-preview"]
  };
  return normalized === canonical || Boolean(legacyAliases[slot]?.includes(normalized));
}
