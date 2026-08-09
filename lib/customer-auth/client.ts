"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/env";

const CUSTOMER_AUTH_STORAGE_KEY = "debroder-customer-auth-v1";
let customerClient: SupabaseClient | null | undefined;

export function getCustomerSupabaseClient(): SupabaseClient | null {
  if (customerClient !== undefined) return customerClient;
  const env = getPublicSupabaseEnv();
  if (!env) {
    customerClient = null;
    return null;
  }
  customerClient = createClient(env.url, env.anonKey, {
    auth: {
      storageKey: CUSTOMER_AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit"
    }
  });
  return customerClient;
}

export function safeCustomerNext(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/admin")) return fallback;
  const allowed = ["/account", "/checkout", "/order-confirmation", "/track-order"];
  return allowed.some((prefix) => value === prefix || value.startsWith(`${prefix}/`) || value.startsWith(`${prefix}?`))
    ? value
    : fallback;
}
