"use client";

import type { Session } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { CustomerProfile } from "@/lib/customer-auth/contracts";
import { getCustomerSupabaseClient } from "@/lib/customer-auth/client";

type CustomerAuthContextValue = {
  loading: boolean;
  session: Session | null;
  profile: CustomerProfile | null;
  error: string;
  accessToken: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const customerAuthEnabled = !pathname.startsWith("/admin");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.access_token) {
      setProfile(null);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/customer/session", {
        cache: "no-store",
        headers: { authorization: `Bearer ${nextSession.access_token}` }
      });
      const payload = await response.json().catch(() => ({})) as { profile?: CustomerProfile; error?: string; code?: string };
      if (!response.ok || !payload.profile) {
        if ([
          "CUSTOMER_INTERNAL_ACCOUNT",
          "CUSTOMER_ACCOUNT_NOT_PROVISIONED",
          "CUSTOMER_EMAIL_NOT_VERIFIED"
        ].includes(payload.code || "")) {
          await getCustomerSupabaseClient()?.auth.signOut();
        }
        setProfile(null);
        setError(payload.error || "Akun pelanggan belum dapat dimuat.");
        return;
      }
      setProfile(payload.profile);
      setError("");
    } catch {
      setProfile(null);
      setError("Akun pelanggan belum dapat dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!customerAuthEnabled) {
      setSession(null);
      setProfile(null);
      setError("");
      setLoading(false);
      return;
    }
    const client = getCustomerSupabaseClient();
    if (!client) {
      setError("Layanan akun pelanggan belum dikonfigurasi.");
      setLoading(false);
      return;
    }
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) void loadProfile(data.session);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) window.setTimeout(() => void loadProfile(nextSession), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [customerAuthEnabled, loadProfile]);

  const value = useMemo<CustomerAuthContextValue>(() => ({
    loading,
    session,
    profile,
    error,
    accessToken: session?.access_token ?? null,
    refresh: async () => {
      const client = getCustomerSupabaseClient();
      const next = await client?.auth.getSession();
      await loadProfile(next?.data.session ?? null);
    },
    signOut: async () => {
      await getCustomerSupabaseClient()?.auth.signOut();
      setSession(null);
      setProfile(null);
      setError("");
    }
  }), [error, loadProfile, loading, profile, session]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const value = useContext(CustomerAuthContext);
  if (!value) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider.");
  return value;
}
