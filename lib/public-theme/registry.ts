export const PUBLIC_THEME_IDS = [
  "luxury_minimalist",
  "editorial_fashion",
  "modern_streetwear",
  "clean_commerce",
  "dark_premium",
  "soft_lifestyle",
  "tech_commerce",
  "marketplace_dense",
  "bold_brand_commerce",
  "hybrid_premium_commerce"
] as const;

export type PublicThemeId = (typeof PUBLIC_THEME_IDS)[number];
export const DEFAULT_PUBLIC_THEME_ID: PublicThemeId = "hybrid_premium_commerce";

export type PublicThemeTokens = {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  ink: string;
  muted: string;
  accent: string;
  accentStrong: string;
  border: string;
  borderStrong: string;
  controlRadius: number;
  cardRadius: number;
  shadow: string;
  headingScale: number;
  bodyScale: number;
  sectionSpace: number;
  contentMax: number;
  gridGap: number;
  navTreatment: "quiet" | "editorial" | "graphic" | "compact" | "dark";
  buttonTreatment: "pill" | "square" | "soft" | "underline";
  cardTreatment: "minimal" | "editorial" | "sharp" | "dense" | "elevated";
  footerTreatment: "light" | "dark" | "quiet";
  campaignTreatment: "calm" | "editorial" | "graphic" | "structured";
  pdpDensity: "relaxed" | "balanced" | "compact";
};

export type PublicThemeDefinition = {
  id: PublicThemeId;
  name: string;
  description: string;
  preview: { canvas: string; accent: string; foreground: string };
  tokens: PublicThemeTokens;
};

const base = (tokens: Partial<PublicThemeTokens> & Pick<PublicThemeTokens, "canvas" | "surface" | "ink" | "accent">): PublicThemeTokens => ({
  canvas: tokens.canvas,
  surface: tokens.surface,
  surfaceMuted: tokens.surfaceMuted ?? tokens.canvas,
  ink: tokens.ink,
  muted: tokens.muted ?? "#6c6b64",
  accent: tokens.accent,
  accentStrong: tokens.accentStrong ?? tokens.accent,
  border: tokens.border ?? "rgba(23,23,23,.12)",
  borderStrong: tokens.borderStrong ?? "rgba(23,23,23,.24)",
  controlRadius: tokens.controlRadius ?? 6,
  cardRadius: tokens.cardRadius ?? tokens.controlRadius ?? 6,
  shadow: tokens.shadow ?? "none",
  headingScale: tokens.headingScale ?? 1,
  bodyScale: tokens.bodyScale ?? 1,
  sectionSpace: tokens.sectionSpace ?? 1,
  contentMax: tokens.contentMax ?? 1320,
  gridGap: tokens.gridGap ?? 20,
  navTreatment: tokens.navTreatment ?? "quiet",
  buttonTreatment: tokens.buttonTreatment ?? "square",
  cardTreatment: tokens.cardTreatment ?? "minimal",
  footerTreatment: tokens.footerTreatment ?? "quiet",
  campaignTreatment: tokens.campaignTreatment ?? "structured",
  pdpDensity: tokens.pdpDensity ?? "balanced"
});

