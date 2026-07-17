"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { createSupabaseClient } from "@/lib/supabase";
import type { PimPhase6Filters, PimPhase6Scope, PimPhase6ScopeKind } from "@/lib/pim-phase6";

type Config = {
  role: string;
  readOnlyBusinessData: boolean;
  schemaVersion: string;
  ruleSetVersion: string;
  limits: { directProducts: number; directVariants: number; maximumFileBytes: number; retentionHours: number; pageSize: number; maxExclusions: number };
  backgroundAvailable: boolean;
  ruleCodes: string[];
  ruleApplicabilities: string[];
  categories: Array<{ id: string; name: string; slug: string }>;
  exportHistoryAvailable: boolean;
  exportHistory: ExportJob[];
  runHistoryAvailable: boolean;
  runHistory: RunSummary[];
};
type ProductRow = { id: string; name: string; slug: string; status: string; categoryId: string | null; categoryName: string; basePrice: number | null; updatedAt: string | null };
type ProductPage = { page: number; pageSize: number; total: number; rows: ProductRow[] };
type ExportJob = { id: string; actorRole: string; jobKind: string; format: string; scope: { kind?: string } | null; schemaVersion: string; status: string; productCount: number; variantCount: number; fileName: string | null; fileSize: number | null; fileSha256: string | null; createdAt: string | null; completedAt: string | null; expiresAt: string | null; failureCode: string | null };
type RunSummary = { id: string; status: string; completeness: string; productCount: number; variantCount: number; applicableRuleCount: number; executedRuleCount: number; failedRuleCount: number; passCount: number; warningCount: number; errorCount: number; totalFindings: number; newFindings: number; existingFindings: number; resolvedFindings: number; snapshotAt: string | null; durationMs: number | null; startedAt: string | null };
type Finding = { fingerprint: string; issueCode: string; severity: "WARNING" | "ERROR"; lifecycle: string; productId: string; productName: string; categoryId: string | null; categoryName: string; productStatus: string; variantId: string | null; sku: string | null; field: string; currentValue: unknown; valueState: string; message: string; recommendation: string; editorDestination: string; evaluationStatus: string; ruleAppliesTo: string };
type FindingPage = { page: number; pageSize: number; total: number; rows: Finding[] };
type FindingFilters = { issueCode: string; categoryId: string; productStatus: string; productId: string; variantId: string; sku: string; applicability: string };
type Estimate = { scopeLabel: string; scopeHash: string; snapshotAt: string; productCount: number; variantCount: number; mode: "DIRECT" | "BLOCKED_BACKGROUND_UNAVAILABLE"; schemaVersion: string; ruleSetVersion: string };

const emptyFilters: PimPhase6Filters = { query: "", status: "all", categoryId: null, updatedFrom: null, updatedTo: null };
const emptyFindingFilters: FindingFilters = { issueCode: "", categoryId: "", productStatus: "all", productId: "", variantId: "", sku: "", applicability: "" };

