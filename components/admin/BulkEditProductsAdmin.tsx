"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import type { PimBulkAction, PimBulkFilters, PimBulkPreviewRow, PimBulkPriceMode, PimBulkSelection, PimBulkStockMode, PimBulkTargetRow, PimBulkTargetType } from "@/lib/pim-bulk-edit";
import { createSupabaseClient } from "@/lib/supabase";
import { getCmsStatusLabel } from "@/lib/ui-language";

type Config = {
  role: string;
  previewOnly: boolean;
  limits: { productsPerBatch: number; variantsPerBatch: number; sellablesPerBatch: number; pageSize: number; previewRows: number; maxPercent: number; maxExclusions: number };
  categories: Array<{ id: string; name: string; slug: string }>;
  history: Array<{ id: string; action: string; targetType: string; targetCount: number; status: string; createdAt: string; actorRole: string }>;
  historyAvailable: boolean;
};
type TargetPayload = { targetType: PimBulkTargetType; page: number; pageSize: number; total: number; rows: PimBulkTargetRow[]; error?: string };
type PreviewPayload = {
  status: "ready" | "blocked";
  action: PimBulkAction;
  actionLabel: string;
  selection: PimBulkSelection;
  previewToken: string;
  previewHash: string;
  summary: { targetCount: number; validCount: number; invalidCount: number; skippedCount: number; warnings: number; blockingErrors: number; estimatedUpdates: number };
  rows: PimBulkPreviewRow[];
  issues: Array<{ targetId: string | null; code: string; message: string; field: string; severity: "error" | "warning" }>;
  error?: string;
  code?: string;
};

const targetLabels: Record<PimBulkTargetType, string> = { product: "Produk Utama", variant: "Varian Warna", sellable: "SKU Siap Jual" };

