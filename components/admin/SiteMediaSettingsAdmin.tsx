/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import {
  DEFAULT_SITE_MEDIA,
  parseSiteMediaDefaults,
  SITE_MEDIA_SETTING_KEY,
  type SiteMediaDefaults
} from "@/lib/site-media";

type MediaChoice = {
  id: string;
  name: string;
  public_url: string;
  folder: string;
};

type SlotDefinition = {
  key: keyof SiteMediaDefaults;
  label: string;
  description: string;
  ratio: string;
  aspectRatio: string;
};

const slots: SlotDefinition[] = [
  { key: "heroDesktop", label: "Hero homepage desktop", description: "Fallback khusus hero homepage desktop.", ratio: "2400 × 1050 (16:7)", aspectRatio: "16 / 7" },
  { key: "heroMobile", label: "Hero homepage mobile", description: "Fallback khusus hero homepage mobile.", ratio: "1600 × 2000 (4:5)", aspectRatio: "4 / 5" },
  { key: "product", label: "Produk", description: "Fallback aman untuk produk legacy; tidak digunakan sebagai pengganti Open Graph.", ratio: "2000 × 2500 (4:5)", aspectRatio: "4 / 5" },
  { key: "category", label: "Kategori", description: "Fallback khusus card kategori.", ratio: "2000 × 2500 (4:5)", aspectRatio: "4 / 5" },
  { key: "editorial", label: "Editorial", description: "Fallback khusus card editorial/trending.", ratio: "2000 × 2500 (4:5)", aspectRatio: "4 / 5" },
  { key: "featuredDesktop", label: "Featured desktop", description: "Fallback Featured homepage desktop.", ratio: "2000 × 1600 (5:4)", aspectRatio: "5 / 4" },
  { key: "featuredMobile", label: "Featured mobile", description: "Fallback Featured homepage mobile.", ratio: "1600 × 2000 (4:5)", aspectRatio: "4 / 5" },
  { key: "pageHeroDesktop", label: "Page Hero desktop", description: "Fallback hero halaman kategori/layanan.", ratio: "2400 × 1000 (12:5)", aspectRatio: "12 / 5" },
  { key: "pageHeroMobile", label: "Page Hero mobile", description: "Fallback hero halaman mobile.", ratio: "1600 × 2000 (4:5)", aspectRatio: "4 / 5" },
  { key: "serviceDetail", label: "Detail layanan", description: "Fallback detail visual layanan, terpisah dari page hero.", ratio: "2000 × 1500 (4:3)", aspectRatio: "4 / 3" },
  { key: "bannerDesktop", label: "Campaign desktop", description: "Fallback campaign homepage desktop.", ratio: "2400 × 1050 (16:7)", aspectRatio: "16 / 7" },
  { key: "bannerMobile", label: "Campaign mobile", description: "Fallback campaign homepage mobile.", ratio: "1600 × 2000 (4:5)", aspectRatio: "4 / 5" },
  { key: "instagramBannerDesktop", label: "Banner Instagram desktop", description: "Fallback khusus banner Instagram desktop, terpisah dari campaign 16:7.", ratio: "2400 × 1000 (12:5)", aspectRatio: "12 / 5" },
  { key: "instagramBannerMobile", label: "Banner Instagram mobile", description: "Fallback khusus banner Instagram mobile.", ratio: "1600 × 2000 (4:5)", aspectRatio: "4 / 5" },
  { key: "store", label: "Store", description: "Fallback khusus foto toko.", ratio: "2000 × 1500 (4:3)", aspectRatio: "4 / 3" },
  { key: "aboutLandscape", label: "About homepage", description: "Fallback About homepage landscape.", ratio: "2000 × 1500 (4:3)", aspectRatio: "4 / 3" },
  { key: "aboutPortrait", label: "Halaman Tentang", description: "Fallback halaman Tentang portrait.", ratio: "2000 × 2500 (4:5)", aspectRatio: "4 / 5" },
  { key: "customHeroDesktop", label: "Custom hero desktop", description: "Fallback hero Custom yang independen.", ratio: "2400 × 1000 (12:5)", aspectRatio: "12 / 5" },
  { key: "customHeroMobile", label: "Custom hero mobile", description: "Fallback hero Custom mobile yang independen.", ratio: "1600 × 2000 (4:5)", aspectRatio: "4 / 5" },
  { key: "customPreset", label: "Custom preset", description: "Fallback mockup/preset configurator.", ratio: "1600 × 1200 (4:3)", aspectRatio: "4 / 3" },
  { key: "socialPreview", label: "Social preview", description: "Hanya untuk preview share dan metadata Open Graph.", ratio: "1200 × 630 (1.91:1)", aspectRatio: "1200 / 630" }
];

