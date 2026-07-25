"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createSupabaseClient } from "@/lib/supabase";

function validateNewPassword(value: string) {
  if (value.length < 12) return "Kata sandi baru minimal 12 karakter.";
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) {
    return "Gunakan huruf kecil dan huruf besar.";
  }
  if (!/\d/.test(value)) return "Tambahkan minimal satu angka.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Tambahkan minimal satu simbol.";
  return "";
}

export function AdminChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validation = validateNewPassword(newPassword);
    if (validation) return setError(validation);
    if (newPassword !== confirmation) return setError("Konfirmasi kata sandi tidak sama.");
    if (newPassword === currentPassword) {
      return setError("Kata sandi baru harus berbeda dari kata sandi saat ini.");
    }

    const supabase = createSupabaseClient();
    if (!supabase) return setError("Layanan data belum tersedia.");

    setBusy(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (userError || !email) throw new Error("Identitas akun tidak tersedia.");

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });
      if (verifyError) throw new Error("Kata sandi saat ini tidak sesuai.");

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sesi tidak tersedia setelah perubahan kata sandi.");

      const response = await fetch("/api/admin/change-password/complete", {
        method: "POST",
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Perubahan kata sandi belum dapat diselesaikan.");
      }

      await supabase.auth.signOut();
      router.replace("/admin/login?password=changed");
      router.refresh();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Kata sandi belum dapat diubah.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-offWhite px-4 py-10 text-brand-charcoal">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-xl border border-brand-softGray bg-white p-6 shadow-soft sm:p-8"
        >
          <Logo variant="primary-dark" size="md" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
            Keamanan Akun
          </p>
          <h1 className="mt-3 text-3xl font-black">Ganti Kata Sandi</h1>
          <p className="mt-3 text-sm leading-6 text-brand-charcoal/70">
            Perubahan ini tidak diwajibkan pada login pertama. Setelah berhasil, seluruh sesi lama dicabut dan Anda harus login kembali.
          </p>

          <label className="mt-6 block text-sm font-black">
            Kata sandi saat ini
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              required
            />
          </label>
          <label className="mt-4 block text-sm font-black">
            Kata sandi baru
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              required
            />
          </label>
          <label className="mt-4 block text-sm font-black">
            Ulangi kata sandi baru
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              required
            />
          </label>

          <p className="mt-4 text-xs leading-5 text-brand-charcoal/60">
            Minimal 12 karakter, memakai huruf besar, huruf kecil, angka, dan simbol.
          </p>
          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-charcoal px-6 py-4 text-sm font-black text-white disabled:opacity-50"
          >
            {busy ? "Menyimpan..." : "Ganti Kata Sandi"}
          </button>
        </form>
      </div>
    </main>
  );
}
