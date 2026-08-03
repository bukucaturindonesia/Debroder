export const PUBLIC_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export type PublicMediaMimeType = (typeof PUBLIC_MEDIA_MIME_TYPES)[number];

export type PublicMediaSlot =
  | "productPrimary"
  | "productGallery"
  | "categoryPortrait"
  | "trendingPortrait"
  | "homepageHeroDesktop"
  | "homepageHeroMobile"
  | "homepageFeaturedDesktop"
  | "homepageFeaturedMobile"
  | "homepageCampaignDesktop"
  | "homepageCampaignMobile"
  | "instagramBannerDesktop"
  | "instagramBannerMobile"
  | "pageHeroDesktop"
  | "pageHeroMobile"
  | "serviceDetailLandscape"
  | "storeLandscape"
  | "aboutHomepageLandscape"
  | "aboutPagePortrait"
  | "editorialPortrait"
  | "customHeroDesktop"
  | "customHeroMobile"
  | "customPathway"
  | "customInspiration"
  | "customPreset"
  | "openGraph";

export type MediaMissingBehavior =
  | "block-publish"
  | "hide-section"
  | "slot-fallback";

export type MediaSlotContract = {
  slot: PublicMediaSlot;
  aspectRatio: string;
  ratioValue: number;
  recommendedWidth: number;
  recommendedHeight: number;
  minimumWidth: number;
  minimumHeight: number;
  allowedFormats: readonly PublicMediaMimeType[];
  recommendedMaxBytes: number;
  technicalMaxBytes: number;
  fallbackPath: string | null;
  missingBehavior: MediaMissingBehavior;
  supportsFocalPoint: boolean;
  responsivePair?: PublicMediaSlot;
  allowResponsiveFallback: boolean;
};

const MB = 1024 * 1024;

export const PUBLIC_MEDIA_FALLBACKS = {
  product: "/debroder/fallback/fallback-product-4x5.svg",
  category: "/debroder/fallback/fallback-category-4x5.svg",
  editorial: "/debroder/fallback/fallback-editorial-4x5.svg",
  featuredDesktop: "/debroder/fallback/fallback-featured-desktop-5x4.svg",
  homepageHeroDesktop:
    "/debroder/fallback/fallback-homepage-hero-desktop-16x7.svg",
  homepageHeroMobile:
    "/debroder/fallback/fallback-homepage-hero-mobile-4x5.svg",
  pageHeroDesktop:
    "/debroder/fallback/fallback-page-hero-desktop-12x5.svg",
  pageHeroMobile:
    "/debroder/fallback/fallback-page-hero-mobile-4x5.svg",
  campaignDesktop:
    "/debroder/fallback/fallback-campaign-desktop-16x7.svg",
  campaignMobile:
    "/debroder/fallback/fallback-campaign-mobile-4x5.svg",
  instagramBannerDesktop:
    "/debroder/fallback/fallback-instagram-banner-desktop-12x5.svg",
  instagramBannerMobile:
    "/debroder/fallback/fallback-instagram-banner-mobile-4x5.svg",
  store: "/debroder/fallback/fallback-store-4x3.svg",
  serviceDetail: "/debroder/fallback/fallback-service-detail-4x3.svg",
  aboutLandscape:
    "/debroder/fallback/fallback-about-landscape-4x3.svg",
  aboutPortrait:
    "/debroder/fallback/fallback-about-portrait-4x5.svg",
  customHeroDesktop:
    "/debroder/fallback/fallback-custom-hero-desktop-12x5.svg",
  customHeroMobile:
    "/debroder/fallback/fallback-custom-hero-mobile-4x5.svg",
  customPreset:
    "/debroder/fallback/fallback-custom-preset-4x3.svg",
  openGraph: "/debroder/open-graph-logo.png"
} as const;

const portrait = {
  aspectRatio: "4:5",
  ratioValue: 4 / 5,
  recommendedWidth: 2000,
  recommendedHeight: 2500,
  minimumWidth: 1200,
  minimumHeight: 1500,
  allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
  recommendedMaxBytes: 500 * 1024,
  technicalMaxBytes: 10 * MB,
  supportsFocalPoint: true
} as const;