export function BulkEditProductsAdmin() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [targetType, setTargetType] = useState<PimBulkTargetType>("product");
  const [filters, setFilters] = useState<PimBulkFilters>({ query: "", status: "all", categoryId: null });
  const [page, setPage] = useState(1);
  const [targets, setTargets] = useState<TargetPayload>({ targetType: "product", page: 1, pageSize: 25, total: 0, rows: [] });
  const [explicitIds, setExplicitIds] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState("PRODUCT_SET_CATEGORY");
  const [mode, setMode] = useState("SET");
  const [value, setValue] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [statusValue, setStatusValue] = useState("draft");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const loadTargets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view: "targets", targetType, page: String(page), query: filters.query, status: filters.status });
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    try {
      const response = await authorizedFetch(`/api/admin/products/bulk-edit?${params}`);
      const payload = await response.json() as TargetPayload;
      if (!response.ok) throw new Error("Daftar data belum dapat dimuat.");
      setTargets(payload);
    } catch {
      setNotice("Daftar data belum dapat dimuat. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [filters, page, targetType]);

  useEffect(() => {
    authorizedFetch("/api/admin/products/bulk-edit").then(async (response) => {
      const payload = await response.json() as Config & { error?: string };
      if (!response.ok) throw new Error("Pengaturan perubahan massal belum dapat dimuat.");
      setConfig(payload);
      setCategoryId(payload.categories[0]?.id || "");
    }).catch(() => setNotice("Pengaturan perubahan massal belum dapat dimuat. Coba lagi."));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadTargets(); }, 200);
    return () => window.clearTimeout(timeout);
  }, [loadTargets]);

  const selectedCount = allMatching ? Math.max(0, targets.total - excludedIds.size) : explicitIds.size;
  const targetLimit = targetType === "product" ? config?.limits.productsPerBatch || 250 : targetType === "variant" ? config?.limits.variantsPerBatch || 500 : config?.limits.sellablesPerBatch || 1000;
  const selectedOnPage = targets.rows.filter((row) => allMatching ? !excludedIds.has(row.id) : explicitIds.has(row.id)).length;
  const pageChecked = Boolean(targets.rows.length) && selectedOnPage === targets.rows.length;
  const pageIndeterminate = selectedOnPage > 0 && !pageChecked;
  const totalPages = Math.max(1, Math.ceil(targets.total / targets.pageSize));

  const selection = useMemo<PimBulkSelection>(() => ({
    mode: allMatching ? "all_matching" : "explicit",
    targetType,
    ids: [...explicitIds],
    filters,
    excludedIds: [...excludedIds]
  }), [allMatching, targetType, explicitIds, filters, excludedIds]);

  function resetSelection(message = "Selection direset karena target atau filter berubah.") {
    setExplicitIds(new Set());
    setAllMatching(false);
    setExcludedIds(new Set());
    setPreview(null);
    setResult(null);
    setConfirmed(false);
    setNotice(message);
  }

  function changeTarget(next: PimBulkTargetType) {
    setTargetType(next);
    setFilters({ query: "", status: "all", categoryId: null });
    setPage(1);
    setActionType(next === "product" ? "PRODUCT_SET_CATEGORY" : next === "variant" ? "VARIANT_SET_STATUS" : "SELLABLE_STOCK");
    setStatusValue(next === "product" ? "draft" : "active");
    resetSelection();
  }

  function changeFilters(next: PimBulkFilters) {
    setFilters(next);
    setPage(1);
    resetSelection();
  }

  function toggleRow(id: string, checked: boolean) {
    setPreview(null);
    setConfirmed(false);
    if (allMatching) setExcludedIds((current) => {
      const next = new Set(current);
      if (checked) next.delete(id);
      else if (next.size < (config?.limits.maxExclusions || 1000)) next.add(id);
      else setNotice(`Exclusion maksimal ${config?.limits.maxExclusions || 1000}. Persempit filter.`);
      return next;
    });
    else setExplicitIds((current) => {
      const next = new Set(current);
      if (!checked) next.delete(id);
      else if (next.size < targetLimit) next.add(id);
      else setNotice(`Selection ${targetLabels[targetType]} maksimal ${targetLimit} per batch.`);
      return next;
    });
  }

  function togglePage(checked: boolean) {
    if (allMatching) setExcludedIds((current) => { const next = new Set(current); for (const row of targets.rows) { if (checked) next.delete(row.id); else if (next.size < (config?.limits.maxExclusions || 1000)) next.add(row.id); } return next; });
    else setExplicitIds((current) => { const next = new Set(current); for (const row of targets.rows) { if (!checked) next.delete(row.id); else if (next.size < targetLimit) next.add(row.id); } return next; });
    setPreview(null);
    setConfirmed(false);
  }

  function selectAllResults() {
    setAllMatching(true);
    setExplicitIds(new Set());
    setExcludedIds(new Set());
    setNotice(`Seluruh ${targets.total} hasil filter dipilih. Item yang dibatalkan akan menjadi exclusion.`);
  }

  function openDialog() {
    setPreview(null);
    setResult(null);
    setConfirmed(false);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    triggerRef.current?.focus();
  }

  function buildAction(): PimBulkAction | null {
    if (actionType === "PRODUCT_SET_CATEGORY") return categoryId ? { type: actionType, targetType: "product", categoryId } : null;
    if (actionType === "PRODUCT_SET_STATUS") return { type: actionType, targetType: "product", status: statusValue as "draft" | "active" | "archived" };
    if (actionType === "PRODUCT_PRICE") return { type: actionType, targetType: "product", mode: mode as PimBulkPriceMode, value };
    if (actionType === "VARIANT_SET_STATUS") return { type: actionType, targetType: "variant", status: statusValue as "active" | "inactive" };
    if (actionType === "VARIANT_PRICE") return { type: actionType, targetType: "variant", mode: mode as PimBulkPriceMode, value };
    if (actionType === "SELLABLE_STOCK") return { type: actionType, targetType: "sellable", mode: mode as PimBulkStockMode, value };
    return null;
  }

  async function runPreview() {
    const action = buildAction();
    if (!action) return setNotice("Konfigurasi action belum lengkap.");
    setWorking(true);
    setNotice("Menjalankan pratinjau tanpa menyimpan data...");
    try {
      const response = await authorizedFetch("/api/admin/products/bulk-edit?action=preview", { method: "POST", body: JSON.stringify({ selection, action }) });
      const payload = await response.json() as PreviewPayload;
      if (!response.ok && !payload.summary) throw new Error("Pratinjau perubahan belum dapat dijalankan.");
      setPreview(payload);
      setConfirmed(false);
      setNotice(payload.status === "ready" ? "Pratinjau berhasil. Periksa data sebelum dan sesudah, lalu konfirmasi." : `Pratinjau tertahan: ${payload.summary.blockingErrors} masalah harus diperbaiki.`);
    } catch {
      setNotice("Pratinjau perubahan belum dapat dijalankan. Periksa pilihan lalu coba lagi.");
    } finally {
      setWorking(false);
    }
  }

  async function commit() {
    const action = buildAction();
    if (!action || !preview?.previewToken || preview.status !== "ready" || !confirmed) return;
    setWorking(true);
    setNotice("Memvalidasi ulang current state dan menjalankan atomic update...");
    try {
      const response = await authorizedFetch("/api/admin/products/bulk-edit?action=commit", { method: "POST", body: JSON.stringify({ selection, action, previewToken: preview.previewToken }) });
      const payload = await response.json() as { ok?: boolean; result?: Record<string, unknown>; error?: string; code?: string };
      if (!response.ok || !payload.ok) throw new Error("Perubahan massal belum dapat disimpan. Periksa data lalu coba lagi.");
      setResult(payload.result || {});
      setNotice("Perubahan massal berhasil diterapkan tanpa pembaruan sebagian.");
      setConfirmed(false);
      await loadTargets();
    } catch {
      setNotice("Perubahan belum dapat diterapkan. Seluruh data dikembalikan ke kondisi sebelumnya.");
    } finally {
      setWorking(false);
    }
  }

  return <div className="grid gap-6">
    <AdminPageHeader eyebrow="Manajemen Produk" title="Ubah Banyak Produk" description="Pilih beberapa data, jalankan pemeriksaan awal, tinjau kondisi sebelum dan sesudah, lalu terapkan perubahan sekaligus. SKU, slug, media, dan penghapusan permanen tidak tersedia." actions={<Link href="/admin/products" className="rounded-full border border-brand-softGray bg-white px-5 py-3 text-sm font-semibold">Kembali ke Manajemen Produk</Link>} />
    {config?.previewOnly ? <div role="status" className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">MODE PRATINJAU — Anda dapat memilih data dan menjalankan pemeriksaan awal, tetapi tidak dapat menerapkan perubahan.</div> : null}
    <div aria-live="polite" className="min-h-6 text-sm font-medium">{notice}</div>

    <section className="border border-brand-softGray bg-white p-5 sm:p-6" aria-labelledby="target-heading">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="target-heading" className="text-lg font-semibold">1. Pilih Data</h2><p className="mt-1 text-sm text-brand-charcoal/55">Pilihan tersimpan saat berpindah halaman dan dihapus ketika filter berubah.</p></div><div className="flex flex-wrap gap-2">{(["product", "variant", "sellable"] as PimBulkTargetType[]).map((item) => <button key={item} type="button" onClick={() => changeTarget(item)} aria-pressed={targetType === item} className={`rounded-full px-4 py-2 text-xs font-semibold ${targetType === item ? "bg-brand-charcoal text-white" : "border border-brand-softGray"}`}>{targetLabels[item]}</button>)}</div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_220px]">
        <input value={filters.query} onChange={(event) => changeFilters({ ...filters, query: event.target.value })} placeholder={`Cari ${targetLabels[targetType]}...`} className="min-h-11 border border-brand-softGray px-4 text-sm" />
        <select value={filters.status} onChange={(event) => changeFilters({ ...filters, status: event.target.value })} className="min-h-11 border border-brand-softGray bg-white px-4 text-sm"><option value="all">Semua status</option>{targetType === "product" ? <><option value="draft">Draft</option><option value="active">Aktif</option><option value="archived">Diarsipkan</option></> : <><option value="active">Aktif</option><option value="inactive">Tidak Aktif</option></>}</select>
        {targetType === "product" ? <select value={filters.categoryId || ""} onChange={(event) => changeFilters({ ...filters, categoryId: event.target.value || null })} className="min-h-11 border border-brand-softGray bg-white px-4 text-sm"><option value="">Semua kategori</option>{(config?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : <div />}
      </div>

      <div className="mt-5 overflow-x-auto border border-brand-softGray"><table className="min-w-[820px] w-full text-left text-sm"><thead className="bg-brand-offWhite"><tr><th className="w-14 px-4 py-3"><SelectionCheckbox checked={pageChecked} indeterminate={pageIndeterminate} label="Pilih semua pada halaman ini" onChange={togglePage} /></th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Harga/Penyesuaian</th><th className="px-4 py-3">Stok</th><th className="px-4 py-3">SKU</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-8 text-center">Memuat data...</td></tr> : targets.rows.length ? targets.rows.map((row) => { const checked = allMatching ? !excludedIds.has(row.id) : explicitIds.has(row.id); return <tr key={row.id} className="border-t border-brand-softGray"><td className="px-4 py-3"><input type="checkbox" checked={checked} onChange={(event) => toggleRow(row.id, event.target.checked)} aria-label={`Pilih ${row.label}`} className="h-5 w-5" /></td><td className="px-4 py-3"><p className="font-semibold">{row.label}</p><p className="mt-1 text-xs text-brand-charcoal/50">{row.secondary}</p></td><td className="px-4 py-3">{getCmsStatusLabel(row.status)}</td><td className="px-4 py-3">{row.basePrice ?? row.priceAdjustment ?? "—"}</td><td className="px-4 py-3">{row.stockQuantity ?? "—"}</td><td className="px-4 py-3 font-mono text-xs">{row.sku || "—"}</td></tr>; }) : <tr><td colSpan={6} className="p-8 text-center">Tidak ada hasil untuk filter ini.</td></tr>}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm"><strong>{selectedCount}</strong> dipilih dari {targets.total} hasil.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={selectAllResults} disabled={!targets.total || allMatching} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Pilih seluruh {targets.total} hasil</button><button type="button" onClick={() => resetSelection("Selection dihapus.")} disabled={!selectedCount} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Hapus pilihan</button><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Sebelumnya</button><span className="px-2 py-2 text-xs font-semibold">{page}/{totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Berikutnya</button></div></div>
    </section>

    {selectedCount ? <section className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 border border-brand-charcoal bg-white p-4 shadow-lg" aria-label="Tindakan untuk banyak data"><div><p className="font-semibold">{selectedCount} {targetLabels[targetType]} dipilih</p><p className="text-xs text-brand-charcoal/55">{allMatching ? `${excludedIds.size} data dikecualikan` : "Pilihan tersimpan lintas halaman"}</p></div><button ref={triggerRef} type="button" onClick={openDialog} className="min-h-11 rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white">Lanjutkan Perubahan</button></section> : null}

    <dialog ref={dialogRef} onClose={() => triggerRef.current?.focus()} className="m-auto max-h-[92vh] w-[min(920px,calc(100%-2rem))] overflow-y-auto border-0 p-0 shadow-2xl backdrop:bg-black/40">
      <div className="p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-green">Manajemen Produk</p><h2 className="mt-2 text-2xl font-semibold">2. Atur dan Tinjau Perubahan</h2><p className="mt-2 text-sm text-brand-charcoal/55">Data dipilih: {selectedCount} {targetLabels[targetType]}</p></div><button type="button" onClick={closeDialog} aria-label="Tutup perubahan massal" className="min-h-11 min-w-11 rounded-full border text-lg">×</button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Tindakan<select value={actionType} onChange={(event) => { setActionType(event.target.value); setPreview(null); }} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal">{targetType === "product" ? <><option value="PRODUCT_SET_CATEGORY">Ubah kategori</option><option value="PRODUCT_SET_STATUS">Ubah status</option><option value="PRODUCT_PRICE">Ubah harga dasar</option></> : targetType === "variant" ? <><option value="VARIANT_SET_STATUS">Aktifkan/nonaktifkan varian</option><option value="VARIANT_PRICE">Ubah penyesuaian harga varian</option></> : <option value="SELLABLE_STOCK">Ubah stok SKU</option>}</select></label>
          {actionType === "PRODUCT_SET_CATEGORY" ? <label className="text-sm font-semibold">Kategori tujuan<select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPreview(null); }} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal">{(config?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label> : null}
          {actionType.endsWith("SET_STATUS") ? <label className="text-sm font-semibold">Status tujuan<select value={statusValue} onChange={(event) => { setStatusValue(event.target.value); setPreview(null); }} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal">{targetType === "product" ? <><option value="draft">Draft</option><option value="active">Terbitkan / Aktif</option><option value="archived">Arsipkan</option></> : <><option value="active">Aktif</option><option value="inactive">Tidak Aktif</option></>}</select></label> : null}
          {actionType.includes("PRICE") || actionType === "SELLABLE_STOCK" ? <><label className="text-sm font-semibold">Cara Perubahan<select value={mode} onChange={(event) => { setMode(event.target.value); setPreview(null); }} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal">{actionType === "SELLABLE_STOCK" ? <><option value="SET">Tetapkan stok</option><option value="INCREASE">Tambah stok</option><option value="DECREASE">Kurangi stok</option></> : <><option value="SET">Tetapkan harga</option><option value="INCREASE_FIXED">Tambah nilai tetap</option><option value="DECREASE_FIXED">Kurangi nilai tetap</option><option value="INCREASE_PERCENT">Naikkan persen</option><option value="DECREASE_PERCENT">Turunkan persen</option></>}</select></label><label className="text-sm font-semibold">Nilai{mode.includes("PERCENT") ? " (%)" : ""}<input type="number" min={0} step={1} value={value} onChange={(event) => { setValue(Number(event.target.value)); setPreview(null); }} className="mt-2 min-h-11 w-full border px-3 font-normal" /></label></> : null}
        </div>
        <p className="mt-4 text-xs leading-5 text-brand-charcoal/55">Pemeriksaan awal wajib dilakukan. Persentase yang menghasilkan pecahan Rupiah akan diblokir. SKU, slug, nama, data master warna/ukuran, media, dan penghapusan permanen tidak dapat diubah.</p>
        <button type="button" onClick={runPreview} disabled={working} className="mt-5 min-h-11 rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white disabled:opacity-45">Tinjau Perubahan</button>

        {preview ? <div className="mt-7 border-t pt-6"><div aria-live="polite" className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Data", preview.summary.targetCount], ["Sesuai", preview.summary.validCount], ["Tidak Sesuai", preview.summary.invalidCount], ["Dilewati", preview.summary.skippedCount], ["Masalah", preview.summary.blockingErrors]].map(([label, number]) => <div key={String(label)} className="border p-3"><p className="text-xs text-brand-charcoal/50">{label}</p><p className="mt-1 text-xl font-semibold">{number}</p></div>)}</div>
          <div className="mt-5 overflow-x-auto border"><table className="min-w-[680px] w-full text-left text-xs"><thead className="bg-brand-offWhite"><tr><th className="px-3 py-3">Data</th><th className="px-3 py-3">Sebelum</th><th className="px-3 py-3">Sesudah</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.id} className="border-t"><td className="px-3 py-3"><strong>{row.label}</strong><br /><span className="text-brand-charcoal/50">{row.secondary}</span></td><td className="px-3 py-3">{row.currentValue}</td><td className="px-3 py-3">{row.newValue}</td><td className="px-3 py-3 font-semibold">{row.validationStatus === "valid" ? "Sesuai" : row.validationStatus === "error" ? "Tidak Sesuai" : "Dilewati"}</td></tr>)}</tbody></table></div>
          {preview.issues.length ? <div className="mt-4 max-h-48 overflow-y-auto border border-amber-200 bg-amber-50 p-3" tabIndex={0}>{preview.issues.map((item, index) => <p key={`${item.targetId}-${item.code}-${index}`} className="py-1 text-xs"><strong>{item.code}</strong> — {item.message}</p>)}</div> : null}
          <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={preview.status !== "ready" || config?.previewOnly || working} className="mt-1 h-5 w-5" /><span>Saya sudah meninjau kondisi sebelum dan sesudah. Jika satu data gagal, seluruh perubahan akan dibatalkan.</span></label>
          <button data-admin-mutation="true" type="button" onClick={commit} disabled={preview.status !== "ready" || !confirmed || Boolean(config?.previewOnly) || working} aria-describedby={config?.previewOnly ? "preview-only-reason" : undefined} className="mt-4 min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-45">Terapkan {preview.actionLabel}</button>
          {config?.previewOnly ? <p id="preview-only-reason" className="mt-2 text-xs font-semibold text-amber-800">Penerapan perubahan dinonaktifkan dalam mode pratinjau.</p> : null}
        </div> : null}
        {result ? <div className="mt-6 border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-semibold">Perubahan berhasil diterapkan</h3><p className="mt-1 text-sm">Tidak ada pembaruan sebagian. Riwayat perubahan telah disimpan.</p></div> : null}
      </div>
    </dialog>

    <section className="border border-brand-softGray bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Riwayat Perubahan Massal</h2>{config?.historyAvailable ? <div className="mt-4 grid gap-2">{config.history.length ? config.history.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-3 border p-3 text-xs"><span><strong>{bulkActionLabel(item.action)}</strong> · {bulkTargetLabel(item.targetType)}</span><span>{item.targetCount} data · {bulkHistoryStatusLabel(item.status)} · {new Date(item.createdAt).toLocaleString("id-ID")}</span></div>) : <p className="text-sm text-brand-charcoal/55">Belum ada riwayat.</p>}</div> : <p className="mt-2 text-sm text-amber-800">Riwayat belum tersedia. Terapkan pembaruan database Phase 5 melalui alur owner terlebih dahulu.</p>}</section>
  </div>;
}