export function SiteMediaSettingsAdmin() {
  const [values, setValues] = useState<SiteMediaDefaults>(DEFAULT_SITE_MEDIA);
  const [media, setMedia] = useState<MediaChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function load() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);

    const [settingResult, mediaResult] = await Promise.all([
      supabase
        .from("website_settings")
        .select("value")
        .eq("setting_key", SITE_MEDIA_SETTING_KEY)
        .maybeSingle(),
      supabase
        .from("media_assets")
        .select("id,name,public_url,folder")
        .eq("status_aktif", true)
        .eq("media_type", "image")
        .order("created_at", { ascending: false })
    ]);

    setLoading(false);
    if (settingResult.error) {
      setStatus("Pengaturan gambar belum dapat dimuat. Coba lagi.");
    } else {
      setValues(parseSiteMediaDefaults(settingResult.data?.value));
      setStatus("");
    }
    setMedia((mediaResult.data || []) as MediaChoice[]);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const groupedMedia = useMemo<Array<[string, MediaChoice[]]>>(() => {
    const groups = media.reduce<Record<string, MediaChoice[]>>((currentGroups, item) => {
      const group = item.folder || "Lainnya";
      currentGroups[group] = [...(currentGroups[group] || []), item];
      return currentGroups;
    }, {});
    return Object.entries(groups).sort(([left], [right]) => left.localeCompare(right));
  }, [media]);

  async function save() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      setSaving(false);
      setStatus("Sesi admin berakhir. Masuk kembali sebelum menyimpan pengaturan media.");
      return;
    }

    const response = await fetch("/api/admin/media/settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });
    const payload = (await response.json().catch(() => null)) as {
      values?: SiteMediaDefaults;
      error?: string;
    } | null;
    setSaving(false);
    if (!response.ok || !payload?.values) {
      setStatus(payload?.error || "Gambar website belum dapat disimpan. Periksa slot dan media yang dipilih.");
      return;
    }
    setValues(payload.values);
    setStatus("Gambar default website berhasil divalidasi server dan disimpan.");
  }

  if (loading) return <div className="mt-6 h-64 animate-pulse bg-white" />;

  return (
    <div className="mt-6 grid gap-5">
      <section className="border border-brand-softGray bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-charcoal/45">Media global</p>
            <h2 className="mt-2 text-2xl font-semibold">Gambar Default Website</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/65">
              Gambar khusus konten tetap diatur pada menu Hero, Produk, Kategori, Store, Banner, dan Page Hero. Setiap slot mempunyai fallback dan rasio sendiri. Social preview tidak pernah digunakan sebagai fallback produk, hero, kategori, Store, atau About.
            </p>
          </div>
          <Link href="/admin/media" className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-5 text-sm font-semibold hover:border-brand-charcoal">
            Buka Galeri Media
          </Link>
        </div>
        {status ? <p role="status" className="mt-4 bg-brand-offWhite p-3 text-sm font-semibold">{status}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot) => {
          const url = values[slot.key];
          return (
            <article key={slot.key} className="border border-brand-softGray bg-white p-4">
              <div className="overflow-hidden bg-brand-offWhite">
                <img
                  src={url}
                  alt={`Pratinjau ${slot.label}`}
                  className="w-full object-cover"
                  style={{ aspectRatio: slot.aspectRatio }}
                />
              </div>
              <h3 className="mt-4 font-semibold">{slot.label}</h3>
              <p className="mt-1 text-xs font-semibold text-brand-green">Rekomendasi {slot.ratio}</p>
              <p className="mt-2 min-h-10 text-sm leading-5 text-brand-charcoal/60">{slot.description}</p>
              <label className="mt-4 grid gap-2 text-xs font-semibold">
                Pilih dari Galeri Media
                <select
                  value={url}
                  onChange={(event) => setValues((current) => ({ ...current, [slot.key]: event.target.value }))}
                  className="min-h-11 rounded-lg border border-brand-softGray bg-white px-3 text-sm font-normal"
                >
                  <option value={DEFAULT_SITE_MEDIA[slot.key]}>Fallback khusus slot</option>
                  {groupedMedia.map(([folder, items]) => (
                    <optgroup key={folder} label={folder}>
                      {items.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="mt-3 grid gap-2 text-xs font-semibold">
                Atau URL gambar
                <input
                  value={url}
                  onChange={(event) => setValues((current) => ({ ...current, [slot.key]: event.target.value }))}
                  className="min-h-11 rounded-lg border border-brand-softGray px-3 text-sm font-normal"
                />
              </label>
            </article>
          );
        })}
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="min-h-12 rounded-full bg-brand-green px-7 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
          {saving ? "Menyimpan..." : "Simpan Semua Gambar"}
        </button>
      </div>
    </div>
  );
}