const mobilePortrait = {
  aspectRatio: "4:5",
  ratioValue: 4 / 5,
  recommendedWidth: 1600,
  recommendedHeight: 2000,
  minimumWidth: 1080,
  minimumHeight: 1350,
  allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
  recommendedMaxBytes: 700 * 1024,
  technicalMaxBytes: 10 * MB,
  supportsFocalPoint: true
} as const;

export const PUBLIC_MEDIA_REGISTRY: Record<PublicMediaSlot, MediaSlotContract> = {
  productPrimary: {
    slot: "productPrimary",
    ...portrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.product,
    missingBehavior: "slot-fallback",
    allowResponsiveFallback: false
  },
  productGallery: {
    slot: "productGallery",
    ...portrait,
    fallbackPath: null,
    missingBehavior: "hide-section",
    allowResponsiveFallback: false
  },
  categoryPortrait: {
    slot: "categoryPortrait",
    ...portrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.category,
    missingBehavior: "slot-fallback",
    allowResponsiveFallback: false
  },
  trendingPortrait: {
    slot: "trendingPortrait",
    ...portrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.editorial,
    missingBehavior: "hide-section",
    allowResponsiveFallback: false
  },
  homepageHeroDesktop: {
    slot: "homepageHeroDesktop",
    aspectRatio: "16:7",
    ratioValue: 16 / 7,
    recommendedWidth: 2400,
    recommendedHeight: 1050,
    minimumWidth: 1600,
    minimumHeight: 700,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 900 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.homepageHeroDesktop,
    missingBehavior: "slot-fallback",
    supportsFocalPoint: true,
    responsivePair: "homepageHeroMobile",
    allowResponsiveFallback: false
  },
  homepageHeroMobile: {
    slot: "homepageHeroMobile",
    ...mobilePortrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.homepageHeroMobile,
    missingBehavior: "slot-fallback",
    responsivePair: "homepageHeroDesktop",
    allowResponsiveFallback: false
  },
  homepageFeaturedDesktop: {
    slot: "homepageFeaturedDesktop",
    aspectRatio: "5:4",
    ratioValue: 5 / 4,
    recommendedWidth: 2000,
    recommendedHeight: 1600,
    minimumWidth: 1250,
    minimumHeight: 1000,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 700 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.featuredDesktop,
    missingBehavior: "hide-section",
    supportsFocalPoint: true,
    responsivePair: "homepageFeaturedMobile",
    allowResponsiveFallback: false
  },
  homepageFeaturedMobile: {
    slot: "homepageFeaturedMobile",
    ...mobilePortrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.editorial,
    missingBehavior: "hide-section",
    responsivePair: "homepageFeaturedDesktop",
    allowResponsiveFallback: false
  },
  homepageCampaignDesktop: {
    slot: "homepageCampaignDesktop",
    aspectRatio: "16:7",
    ratioValue: 16 / 7,
    recommendedWidth: 2400,
    recommendedHeight: 1050,
    minimumWidth: 1600,
    minimumHeight: 700,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 900 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.campaignDesktop,
    missingBehavior: "slot-fallback",
    supportsFocalPoint: true,
    responsivePair: "homepageCampaignMobile",
    allowResponsiveFallback: false
  },
  homepageCampaignMobile: {
    slot: "homepageCampaignMobile",
    ...mobilePortrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.campaignMobile,
    missingBehavior: "slot-fallback",
    responsivePair: "homepageCampaignDesktop",
    allowResponsiveFallback: false
  },
  instagramBannerDesktop: {
    slot: "instagramBannerDesktop",
    aspectRatio: "12:5",
    ratioValue: 12 / 5,
    recommendedWidth: 2400,
    recommendedHeight: 1000,
    minimumWidth: 1600,
    minimumHeight: 667,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 900 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.instagramBannerDesktop,
    missingBehavior: "slot-fallback",
    supportsFocalPoint: true,
    responsivePair: "instagramBannerMobile",
    allowResponsiveFallback: false
  },
  instagramBannerMobile: {
    slot: "instagramBannerMobile",
    ...mobilePortrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.instagramBannerMobile,
    missingBehavior: "slot-fallback",
    responsivePair: "instagramBannerDesktop",
    allowResponsiveFallback: false
  },
  pageHeroDesktop: {
    slot: "pageHeroDesktop",
    aspectRatio: "12:5",
    ratioValue: 12 / 5,
    recommendedWidth: 2400,
    recommendedHeight: 1000,
    minimumWidth: 1600,
    minimumHeight: 667,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 900 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.pageHeroDesktop,
    missingBehavior: "slot-fallback",
    supportsFocalPoint: true,
    responsivePair: "pageHeroMobile",
    allowResponsiveFallback: false
  },
  pageHeroMobile: {
    slot: "pageHeroMobile",
    ...mobilePortrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.pageHeroMobile,
    missingBehavior: "slot-fallback",
    responsivePair: "pageHeroDesktop",
    allowResponsiveFallback: false
  },
  serviceDetailLandscape: {
    slot: "serviceDetailLandscape",
    aspectRatio: "4:3",
    ratioValue: 4 / 3,
    recommendedWidth: 2000,
    recommendedHeight: 1500,
    minimumWidth: 1200,
    minimumHeight: 900,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 700 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.serviceDetail,
    missingBehavior: "hide-section",
    supportsFocalPoint: true,
    allowResponsiveFallback: false
  },
  storeLandscape: {
    slot: "storeLandscape",
    aspectRatio: "4:3",
    ratioValue: 4 / 3,
    recommendedWidth: 2000,
    recommendedHeight: 1500,
    minimumWidth: 1200,
    minimumHeight: 900,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 700 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.store,
    missingBehavior: "slot-fallback",
    supportsFocalPoint: true,
    allowResponsiveFallback: false
  },
  aboutHomepageLandscape: {
    slot: "aboutHomepageLandscape",
    aspectRatio: "4:3",
    ratioValue: 4 / 3,
    recommendedWidth: 2000,
    recommendedHeight: 1500,
    minimumWidth: 1200,
    minimumHeight: 900,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 700 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.aboutLandscape,
    missingBehavior: "hide-section",
    supportsFocalPoint: true,
    allowResponsiveFallback: false
  },
  aboutPagePortrait: {
    slot: "aboutPagePortrait",
    ...portrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.aboutPortrait,
    missingBehavior: "hide-section",
    allowResponsiveFallback: false
  },
  editorialPortrait: {
    slot: "editorialPortrait",
    ...portrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.editorial,
    missingBehavior: "hide-section",
    allowResponsiveFallback: false
  },
  customHeroDesktop: {
    slot: "customHeroDesktop",
    aspectRatio: "12:5",
    ratioValue: 12 / 5,
    recommendedWidth: 2400,
    recommendedHeight: 1000,
    minimumWidth: 1600,
    minimumHeight: 667,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 900 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.customHeroDesktop,
    missingBehavior: "slot-fallback",
    supportsFocalPoint: true,
    responsivePair: "customHeroMobile",
    allowResponsiveFallback: false
  },
  customHeroMobile: {
    slot: "customHeroMobile",
    ...mobilePortrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.customHeroMobile,
    missingBehavior: "slot-fallback",
    responsivePair: "customHeroDesktop",
    allowResponsiveFallback: false
  },
  customPathway: {
    slot: "customPathway",
    ...portrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.category,
    missingBehavior: "hide-section",
    allowResponsiveFallback: false
  },
  customInspiration: {
    slot: "customInspiration",
    ...portrait,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.editorial,
    missingBehavior: "hide-section",
    allowResponsiveFallback: false
  },
  customPreset: {
    slot: "customPreset",
    aspectRatio: "4:3",
    ratioValue: 4 / 3,
    recommendedWidth: 1600,
    recommendedHeight: 1200,
    minimumWidth: 1200,
    minimumHeight: 900,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 600 * 1024,
    technicalMaxBytes: 10 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.customPreset,
    missingBehavior: "slot-fallback",
    supportsFocalPoint: true,
    allowResponsiveFallback: false
  },
  openGraph: {
    slot: "openGraph",
    aspectRatio: "1.91:1",
    ratioValue: 1200 / 630,
    recommendedWidth: 1200,
    recommendedHeight: 630,
    minimumWidth: 1200,
    minimumHeight: 630,
    allowedFormats: PUBLIC_MEDIA_MIME_TYPES,
    recommendedMaxBytes: 500 * 1024,
    technicalMaxBytes: 5 * MB,
    fallbackPath: PUBLIC_MEDIA_FALLBACKS.openGraph,
    missingBehavior: "slot-fallback",
    supportsFocalPoint: false,
    allowResponsiveFallback: false
  }
};