function SelectionCheckbox({ checked, indeterminate, label, onChange }: { checked: boolean; indeterminate: boolean; label: string; onChange: (checked: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label} className="h-5 w-5" />;
}

function bulkActionLabel(value: string) {
  const labels: Record<string, string> = { PRODUCT_SET_CATEGORY: "Ubah Kategori", PRODUCT_SET_STATUS: "Ubah Status Produk", PRODUCT_PRICE: "Ubah Harga Dasar", VARIANT_SET_STATUS: "Ubah Status Varian", VARIANT_PRICE: "Ubah Harga Varian", SELLABLE_STOCK: "Ubah Stok SKU" };
  return labels[value] || "Tindakan belum dikenali";
}
function bulkTargetLabel(value: string) { return targetLabels[value as PimBulkTargetType] || "Data produk"; }
function bulkHistoryStatusLabel(value: string) {
  const labels: Record<string, string> = { completed: "Selesai", success: "Berhasil", failed: "Gagal", blocked: "Diblokir", pending: "Menunggu" };
  return labels[value.toLowerCase()] || "Status belum dikenali";
}

async function authorizedFetch(input: string, init?: RequestInit) {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error("Layanan data belum tersedia. Hubungi pengelola sistem.");
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sesi admin tidak tersedia.");
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init?.body) headers.set("content-type", "application/json");
  return fetch(input, { ...init, cache: "no-store", headers });
}