export const PUBLIC_THEME_REGISTRY: Record<PublicThemeId, PublicThemeDefinition> = {
  luxury_minimalist: {
    id: "luxury_minimalist", name: "Luxury Minimalist", description: "Warm cream, calm composition, and product-led premium whitespace.",
    preview: { canvas: "#fbfaf7", accent: "#171717", foreground: "#171717" },
    tokens: base({ canvas: "#fbfaf7", surface: "#ffffff", ink: "#171717", accent: "#171717", muted: "#6c6b64", controlRadius: 4, cardRadius: 4, headingScale: 1.08, sectionSpace: 1.15, contentMax: 1280, gridGap: 24, buttonTreatment: "underline", cardTreatment: "minimal", campaignTreatment: "calm", pdpDensity: "relaxed" })
  },
  editorial_fashion: {
    id: "editorial_fashion", name: "Editorial Fashion", description: "Magazine-inspired typography and campaign-first visual storytelling.",
    preview: { canvas: "#f6f4ef", accent: "#8f3d2e", foreground: "#171717" },
    tokens: base({ canvas: "#f6f4ef", surface: "#ffffff", ink: "#171717", accent: "#8f3d2e", muted: "#706b65", controlRadius: 2, cardRadius: 2, headingScale: 1.22, sectionSpace: 1.3, contentMax: 1380, gridGap: 24, navTreatment: "editorial", buttonTreatment: "underline", cardTreatment: "editorial", campaignTreatment: "editorial", pdpDensity: "relaxed" })
  },
  modern_streetwear: {
    id: "modern_streetwear", name: "Modern Streetwear", description: "Sharp monochrome structure with a controlled electric accent.",
    preview: { canvas: "#f4f4f2", accent: "#d6ff00", foreground: "#0b0b0b" },
    tokens: base({ canvas: "#f4f4f2", surface: "#ffffff", ink: "#0b0b0b", accent: "#d6ff00", accentStrong: "#9ab800", muted: "#575757", controlRadius: 0, cardRadius: 0, headingScale: 1.14, bodyScale: .98, sectionSpace: .85, contentMax: 1320, gridGap: 12, navTreatment: "graphic", buttonTreatment: "square", cardTreatment: "sharp", campaignTreatment: "graphic", pdpDensity: "compact" })
  },
  clean_commerce: {
    id: "clean_commerce", name: "Clean Commerce", description: "Efficient product discovery with restrained typography and compact navigation.",
    preview: { canvas: "#ffffff", accent: "#063d24", foreground: "#181818" },
    tokens: base({ canvas: "#ffffff", surface: "#ffffff", ink: "#181818", accent: "#063d24", muted: "#676b68", controlRadius: 6, cardRadius: 6, sectionSpace: .82, contentMax: 1240, gridGap: 16, navTreatment: "compact", buttonTreatment: "square", cardTreatment: "minimal", campaignTreatment: "structured", pdpDensity: "compact" })
  },
  dark_premium: {
    id: "dark_premium", name: "Dark Premium", description: "Deep charcoal surfaces, readable contrast, and a restrained luxury accent.",
    preview: { canvas: "#181818", accent: "#c9a86a", foreground: "#f4f2ec" },
    tokens: base({ canvas: "#181818", surface: "#222222", surfaceMuted: "#1d1d1d", ink: "#f4f2ec", muted: "#c2c2b8", accent: "#c9a86a", border: "rgba(255,255,255,.16)", borderStrong: "rgba(255,255,255,.3)", controlRadius: 6, cardRadius: 6, shadow: "0 18px 50px rgba(0,0,0,.28)", sectionSpace: 1, contentMax: 1320, gridGap: 20, navTreatment: "dark", buttonTreatment: "square", cardTreatment: "elevated", footerTreatment: "dark", campaignTreatment: "calm", pdpDensity: "balanced" })
  },
  soft_lifestyle: {
    id: "soft_lifestyle", name: "Soft Lifestyle", description: "Warm neutral surfaces and relaxed premium rhythm for lifestyle-led shopping.",
    preview: { canvas: "#f7f2ed", accent: "#a55a4a", foreground: "#332e2a" },
    tokens: base({ canvas: "#f7f2ed", surface: "#fffaf6", ink: "#332e2a", accent: "#a55a4a", muted: "#756b65", controlRadius: 12, cardRadius: 12, sectionSpace: 1.1, contentMax: 1320, gridGap: 18, buttonTreatment: "soft", cardTreatment: "elevated", campaignTreatment: "calm", pdpDensity: "relaxed" })
  },
  tech_commerce: {
    id: "tech_commerce", name: "Tech Commerce", description: "Crisp product information, precise spacing, and structured comparison-friendly grids.",
    preview: { canvas: "#f2f5f5", accent: "#0f7180", foreground: "#172024" },
    tokens: base({ canvas: "#f2f5f5", surface: "#ffffff", ink: "#172024", accent: "#0f7180", muted: "#627074", controlRadius: 4, cardRadius: 4, shadow: "0 8px 24px rgba(23,32,36,.08)", bodyScale: .98, sectionSpace: .9, contentMax: 1320, gridGap: 14, navTreatment: "compact", buttonTreatment: "square", cardTreatment: "elevated", campaignTreatment: "structured", pdpDensity: "compact" })
  },
  marketplace_dense: {
    id: "marketplace_dense", name: "Marketplace Dense", description: "Controlled density for large catalogues, search, filters, and fast scanning.",
    preview: { canvas: "#f7f7f5", accent: "#063d24", foreground: "#1d1d1b" },
    tokens: base({ canvas: "#f7f7f5", surface: "#ffffff", ink: "#1d1d1b", accent: "#063d24", muted: "#666a67", controlRadius: 4, cardRadius: 4, sectionSpace: .72, contentMax: 1440, gridGap: 10, navTreatment: "compact", buttonTreatment: "square", cardTreatment: "dense", campaignTreatment: "structured", pdpDensity: "compact" })
  },
  bold_brand_commerce: {
    id: "bold_brand_commerce", name: "Bold Brand Commerce", description: "Expressive DEBRODER presence with bold accents and campaign confidence.",
    preview: { canvas: "#ffffff", accent: "#b91c1c", foreground: "#111111" },
    tokens: base({ canvas: "#ffffff", surface: "#ffffff", ink: "#111111", accent: "#b91c1c", muted: "#686868", controlRadius: 4, cardRadius: 4, headingScale: 1.14, sectionSpace: 1.05, contentMax: 1340, gridGap: 18, navTreatment: "graphic", buttonTreatment: "square", cardTreatment: "sharp", campaignTreatment: "graphic", pdpDensity: "balanced" })
  },
  hybrid_premium_commerce: {
    id: "hybrid_premium_commerce", name: "Hybrid Premium Commerce", description: "Recommended balance of luxury emotion, editorial character, and conversion clarity.",
    preview: { canvas: "#fbfaf7", accent: "#063d24", foreground: "#171717" },
    tokens: base({ canvas: "#fbfaf7", surface: "#ffffff", ink: "#171717", accent: "#063d24", muted: "#6c6b64", controlRadius: 6, cardRadius: 6, sectionSpace: 1, contentMax: 1320, gridGap: 20, navTreatment: "quiet", buttonTreatment: "square", cardTreatment: "minimal", campaignTreatment: "structured", pdpDensity: "balanced" })
  }
};

