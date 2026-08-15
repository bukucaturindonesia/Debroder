import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { PUBLIC_CACHE_REVALIDATE_SECONDS, PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { readCatalogPageSource } from "./data-access";
import type { CatalogPageInput } from "./domain";
import { loadCatalogPageModel } from "./use-case";

const readCachedCatalogSource = unstable_cache(
  (routeKey: string) => readCatalogPageSource(routeKey),
  ["public-catalog-source-v1"],
  {
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.catalog, PUBLIC_CACHE_TAGS.product]
  }
);

export const getCatalogPageModel = cache((input: CatalogPageInput) => {
  return loadCatalogPageModel(input, readCachedCatalogSource);
});
