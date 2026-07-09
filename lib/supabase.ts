import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const placeholderPattern = /^ISI_/;

export const WEBSITE_IMAGES_BUCKET = "website-images";
export const ORDER_UPLOADS_BUCKET = "order-uploads";
const SUPABASE_FETCH_TIMEOUT_MS = 8000;

async function noStoreFetch(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SUPABASE_FETCH_TIMEOUT_MS
  );

  try {
    const signal = init?.signal
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal;

    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function hasValidSupabaseEnv() {
  return getSupabaseEnvStatus().configured;
}

function hasPublicAnonKey(value?: string) {
  if (!value || placeholderPattern.test(value)) return false;

  const lowerValue = value.toLowerCase();
  if (
    lowerValue.startsWith("sb_secret_") ||
    lowerValue.startsWith("service_role") ||
    lowerValue.includes("service_role")
  ) {
    return false;
  }

  return true;
}

function hasValidProjectUrl(value?: string) {
  if (!value || placeholderPattern.test(value)) return false;
  if (value.includes("/rest/v1")) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSupabaseEnvStatus() {
  const hasUrl = Boolean(supabaseUrl);
  const hasAnonKey = Boolean(supabaseAnonKey);
  const urlValid = hasValidProjectUrl(supabaseUrl);
  const anonKeyValid = hasPublicAnonKey(supabaseAnonKey);

  return {
    hasUrl,
    hasAnonKey,
    urlValid,
    anonKeyValid,
    usesRestEndpoint: Boolean(supabaseUrl?.includes("/rest/v1")),
    environment:
      process.env.NODE_ENV === "production" ? "Production" : "Development",
    configured: hasUrl && hasAnonKey && urlValid && anonKeyValid
  };
}

export function isSupabaseConfigured() {
  return hasValidSupabaseEnv();
}

export function createSupabaseClient(): SupabaseClient | null {
  if (!hasValidSupabaseEnv() || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function createSupabaseServerClient(): SupabaseClient | null {
  if (!hasValidSupabaseEnv() || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: noStoreFetch
    }
  });
}
