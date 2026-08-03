import {
  PUBLIC_MEDIA_FALLBACKS,
  resolvePublicMediaSrc,
  type PublicMediaSlot
} from "@/lib/public-media";

export const SITE_MEDIA_SETTING_KEY = "site_media_defaults";

export type SiteMediaDefaults = {
  heroDesktop: string;
  heroMobile: string;
  product: string;
  category: string;
  editorial: string;
  featuredDesktop: string;
  featuredMobile: string;
  pageHeroDesktop: string;
  pageHeroMobile: string;
  serviceDetail: string;
  bannerDesktop: string;
  bannerMobile: string;
  instagramBannerDesktop: string;
  instagramBannerMobile: string;
  store: string;
  aboutLandscape: string;
  aboutPortrait: string;
  customHeroDesktop: string;
  customHeroMobile: string;
  customPreset: string;
  socialPreview: string;
};

/** Social assets are metadata-only. They must not be reused as public visual fallbacks. */
export const SAFE_BRAND_IMAGE = "/debroder/social-preview.png";
export const SAFE_BRAND_SQUARE = "/debroder/open-graph-logo.png";

export const DEFAULT_SITE_MEDIA: SiteMediaDefaults = {
  heroDesktop: PUBLIC_MEDIA_FALLBACKS.homepageHeroDesktop,
  heroMobile: PUBLIC_MEDIA_FALLBACKS.homepageHeroMobile,
  product: PUBLIC_MEDIA_FALLBACKS.product,
  category: PUBLIC_MEDIA_FALLBACKS.category,
  editorial: PUBLIC_MEDIA_FALLBACKS.editorial,
  featuredDesktop: PUBLIC_MEDIA_FALLBACKS.featuredDesktop,
  featuredMobile: PUBLIC_MEDIA_FALLBACKS.editorial,
  pageHeroDesktop: PUBLIC_MEDIA_FALLBACKS.pageHeroDesktop,
  pageHeroMobile: PUBLIC_MEDIA_FALLBACKS.pageHeroMobile,
  serviceDetail: PUBLIC_MEDIA_FALLBACKS.serviceDetail,
  bannerDesktop: PUBLIC_MEDIA_FALLBACKS.campaignDesktop,
  bannerMobile: PUBLIC_MEDIA_FALLBACKS.campaignMobile,
  instagramBannerDesktop: PUBLIC_MEDIA_FALLBACKS.instagramBannerDesktop,
  instagramBannerMobile: PUBLIC_MEDIA_FALLBACKS.instagramBannerMobile,
  store: PUBLIC_MEDIA_FALLBACKS.store,
  aboutLandscape: PUBLIC_MEDIA_FALLBACKS.aboutLandscape,
  aboutPortrait: PUBLIC_MEDIA_FALLBACKS.aboutPortrait,
  customHeroDesktop: PUBLIC_MEDIA_FALLBACKS.customHeroDesktop,
  customHeroMobile: PUBLIC_MEDIA_FALLBACKS.customHeroMobile,
  customPreset: PUBLIC_MEDIA_FALLBACKS.customPreset,
  socialPreview: SAFE_BRAND_IMAGE
};

export const SITE_MEDIA_SLOTS: Record<keyof SiteMediaDefaults, PublicMediaSlot> = {
  heroDesktop: "homepageHeroDesktop",
  heroMobile: "homepageHeroMobile",
  product: "productPrimary",
  category: "categoryPortrait",
  editorial: "editorialPortrait",
  featuredDesktop: "homepageFeaturedDesktop",
  featuredMobile: "homepageFeaturedMobile",
  pageHeroDesktop: "pageHeroDesktop",
  pageHeroMobile: "pageHeroMobile",
  serviceDetail: "serviceDetailLandscape",
  bannerDesktop: "homepageCampaignDesktop",
  bannerMobile: "homepageCampaignMobile",
  instagramBannerDesktop: "instagramBannerDesktop",
  instagramBannerMobile: "instagramBannerMobile",
  store: "storeLandscape",
  aboutLandscape: "aboutHomepageLandscape",
  aboutPortrait: "aboutPagePortrait",
  customHeroDesktop: "customHeroDesktop",
  customHeroMobile: "customHeroMobile",
  customPreset: "customPreset",
  socialPreview: "openGraph"
};

export function parseSiteMediaDefaults(value: unknown): SiteMediaDefaults {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_SITE_MEDIA;
  }

  const source = value as Record<string, unknown>;
  const pick = (
    key: keyof SiteMediaDefaults,
    legacyKeys: string[] = []
  ) => {
    for (const candidateKey of [key, ...legacyKeys]) {
      const candidate = source[candidateKey];
      const resolved = resolvePublicMediaSrc(
        SITE_MEDIA_SLOTS[key],
        candidate,
        DEFAULT_SITE_MEDIA[key]
      );
      if (typeof candidate === "string" && candidate.trim() && resolved) {
        return resolved;
      }
    }
    return DEFAULT_SITE_MEDIA[key];
  };

  return {
    heroDesktop: pick("heroDesktop"),
    heroMobile: pick("heroMobile"),
    product: pick("product"),
    category: pick("category"),
    editorial: pick("editorial"),
    featuredDesktop: pick("featuredDesktop", ["editorial"]),
    featuredMobile: pick("featuredMobile", ["editorial"]),
    pageHeroDesktop: pick("pageHeroDesktop"),
    pageHeroMobile: pick("pageHeroMobile"),
    serviceDetail: pick("serviceDetail"),
    bannerDesktop: pick("bannerDesktop"),
    bannerMobile: pick("bannerMobile"),
    instagramBannerDesktop: pick("instagramBannerDesktop"),
    instagramBannerMobile: pick("instagramBannerMobile"),
    store: pick("store"),
    aboutLandscape: pick("aboutLandscape", ["benefit"]),
    aboutPortrait: pick("aboutPortrait"),
    customHeroDesktop: pick("customHeroDesktop"),
    customHeroMobile: pick("customHeroMobile"),
    customPreset: pick("customPreset"),
    socialPreview: pick("socialPreview")
  };
}
