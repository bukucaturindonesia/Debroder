"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  customerLoginSchema,
  customerPasswordSchema,
  customerRegistrationSchema,
  customerRecoverySchema
} from "@/lib/customer-auth/contracts";
import { getCustomerSupabaseClient, safeCustomerNext } from "@/lib/customer-auth/client";
import { customerRecaptchaToken } from "@/lib/customer-auth/recaptcha-client";

const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();

export function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeCustomerNext(searchParams.get("next"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const parsed = customerLoginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Data masuk tidak valid.");
    const client = getCustomerSupabaseClient();
    if (!client) return setError("Layanan akun pelanggan belum tersedia.");
    setLoading(true);
    try {
      await verifyClientRecaptcha("customer_login");
      const { data, error: loginError } = await client.auth.signInWithPassword(parsed.data);
      if (loginError || !data.session) throw new Error("Email atau kata sandi tidak cocok.");
      if (!data.user.email_confirmed_at) {
        await client.auth.signOut();
        router.push(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
        return;
      }
      const response = await fetch("/api/customer/session", {
        cache: "no-store",
        headers: { authorization: `Bearer ${data.session.access_token}` }
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; code?: string };
      if (!response.ok) {
        await client.auth.signOut();
        if (payload.code === "CUSTOMER_INTERNAL_ACCOUNT") {
          throw new Error("Akun internal tidak dapat digunakan di login pelanggan. Gunakan jalur Admin.");
        }
        throw new Error(payload.error || "Akun pelanggan belum dapat dibuka.");
      }
      router.replace(next);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Akun pelanggan belum dapat dibuka.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard eyebrow="Akun pelanggan" title="Masuk ke akun Anda" description="Lihat riwayat pesanan, simpan alamat, dan lanjutkan transaksi tanpa verifikasi WhatsApp." requiresRecaptcha>
      <RecaptchaScript />
      <form onSubmit={submit} className="mt-7 grid gap-4">
        <AuthField label="Email"><input name="email" type="email" autoComplete="email" required /></AuthField>
        <AuthField label="Kata sandi"><input name="password" type="password" autoComplete="current-password" required /></AuthField>
        <div className="flex justify-end"><Link href="/forgot-password" className="text-sm font-semibold underline underline-offset-4">Lupa kata sandi?</Link></div>
        <ErrorMessage value={error} />
        <PrimaryButton loading={loading} label="Masuk" loadingLabel="Memeriksa akun..." />
      </form>
      <p className="mt-6 text-center text-sm text-black/60">Belum punya akun? <Link href="/register" className="font-semibold text-black underline underline-offset-4">Daftar melalui email</Link></p>
      <p className="mt-3 text-center text-xs text-black/45">Akses admin tidak tersedia dari halaman ini.</p>
    </AuthCard>
  );
}

export function CustomerRegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const parsed = customerRegistrationSchema.safeParse({
      fullName: form.get("fullName"),
      email: form.get("email"),
      password: form.get("password"),
      acceptedTerms: form.get("acceptedTerms") === "on"
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Data pendaftaran tidak valid.");
    setLoading(true);
    try {
      const recaptchaToken = await customerRecaptchaToken("customer_register");
      const response = await fetch("/api/customer/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed.data, recaptchaToken })
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Pendaftaran belum dapat diproses.");
      router.push(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pendaftaran belum dapat diproses.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard eyebrow="Daftar pelanggan" title="Buat akun dengan email" description="Kami mengirim tautan verifikasi ke email Anda. Akun baru aktif setelah tautan dibuka." requiresRecaptcha>
      <RecaptchaScript />
      <form onSubmit={submit} className="mt-7 grid gap-4">
        <AuthField label="Nama lengkap"><input name="fullName" autoComplete="name" minLength={2} maxLength={150} required /></AuthField>
        <AuthField label="Email"><input name="email" type="email" autoComplete="email" required /></AuthField>
        <AuthField label="Kata sandi"><input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></AuthField>
        <p className="text-xs leading-5 text-black/50">Minimal 10 karakter dan memiliki huruf besar, huruf kecil, serta angka.</p>
        <label className="flex items-start gap-3 text-sm leading-6 text-black/70">
          <input name="acceptedTerms" type="checkbox" className="mt-1 h-4 w-4" required />
          <span>Saya menyetujui <Link href="/legal/terms" className="font-semibold underline">Syarat & Ketentuan</Link> serta <Link href="/legal/privacy" className="font-semibold underline">Kebijakan Privasi</Link>.</span>
        </label>
        <ErrorMessage value={error} />
        <PrimaryButton loading={loading} label="Daftar & Kirim Verifikasi" loadingLabel="Membuat akun..." />
      </form>
      <p className="mt-6 text-center text-sm text-black/60">Sudah punya akun? <Link href="/login" className="font-semibold text-black underline underline-offset-4">Masuk</Link></p>
    </AuthCard>
  );
}

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = customerRecoverySchema.safeParse({ email });
    if (!parsed.success) return setError("Email tidak valid.");
    setLoading(true);
    try {
      const recaptchaToken = await customerRecaptchaToken("customer_resend_verification");
      const response = await fetch("/api/customer/auth/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email, recaptchaToken })
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || "Email verifikasi belum dapat dikirim.");
      setMessage(payload.message || "Email verifikasi telah diminta.");
      setCooldown(60);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Email verifikasi belum dapat dikirim.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard eyebrow="Verifikasi email" title="Periksa kotak masuk Anda" description="Buka tautan verifikasi dari DEBRODER. Tanpa verifikasi email, akun pelanggan tidak dapat digunakan." requiresRecaptcha>
      <RecaptchaScript />
      <form onSubmit={resend} className="mt-7 grid gap-4">
        <AuthField label="Email pendaftaran"><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></AuthField>
        {message ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p> : null}
        <ErrorMessage value={error} />
        <button type="submit" disabled={loading || cooldown > 0} className="min-h-12 rounded-full border border-black/20 px-6 text-sm font-semibold disabled:opacity-45">
          {loading ? "Mengirim..." : cooldown > 0 ? `Kirim ulang dalam ${cooldown} detik` : "Kirim Ulang Email Verifikasi"}
        </button>
      </form>
      <Link href="/login" className="mt-6 inline-flex text-sm font-semibold underline underline-offset-4">Kembali ke halaman masuk</Link>
    </AuthCard>
  );
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const parsed = customerRecoverySchema.safeParse({ email: form.get("email") });
    if (!parsed.success) return setError("Email tidak valid.");
    setLoading(true);
    try {
      const recaptchaToken = await customerRecaptchaToken("customer_password_recovery");
      const response = await fetch("/api/customer/auth/recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email, recaptchaToken })
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || "Pemulihan akun belum dapat diproses.");
      setMessage(payload.message || "Periksa email untuk melanjutkan pemulihan akun.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pemulihan akun belum dapat diproses.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard eyebrow="Pemulihan akun" title="Atur ulang kata sandi" description="Masukkan email pelanggan. Kami tidak akan membuka informasi apakah email tersebut terdaftar." requiresRecaptcha>
      <RecaptchaScript />
      <form onSubmit={submit} className="mt-7 grid gap-4">
        <AuthField label="Email pelanggan"><input name="email" type="email" autoComplete="email" required /></AuthField>
        {message ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p> : null}
        <ErrorMessage value={error} />
        <PrimaryButton loading={loading} label="Kirim Tautan Pemulihan" loadingLabel="Mengirim..." />
      </form>
      <Link href="/login" className="mt-6 inline-flex text-sm font-semibold underline underline-offset-4">Kembali ke halaman masuk</Link>
    </AuthCard>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let completed = false;
    const client = getCustomerSupabaseClient();
    if (!client) {
      setError("Layanan akun pelanggan belum tersedia.");
      return;
    }
    const authClient = client;

    async function validateRecoverySession(session: Session | null) {
      if (!active || completed || !session?.access_token) return;
      completed = true;
      try {
        const response = await fetch("/api/customer/session", {
          cache: "no-store",
          headers: { authorization: `Bearer ${session.access_token}` }
        });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!active) return;
        if (!response.ok) {
          await authClient.auth.signOut();
          setError(payload.error || "Tautan ini tidak dapat digunakan untuk akun pelanggan.");
          return;
        }
        setReady(true);
        setError("");
      } catch {
        if (active) setError("Tautan pemulihan belum dapat diperiksa. Periksa koneksi lalu coba lagi.");
      }
    }

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (session) window.setTimeout(() => void validateRecoverySession(session), 0);
    });
    void client.auth.getSession().then(({ data }) => {
      if (data.session) void validateRecoverySession(data.session);
    });
    const timeout = window.setTimeout(() => {
      if (active && !completed) setError("Tautan pemulihan tidak valid atau sudah kedaluwarsa.");
    }, 5000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const parsed = customerPasswordSchema.safeParse({ password: form.get("password"), confirmation: form.get("confirmation") });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Kata sandi tidak valid.");
    const client = getCustomerSupabaseClient();
    if (!client) return setError("Layanan akun pelanggan belum tersedia.");
    setLoading(true);
    try {
      const { error: updateError } = await client.auth.updateUser({ password: parsed.data.password });
      if (updateError) throw new Error("Kata sandi belum dapat diperbarui. Minta tautan baru.");
      await client.auth.signOut();
      router.replace("/login?reset=success");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kata sandi belum dapat diperbarui.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard eyebrow="Keamanan akun" title="Buat kata sandi baru" description="Gunakan kata sandi unik yang tidak dipakai di layanan lain.">
      <form onSubmit={submit} className="mt-7 grid gap-4">
        <AuthField label="Kata sandi baru"><input name="password" type="password" autoComplete="new-password" minLength={10} required disabled={!ready} /></AuthField>
        <AuthField label="Ulangi kata sandi"><input name="confirmation" type="password" autoComplete="new-password" minLength={10} required disabled={!ready} /></AuthField>
        <ErrorMessage value={error} />
        <PrimaryButton loading={loading} label="Simpan Kata Sandi Baru" loadingLabel="Menyimpan..." disabled={!ready} />
      </form>
    </AuthCard>
  );
}

export function CustomerAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => safeCustomerNext(searchParams.get("next")), [searchParams]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let completed = false;
    const client = getCustomerSupabaseClient();
    if (!client) {
      setError("Layanan akun pelanggan belum tersedia.");
      return;
    }
    const authClient = client;

    async function finish(session: Session | null) {
      if (!active || completed || !session?.user.email_confirmed_at) return;
      completed = true;
      try {
        const response = await fetch("/api/customer/session", {
          cache: "no-store",
          headers: { authorization: `Bearer ${session.access_token}` }
        });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!active) return;
        if (!response.ok) {
          await authClient.auth.signOut();
          setError(payload.error || "Akun pelanggan belum dapat diaktifkan.");
          return;
        }
        router.replace(next);
        router.refresh();
      } catch {
        if (active) setError("Akun pelanggan belum dapat diaktifkan. Periksa koneksi lalu coba lagi.");
      }
    }

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (session) window.setTimeout(() => void finish(session), 0);
    });
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || completed) return;
      if (sessionError) {
        setError("Tautan verifikasi tidak valid atau sudah kedaluwarsa.");
        return;
      }
      if (data.session) void finish(data.session);
    });
    const timeout = window.setTimeout(() => {
      if (active && !completed) setError("Tautan verifikasi tidak valid atau sudah kedaluwarsa.");
    }, 5000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [next, router]);

  return (
    <AuthCard eyebrow="Verifikasi email" title={error ? "Verifikasi belum berhasil" : "Mengaktifkan akun Anda..."} description={error || "Tunggu sebentar. Kami sedang memeriksa tautan dan menyiapkan akun pelanggan."}>
      {error ? <Link href="/verify-email" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-black px-6 text-sm font-semibold text-white">Kirim Ulang Verifikasi</Link> : <div className="mt-7 h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-black" /></div>}
    </AuthCard>
  );
}

