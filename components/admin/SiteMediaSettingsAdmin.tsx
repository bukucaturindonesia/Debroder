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
};

const slots: SlotDefinition[] = [
  { key: "heroDesktop", label: "Hero default desktop", description: "Dipakai bila slide hero belum memiliki gambar desktop.", ratio: "1920 × 900" },
  { key: "heroMobile", label: "Hero default mobile", description: "Dipakai bila slide hero belum memiliki gambar mobile.", ratio: "1080 × 1350 (4:5)" },
  { key: "product", label: "Produk default", description: "Dipakai untuk produk, kategori, atau layanan yang belum memiliki foto.", ratio: "2000 × 2500 (4:5)" },
  { key: "pageHeroDesktop", label: "Page Hero default desktop", description: "Fallback untuk hero halaman kategori dan layanan.", ratio: "1920 × 800" },
  { key: "pageHeroMobile", label: "Page Hero default mobile", description: "Fallback mobile untuk hero halaman kategori dan layanan.", ratio: "1080 × 1350 (4:5)" },
  { key: "bannerDesktop", label: "Banner default desktop", description: "Fallback banner Instagram dan campaign.", ratio: "1920 × 800" },
  { key: "bannerMobile", label: "Banner default mobile", description: "Fallback banner mobile.", ratio: "1080 × 1350 (4:5)" },
  { key: "store", label: "Store default", description: "Dipakai apabila foto store belum diatur.", ratio: "1200 × 800" },
  { key: "benefit", label: "Benefit/About default", description: "Dipakai untuk section benefit atau tentang kami yang belum memiliki foto.", ratio: "1200 × 900" },
  { key: "socialPreview", label: "Social preview default", description: "Gambar cadangan untuk preview share dan Open Graph.", ratio: "1200 × 630" }
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
    const { error } = await supabase.from("website_settings").upsert(
      {
        setting_key: SITE_MEDIA_SETTING_KEY,
        label: "Gambar Default Website",
        value: values,
        description: "Fallback media publik yang dapat diatur dari admin.",
        group_name: "public_media",
        updated_at: new Date().toISOString()
      },
      { onConflict: "setting_key" }
    );
    setSaving(false);
    setStatus(error ? "Gambar website belum dapat disimpan. Coba lagi." : "Gambar default website berhasil disimpan.");
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
              Gambar khusus konten tetap diatur pada menu Hero, Produk, Kategori, Store, Banner, dan Page Hero. Pengaturan ini menjadi cadangan agar tidak ada foto kosong atau broken image.
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
                <img src={url} alt={`Pratinjau ${slot.label}`} className="aspect-[4/3] w-full object-cover" />
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
                  <option value={DEFAULT_SITE_MEDIA[slot.key]}>Placeholder logo DEBRODER</option>
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
