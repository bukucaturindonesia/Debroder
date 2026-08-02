"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createSupabaseClient } from "@/lib/supabase";

function validateNewPassword(value: string) {
  if (value.length < 12) return "Kata sandi baru minimal 12 karakter.";
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return "Gunakan huruf kecil dan huruf besar.";
  if (!/\d/.test(value)) return "Tambahkan minimal satu angka.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Tambahkan minimal satu simbol.";
  return "";
}

export function AdminChangePassword() {
  const router = useRouter();
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
    const supabase = createSupabaseClient();
    if (!supabase) return setError("Layanan data belum tersedia.");

    setBusy(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) throw new Error("Link reset tidak valid atau sudah kedaluwarsa.");
      const updated = await supabase.auth.updateUser({ password: newPassword });
      if (updated.error) throw updated.error;
      const completed = await fetch("/api/admin/change-password/complete", {
        method: "POST",
        cache: "no-store",
        headers: { authorization: `Bearer ${session.data.session.access_token}` }
      });
      const payload = await completed.json().catch(() => ({})) as { error?: string };
      if (!completed.ok) throw new Error(payload.error || "Reset password belum dapat diselesaikan.");
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
        <form onSubmit={handleSubmit} className="w-full rounded-xl border border-brand-softGray bg-white p-6 shadow-soft sm:p-8">
          <Logo variant="primary-dark" size="md" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Keamanan Akun</p>
          <h1 className="mt-3 text-3xl font-black">Atur Ulang Kata Sandi</h1>
          <p className="mt-3 text-sm leading-6 text-brand-charcoal/70">Gunakan link reset resmi. Setelah berhasil, sesi lama dicabut dan Anda harus login kembali.</p>
          <label htmlFor="new-password" className="mt-6 block text-sm font-black">Kata sandi baru</label>
          <input id="new-password" name="new_password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" required />
          <label htmlFor="confirm-password" className="mt-4 block text-sm font-black">Ulangi kata sandi baru</label>
          <input id="confirm-password" name="confirm_password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" required />
          <p className="mt-4 text-xs leading-5 text-brand-charcoal/60">Minimal 12 karakter, memakai huruf besar, huruf kecil, angka, dan simbol.</p>
          {error ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
          <button type="submit" disabled={busy} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-charcoal px-6 py-4 text-sm font-black text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan Kata Sandi"}</button>
        </form>
      </div>
    </main>
  );
}
