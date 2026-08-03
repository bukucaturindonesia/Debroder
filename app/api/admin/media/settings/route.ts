import { z } from "zod";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";
import {
  resolvePublicMedia,
  validateMediaContract
} from "@/lib/public-media";
import {
  SITE_MEDIA_SETTING_KEY,
  SITE_MEDIA_SLOTS,
  type SiteMediaDefaults
} from "@/lib/site-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const mediaUrl = z.string().trim().min(1).max(2048);
const settingsSchema = z.object({
  heroDesktop: mediaUrl,
  heroMobile: mediaUrl,
  product: mediaUrl,
  category: mediaUrl,
  editorial: mediaUrl,
  featuredDesktop: mediaUrl,
  featuredMobile: mediaUrl,
  pageHeroDesktop: mediaUrl,
  pageHeroMobile: mediaUrl,
  serviceDetail: mediaUrl,
  bannerDesktop: mediaUrl,
  bannerMobile: mediaUrl,
  instagramBannerDesktop: mediaUrl,
  instagramBannerMobile: mediaUrl,
  store: mediaUrl,
  aboutLandscape: mediaUrl,
  aboutPortrait: mediaUrl,
  customHeroDesktop: mediaUrl,
  customHeroMobile: mediaUrl,
  customPreset: mediaUrl,
  socialPreview: mediaUrl
}).strict();

type MediaAssetRow = {
  public_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
};

export async function PUT(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "content.manage");
    const input = settingsSchema.parse(await request.json()) as SiteMediaDefaults;
    const entries = Object.entries(input) as Array<[keyof SiteMediaDefaults, string]>;
    const resolvedEntries = entries.map(([key, value]) => {
      const slot = SITE_MEDIA_SLOTS[key];
      const resolved = resolvePublicMedia({ slot, primary: value });
      if (!resolved.src || resolved.source !== "slot") {
        throw new MediaSettingsValidationError(
          `${labelForKey(key)} tidak valid atau memakai media sosial untuk slot publik.`
        );
      }
      return { key, slot, src: resolved.src };
    });

    const remoteUrls = Array.from(new Set(
      resolvedEntries
        .map((entry) => entry.src)
        .filter((src) => src.startsWith("https://"))
    ));
    const assetByUrl = new Map<string, MediaAssetRow>();
    if (remoteUrls.length) {
      const { data, error } = await actor.adminClient
        .from("media_assets")
        .select("public_url,mime_type,size_bytes,width,height")
        .in("public_url", remoteUrls)
        .eq("media_type", "image")
        .eq("status_aktif", true);
      if (error) throw error;
      for (const asset of (data || []) as MediaAssetRow[]) {
        assetByUrl.set(asset.public_url, asset);
      }
    }

    for (const entry of resolvedEntries) {
      if (!entry.src.startsWith("https://")) continue;
      const asset = assetByUrl.get(entry.src);
      if (!asset) {
        throw new MediaSettingsValidationError(
          `${labelForKey(entry.key)} harus dipilih dari Galeri Media yang aktif.`
        );
      }
      const issues = validateMediaContract({
        slot: entry.slot,
        mimeType: asset.mime_type || "",
        sizeBytes: asset.size_bytes || 0,
        width: asset.width,
        height: asset.height
      });
      const error = issues.find((issue) => issue.severity === "error");
      if (error) {
        throw new MediaSettingsValidationError(`${labelForKey(entry.key)}: ${error.message}`);
      }
    }

    const values = Object.fromEntries(
      resolvedEntries.map((entry) => [entry.key, entry.src])
    ) as SiteMediaDefaults;
    const { error } = await actor.adminClient.from("website_settings").upsert(
      {
        setting_key: SITE_MEDIA_SETTING_KEY,
        label: "Gambar Default Website",
        value: values,
        description: "Fallback media publik per-slot yang divalidasi server.",
        group_name: "public_media",
        updated_at: new Date().toISOString()
      },
      { onConflict: "setting_key" }
    );
    if (error) throw error;

    return Response.json({ values });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Pengaturan media tidak lengkap atau format input tidak valid." },
        { status: 422 }
      );
    }
    if (error instanceof MediaSettingsValidationError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    return phase13ErrorResponse(error, request);
  }
}

class MediaSettingsValidationError extends Error {}

function labelForKey(key: keyof SiteMediaDefaults) {
  const labels: Record<keyof SiteMediaDefaults, string> = {
    heroDesktop: "Hero homepage desktop",
    heroMobile: "Hero homepage mobile",
    product: "Fallback produk",
    category: "Fallback kategori",
    editorial: "Fallback editorial",
    featuredDesktop: "Featured desktop",
    featuredMobile: "Featured mobile",
    pageHeroDesktop: "Page hero desktop",
    pageHeroMobile: "Page hero mobile",
    serviceDetail: "Detail layanan",
    bannerDesktop: "Campaign desktop",
    bannerMobile: "Campaign mobile",
    instagramBannerDesktop: "Banner Instagram desktop",
    instagramBannerMobile: "Banner Instagram mobile",
    store: "Store",
    aboutLandscape: "About homepage",
    aboutPortrait: "Halaman Tentang",
    customHeroDesktop: "Custom hero desktop",
    customHeroMobile: "Custom hero mobile",
    customPreset: "Custom preset",
    socialPreview: "Open Graph"
  };
  return labels[key];
}
