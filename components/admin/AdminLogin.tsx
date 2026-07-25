"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Logo } from "@/components/Logo";
import {
  createSupabaseClient,
  getSupabaseEnvStatus,
  isSupabaseConfigured
} from "@/lib/supabase";

function configMessage(status: ReturnType<typeof getSupabaseEnvStatus>) {
  if (status.usesRestEndpoint || (!status.anonKeyValid && status.hasAnonKey)) {
    return "Konfigurasi layanan data belum sesuai. Hubungi pengelola sistem.";
  }
  return "Layanan data belum aktif. Hubungi pengelola sistem.";
}

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabaseStatus = getSupabaseEnvStatus();
  const configured = isSupabaseConfigured();
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();

  async function verifyRecaptcha() {
    if (!recaptchaSiteKey) return true;
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) throw new Error("reCAPTCHA belum siap.");
    const token = await new Promise<string>((resolve, reject) => {
      grecaptcha.ready(() => {
        grecaptcha.execute(recaptchaSiteKey, { action: "admin_login" }).then(resolve).catch(reject);
      });
    });
    const response = await fetch("/api/recaptcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "admin_login" })
    });
    const result = (await response.json()) as { success?: boolean; message?: string };
    if (!response.ok || !result.success) throw new Error(result.message || "Verifikasi keamanan gagal.");
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const supabase = createSupabaseClient();
    if (!supabase) return setError(configMessage(supabaseStatus));

    setIsLoading(true);
    try {
      await verifyRecaptcha();
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError || !data.user || !data.session) throw new Error("Email atau password salah.");

      const response = await fetch("/api/admin/session?path=%2Fadmin%2Fdashboard", {
        cache: "no-store",
        headers: { authorization: `Bearer ${data.session.access_token}` }
      });
      const access = await response.json().catch(() => ({})) as {
        error?: string;
        home?: string;
      };

      if (!response.ok) {
        await supabase.auth.signOut();
        throw new Error(access.error || "Akses panel admin ditolak.");
      }

      router.push(access.home || "/admin/dashboard");
      router.refresh();
    } catch (loginFailure) {
      setError(loginFailure instanceof Error ? loginFailure.message : "Login gagal.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-offWhite px-4 py-10 text-brand-charcoal">
      {recaptchaSiteKey ? <Script src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`} strategy="afterInteractive" /> : null}
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center">
        <form onSubmit={handleSubmit} className="w-full rounded-xl border border-brand-softGray bg-white p-6 shadow-soft sm:p-8">
          <Logo variant="primary-dark" size="md" />
          <h1 className="mt-8 text-3xl font-black">Masuk ke Panel Admin</h1>
          <p className="mt-3 text-sm leading-6 text-brand-charcoal/70">Gunakan akun personal sesuai role dan scope yang diberikan.</p>

          {!configured ? <div className="mt-5 rounded-2xl bg-brand-offWhite p-4 text-sm font-semibold leading-6 text-brand-charcoal/70"><p>{configMessage(supabaseStatus)}</p></div> : null}
          {!recaptchaSiteKey ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">Verifikasi keamanan belum aktif. Aktifkan sebelum produksi.</p> : null}

          <label className="mt-6 block text-sm font-black">Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 text-base" required />
          </label>
          <label className="mt-4 block text-sm font-black">Kata sandi
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 text-base" required />
          </label>
          {error ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
          <button type="submit" disabled={isLoading || !configured} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-charcoal px-6 py-4 text-sm font-black text-white disabled:opacity-50">
            {isLoading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
