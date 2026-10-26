import "server-only";

import { unstable_cache } from "next/cache";
import { publicCmsStatusFilter } from "@/lib/cms-workflow";
import { PUBLIC_CACHE_REVALIDATE_SECONDS, PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { CatalogPageHeroRow } from "@/lib/catalog-page/source";

type HeroArtwork = Pick<CatalogPageHeroRow, "page_key" | "image_url" | "mobile_image_url" | "object_position" | "mobile_object_position" | "object_fit" | "focal_zoom" | "mobile_focal_zoom">;

/** Read only published CMS artwork; product and transaction sources stay separate. */
export const getPublicCategoryHero = unstable_cache(
  async (pageKey: string): Promise<HeroArtwork | null> => {
    const client = createSupabaseServerClient();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from("page_heroes")
        .select("page_key,image_url,mobile_image_url,object_position,mobile_object_position,object_fit,focal_zoom,mobile_focal_zoom")
        .eq("page_key", pageKey)
        .eq("status_aktif", true)
        .or(publicCmsStatusFilter())
        .limit(1)
        .maybeSingle();
      return error ? null : data as HeroArtwork | null;
    } catch {
      return null;
    }
  },
  ["public-category-hero-v1"],
  { revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_CACHE_TAGS.content] }
);
