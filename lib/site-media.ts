export const SITE_MEDIA_SETTING_KEY = "site_media_defaults";

export type SiteMediaDefaults = {
  heroDesktop: string;
  heroMobile: string;
  product: string;
  pageHeroDesktop: string;
  pageHeroMobile: string;
  bannerDesktop: string;
  bannerMobile: string;
  store: string;
  benefit: string;
  socialPreview: string;
};

export const SAFE_BRAND_IMAGE = "/brand/debroder/social-preview.png";
export const SAFE_BRAND_SQUARE = "/brand/debroder/open-graph-logo.png";

export const DEFAULT_SITE_MEDIA: SiteMediaDefaults = {
  heroDesktop: SAFE_BRAND_IMAGE,
  heroMobile: SAFE_BRAND_IMAGE,
  product: SAFE_BRAND_SQUARE,
  pageHeroDesktop: SAFE_BRAND_IMAGE,
  pageHeroMobile: SAFE_BRAND_IMAGE,
  bannerDesktop: SAFE_BRAND_IMAGE,
  bannerMobile: SAFE_BRAND_IMAGE,
  store: SAFE_BRAND_IMAGE,
  benefit: SAFE_BRAND_IMAGE,
  socialPreview: SAFE_BRAND_IMAGE
};

export function parseSiteMediaDefaults(value: unknown): SiteMediaDefaults {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_SITE_MEDIA;
  }

  const source = value as Record<string, unknown>;
  const pick = (key: keyof SiteMediaDefaults) => {
    const candidate = source[key];
    return typeof candidate === "string" && candidate.trim()
      ? candidate.trim()
      : DEFAULT_SITE_MEDIA[key];
  };

  return {
    heroDesktop: pick("heroDesktop"),
    heroMobile: pick("heroMobile"),
    product: pick("product"),
    pageHeroDesktop: pick("pageHeroDesktop"),
    pageHeroMobile: pick("pageHeroMobile"),
    bannerDesktop: pick("bannerDesktop"),
    bannerMobile: pick("bannerMobile"),
    store: pick("store"),
    benefit: pick("benefit"),
    socialPreview: pick("socialPreview")
  };
}
