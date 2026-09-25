import { brochureSite } from "@/src/config/site";

const defaultSiteUrl = brochureSite.domain;

function normalizeSiteUrl(value?: string) {
  const candidate = (value || defaultSiteUrl).trim().replace(/\/+$/, "");

  try {
    return new URL(candidate).toString().replace(/\/+$/, "");
  } catch {
    return defaultSiteUrl;
  }
}

export const siteConfig = {
  siteName: brochureSite.name,
  companyName: "CV. Debroder",
  siteUrl: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  defaultMetaTitle: "DEBRODER — Bahan & Produksi Apparel",
  defaultMetaDescription:
    "DEBRODER menyediakan bahan tekstil dan layanan produksi apparel, DTF, jersey, dan maklon sublim."
} as const;

export function absoluteUrl(path = "") {
  if (!path) return siteConfig.siteUrl;
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.siteUrl}${normalizedPath}`;
}
