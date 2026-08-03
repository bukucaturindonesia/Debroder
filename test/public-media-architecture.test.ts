import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_MEDIA_FALLBACKS,
  PUBLIC_MEDIA_REGISTRY,
  normalizePublicMediaPath,
  resolvePublicMedia,
  validateMediaContract
} from "@/lib/public-media";
import { DEFAULT_SITE_MEDIA, parseSiteMediaDefaults } from "@/lib/site-media";
import { jerseyMediaSlots, jerseySectionFallbacks } from "@/lib/jersey-experience";
import { validateProductPublishSnapshot } from "@/lib/product-manager";

const socialPaths = [
  "/debroder/social-preview.png",
  "/debroder/open-graph-logo.png"
];

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Public media architecture reconciliation V1.1", () => {
  it("keeps social assets exclusive to Open Graph", () => {
    for (const [slot, contract] of Object.entries(PUBLIC_MEDIA_REGISTRY)) {
      if (slot === "openGraph") continue;
      expect(socialPaths).not.toContain(contract.fallbackPath);
    }
    expect(PUBLIC_MEDIA_REGISTRY.openGraph.aspectRatio).toBe("1.91:1");
    expect(PUBLIC_MEDIA_REGISTRY.openGraph.fallbackPath).toBe(PUBLIC_MEDIA_FALLBACKS.openGraph);
  });

  it("uses slot-specific product fallback instead of social preview", () => {
    const result = resolvePublicMedia({
      slot: "productPrimary",
      primary: "/debroder/social-preview.png"
    });
    expect(result).toMatchObject({
      src: PUBLIC_MEDIA_FALLBACKS.product,
      source: "slot-fallback",
      slot: "productPrimary",
      isFallback: true
    });
  });

  it("keeps desktop and mobile hero contracts independent", () => {
    const desktop = resolvePublicMedia({ slot: "pageHeroDesktop" });
    const mobile = resolvePublicMedia({ slot: "pageHeroMobile" });
    expect(desktop.src).toBe(PUBLIC_MEDIA_FALLBACKS.pageHeroDesktop);
    expect(mobile.src).toBe(PUBLIC_MEDIA_FALLBACKS.pageHeroMobile);
    expect(desktop.src).not.toBe(mobile.src);
    expect(PUBLIC_MEDIA_REGISTRY.pageHeroDesktop.aspectRatio).toBe("12:5");
    expect(PUBLIC_MEDIA_REGISTRY.pageHeroMobile.aspectRatio).toBe("4:5");
    expect(PUBLIC_MEDIA_REGISTRY.pageHeroDesktop.allowResponsiveFallback).toBe(false);
  });


  it("keeps Instagram banner and campaign ratios independent", () => {
    expect(PUBLIC_MEDIA_REGISTRY.homepageCampaignDesktop.aspectRatio).toBe("16:7");
    expect(PUBLIC_MEDIA_REGISTRY.instagramBannerDesktop.aspectRatio).toBe("12:5");
    expect(PUBLIC_MEDIA_REGISTRY.instagramBannerMobile.aspectRatio).toBe("4:5");
    expect(PUBLIC_MEDIA_FALLBACKS.instagramBannerDesktop).not.toBe(PUBLIC_MEDIA_FALLBACKS.campaignDesktop);
  });

  it("maps Jersey media by section shape instead of a universal fallback", () => {
    expect(jerseyMediaSlots("split_campaign")).toEqual({
      desktop: "editorialPortrait",
      mobile: "editorialPortrait"
    });
    expect(jerseyMediaSlots("wide_campaign")).toEqual({
      desktop: "homepageCampaignDesktop",
      mobile: "homepageCampaignMobile"
    });
    expect(jerseySectionFallbacks("wide_campaign")).toEqual({
      desktop: PUBLIC_MEDIA_FALLBACKS.campaignDesktop,
      mobile: PUBLIC_MEDIA_FALLBACKS.campaignMobile
    });
    const jerseyAdmin = source("components/admin/JerseyExperienceAdmin.tsx");
    expect(jerseyAdmin).toContain("jerseySectionFallbacks(form.section_type)");
    expect(jerseyAdmin).not.toContain("desktop_media_url: form.desktop_media_url.trim() || PUBLIC_MEDIA_FALLBACKS.editorial");
  });
  it("rejects unsafe and ambiguous public media paths", () => {
    expect(normalizePublicMediaPath("/public/products/front.webp")).toBeNull();
    expect(normalizePublicMediaPath("/products/../secret.webp")).toBeNull();
    expect(normalizePublicMediaPath("javascript:alert(1)")).toBeNull();
    expect(normalizePublicMediaPath("https://example.com/photo.webp")).toBeNull();
    expect(normalizePublicMediaPath("/products/front.webp")).toBe("/products/front.webp");
    expect(normalizePublicMediaPath("https://untrusted.supabase.co/storage/v1/object/public/website-images/a.webp"))
      .toBeNull();
    const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
    expect(normalizePublicMediaPath("https://demo.supabase.co/storage/v1/object/public/website-images/a.webp"))
      .toBe("https://demo.supabase.co/storage/v1/object/public/website-images/a.webp");
    if (previousSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
  });

  it("enforces product 4:5 dimensions, MIME, and technical size", () => {
    expect(validateMediaContract({
      slot: "productPrimary",
      mimeType: "image/webp",
      sizeBytes: 400_000,
      width: 2000,
      height: 2500
    })).toEqual([]);

    const issues = validateMediaContract({
      slot: "productPrimary",
      mimeType: "image/gif",
      sizeBytes: 11 * 1024 * 1024,
      width: 1920,
      height: 1080
    });
    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "unsupported-format",
      "file-too-large",
      "dimensions-too-small",
      "invalid-ratio"
    ]));
    expect(issues.every((issue) => issue.severity === "error")).toBe(true);
  });

  it("supports every canonical crop ratio", () => {
    const ratios = new Set(Object.values(PUBLIC_MEDIA_REGISTRY).map((contract) => contract.aspectRatio));
    expect(ratios).toEqual(new Set(["4:5", "16:7", "12:5", "5:4", "4:3", "1.91:1"]));
  });

  it("sanitizes legacy site media defaults without leaking social images into public slots", () => {
    const parsed = parseSiteMediaDefaults({
      product: "/debroder/social-preview.png",
      pageHeroDesktop: "/debroder/open-graph-logo.png",
      benefit: "/legacy/about-landscape.webp",
      instagramBannerDesktop: "/debroder/social-preview.png",
      socialPreview: "/debroder/social-preview.png"
    });
    expect(parsed.product).toBe(DEFAULT_SITE_MEDIA.product);
    expect(parsed.pageHeroDesktop).toBe(DEFAULT_SITE_MEDIA.pageHeroDesktop);
    expect(parsed.aboutLandscape).toBe("/legacy/about-landscape.webp");
    expect(parsed.instagramBannerDesktop).toBe(DEFAULT_SITE_MEDIA.instagramBannerDesktop);
    expect(parsed.socialPreview).toBe("/debroder/social-preview.png");
  });

  it("preserves publish validation for an active variant without primary/front media", () => {
    const issues = validateProductPublishSnapshot({
      id: "product-1",
      name: "Kaos Uji",
      slug: "kaos-uji",
      productCategoryId: "category-1",
      basePrice: 45000,
      status: "draft",
      categoryActive: true,
      duplicateSlug: false,
      variants: [{
        id: "variant-1",
        name: "Hitam",
        slug: "hitam",
        hexCode: "#111111",
        status: "active",
        hasFrontImage: false,
        imageRoles: [],
        sellable: [{
          id: "sku-1",
          sku: "KAOS-HITAM-L",
          sizeId: "size-l",
          sizeActive: true,
          stockQuantity: 10,
          status: "active",
          duplicateSku: false
        }]
      }]
    });
    expect(issues.some((issue) => issue.field === "variant.variant-1.images")).toBe(true);
  });

  it("uses independent About, Custom hero, plain-category, and service detail sources", () => {
    const aboutPage = source("app/tentang/page.tsx");
    const homePage = source("app/page.tsx");
    const customHub = source("components/custom/CustomHub.tsx");
    const publicPage = source("components/PublicPage.tsx");
    const responsivePicture = source("components/ResponsivePicture.tsx");
    const publicData = source("lib/public-data.ts");

    expect(aboutPage).toContain("about_page_image_url");
    expect(publicData).toContain('resolveMediaUrl("aboutHomepageLandscape"');
    expect(homePage).toContain("PLAIN_CATEGORY_SECTION_SETTING.slug");
    expect(homePage).toContain(".filter(isCustomHomepageItem)");
    expect(publicData).toContain('? "customHeroDesktop"');
    expect(customHub).toContain("pageHero?.image_url");
    expect(customHub).toContain("fallbackImages.customHero");
    expect(customHub).not.toContain("categories[0]");
    expect(publicPage).toContain("detail_image_url");
    expect(publicData).toContain('resolveMediaUrl("serviceDetailLandscape"');
    expect(publicPage).toContain("fallbackImages.serviceDetail");
    expect(publicPage).toContain("const imageSrc = src || fallbackSrc");
    expect(responsivePicture).toContain("mobileFallbackSrc");
    expect(publicData).toContain('resolveMediaUrl("editorialPortrait", service.image_url');
    expect(publicData).toContain('resolveMediaUrl("instagramBannerDesktop"');
  });

  it("exposes canonical admin guidance and server-authoritative upload validation", () => {
    const dashboard = source("components/admin/AdminDashboard.tsx");
    const uploadRoute = source("app/api/admin/media/upload/route.ts");
    const settingsRoute = source("app/api/admin/media/settings/route.ts");
    const productUpload = source("lib/product-media-upload.ts");
    const variantGallery = source("components/admin/VariantGalleryManager.tsx");
    const siteMediaAdmin = source("components/admin/SiteMediaSettingsAdmin.tsx");

    expect(dashboard).toContain("2000 × 2500");
    expect(dashboard).toContain("Rasio wajib 4:5");
    expect(uploadRoute).toContain('requirePhase13Actor(request, "content.manage")');
    expect(uploadRoute).toContain("inspectImage(bytes)");
    expect(uploadRoute).toContain("validateMediaContract");
    expect(uploadRoute).toContain("replaceAssetId");
    expect(uploadRoute).toContain("safeStoragePath");
    expect(uploadRoute).toContain("folderMatchesSlot");
    expect(settingsRoute).toContain('requirePhase13Actor(request, "content.manage")');
    expect(settingsRoute).toContain("SITE_MEDIA_SLOTS");
    expect(settingsRoute).toContain("validateMediaContract");
    expect(productUpload).toContain('fetch("/api/admin/media/upload"');
    expect(productUpload).not.toContain("supabase.storage");
    expect(variantGallery).toContain("uploadProductMediaAsset");
    expect(variantGallery).not.toContain("supabase.storage");
    expect(siteMediaAdmin).toContain('fetch("/api/admin/media/settings"');
    expect(siteMediaAdmin).not.toContain('from("website_settings").upsert');
  });

  it("ships a non-destructive transition migration for independent media fields", () => {
    const migration = source("supabase/migrations/20260803095600_public_media_architecture_reconciliation_v1.sql");
    expect(migration).toContain("add column if not exists detail_image_url text");
    expect(migration).toContain("add column if not exists about_page_image_url text");
    expect(migration).toContain("add column if not exists about_page_mobile_focal_x numeric");
    expect(migration).toContain("add column if not exists about_page_mobile_target_ratio text");
    expect(migration).toContain("page_key = 'custom'");
    expect(migration).not.toMatch(/insert\s+into\s+public\.page_heroes/i);
    expect(migration).not.toMatch(/drop\s+(table|column)/i);
    expect(migration).not.toMatch(/delete\s+from/i);
  });
});
