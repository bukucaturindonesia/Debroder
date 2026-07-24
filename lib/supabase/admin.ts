import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabaseEnv } from "@/lib/server-env";

let adminClient: SupabaseClient | null = null;

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
