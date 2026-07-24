import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/env";

let publicClient: SupabaseClient | null = null;

export function getPublicSupabaseClient(): SupabaseClient | null {
  const env = getPublicSupabaseEnv();

  if (!env) {
    return null;
  }

  if (!publicClient) {
    publicClient = createClient(env.url, env.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }

  return publicClient;
}