export function ExportReconciliationAdmin() {
  const [tab, setTab] = useState<"export" | "reconciliation">("export");
  const [config, setConfig] = useState<Config | null>(null);
  const [products, setProducts] = useState<ProductPage>({ page: 1, pageSize: 25, total: 0, rows: [] });
  const [filters, setFilters] = useState<PimPhase6Filters>(emptyFilters);
  const [scopeKind, setScopeKind] = useState<PimPhase6ScopeKind>("selected");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [activeRun, setActiveRun] = useState<RunSummary | null>(null);
  const [findings, setFindings] = useState<FindingPage>({ page: 1, pageSize: 50, total: 0, rows: [] });
  const [findingPage, setFindingPage] = useState(1);
  const [findingSeverity, setFindingSeverity] = useState("all");
  const [findingLifecycle, setFindingLifecycle] = useState("all");
  const [findingQuery, setFindingQuery] = useState("");
  const [findingFilters, setFindingFilters] = useState<FindingFilters>(emptyFindingFilters);
  const [exportToken, setExportToken] = useState(() => createToken("export"));
  const [reconciliationToken, setReconciliationToken] = useState(() => createToken("reconcile"));

  const loadConfig = useCallback(async () => {
    const response = await authorizedFetch("/api/admin/products/export-reconciliation");
    const payload = await response.json() as Config & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Konfigurasi Phase 6 gagal dimuat.");
    setConfig(payload);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view: "products", page: String(page), query: filters.query, status: filters.status });
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.updatedFrom) params.set("updatedFrom", filters.updatedFrom.slice(0, 10));
    if (filters.updatedTo) params.set("updatedTo", filters.updatedTo.slice(0, 10));
    try {
      const response = await authorizedFetch(`/api/admin/products/export-reconciliation?${params}`);
      const payload = await response.json() as ProductPage & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Product Root gagal dimuat.");
      setProducts(payload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Product Root gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { void loadConfig().catch((error) => setNotice(error instanceof Error ? error.message : "Konfigurasi Phase 6 gagal dimuat.")); }, [loadConfig]);
  useEffect(() => { const timer = window.setTimeout(() => void loadProducts(), 200); return () => window.clearTimeout(timer); }, [loadProducts]);

  const scope = useMemo<PimPhase6Scope>(() => ({
    kind: scopeKind,
    ids: scopeKind === "current_page" ? products.rows.filter((row) => selectedIds.has(row.id)).map((row) => row.id) : [...selectedIds],
    excludedIds: scopeKind === "all_matching" ? [...excludedIds] : [],
    filters
  }), [excludedIds, filters, products.rows, scopeKind, selectedIds]);
  const selectedOnPage = products.rows.filter((row) => scopeKind === "all_matching" ? !excludedIds.has(row.id) : selectedIds.has(row.id)).length;
  const pageChecked = Boolean(products.rows.length) && selectedOnPage === products.rows.length;
  const totalPages = Math.max(1, Math.ceil(products.total / products.pageSize));

  function changeFilters(next: PimPhase6Filters) {
    setFilters(next);
    setPage(1);
    setSelectedIds(new Set());
    setExcludedIds(new Set());
    setEstimate(null);
    setExportToken(createToken("export"));
    setReconciliationToken(createToken("reconcile"));
  }

  function changeScope(next: PimPhase6ScopeKind) {
    setScopeKind(next);
    setSelectedIds(new Set());
    setExcludedIds(new Set());
    setEstimate(null);
    setExportToken(createToken("export"));
    setReconciliationToken(createToken("reconcile"));
    if (next === "full") setFilters(emptyFilters);
  }

  function toggleRow(id: string, checked: boolean) {
    setEstimate(null);
    if (scopeKind === "all_matching") setExcludedIds((current) => { const next = new Set(current); if (checked) next.delete(id); else if (next.size < (config?.limits.maxExclusions || 1000)) next.add(id); return next; });
    else setSelectedIds((current) => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; });
  }

  function togglePage(checked: boolean) {
    setEstimate(null);
    if (scopeKind === "all_matching") setExcludedIds((current) => { const next = new Set(current); for (const row of products.rows) checked ? next.delete(row.id) : next.add(row.id); return next; });
    else setSelectedIds((current) => { const next = new Set(current); for (const row of products.rows) checked ? next.add(row.id) : next.delete(row.id); return next; });
  }

  async function estimateScope() {
    setWorking(true);
    setNotice("Menghitung ulang scope dan snapshot di server...");
    try {
      const response = await phase6Post({ action: "estimate", scope });
      const payload = await response.json() as Estimate & { error?: string; code?: string };
      if (!response.ok) throw new Error(payload.code ? `${payload.code}: ${payload.error}` : payload.error || "Estimate gagal.");
      setEstimate(payload);
      setNotice(payload.mode === "DIRECT" ? "Scope aman untuk direct processing." : "Scope melebihi limit. Persempit filter karena background runner belum tersedia.");
    } catch (error) {
      setEstimate(null);
      setNotice(error instanceof Error ? error.message : "Estimate gagal.");
    } finally {
      setWorking(false);
    }
  }

  async function generateExport() {
    if (!estimate || estimate.mode !== "DIRECT") return;
    setWorking(true);
    setNotice("Membuat snapshot export dan menyimpan file private...");
    try {
      const response = await phase6Post({ action: "export", scope, format, idempotencyToken: exportToken });
      const payload = await response.json() as { job?: ExportJob; downloadPath?: string | null; error?: string; code?: string };
      if (!response.ok || !payload.job) throw new Error(payload.code ? `${payload.code}: ${payload.error}` : payload.error || "Export gagal.");
      setNotice(`Export ${payload.job.status}. SHA-256: ${payload.job.fileSha256 || "menunggu"}`);
      await loadConfig();
      if (payload.downloadPath) await downloadPrivateFile(payload.downloadPath, payload.job.fileName || undefined);
      setExportToken(createToken("export"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Export gagal.");
    } finally {
      setWorking(false);
    }
  }

  async function runReconciliation() {
    if (!estimate || estimate.mode !== "DIRECT") return;
    setWorking(true);
    setNotice("Menjalankan scan read-only menggunakan rule registry canonical...");
    try {
      const response = await phase6Post({ action: "reconcile", scope, idempotencyToken: reconciliationToken });
      const payload = await response.json() as { run?: RunSummary; findings?: FindingPage; error?: string; code?: string };
      if (!response.ok || !payload.run) throw new Error(payload.code ? `${payload.code}: ${payload.error}` : payload.error || "Reconciliation gagal.");
      setActiveRun(payload.run);
      setFindings(payload.findings || { page: 1, pageSize: 50, total: 0, rows: [] });
      setFindingPage(1);
      setNotice(`Reconciliation ${payload.run.status} · ${payload.run.totalFindings} finding · ${payload.run.completeness}.`);
      await loadConfig();
      setReconciliationToken(createToken("reconcile"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Reconciliation gagal.");
    } finally {
      setWorking(false);
    }
  }

  const loadFindings = useCallback(async () => {
    if (!activeRun) return;
    const params = new URLSearchParams({ view: "findings", runId: activeRun.id, page: String(findingPage), query: findingQuery });
    if (findingSeverity !== "all") params.set("severity", findingSeverity);
    if (findingLifecycle !== "all") params.set("lifecycle", findingLifecycle);
    for (const [key, value] of Object.entries(findingFilters)) if (value && value !== "all") params.set(key, value);
    const response = await authorizedFetch(`/api/admin/products/export-reconciliation?${params}`);
    const payload = await response.json() as FindingPage & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Finding gagal dimuat.");
    setFindings(payload);
  }, [activeRun, findingFilters, findingLifecycle, findingPage, findingQuery, findingSeverity]);

  useEffect(() => { const timer = window.setTimeout(() => void loadFindings().catch((error) => setNotice(error instanceof Error ? error.message : "Finding gagal dimuat.")), 200); return () => window.clearTimeout(timer); }, [loadFindings]);

  async function createReport(reportFormat: "xlsx" | "csv") {
    if (!activeRun || activeRun.completeness !== "COMPLETE") return;
    setWorking(true);
    try {
      const response = await phase6Post({ action: "report", runId: activeRun.id, format: reportFormat, idempotencyToken: `report_${reportFormat}_${activeRun.id.replace(/-/g, "")}` });
      const payload = await response.json() as { job?: ExportJob; downloadPath?: string | null; error?: string; code?: string };
      if (!response.ok || !payload.job) throw new Error(payload.code ? `${payload.code}: ${payload.error}` : payload.error || "Report gagal dibuat.");
      setNotice(`Report ${reportFormat.toUpperCase()} siap. SHA-256: ${payload.job.fileSha256 || "—"}`);
      await loadConfig();
      if (payload.downloadPath) await downloadPrivateFile(payload.downloadPath, payload.job.fileName || undefined);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Report gagal dibuat.");
    } finally {
      setWorking(false);
    }
  }

  return <div className="grid gap-6">
    <AdminPageHeader eyebrow="PIM PHASE 6" title="Export & Reconciliation" description="Export canonical PIM dan periksa kesehatan data secara read-only. Temuan hanya mengarah ke workflow editor existing; tidak ada auto-fix." actions={<Link href="/admin/products" className="rounded-full border border-brand-softGray bg-white px-5 py-3 text-sm font-semibold">Kembali ke Product Manager</Link>} />
    <div role="status" className="border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900">READ-ONLY BUSINESS DATA — export dan reconciliation tidak mengubah produk, variant, SKU, harga, stok, status, master, atau media.</div>
    <div aria-live="polite" className="min-h-6 text-sm font-medium">{notice}</div>

    <div role="tablist" aria-label="Export dan Reconciliation" className="flex gap-2 border-b border-brand-softGray">
      <button role="tab" aria-selected={tab === "export"} type="button" onClick={() => setTab("export")} className={`min-h-11 border-b-2 px-5 text-sm font-semibold ${tab === "export" ? "border-brand-green text-brand-green" : "border-transparent"}`}>Export Produk</button>
      <button role="tab" aria-selected={tab === "reconciliation"} type="button" onClick={() => setTab("reconciliation")} className={`min-h-11 border-b-2 px-5 text-sm font-semibold ${tab === "reconciliation" ? "border-brand-green text-brand-green" : "border-transparent"}`}>Reconciliation</button>
    </div>

    <section className="border border-brand-softGray bg-white p-5 sm:p-6" aria-labelledby="scope-heading">
      <h2 id="scope-heading" className="text-lg font-semibold">1. Pilih Scope</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold">Scope<select value={scopeKind} onChange={(event) => changeScope(event.target.value as PimPhase6ScopeKind)} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal"><option value="selected">Selected Products</option><option value="current_page">Current Page Selection</option><option value="all_matching">All Matching Current Filters</option><option value="category">Category</option><option value="status">Product Status</option><option value="updated_range">Updated Date Range</option><option value="full">Full PIM</option></select></label>
        <label className="text-sm font-semibold">Cari produk<input value={filters.query} disabled={scopeKind === "full"} onChange={(event) => changeFilters({ ...filters, query: event.target.value })} className="mt-2 min-h-11 w-full border px-3 font-normal disabled:bg-brand-offWhite" placeholder="Nama, slug, SKU" /></label>
        <label className="text-sm font-semibold">Status<select value={filters.status} disabled={scopeKind === "full"} onChange={(event) => changeFilters({ ...filters, status: event.target.value as PimPhase6Filters["status"] })} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal disabled:bg-brand-offWhite"><option value="all">Semua status</option><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
        <label className="text-sm font-semibold">Kategori<select value={filters.categoryId || ""} disabled={scopeKind === "full"} onChange={(event) => changeFilters({ ...filters, categoryId: event.target.value || null })} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal disabled:bg-brand-offWhite"><option value="">Semua kategori</option>{(config?.categories || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Updated dari<input type="date" value={filters.updatedFrom?.slice(0, 10) || ""} disabled={scopeKind === "full"} onChange={(event) => changeFilters({ ...filters, updatedFrom: event.target.value || null })} className="mt-2 min-h-11 w-full border px-3 font-normal disabled:bg-brand-offWhite" /></label>
        <label className="text-sm font-semibold">Updated sampai<input type="date" value={filters.updatedTo?.slice(0, 10) || ""} disabled={scopeKind === "full"} onChange={(event) => changeFilters({ ...filters, updatedTo: event.target.value || null })} className="mt-2 min-h-11 w-full border px-3 font-normal disabled:bg-brand-offWhite" /></label>
      </div>

      <div className="mt-5 overflow-x-auto border"><table className="min-w-[820px] w-full text-left text-sm"><thead className="bg-brand-offWhite"><tr><th className="w-14 px-4 py-3"><input type="checkbox" checked={pageChecked} onChange={(event) => togglePage(event.target.checked)} aria-label="Pilih seluruh produk pada halaman ini" className="h-5 w-5" /></th><th className="px-4 py-3">Product Root</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Base price</th><th className="px-4 py-3">Updated</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-8 text-center">Memuat Product Root...</td></tr> : products.rows.length ? products.rows.map((row) => { const checked = scopeKind === "all_matching" ? !excludedIds.has(row.id) : selectedIds.has(row.id); return <tr key={row.id} className="border-t"><td className="px-4 py-3"><input type="checkbox" checked={checked} disabled={["category", "status", "updated_range", "full"].includes(scopeKind)} onChange={(event) => toggleRow(row.id, event.target.checked)} aria-label={`Pilih ${row.name}`} className="h-5 w-5 disabled:opacity-30" /></td><td className="px-4 py-3"><strong>{row.name}</strong><p className="text-xs text-brand-charcoal/50">/{row.slug}</p></td><td className="px-4 py-3">{row.categoryName}</td><td className="px-4 py-3">{row.status}</td><td className="px-4 py-3">{row.basePrice ?? "—"}</td><td className="px-4 py-3 text-xs">{row.updatedAt ? new Date(row.updatedAt).toLocaleString("id-ID") : "—"}</td></tr>; }) : <tr><td colSpan={6} className="p-8 text-center">Tidak ada produk pada filter ini.</td></tr>}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{scopeKind === "all_matching" ? `${Math.max(0, products.total - excludedIds.size)} hasil filter dipilih · ${excludedIds.size} exclusion` : `${selectedIds.size} produk dipilih · ${products.total} hasil filter`}</p><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Sebelumnya</button><span className="text-xs font-semibold">{page}/{totalPages}</span><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Berikutnya</button></div></div>
    </section>

    <section className="border border-brand-softGray bg-white p-5 sm:p-6" aria-labelledby="summary-heading"><h2 id="summary-heading" className="text-lg font-semibold">2. Tinjau Scope</h2><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={estimateScope} disabled={working} className="min-h-11 rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white disabled:opacity-40">Hitung Ulang Scope</button>{tab === "export" ? <label className="text-sm font-semibold">Format<select value={format} onChange={(event) => { setFormat(event.target.value as "xlsx" | "csv"); setExportToken(createToken("export")); }} className="ml-2 min-h-11 border bg-white px-3 font-normal"><option value="xlsx">XLSX</option><option value="csv">CSV UTF-8</option></select></label> : null}</div>{estimate ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Scope", estimate.scopeLabel], ["Produk", estimate.productCount], ["Variant/SKU", estimate.variantCount], ["Mode", estimate.mode], [tab === "export" ? "Schema" : "Rule set", tab === "export" ? estimate.schemaVersion : estimate.ruleSetVersion]].map(([label, value]) => <div key={String(label)} className="border p-3"><p className="text-xs text-brand-charcoal/50">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>)}</div> : null}<p className="mt-4 text-xs text-brand-charcoal/55">Direct limit: {config?.limits.directProducts || 250} produk / {config?.limits.directVariants || 5000} variant · retention {config?.limits.retentionHours || 168} jam · background job tidak tersedia.</p></section>

    {tab === "export" ? <ExportPanel config={config} estimate={estimate} working={working} onGenerate={generateExport} onDownload={downloadPrivateFile} /> : <ReconciliationPanel activeRun={activeRun} findings={findings} findingPage={findingPage} findingSeverity={findingSeverity} findingLifecycle={findingLifecycle} findingQuery={findingQuery} findingFilters={findingFilters} working={working} estimate={estimate} config={config} onRun={runReconciliation} onOpenRun={(run) => { setActiveRun(run); setFindingPage(1); }} onFindingPage={setFindingPage} onSeverity={(value) => { setFindingSeverity(value); setFindingPage(1); }} onLifecycle={(value) => { setFindingLifecycle(value); setFindingPage(1); }} onQuery={(value) => { setFindingQuery(value); setFindingPage(1); }} onFindingFilters={(value) => { setFindingFilters(value); setFindingPage(1); }} onReport={createReport} />}
  </div>;
}

function ExportPanel({ config, estimate, working, onGenerate, onDownload }: { config: Config | null; estimate: Estimate | null; working: boolean; onGenerate: () => void; onDownload: (path: string, name?: string) => Promise<void> }) {
  return <section role="tabpanel" className="border border-brand-softGray bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">3. Generate Product Export</h2><p className="mt-1 text-sm text-brand-charcoal/55">XLSX berisi information, dictionary, products, variants, dan master references. CSV memakai satu row per sellable SKU.</p></div><button type="button" onClick={onGenerate} disabled={working || estimate?.mode !== "DIRECT"} className="min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-40">Generate & Download</button></div><HistoryList rows={config?.exportHistory.filter((item) => item.jobKind === "product_export") || []} available={Boolean(config?.exportHistoryAvailable)} onDownload={onDownload} /></section>;
}

function ReconciliationPanel(props: { activeRun: RunSummary | null; findings: FindingPage; findingPage: number; findingSeverity: string; findingLifecycle: string; findingQuery: string; findingFilters: FindingFilters; working: boolean; estimate: Estimate | null; config: Config | null; onRun: () => void; onOpenRun: (run: RunSummary) => void; onFindingPage: (page: number) => void; onSeverity: (value: string) => void; onLifecycle: (value: string) => void; onQuery: (value: string) => void; onFindingFilters: (value: FindingFilters) => void; onReport: (format: "xlsx" | "csv") => void }) {
  const totalPages = Math.max(1, Math.ceil(props.findings.total / props.findings.pageSize));
  const [runStatus, setRunStatus] = useState("all");
  const visibleRuns = (props.config?.runHistory || []).filter((run) => runStatus === "all" || run.status === runStatus);
  return <section role="tabpanel" className="grid gap-6"><div className="border border-brand-softGray bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">3. Jalankan Reconciliation</h2><p className="mt-1 text-sm text-brand-charcoal/55">Scan read-only. Tidak ada tombol fix, publish, archive, update price, update stock, atau delete.</p></div><button type="button" onClick={props.onRun} disabled={props.working || props.estimate?.mode !== "DIRECT"} className="min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-40">Jalankan Reconciliation</button></div>{props.activeRun ? <><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{[["Status", props.activeRun.status], ["Completeness", props.activeRun.completeness], ["PASS", props.activeRun.passCount], ["WARNING", props.activeRun.warningCount], ["ERROR", props.activeRun.errorCount], ["Findings", props.activeRun.totalFindings], ["NEW", props.activeRun.newFindings], ["EXISTING", props.activeRun.existingFindings], ["RESOLVED", props.activeRun.resolvedFindings], ["Rules failed", props.activeRun.failedRuleCount], ["Products", props.activeRun.productCount], ["Variants", props.activeRun.variantCount]].map(([label, value]) => <div key={String(label)} className={`border p-3 ${label === "Status" && value === "INCOMPLETE" ? "border-red-300 bg-red-50" : ""}`}><p className="text-xs text-brand-charcoal/50">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => props.onReport("xlsx")} disabled={props.working || props.activeRun?.completeness !== "COMPLETE"} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Download XLSX Report</button><button type="button" onClick={() => props.onReport("csv")} disabled={props.working || props.activeRun?.completeness !== "COMPLETE"} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Download CSV Report</button></div></> : null}</div>
    {props.activeRun ? <div className="border border-brand-softGray bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Findings</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-sm font-semibold">Severity<select value={props.findingSeverity} onChange={(event) => props.onSeverity(event.target.value)} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal"><option value="all">Semua</option><option value="ERROR">ERROR</option><option value="WARNING">WARNING</option></select></label><label className="text-sm font-semibold">Lifecycle<select value={props.findingLifecycle} onChange={(event) => props.onLifecycle(event.target.value)} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal"><option value="all">Semua</option><option value="NEW">NEW</option><option value="EXISTING">EXISTING</option><option value="RESOLVED">RESOLVED</option><option value="NOT_EVALUATED">NOT_EVALUATED</option></select></label><label className="text-sm font-semibold">Produk / SKU / issue<input value={props.findingQuery} onChange={(event) => props.onQuery(event.target.value)} className="mt-2 min-h-11 w-full border px-3 font-normal" /></label><label className="text-sm font-semibold">Issue code<input value={props.findingFilters.issueCode} onChange={(event) => props.onFindingFilters({ ...props.findingFilters, issueCode: event.target.value })} className="mt-2 min-h-11 w-full border px-3 font-normal" /></label><label className="text-sm font-semibold">Kategori<select value={props.findingFilters.categoryId} onChange={(event) => props.onFindingFilters({ ...props.findingFilters, categoryId: event.target.value })} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal"><option value="">Semua</option>{(props.config?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="text-sm font-semibold">Product status<select value={props.findingFilters.productStatus} onChange={(event) => props.onFindingFilters({ ...props.findingFilters, productStatus: event.target.value })} className="mt-2 min-h-11 w-full border bg-white px-3 font-normal"><option value="all">Semua</option><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label><label className="text-sm font-semibold">Product ID<input value={props.findingFilters.productId} onChange={(event) => props.onFindingFilters({ ...props.findingFilters, productId: event.target.value })} className="mt-2 min-h-11 w-full border px-3 font-normal" /></label><label className="text-sm font-semibold">Variant ID<input value={props.findingFilters.variantId} onChange={(event) => props.onFindingFilters({ ...props.findingFilters, variantId: event.target.value })} className="mt-2 min-h-11 w-full border px-3 font-normal" /></label><label className="text-sm font-semibold">SKU<input value={props.findingFilters.sku} onChange={(event) => props.onFindingFilters({ ...props.findingFilters, sku: event.target.value })} className="mt-2 min-h-11 w-full border px-3 font-normal" /></label><label className="text-sm font-semibold">Rule applicability<input value={props.findingFilters.applicability} onChange={(event) => props.onFindingFilters({ ...props.findingFilters, applicability: event.target.value })} className="mt-2 min-h-11 w-full border px-3 font-normal" placeholder="contoh: published_product" /></label></div><div className="mt-5 overflow-x-auto border"><table className="min-w-[960px] w-full text-left text-xs"><thead className="bg-brand-offWhite"><tr><th className="px-3 py-3">Severity</th><th className="px-3 py-3">Lifecycle</th><th className="px-3 py-3">Issue</th><th className="px-3 py-3">Produk / SKU</th><th className="px-3 py-3">Temuan</th><th className="px-3 py-3">Rekomendasi</th><th className="px-3 py-3">Editor</th></tr></thead><tbody>{props.findings.rows.length ? props.findings.rows.map((finding) => <tr key={finding.fingerprint} className="border-t align-top"><td className="px-3 py-3 font-semibold">{finding.severity}</td><td className="px-3 py-3">{finding.lifecycle}</td><td className="px-3 py-3 font-mono">{finding.issueCode}</td><td className="px-3 py-3"><strong>{finding.productName}</strong><br />{finding.sku || "—"}</td><td className="px-3 py-3">{finding.message}</td><td className="px-3 py-3">{finding.recommendation}</td><td className="px-3 py-3"><Link href={finding.editorDestination} className="font-semibold text-brand-green underline">Buka editor canonical</Link></td></tr>) : <tr><td colSpan={7} className="p-8 text-center">Tidak ada finding pada filter ini.</td></tr>}</tbody></table></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => props.onFindingPage(Math.max(1, props.findingPage - 1))} disabled={props.findingPage <= 1} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Sebelumnya</button><span className="px-2 py-2 text-xs font-semibold">{props.findingPage}/{totalPages}</span><button type="button" onClick={() => props.onFindingPage(Math.min(totalPages, props.findingPage + 1))} disabled={props.findingPage >= totalPages} className="rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40">Berikutnya</button></div></div> : null}
    <div className="border border-brand-softGray bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Run History</h2><label className="text-sm font-semibold">Run status<select value={runStatus} onChange={(event) => setRunStatus(event.target.value)} className="ml-2 min-h-10 border bg-white px-3 font-normal"><option value="all">Semua</option><option value="PASS">PASS</option><option value="WARNING">WARNING</option><option value="ERROR">ERROR</option><option value="INCOMPLETE">INCOMPLETE</option></select></label></div><div className="mt-4 grid gap-2">{props.config?.runHistoryAvailable ? visibleRuns.length ? visibleRuns.map((run) => <button key={run.id} type="button" onClick={() => props.onOpenRun(run)} className="flex flex-wrap justify-between gap-3 border p-3 text-left text-xs"><span><strong>{run.status}</strong> · {run.completeness} · {run.productCount} produk</span><span>{run.totalFindings} finding · {run.startedAt ? new Date(run.startedAt).toLocaleString("id-ID") : "—"}</span></button>) : <p className="text-sm text-brand-charcoal/55">Belum ada run.</p> : <p className="text-sm text-amber-800">History tersedia setelah migration Phase 6 diterapkan.</p>}</div></div></section>;
}

function HistoryList({ rows, available, onDownload }: { rows: ExportJob[]; available: boolean; onDownload: (path: string, name?: string) => Promise<void> }) {
  return <div className="mt-6"><h3 className="font-semibold">Export History</h3><div className="mt-3 grid gap-2">{available ? rows.length ? rows.map((job) => <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 border p-3 text-xs"><span><strong>{job.format.toUpperCase()}</strong> · {job.status} · {job.scope?.kind || "scope"} · {job.productCount} produk · {job.variantCount} variant<br />ID: <span className="font-mono text-[10px]">{job.id}</span> · actor: {job.actorRole || "admin"} · size: {job.fileSize ?? "—"} byte<br />created: {job.createdAt ? new Date(job.createdAt).toLocaleString("id-ID") : "—"} · completed: {job.completedAt ? new Date(job.completedAt).toLocaleString("id-ID") : "—"} · expiry: {job.expiresAt ? new Date(job.expiresAt).toLocaleString("id-ID") : "—"}<br /><span className="font-mono text-[10px]">{job.fileSha256 || job.failureCode || "—"}</span></span>{job.status === "COMPLETED" && job.expiresAt && new Date(job.expiresAt).getTime() > Date.now() ? <button type="button" onClick={() => void onDownload(`/api/admin/products/export-reconciliation/download/${job.id}`, job.fileName || undefined)} className="rounded-full border px-4 py-2 font-semibold">Download</button> : <span className="font-semibold">{job.status === "EXPIRED" ? "File expired — download tidak tersedia" : job.status}</span>}</div>) : <p className="text-sm text-brand-charcoal/55">Belum ada export.</p> : <p className="text-sm text-amber-800">History tersedia setelah migration Phase 6 diterapkan.</p>}</div></div>;
}

async function phase6Post(body: Record<string, unknown>) {
  return authorizedFetch("/api/admin/products/export-reconciliation", { method: "POST", body: JSON.stringify(body) });
}

async function downloadPrivateFile(path: string, fallbackName?: string) {
  const response = await authorizedFetch(path);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || "Download private gagal.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = match?.[1] || fallbackName || "DEBRODER_PIM_EXPORT";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function createToken(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function authorizedFetch(input: string, init?: RequestInit) {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sesi admin tidak tersedia.");
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init?.body) headers.set("content-type", "application/json");
  return fetch(input, { ...init, cache: "no-store", headers });
}
