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

function isMissingProfilesTable(errorMessage = "", errorCode?: string) {
  const normalizedMessage = errorMessage.toLowerCase();
  return (
    errorCode === "42P01" ||
    (normalizedMessage.includes("profiles") &&
      normalizedMessage.includes("does not exist"))
  );
}

function configMessage(status: ReturnType<typeof getSupabaseEnvStatus>) {
  if (status.usesRestEndpoint) {
    return "Supabase belum aktif. Gunakan Project URL, bukan URL /rest/v1.";
  }

  if (!status.anonKeyValid && status.hasAnonKey) {
    return "Supabase belum aktif. Gunakan anon/public/publishable key, bukan secret key.";
  }

  return "Supabase belum aktif. Periksa Environment Variables.";
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
    if (!supabase) {
      setError(configMessage(supabaseStatus));
      return;
    }

    setIsLoading(true);
    try {
      await verifyRecaptcha();
    } catch (recaptchaError) {
      setIsLoading(false);
      setError(recaptchaError instanceof Error ? recaptchaError.message : "Verifikasi keamanan gagal.");
      return;
    }
    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (loginError || !data.user) {
      setIsLoading(false);
      setError("Email atau password salah.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setError(
        isMissingProfilesTable(profileError.message, profileError.code)
          ? "Tabel profiles belum tersedia. Jalankan schema.sql terlebih dahulu."
          : "Supabase aktif, tetapi database schema belum dijalankan."
      );
      return;
    }

    if (profile?.role !== "superadmin") {
      await supabase.auth.signOut();
      setIsLoading(false);
      setError("Akses ditolak. Akun ini belum memiliki role superadmin.");
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-brand-offWhite px-4 py-10 text-brand-charcoal">
      {recaptchaSiteKey ? <Script src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`} strategy="afterInteractive" /> : null}
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-xl border border-brand-softGray bg-white p-6 shadow-soft sm:p-8"
        >
          <Logo variant="primary-dark" size="md" />

          <h1 className="mt-8 text-3xl font-black">Login Super Admin</h1>
          <p className="mt-3 text-sm leading-6 text-brand-charcoal/70">
            Login ini hanya untuk pengelola konten website DE BRODER.
          </p>

          {!configured ? (
            <div className="mt-5 rounded-2xl bg-brand-offWhite p-4 text-sm font-semibold leading-6 text-brand-charcoal/70">
              <p>{configMessage(supabaseStatus)}</p>
              <div className="mt-4 rounded-2xl bg-white p-4">
                <p className="font-black text-brand-charcoal">Supabase Status:</p>
                <div className="mt-3 grid gap-1">
                  <p>URL tersedia: {supabaseStatus.hasUrl ? "Ya" : "Tidak"}</p>
                  <p>
                    Anon Key tersedia:{" "}
                    {supabaseStatus.hasAnonKey ? "Ya" : "Tidak"}
                  </p>
                  <p>URL valid: {supabaseStatus.urlValid ? "Ya" : "Tidak"}</p>
                  <p>
                    Anon Key valid:{" "}
                    {supabaseStatus.anonKeyValid ? "Ya" : "Tidak"}
                  </p>
                  <p>Environment: {supabaseStatus.environment}</p>
                </div>
              </div>
            </div>
          ) : null}

          {!recaptchaSiteKey ? (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
              reCAPTCHA belum aktif. Isi NEXT_PUBLIC_RECAPTCHA_SITE_KEY dan RECAPTCHA_SECRET_KEY sebelum deploy production.
            </p>
          ) : null}

          <label className="mt-6 block text-sm font-black">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 text-base outline-none transition focus:border-brand-charcoal"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-black">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 text-base outline-none transition focus:border-brand-charcoal"
              required
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading || !configured}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-charcoal px-6 py-4 text-sm font-black text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Memproses..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