export type ResolvedPublicMedia = {
  src: string | null;
  source: "slot" | "responsive" | "legacy-compatible" | "slot-fallback" | "hidden";
  slot: PublicMediaSlot;
  isFallback: boolean;
  warning?: string;
};

const SOCIAL_ONLY_PATHS = new Set([
  "/debroder/social-preview.png",
  "/debroder/open-graph-logo.png",
  "/brand/debroder/social-preview.png",
  "/brand/debroder/open-graph-logo.png"
]);

export function normalizePublicMediaPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;
  if (trimmed.includes("\\") || trimmed.includes("\0")) return null;
  if (trimmed.startsWith("/public/") || trimmed === "/public") return null;
  if (trimmed.split("/").includes("..")) return null;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    const configuredHost = safeConfiguredSupabaseHost();
    const isConfiguredSupabaseStorage =
      Boolean(configuredHost) &&
      url.hostname === configuredHost &&
      url.pathname.startsWith("/storage/v1/object/");
    if (isConfiguredSupabaseStorage) return url.toString();
  } catch {
    return null;
  }
  return null;
}

export function resolvePublicMedia(input: {
  slot: PublicMediaSlot;
  primary?: unknown;
  responsive?: unknown;
  legacy?: unknown;
  legacySlot?: PublicMediaSlot;
  allowLegacyCompatibility?: boolean;
  fallbackOverride?: unknown;
}): ResolvedPublicMedia {
  const contract = PUBLIC_MEDIA_REGISTRY[input.slot];
  const primary = validForSlot(input.primary, input.slot);
  if (primary) {
    return { src: primary, source: "slot", slot: input.slot, isFallback: false };
  }

  if (contract.allowResponsiveFallback) {
    const responsive = validForSlot(input.responsive, input.slot);
    if (responsive) {
      return {
        src: responsive,
        source: "responsive",
        slot: input.slot,
        isFallback: false,
        warning: "Media responsive counterpart dipakai sesuai contract slot."
      };
    }
  }

  if (
    input.allowLegacyCompatibility &&
    input.legacySlot &&
    ratiosAreCompatible(input.slot, input.legacySlot)
  ) {
    const legacy = validForSlot(input.legacy, input.slot);
    if (legacy) {
      return {
        src: legacy,
        source: "legacy-compatible",
        slot: input.slot,
        isFallback: false,
        warning: "Media legacy dipakai sementara karena rasionya masih kompatibel."
      };
    }
  }

  const override = validForSlot(input.fallbackOverride, input.slot);
  const fallback = override || validForSlot(contract.fallbackPath, input.slot);
  if (contract.missingBehavior === "slot-fallback" && fallback) {
    return {
      src: fallback,
      source: "slot-fallback",
      slot: input.slot,
      isFallback: true,
      warning: "Media khusus slot belum tersedia. Fallback dengan rasio yang sesuai digunakan."
    };
  }

  return {
    src: null,
    source: "hidden",
    slot: input.slot,
    isFallback: false,
    warning: contract.missingBehavior === "block-publish"
      ? "Media wajib belum tersedia; konten tidak boleh dipublikasikan."
      : "Media tidak tersedia; section harus disembunyikan."
  };
}

