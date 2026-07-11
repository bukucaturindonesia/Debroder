import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabaseEnv, getPublicSupabaseEnv } from "@/lib/env";

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

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

export function getAdminSupabaseClient(): SupabaseClient | null {
  const env = getAdminSupabaseEnv();

  if (!env) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(env.url, env.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }

  return adminClient;
}

