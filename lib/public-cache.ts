import { revalidateTag } from "next/cache";

export const PUBLIC_CACHE_REVALIDATE_SECONDS = 60;

export const PUBLIC_CACHE_TAGS = {
  content: "public-content",
  shell: "public-shell",
  catalog: "public-catalog",
  product: "public-product",
  theme: "public-theme"
} as const;

/** Invalidate only the presentation cache; catalog and commerce data remain warm. */
export function revalidatePublicThemeCache() {
  (revalidateTag as unknown as (tag: string) => void)(PUBLIC_CACHE_TAGS.theme);
}