export function resolvePublicMediaSrc(
  slot: PublicMediaSlot,
  primary?: unknown,
  fallbackOverride?: unknown
) {
  return resolvePublicMedia({ slot, primary, fallbackOverride }).src;
}

export function mediaSlotContract(slot: PublicMediaSlot) {
  return PUBLIC_MEDIA_REGISTRY[slot];
}

export function ratiosAreCompatible(
  targetSlot: PublicMediaSlot,
  sourceSlot: PublicMediaSlot,
  tolerance = 0.08
) {
  const target = PUBLIC_MEDIA_REGISTRY[targetSlot].ratioValue;
  const source = PUBLIC_MEDIA_REGISTRY[sourceSlot].ratioValue;
  return Math.abs(target - source) / target <= tolerance;
}

export type MediaValidationIssue = {
  code:
    | "unsupported-format"
    | "file-too-large"
    | "dimensions-too-small"
    | "invalid-ratio"
    | "invalid-dimensions";
  severity: "error" | "warning";
  message: string;
};

export function validateMediaContract(input: {
  slot: PublicMediaSlot;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  legacy?: boolean;
}): MediaValidationIssue[] {
  const contract = PUBLIC_MEDIA_REGISTRY[input.slot];
  const severity = input.legacy ? "warning" : "error";
  const issues: MediaValidationIssue[] = [];

  if (!contract.allowedFormats.includes(input.mimeType as PublicMediaMimeType)) {
    issues.push({
      code: "unsupported-format",
      severity,
      message: "Format gambar harus JPG, PNG, atau WebP."
    });
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > contract.technicalMaxBytes) {
    issues.push({
      code: "file-too-large",
      severity,
      message: `Ukuran file maksimal ${Math.round(contract.technicalMaxBytes / MB)} MB untuk slot ini.`
    });
  }
  if (!input.width || !input.height || input.width <= 0 || input.height <= 0) {
    issues.push({
      code: "invalid-dimensions",
      severity,
      message: "Dimensi gambar tidak dapat dibaca."
    });
    return issues;
  }
  if (input.width < contract.minimumWidth || input.height < contract.minimumHeight) {
    issues.push({
      code: "dimensions-too-small",
      severity,
      message: `Dimensi minimum ${contract.minimumWidth} × ${contract.minimumHeight} px. Rekomendasi ${contract.recommendedWidth} × ${contract.recommendedHeight} px.`
    });
  }
  const actualRatio = input.width / input.height;
  if (Math.abs(actualRatio - contract.ratioValue) > 0.025) {
    issues.push({
      code: "invalid-ratio",
      severity,
      message: `Rasio gambar harus ${contract.aspectRatio}. Gunakan ${contract.recommendedWidth} × ${contract.recommendedHeight} px.`
    });
  }
  return issues;
}

