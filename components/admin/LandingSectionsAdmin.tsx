"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LANDING_SECTION_DEFAULTS } from "@/lib/homepage-settings";
import { createSupabaseClient } from "@/lib/supabase";
import {
  cmsBadgeClass,
  cmsStatusLabel,
  publishCmsNow,
  saveCmsDraft
} from "@/lib/cms-workflow";
import type { LandingSection } from "@/lib/types";

function sectionLabel(section: LandingSection) {
  if (section.section_key === "plain-category") {
    return "Tampilkan Section Pakaian Polos Berdasarkan Kategori";
  }
  return section.title;
}

const cmsEditorLinks = [
  ["Hero", "/admin/hero"],
  ["Page Hero", "/admin/page-hero"],
  ["Campaign Banner", "/admin/campaign-banners"],
  ["Featured Products", "/admin/featured-products"],
  ["Trending", "/admin/trending"],
  ["Fresh Drop", "/admin/fresh-drop"],
  ["Shop by Category", "/admin/shop-category"],
  ["Pakaian Polos", "/admin/plain-category"],
  ["Categories", "/admin/categories"],
  ["Services", "/admin/services"],
  ["Instagram Banner", "/admin/banner"],
  ["Store", "/admin/store"],
  ["Tentang DEBRODER", "/admin/trust-about"]
] as const;

export function LandingSectionsAdmin() {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function loadSections() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);

    const { error: seedError } = await supabase
      .from("landing_sections")
      .upsert(
        LANDING_SECTION_DEFAULTS.map((section) => ({ ...section, metadata: {} })),
        { onConflict: "section_key", ignoreDuplicates: true }
      );

    if (seedError) {
      setLoading(false);
      setStatus(`CMS landing page belum siap: ${seedError.message}`);
      return;
    }

    const { data, error } = await supabase
      .from("landing_sections")
      .select("*")
      .order("sort_order", { ascending: true });

    setLoading(false);
    if (error) {
      setStatus(`Section landing page belum dapat dimuat: ${error.message}`);
      return;
    }

    setSections((data || []) as LandingSection[]);
    setStatus("");
  }

  useEffect(() => {
    loadSections();
  }, []);

  function updateSection(sectionKey: string, patch: Partial<LandingSection>) {
    setSections((current) => current.map((section) =>
      section.section_key === sectionKey ? { ...section, ...patch } : section
    ));
  }

  async function saveSection(section: LandingSection, mode: "draft" | "published") {
    if (!section.id) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSavingKey(section.section_key);

    const payload = {
      title: section.title.trim(),
      subtitle: section.subtitle.trim(),
      is_visible: section.is_visible,
      sort_order: Number(section.sort_order),
      metadata: section.metadata || {}
    };

    const result = mode === "published"
      ? await publishCmsNow(supabase, "landing_sections", section.id, payload)
      : await saveCmsDraft(supabase, "landing_sections", section.id, payload);

    setSavingKey(null);
    if (!result.success) {
      setStatus(`Section gagal disimpan: ${result.error.message}`);
      return;
    }

    setStatus(
      mode === "published"
        ? `${section.title} disimpan dan dipublikasikan.`
        : `${section.title} disimpan sebagai draft.`
    );
    await loadSections();
  }

  async function moveSection(section: LandingSection, direction: -1 | 1) {
    const index = sections.findIndex((item) => item.section_key === section.section_key);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sections.length) return;

    const swap = sections[swapIndex];
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSavingKey(section.section_key);

    const [currentResult, swapResult] = await Promise.all([
      supabase.from("landing_sections").update({ sort_order: swap.sort_order }).eq("section_key", section.section_key),
      supabase.from("landing_sections").update({ sort_order: section.sort_order }).eq("section_key", swap.section_key)
    ]);

    setSavingKey(null);
    const error = currentResult.error || swapResult.error;
    setStatus(error ? `Urutan gagal disimpan: ${error.message}` : "Urutan landing page diperbarui.");
    if (!error) await loadSections();
  }

  return (
    <div className="mt-6 grid gap-4">
      <div className="border border-brand-softGray bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/50">CMS / Landing Page</p>
        <h2 className="mt-2 text-xl font-semibold">Section landing page</h2>
        <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Status OFF menghapus section dari hasil render publik. Urutan mengikuti nilai yang tersimpan di Supabase.</p>
        <nav aria-label="Editor section landing page" className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {cmsEditorLinks.map(([label, href]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center justify-between border border-brand-softGray px-4 text-sm font-semibold transition hover:border-brand-charcoal">{label}<span aria-hidden="true">›</span></Link>)}
        </nav>
      </div>

      {status ? <p role="status" className="border border-brand-softGray bg-white p-4 text-sm font-semibold">{status}</p> : null}

      {loading ? (
        <div className="h-40 animate-pulse bg-white" />
      ) : (
        sections.map((section, index) => (
          <article key={section.section_key} className="border border-brand-softGray bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">{section.section_key}</p>
                <h3 className="mt-2 text-lg font-semibold">{sectionLabel(section)}</h3>
                <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cmsBadgeClass(section)}`}>
                  {cmsStatusLabel(section)}
                </span>
              </div>
              <label className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={section.is_visible}
                  onChange={(event) => updateSection(section.section_key, { is_visible: event.target.checked })}
                  className="sr-only"
                />
                <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${section.is_visible ? "justify-end bg-brand-green" : "justify-start bg-brand-charcoal/25"}`} aria-hidden="true">
                  <span className="h-5 w-5 rounded-full bg-white shadow" />
                </span>
                <span>{section.is_visible ? "ON" : "OFF"}</span>
              </label>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_120px]">
              <label className="text-sm font-semibold">Judul<input value={section.title} onChange={(event) => updateSection(section.section_key, { title: event.target.value })} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 font-normal" /></label>
              <label className="text-sm font-semibold">Subtitle<input value={section.subtitle} onChange={(event) => updateSection(section.section_key, { subtitle: event.target.value })} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 font-normal" /></label>
              <label className="text-sm font-semibold">Urutan<input type="number" min="0" value={section.sort_order} onChange={(event) => updateSection(section.section_key, { sort_order: Number(event.target.value) })} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 font-normal" /></label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => moveSection(section, -1)} disabled={index === 0 || savingKey !== null} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold disabled:opacity-40">Naik</button>
              <button type="button" onClick={() => moveSection(section, 1)} disabled={index === sections.length - 1 || savingKey !== null} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold disabled:opacity-40">Turun</button>
              <button type="button" onClick={() => saveSection(section, "draft")} disabled={savingKey !== null} className="rounded-full border border-brand-charcoal px-5 py-2 text-xs font-semibold disabled:opacity-50">
                {savingKey === section.section_key ? "Menyimpan..." : "Simpan Draft"}
              </button>
              <button type="button" onClick={() => saveSection(section, "published")} disabled={savingKey !== null} className="rounded-full bg-brand-green px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {savingKey === section.section_key ? "Menerbitkan..." : "Simpan & Publish"}
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