function AuthCard({ eyebrow, title, description, children, requiresRecaptcha = false }: { eyebrow: string; title: string; description: string; children: ReactNode; requiresRecaptcha?: boolean }) {
  return (
    <section className="bg-brand-offWhite px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-lg rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-9">
        <p className="public-eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-black/60">{description}</p>
        {requiresRecaptcha && !siteKey ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">Verifikasi keamanan belum dikonfigurasi. Fitur ini akan ditolak di production sampai reCAPTCHA aktif.</p> : null}
        {children}
      </div>
    </section>
  );
}

function AuthField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border [&_input]:border-black/15 [&_input]:px-4 [&_input]:outline-none [&_input]:transition focus-within:[&_input]:border-black">{label}{children}</label>;
}

function ErrorMessage({ value }: { value: string }) {
  return value ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">{value}</p> : null;
}

function PrimaryButton({ loading, label, loadingLabel, disabled = false }: { loading: boolean; label: string; loadingLabel: string; disabled?: boolean }) {
  return <button type="submit" disabled={loading || disabled} className="min-h-12 rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-45">{loading ? loadingLabel : label}</button>;
}

function RecaptchaScript() {
  return siteKey ? <Script src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`} strategy="afterInteractive" /> : null;
}

async function verifyClientRecaptcha(action: string) {
  const token = await customerRecaptchaToken(action);
  const response = await fetch("/api/recaptcha", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, action })
  });
  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(payload.message || "Verifikasi keamanan gagal.");
}
