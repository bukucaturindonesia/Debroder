import "server-only";

import { publicCmsStatusFilter } from "@/lib/cms-workflow";
import { getCustomDestinationForSourceCategory } from "@/lib/custom-commerce/data";
import { readActiveProductSource } from "@/lib/product-read/data-access";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { CatalogCategoryRow, CatalogPageHeroRow, CatalogPageSource } from "./source";

export async function readCatalogPageSource(routeKey: string): Promise<CatalogPageSource> {
  const client = createSupabaseServerClient();
  if (!client) {
    return {
      routeKey,
      status: "unavailable",
      hero: null,
      campaigns: [],
      category: null,
      productSource: await readActiveProductSource(),
      customDestination: null
    };
  }

  const [heroResult, campaignResult, categoryResult] = await Promise.all([
    client
      .from("page_heroes")
      .select("page_key,label,title,subtitle,image_url,mobile_image_url,object_position,mobile_object_position,object_fit,focal_zoom,mobile_focal_zoom,primary_cta_label,primary_cta_url,secondary_cta_label,secondary_cta_url")
      .eq("page_key", routeKey)
      .eq("status_aktif", true)
      .or(publicCmsStatusFilter())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("cms_banners")
      .select("id,name,desktop_media_url,mobile_media_url,eyebrow,title,subtitle,cta_label,cta_url,section_type,section_group,image_alt,object_position,mobile_object_position,sort_order")
      .eq("experience_key", routeKey)
      .eq("is_active", true)
      .or(publicCmsStatusFilter())
      .order("sort_order", { ascending: true }),
    client
      .from("product_categories")
      .select("id,name,slug,is_active,sort_order")
      .eq("slug", routeKey)
      .eq("is_active", true)
      .maybeSingle()
  ]);

  const hero = !heroResult.error && heroResult.data
    ? heroResult.data as CatalogPageHeroRow
    : null;
  const category = !categoryResult.error && categoryResult.data
    ? categoryResult.data as CatalogCategoryRow
    : null;
  const campaigns = !campaignResult.error && Array.isArray(campaignResult.data)
    ? campaignResult.data
    : [];
  const productSourcePromise = readActiveProductSource(
    routeKey === "koleksi"
      ? {}
      : { productCategoryId: category?.id || undefined }
  );
  const customDestinationPromise = category?.id
    ? getCustomDestinationForSourceCategory(category.id)
    : Promise.resolve(null);
  const [productSource, customDestination] = await Promise.all([
    productSourcePromise,
    customDestinationPromise
  ]);
  const unavailable = Boolean(
    heroResult.error
    || categoryResult.error
    || productSource.products.status === "unavailable"
  );

  return {
    routeKey,
    status: unavailable
      ? "unavailable"
      : productSource.products.data.length
        ? "ready"
        : "empty",
    hero,
    campaigns,
    category,
    productSource,
    customDestination
  };
}
