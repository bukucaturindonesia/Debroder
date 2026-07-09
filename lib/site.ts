const defaultSiteUrl = "https://debroder.vercel.app";

function normalizeSiteUrl(value?: string) {
  const candidate = (value || defaultSiteUrl).trim().replace(/\/+$/, "");

  try {
    return new URL(candidate).toString().replace(/\/+$/, "");
  } catch {
    return defaultSiteUrl;
  }
}

export const siteConfig = {
  siteName: "DEBRODER",
  companyName: "CV. Debroder",
  siteUrl: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  defaultMetaTitle: "DE BRODER \u2014 Kaos Polos New State Apparel & Sablon DTF",
  defaultMetaDescription:
    "DE BRODER menyediakan kaos polos New State Apparel, sablon DTF, custom jersey, maklon DTF, cetak sublim, Distributor Kaos NSA, dan Kaos Cotton Combed melalui store di Makassar dan Parepare."
} as const;

export function absoluteUrl(path = "") {
  if (!path) return siteConfig.siteUrl;
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.siteUrl}${normalizedPath}`;
}
