import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase";
import { PUBLIC_CACHE_REVALIDATE_SECONDS, PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import {
  DEFAULT_PUBLIC_THEME_ID,
  getPublicTheme,
  isPublicThemeId,
  type PublicThemeId
} from "./registry";

export const PUBLIC_THEME_SETTING_KEY = "active_public_theme";

export type PublicThemeState = {
  current: PublicThemeId;
  previous: PublicThemeId | null;
  changed_at: string | null;
  changed_by: string | null;
};

export const DEFAULT_PUBLIC_THEME_STATE: PublicThemeState = {
  current: DEFAULT_PUBLIC_THEME_ID,
  previous: null,
  changed_at: null,
  changed_by: null
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parsePublicThemeState(value: unknown): PublicThemeState {
  if (!isRecord(value) || !isPublicThemeId(value.current)) return DEFAULT_PUBLIC_THEME_STATE;
  return {
    current: value.current,
    previous: isPublicThemeId(value.previous) && value.previous !== value.current ? value.previous : null,
    changed_at: typeof value.changed_at === "string" ? value.changed_at : null,
    changed_by: typeof value.changed_by === "string" ? value.changed_by : null
  };
}

async function readPublicThemeState(): Promise<PublicThemeState> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return DEFAULT_PUBLIC_THEME_STATE;
  const { data, error } = await supabase
    .from("website_settings")
    .select("value")
    .eq("setting_key", PUBLIC_THEME_SETTING_KEY)
    .maybeSingle();
  if (error) return DEFAULT_PUBLIC_THEME_STATE;
  return parsePublicThemeState(data?.value);
}

export const getPublicThemeState = unstable_cache(
  readPublicThemeState,
  ["public-theme-state-v1"],
  { revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_CACHE_TAGS.theme] }
);

export async function getActivePublicTheme() {
  const state = await getPublicThemeState();
  return getPublicTheme(state.current);
}

