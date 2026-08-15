"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useAdminAccess } from "@/components/admin/layout/AdminAccessContext";
import { createSupabaseClient } from "@/lib/supabase";
import {
  DEFAULT_PUBLIC_THEME_ID,
  getPublicTheme,
  publicThemeCssVariables,
  PUBLIC_THEME_IDS,
  type PublicThemeDefinition,
  type PublicThemeId
} from "@/lib/public-theme/registry";
import type { PublicThemeState } from "@/lib/public-theme/runtime";

type ThemeResponse = { state: PublicThemeState; themes: PublicThemeDefinition[] };

export function PublicThemeAdmin() {
  const access = useAdminAccess();
  const [data, setData] = useState<ThemeResponse | null>(null);
  const [previewId, setPreviewId] = useState<PublicThemeId>(DEFAULT_PUBLIC_THEME_ID);
  const [busy, setBusy] = useState<"apply" | "rollback" | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const supabase = createSupabaseClient();
    const { data: session } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const response = await fetch("/api/admin/theme", {
      cache: "no-store",
      headers: session.session?.access_token ? { authorization: `Bearer ${session.session.access_token}` } : undefined
    });
    const payload = await response.json().catch(() => ({})) as ThemeResponse & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Tema belum dapat dimuat.");
    setData(payload);
    setPreviewId(payload.state.current);
  }, []);

  useEffect(() => {
    void load().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Tema belum dapat dimuat."));
  }, [load]);

  const previewTheme = useMemo(() => getPublicTheme(previewId), [previewId]);

  async function mutate(action: "apply" | "rollback", themeId?: PublicThemeId) {
    if (action === "apply" && !themeId) return;
    const label = action === "rollback" ? "tema sebelumnya" : getPublicTheme(themeId).name;
    if (!window.confirm(`Terapkan ${label} ke seluruh public storefront?`)) return;
    const supabase = createSupabaseClient();
    const { data: session } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    setBusy(action);
    setStatus("");
    const response = await fetch("/api/admin/theme", {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(session.session?.access_token ? { authorization: `Bearer ${session.session.access_token}` } : {})
      },
      body: JSON.stringify(action === "rollback" ? { action } : { action, themeId })
    });
    const payload = await response.json().catch(() => ({})) as ThemeResponse & { error?: string };
    setBusy(null);
    if (!response.ok) {
      setStatus(payload.error || "Tema belum dapat diterapkan.");
      return;
    }
    setData(payload);
    setPreviewId(payload.state.current);
    setStatus("Tema berhasil diterapkan. Public storefront akan membaca tema baru tanpa redeploy.");
  }

  return (
    <section className="mt-6 space-y-6" aria-labelledby="public-theme-title">
      <header className="border border-brand-softGray bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Public storefront</p>
            <h2 id="public-theme-title" className="mt-2 text-2xl font-semibold">Tema</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/65">Satu storefront, sepuluh identitas visual. Preview tidak mengubah website publik sampai tema diterapkan.</p>
          </div>
          {data?.state.previous ? <button type="button" data-admin-mutation="true" onClick={() => void mutate("rollback")} disabled={Boolean(busy)} className="min-h-11 rounded-full border border-brand-charcoal px-5 py-2 text-sm font-semibold disabled:opacity-50">{busy === "rollback" ? "Mengembalikan..." : "Kembalikan tema sebelumnya"}</button> : null}
        </div>
        {status ? <p role="status" className="mt-4 border border-brand-softGray bg-brand-offWhite p-3 text-sm font-semibold">{status}</p> : null}
      </header>

      <div className="border border-brand-softGray bg-white p-5 sm:p-6" style={publicThemeCssVariables(previewTheme) as CSSProperties}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/50">Preview aman</p>
            <h3 className="mt-1 text-xl font-semibold">{previewTheme.name}</h3>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: "var(--theme-border)", color: "var(--theme-accent)" }}>Tidak publik sampai diterapkan</span>
        </div>
        <div className="mt-5 grid gap-4 rounded-[var(--theme-card-radius)] p-5" style={{ background: "var(--theme-canvas)", color: "var(--theme-ink)", boxShadow: "var(--theme-shadow)" }}>
          <div className="flex items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--theme-border)" }}><span className="font-semibold">DEBRODER</span><span className="text-sm" style={{ color: "var(--theme-muted)" }}>Koleksi · Jersey · Custom</span></div>
          <div className="grid gap-4 sm:grid-cols-[1.2fr_.8fr]"><div className="min-h-28 rounded-[var(--theme-card-radius)]" style={{ background: "var(--theme-surface)" }} /><div><p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--theme-muted)" }}>Theme preview</p><p className="mt-2 text-2xl font-semibold">{previewTheme.description}</p><button type="button" className="mt-4 px-4 py-2 text-sm font-semibold" style={{ borderRadius: "var(--theme-control-radius)", background: "var(--theme-accent)", color: "var(--theme-canvas)" }}>Belanja sekarang</button></div></div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data?.themes ?? PUBLIC_THEME_IDS.map((id) => getPublicTheme(id))).map((theme) => {
          const active = data?.state.current === theme.id;
          const selected = previewId === theme.id;
          return <article key={theme.id} className={`border bg-white p-4 transition ${selected ? "border-brand-charcoal" : "border-brand-softGray"}`}>
            <div className="h-24 rounded-[var(--theme-card-radius)]" style={{ ...publicThemeCssVariables(theme), background: "var(--theme-canvas)", border: "1px solid var(--theme-border)" } as CSSProperties}><div className="flex h-full items-end justify-between p-3"><span className="h-7 w-7 rounded-full" style={{ background: "var(--theme-accent)" }} /><span className="h-2 w-20 rounded-full" style={{ background: "var(--theme-ink)" }} /></div></div>
            <div className="mt-4 flex items-start justify-between gap-3"><div><h3 className="font-semibold">{theme.name}</h3><p className="mt-1 text-sm leading-5 text-brand-charcoal/60">{theme.description}</p></div>{active ? <span className="shrink-0 rounded-full bg-brand-green px-2 py-1 text-[10px] font-bold tracking-[0.12em] text-white">AKTIF</span> : null}</div>
            <div className="mt-4 flex gap-2"><button type="button" onClick={() => setPreviewId(theme.id)} className="min-h-10 flex-1 rounded-full border border-brand-softGray px-3 text-sm font-semibold">Preview</button><button type="button" data-admin-mutation="true" onClick={() => void mutate("apply", theme.id)} disabled={Boolean(busy) || active} className="min-h-10 flex-1 rounded-full bg-brand-charcoal px-3 text-sm font-semibold text-white disabled:opacity-50">{busy === "apply" && selected ? "Menerapkan..." : "Terapkan Tema"}</button></div>
          </article>;
        })}
      </div>
      <p className="text-xs text-brand-charcoal/50">Perubahan tema hanya memengaruhi presentasi. Produk, harga, stok, cart, checkout, payment, order, dan data pelanggan tetap menggunakan alur canonical.</p>
      <span className="sr-only">Role aktif: {access.role}</span>
    </section>
  );
}