export function mediaSlotForAdminField(
  adminKey: string,
  fieldName: string
): PublicMediaSlot | null {
  if (fieldName === "og_image_url") return "openGraph";
  if (adminKey === "products" && (fieldName === "image_url" || fieldName === "gambar_url")) return "productPrimary";
  if (adminKey === "categories" && (fieldName === "image_url" || fieldName === "gambar_url")) return "categoryPortrait";
  if (adminKey === "services" && fieldName === "image_url") return "editorialPortrait";
  if ((adminKey === "store" || adminKey === "stores") && fieldName === "image_url") return "storeLandscape";
  if (adminKey === "hero") {
    return fieldName === "mobile_image_url"
      ? "homepageHeroMobile"
      : fieldName === "image_url"
        ? "homepageHeroDesktop"
        : null;
  }
  if (adminKey === "banner") {
    return fieldName === "mobile_image_url"
      ? "instagramBannerMobile"
      : fieldName === "image_url"
        ? "instagramBannerDesktop"
        : null;
  }
  if (adminKey === "page-hero") {
    if (fieldName === "detail_image_url") return "serviceDetailLandscape";
    return fieldName === "mobile_image_url"
      ? "pageHeroMobile"
      : fieldName === "image_url"
        ? "pageHeroDesktop"
        : null;
  }
  if (adminKey === "trust-about") {
    if (fieldName === "about_page_image_url") return "aboutPagePortrait";
    if (fieldName === "about_page_mobile_image_url") return "aboutPagePortrait";
    if (fieldName === "image_url" || fieldName === "mobile_image_url") {
      return "aboutHomepageLandscape";
    }
  }
  return null;
}

function validForSlot(
  value: unknown,
  slot: PublicMediaSlot
) {
  const normalized = normalizePublicMediaPath(value);
  if (!normalized) return null;
  if (normalized.startsWith("/images/debroder/")) return null;
  if (slot !== "openGraph" && SOCIAL_ONLY_PATHS.has(normalized)) return null;
  return normalized;
}

function safeConfiguredSupabaseHost() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function isPublicMediaSlot(value: unknown): value is PublicMediaSlot {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PUBLIC_MEDIA_REGISTRY, value);
}
