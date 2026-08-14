import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { PUBLIC_CACHE_REVALIDATE_SECONDS, PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { readPublicShellSource } from "./data-access";
import { loadPublicShellPageModel } from "./use-case";

const readCachedPublicShellSource = unstable_cache(
  readPublicShellSource,
  ["public-shell-source-v1"],
  {
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.catalog]
  }
);

/** Request memoization over a short-lived, public cross-request cache. */
export const getPublicShellPageModel = cache(() =>
  loadPublicShellPageModel(readCachedPublicShellSource)
);