export function isPublicThemeId(value: unknown): value is PublicThemeId {
  return typeof value === "string" && (PUBLIC_THEME_IDS as readonly string[]).includes(value);
}

export function getPublicTheme(value: unknown): PublicThemeDefinition {
  return PUBLIC_THEME_REGISTRY[isPublicThemeId(value) ? value : DEFAULT_PUBLIC_THEME_ID];
}

export function publicThemeCssVariables(theme: PublicThemeDefinition) {
  const { tokens } = theme;
  return {
    "--theme-canvas": tokens.canvas,
    "--theme-surface": tokens.surface,
    "--theme-surface-muted": tokens.surfaceMuted,
    "--theme-ink": tokens.ink,
    "--theme-muted": tokens.muted,
    "--theme-accent": tokens.accent,
    "--theme-accent-strong": tokens.accentStrong,
    "--theme-border": tokens.border,
    "--theme-border-strong": tokens.borderStrong,
    "--theme-control-radius": `${tokens.controlRadius}px`,
    "--theme-card-radius": `${tokens.cardRadius}px`,
    "--theme-shadow": tokens.shadow,
    "--theme-heading-scale": String(tokens.headingScale),
    "--theme-body-scale": String(tokens.bodyScale),
    "--theme-section-space": String(tokens.sectionSpace),
    "--theme-content-max": `${tokens.contentMax}px`,
    "--theme-grid-gap": `${tokens.gridGap}px`,
    "--theme-nav-treatment": tokens.navTreatment,
    "--theme-button-treatment": tokens.buttonTreatment,
    "--theme-card-treatment": tokens.cardTreatment,
    "--theme-footer-treatment": tokens.footerTreatment,
    "--theme-campaign-treatment": tokens.campaignTreatment,
    "--theme-pdp-density": tokens.pdpDensity
  } as Record<string, string>;
}
