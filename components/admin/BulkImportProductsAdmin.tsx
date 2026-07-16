"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { createSupabaseClient } from "@/lib/supabase";

type ImportIssue = {
  rowNumber: number | null;
  productKey: string;
  field: string;
  value: string;
  errorCode: string;
  message: string;
  suggestedFix: string;
  severity: "error" | "warning";
};
type PreviewRow = {
  rowNumber: number;
  productKey: string;
  productName: string;
  slug: string;
  color: string;
  size: string;
  sku: string;
  basePrice: number;
  priceAdjustment: number;
  stock: number;
  validationStatus: "valid" | "error";
};
type PreviewPayload = {
  fileName: string;
  fileChecksum: string;
  payloadHash: string;
  previewToken: string;
  importMode: "create_only";
  status: "ready" | "blocked";
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    productRoots: number;
    colorAssociations: number;
    variants: number;
    skus: number;
    errors: number;
    warnings: number;
  };
  rows: PreviewRow[];
  issues: ImportIssue[];
  error?: string;
};
type ConfigPayload = { role: string; previewOnly: boolean; limits: { maxFileBytes: number; maxRows: number; maxProducts: number; previewRows: number } };

const PAGE_SIZE = 25;

export function BulkImportProductsAdmin() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [page, setPage] = useState(1);
  const [errorCode, setErrorCode] = useState("all");
  const [rowFilter, setRowFilter] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    authorizedFetch("/api/admin/products/bulk-import")
      .then(async (response) => {
        const payload = await response.json() as ConfigPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Konfigurasi Bulk Import gagal dimuat.");
        setConfig(payload);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Konfigurasi Bulk Import gagal dimuat."));
  }, []);

  const filteredIssues = useMemo(() => (preview?.issues || []).filter((issue) => {
    const codeMatch = errorCode === "all" || issue.errorCode === errorCode;
    const rowMatch = !rowFilter || String(issue.rowNumber || "").includes(rowFilter.trim());
    return codeMatch && rowMatch;
  }), [preview, errorCode, rowFilter]);
  const errorCodes = useMemo(() => [...new Set((preview?.issues || []).map((issue) => issue.errorCode))].sort(), [preview]);
  const pagedRows = (preview?.rows || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil((preview?.rows.length || 0) / PAGE_SIZE));

  function chooseFile(next: File | null) {
    setFile(next);
    setPreview(null);
    setResult(null);
    setConfirmed(false);
    setPage(1);
    setNotice(next ? `${next.name} dipilih. Jalankan Validasi / Dry Run.` : "File dihapus.");
  }

  async function runPreview() {
    if (!file) return setNotice("Pilih file XLSX atau CSV terlebih dahulu.");
    setWorking(true);
    setNotice("Menjalankan validasi server-side tanpa menulis data...");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await authorizedFetch("/api/admin/products/bulk-import?action=preview", { method: "POST", body: form });
      const payload = await response.json() as PreviewPayload;
      if (!response.ok && !payload.summary) throw new Error(payload.error || "Dry run gagal.");
      setPreview(payload);
      setConfirmed(false);
      setPage(1);
      setNotice(payload.status === "ready" ? "Dry run PASS. File siap dikonfirmasi." : `Dry run BLOCKED: ${payload.summary.errors} error harus diperbaiki.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Dry run gagal.");
    } finally {
      setWorking(false);
    }
  }

  async function commitImport() {
    if (!file || !preview?.previewToken || preview.status !== "ready" || !confirmed) return;
    setWorking(true);
    setNotice("Memvalidasi ulang dan menjalankan atomic import...");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("previewToken", preview.previewToken);
      const response = await authorizedFetch("/api/admin/products/bulk-import?action=commit", { method: "POST", body: form });
      const payload = await response.json() as { ok?: boolean; result?: Record<string, unknown>; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Final import gagal.");
      setResult(payload.result || {});
      setNotice("Atomic import berhasil. Seluruh product root dibuat sebagai Draft.");
      setConfirmed(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Final import gagal dan transaction dibatalkan.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="PIM PHASE 4"
        title="Bulk Import Produk"
        description="Import create-only untuk product root, warna, ukuran, SKU, harga, dan stok. Dry run wajib dan seluruh produk hasil import tetap Draft."
        actions={<Link href="/admin/products" className="rounded-full border border-brand-softGray bg-white px-5 py-3 text-sm font-semibold">Kembali ke Product Manager</Link>}
      />

      {config?.previewOnly ? <div role="status" className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">PREVIEW ONLY — Admin Guest dapat mengunduh template dan menjalankan dry run, tetapi final import ditolak server.</div> : null}
      <div aria-live="polite" className="min-h-6 text-sm font-medium text-brand-charcoal">{notice}</div>

      <section className="border border-brand-softGray bg-white p-5 sm:p-6" aria-labelledby="template-heading">
        <h2 id="template-heading" className="text-lg font-semibold">1. Unduh Template</h2>
        <p className="mt-2 text-sm text-brand-charcoal/65">Gunakan reference master terbaru. Jangan mengubah nama sheet atau header canonical.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <DownloadButton label="Template Excel" kind="xlsx" />
          <DownloadButton label="Template CSV" kind="csv" />
          <DownloadButton label="Color Master" kind="color-reference" />
          <DownloadButton label="Size Master" kind="size-reference" />
          <DownloadButton label="Category Reference" kind="category-reference" />
        </div>
      </section>

      <section className="border border-brand-softGray bg-white p-5 sm:p-6" aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-lg font-semibold">2. Unggah File</h2>
        <div
          className="mt-4 flex min-h-44 cursor-pointer flex-col items-center justify-center border border-dashed border-brand-charcoal/30 px-5 py-8 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0] || null); }}
        >
          <p className="font-semibold">Tarik file ke sini atau pilih file</p>
          <p className="mt-2 text-sm text-brand-charcoal/60">.xlsx atau .csv UTF-8{config ? ` · maksimal ${config.limits.maxFileBytes / 1024 / 1024} MB · maksimal ${config.limits.maxRows} row` : " · memuat batas server..."}</p>
          {file ? <p className="mt-4 break-all text-sm font-semibold">{file.name} · {(file.size / 1024).toFixed(1)} KB</p> : null}
        </div>
        <input ref={inputRef} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0] || null)} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={runPreview} disabled={!file || working} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">Validasi / Dry Run</button>
          <button type="button" onClick={() => chooseFile(null)} disabled={!file || working} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold disabled:opacity-45">Hapus File</button>
        </div>
      </section>

      {preview ? <>
        <section className="border border-brand-softGray bg-white p-5 sm:p-6" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="text-lg font-semibold">3. Tinjau Hasil Dry Run</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              ["Total row", preview.summary.totalRows], ["Valid", preview.summary.validRows], ["Invalid", preview.summary.invalidRows],
              ["Produk", preview.summary.productRoots], ["Warna", preview.summary.colorAssociations], ["SKU", preview.summary.skus], ["Error", preview.summary.errors]
            ].map(([label, value]) => <div key={String(label)} className="border border-brand-softGray p-3"><p className="text-xs text-brand-charcoal/55">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
          </div>
          <dl className="mt-4 grid gap-2 text-xs text-brand-charcoal/65 sm:grid-cols-2">
            <div><dt className="font-semibold">File SHA-256</dt><dd className="break-all font-mono">{preview.fileChecksum}</dd></div>
            <div><dt className="font-semibold">Mode</dt><dd>Create Only · Draft</dd></div>
          </dl>
        </section>

        <section className="overflow-hidden border border-brand-softGray bg-white" aria-labelledby="preview-heading">
          <div className="flex items-center justify-between gap-3 p-5 sm:p-6"><div><h2 id="preview-heading" className="text-lg font-semibold">Preview Table</h2><p className="mt-1 text-xs text-brand-charcoal/55">{config ? `Menampilkan maksimal ${config.limits.previewRows} row; error report tetap lengkap.` : "Batas preview mengikuti konfigurasi server."}</p></div><span className="text-xs font-semibold">Halaman {page}/{totalPages}</span></div>
          <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-xs"><thead className="bg-brand-offWhite"><tr>{["Row", "Produk", "Slug", "Warna", "Ukuran", "SKU", "Harga", "Adj.", "Stok", "Status"].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{pagedRows.map((row) => <tr key={row.rowNumber} className="border-t border-brand-softGray"><td className="px-3 py-3">{row.rowNumber}</td><td className="px-3 py-3 font-medium">{row.productName}</td><td className="px-3 py-3">{row.slug}</td><td className="px-3 py-3">{row.color}</td><td className="px-3 py-3">{row.size}</td><td className="px-3 py-3 font-mono">{row.sku}</td><td className="px-3 py-3">{row.basePrice}</td><td className="px-3 py-3">{row.priceAdjustment}</td><td className="px-3 py-3">{row.stock}</td><td className="px-3 py-3 font-semibold">{row.validationStatus === "valid" ? "VALID" : "ERROR"}</td></tr>)}</tbody></table></div>
          <div className="flex justify-end gap-2 p-4"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Sebelumnya</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Berikutnya</button></div>
        </section>

        <section className="border border-brand-softGray bg-white p-5 sm:p-6" aria-labelledby="errors-heading">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="errors-heading" className="text-lg font-semibold">Error Panel</h2><button type="button" disabled={!preview.issues.length} onClick={() => downloadErrors(preview.issues)} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Download Error Report</button></div>
          <div className="mt-4 flex flex-wrap gap-2"><label className="text-xs font-semibold">Error code<select value={errorCode} onChange={(event) => setErrorCode(event.target.value)} className="ml-2 border px-3 py-2"><option value="all">Semua</option>{errorCodes.map((code) => <option key={code}>{code}</option>)}</select></label><label className="text-xs font-semibold">Row<input value={rowFilter} onChange={(event) => setRowFilter(event.target.value)} inputMode="numeric" className="ml-2 w-24 border px-3 py-2" /></label></div>
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto" tabIndex={0}>{filteredIssues.length ? filteredIssues.map((issue, index) => <article key={`${issue.rowNumber}-${issue.errorCode}-${index}`} className="border border-brand-softGray p-3 text-xs"><p className="font-semibold">{issue.errorCode} · Row {issue.rowNumber || "FILE"} · {issue.field}</p><p className="mt-1">{issue.message}</p><p className="mt-1 text-brand-charcoal/55">Saran: {issue.suggestedFix}</p></article>) : <p className="text-sm text-brand-charcoal/55">Tidak ada error pada filter ini.</p>}</div>
        </section>

        <section className="border border-brand-softGray bg-white p-5 sm:p-6" aria-labelledby="confirm-heading">
          <h2 id="confirm-heading" className="text-lg font-semibold">4. Konfirmasi Import</h2>
          <p className="mt-2 text-sm">Mode: <strong>Create Only</strong>. Semua {preview.summary.productRoots} product root akan dibuat sebagai <strong>Draft</strong>.</p>
          <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={config?.previewOnly || preview.status !== "ready" || working} className="mt-1" /><span>Saya sudah meninjau dry run dan memahami bahwa final import bersifat atomic.</span></label>
          <button data-admin-mutation="true" type="button" onClick={commitImport} disabled={Boolean(config?.previewOnly) || preview.status !== "ready" || !confirmed || working} className="mt-4 min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-45">Final Import</button>
          {config?.previewOnly ? <p className="mt-2 text-xs font-semibold text-amber-800">Final Import dinonaktifkan: PREVIEW ONLY.</p> : null}
        </section>
      </> : null}

      {result ? <section className="border border-emerald-200 bg-emerald-50 p-5 sm:p-6" aria-labelledby="result-heading"><h2 id="result-heading" className="text-lg font-semibold">5. Hasil Import</h2><p className="mt-2 text-sm">Transaction berhasil. Tidak ada partial write.</p><pre className="mt-4 overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre><Link href="/admin/products" className="mt-4 inline-flex rounded-full bg-brand-charcoal px-5 py-3 text-sm font-semibold text-white">Buka Product Manager</Link></section> : null}
    </div>
  );
}

function DownloadButton({ label, kind }: { label: string; kind: string }) {
  const [working, setWorking] = useState(false);
  return <button type="button" disabled={working} onClick={async () => { setWorking(true); try { const response = await authorizedFetch(`/api/admin/products/bulk-import?download=${kind}`); if (!response.ok) throw new Error("Download gagal."); const blob = await response.blob(); const disposition = response.headers.get("content-disposition") || ""; const name = disposition.match(/filename="([^"]+)"/)?.[1] || `DEBRODER_${kind}`; triggerDownload(blob, name); } finally { setWorking(false); } }} className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold disabled:opacity-40">{working ? "Menyiapkan..." : label}</button>;
}

async function authorizedFetch(input: string, init?: RequestInit) {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sesi admin tidak tersedia.");
  return fetch(input, { ...init, cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...init?.headers } });
}

function downloadErrors(issues: ImportIssue[]) {
  const headers = ["row_number", "product_key", "field", "value", "error_code", "message", "suggested_fix", "severity"];
  const rows = issues.map((issue) => [issue.rowNumber || "", issue.productKey, issue.field, issue.value, issue.errorCode, issue.message, issue.suggestedFix, issue.severity]);
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), "DEBRODER_PIM_IMPORT_ERRORS.csv");
}

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
