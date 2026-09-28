import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { PUBLIC_ROUTES, PUBLIC_SITEMAP_ROUTES } from "@/lib/public-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_SITEMAP_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    lastModified: now,
    changeFrequency: route === PUBLIC_ROUTES.home ? "weekly" : "monthly",
    priority: route === PUBLIC_ROUTES.home ? 1 : 0.8
  }));
}
