"use client";

import Link from "next/link";
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  PIM_AUDIT_CATEGORIES,
  PIM_AUDIT_EVENT_REGISTRY,
  PIM_AUDIT_SOURCE_MODULES,
  PIM_AUDIT_STATUSES,
  type PimAuditChange,
  type PimAuditEntity,
  type PimAuditEventCode
} from "@/lib/pim-audit";
import type { PimAuditDetail, PimAuditListRow } from "@/lib/pim-audit-server";
import { phase13ApiFetch } from "@/lib/admin-phase13-api";
import { getRoleLabel } from "@/lib/access-control";

type Filters = {
  search: string;
  from: string;
  to: string;
  actorId: string;
  actorRole: string;
  category: string;
  eventCode: string;
  status: string;
  sourceModule: string;
  entityType: string;
  productId: string;
  variantId: string;
  sku: string;
  batchId: string;
  requestId: string;
  operationId: string;
  sort: "newest" | "oldest";
};

type ListResponse = {
  rows: PimAuditListRow[];
  hasMore: boolean;
  nextCursor: string | null;
  pageSize: number;
  timezone: string;
  actorRole: string;
  summary: { activities: number; completed: number; failed: number; denied: number; bulk: number };
};

type DetailResponse = { detail: PimAuditDetail; actorRole: string };

const ROLE_OPTIONS = ["owner", "superadmin", "super_admin", "admin", "admin_guest"];
const STATUS_LABELS: Record<string, string> = {
  STARTED: "Dimulai",
  COMPLETED: "Berhasil",
  FAILED: "Gagal",
  PARTIAL: "Sebagian",
  ROLLED_BACK: "Di-rollback",
  DENIED: "Ditolak",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  INCOMPLETE: "Tidak lengkap"
};

export function PimAuditHistoryAdmin() {
  const [filters, setFilters] = useState<Filters>(() => defaultFilters());
  const [applied, setApplied] = useState<Filters>(() => defaultFilters());
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<ListResponse | null>(null);
  const [rows, setRows] = useState<PimAuditListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<PimAuditDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = filtersFromParams(params, defaultFilters());
    setFilters(next);
    setApplied(next);
    setReady(true);
  }, []);

  const load = useCallback(async (nextFilters: Filters, cursor?: string | null) => {
    cursor ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const params = paramsFromFilters(nextFilters);
      if (cursor) params.set("cursor", cursor);
      const response = await phase13ApiFetch<ListResponse>(`/api/admin/products/audit-history?${params}`);
      setData(response);
      setRows((current) => cursor ? [...current, ...response.rows.filter((row) => !current.some((item) => item.id === row.id))] : response.rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat riwayat aktivitas.");
      if (!cursor) setRows([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (ready) void load(applied);
  }, [applied, load, ready]);

  function apply(event: FormEvent) {
    event.preventDefault();
    setRows([]);
    setApplied({ ...filters });
    const params = paramsFromFilters(filters);
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }

  function reset() {
    const next = defaultFilters();
    setFilters(next);
    setRows([]);
    setApplied(next);
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function openDetail(auditId: string) {
    setDetailLoading(true);
    setDetailError("");
    try {
      const response = await phase13ApiFetch<DetailResponse>(`/api/admin/products/audit-history?auditId=${encodeURIComponent(auditId)}`);
      setDetail(response.detail);
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : "Detail audit tidak tersedia.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="PIM Phase 7"
        title="Audit & Riwayat Aktivitas"
        description="Jejak operasi PIM terpusat, immutable, dan hanya-baca. Tidak ada edit, delete, rollback, atau mutation dari halaman ini."
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green">Akses hanya-baca</span>
        <span className="text-xs text-brand-charcoal/55">Timezone: {data?.timezone || "Asia/Makassar"}</span>
      </div>

      <Summary summary={data?.summary} />

      <form onSubmit={apply} className="space-y-5 border border-brand-softGray bg-white p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Cari produk, SKU, audit, batch, atau actor">
            <input value={filters.search} onChange={(event) => update(setFilters, "search", event.target.value)} placeholder="Nama, SKU, audit ID..." />
          </Field>
          <Field label="Dari tanggal"><input type="date" value={filters.from} onChange={(event) => update(setFilters, "from", event.target.value)} /></Field>
          <Field label="Sampai tanggal"><input type="date" value={filters.to} onChange={(event) => update(setFilters, "to", event.target.value)} /></Field>
          <Field label="Status">
            <select value={filters.status} onChange={(event) => update(setFilters, "status", event.target.value)}><option value="">Semua status</option>{PIM_AUDIT_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select>
          </Field>
          <Field label="Kategori">
            <select value={filters.category} onChange={(event) => update(setFilters, "category", event.target.value)}><option value="">Semua kategori</option>{PIM_AUDIT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
          </Field>
          <Field label="Aktivitas">
            <select value={filters.eventCode} onChange={(event) => update(setFilters, "eventCode", event.target.value)}><option value="">Semua aktivitas</option>{Object.entries(PIM_AUDIT_EVENT_REGISTRY).map(([code, definition]) => <option key={code} value={code}>{definition.label}</option>)}</select>
          </Field>
          <Field label="Modul sumber">
            <select value={filters.sourceModule} onChange={(event) => update(setFilters, "sourceModule", event.target.value)}><option value="">Semua modul</option>{PIM_AUDIT_SOURCE_MODULES.map((value) => <option key={value}>{value}</option>)}</select>
          </Field>
          <Field label="Role admin">
            <select value={filters.actorRole} onChange={(event) => update(setFilters, "actorRole", event.target.value)}><option value="">Semua role</option>{ROLE_OPTIONS.map((value) => <option key={value} value={value}>{getRoleLabel(value)}</option>)}</select>
          </Field>
          <Field label="Actor ID"><input value={filters.actorId} onChange={(event) => update(setFilters, "actorId", event.target.value)} placeholder="UUID admin" /></Field>
          <Field label="Entity type"><input value={filters.entityType} onChange={(event) => update(setFilters, "entityType", event.target.value)} placeholder="products / variant..." /></Field>
          <Field label="Product ID"><input value={filters.productId} onChange={(event) => update(setFilters, "productId", event.target.value)} placeholder="UUID product" /></Field>
          <Field label="Variant ID"><input value={filters.variantId} onChange={(event) => update(setFilters, "variantId", event.target.value)} placeholder="UUID variant" /></Field>
          <Field label="SKU"><input value={filters.sku} onChange={(event) => update(setFilters, "sku", event.target.value.toUpperCase())} /></Field>
          <Field label="Batch ID"><input value={filters.batchId} onChange={(event) => update(setFilters, "batchId", event.target.value)} placeholder="UUID batch" /></Field>
          <Field label="Request ID"><input value={filters.requestId} onChange={(event) => update(setFilters, "requestId", event.target.value)} /></Field>
          <Field label="Operation ID"><input value={filters.operationId} onChange={(event) => update(setFilters, "operationId", event.target.value)} placeholder="UUID operation" /></Field>
          <Field label="Urutan">
            <select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value === "oldest" ? "oldest" : "newest" }))}><option value="newest">Terbaru</option><option value="oldest">Terlama</option></select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">Terapkan filter</button>
          <button type="button" onClick={reset} disabled={loading} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold disabled:opacity-45">Reset filter</button>
        </div>
      </form>

      {error ? <AdminAlert type="error"><div className="flex flex-wrap items-center justify-between gap-3"><span>{error}</span><button type="button" onClick={() => void load(applied)} className="underline">Coba lagi</button></div></AdminAlert> : null}
      {detailLoading ? <AdminAlert>Memuat detail audit...</AdminAlert> : null}
      {detailError ? <AdminAlert type="error">{detailError}</AdminAlert> : null}

      {loading ? <div role="status" aria-live="polite"><AdminLoadingState label="Memuat riwayat aktivitas..." /></div> : rows.length === 0 && !error ? (
        <AdminEmptyState title="Tidak ada aktivitas ditemukan" description="Tidak ada event pada rentang dan filter ini. Reset filter atau perluas tanggal pencarian." action={<button type="button" onClick={reset} className="rounded-full bg-brand-charcoal px-5 py-2.5 text-sm font-semibold text-white">Reset filter</button>} />
      ) : rows.length ? (
        <AuditList rows={rows} onDetail={openDetail} />
      ) : null}

      {data?.hasMore ? <div className="flex justify-center"><button type="button" onClick={() => void load(applied, data.nextCursor)} disabled={loadingMore || !data.nextCursor} className="min-h-11 rounded-full border border-brand-softGray bg-white px-6 text-sm font-semibold disabled:opacity-45">{loadingMore ? "Memuat..." : "Muat aktivitas berikutnya"}</button></div> : null}

      {detail ? <AuditDetailDialog detail={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

function Summary({ summary }: { summary?: ListResponse["summary"] }) {
  const cards = [
    ["Aktivitas", summary?.activities || 0],
    ["Berhasil", summary?.completed || 0],
    ["Gagal", summary?.failed || 0],
    ["Ditolak", summary?.denied || 0],
    ["Bulk operation", summary?.bulk || 0]
  ];
  return <section aria-label="Ringkasan hasil halaman saat ini" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value]) => <div key={String(label)} className="border border-brand-softGray bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</section>;
}

function AuditList({ rows, onDetail }: { rows: PimAuditListRow[]; onDetail: (id: string) => void }) {
  return (
    <section aria-label="Daftar audit PIM" className="border border-brand-softGray bg-white">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-brand-offWhite text-xs uppercase tracking-[0.12em] text-brand-charcoal/55"><tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Aktivitas</th><th className="px-4 py-3">Objek</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Modul</th><th className="px-4 py-3"><span className="sr-only">Detail</span></th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-brand-softGray align-top"><td className="whitespace-nowrap px-4 py-4 text-xs">{formatDate(row.createdAt)}</td><td className="px-4 py-4"><strong>{row.actorLabel}</strong><p className="mt-1 text-xs text-brand-charcoal/50">{getRoleLabel(row.actorRole)}</p></td><td className="px-4 py-4"><strong>{eventLabel(row.eventCode, row.summary)}</strong><p className="mt-1 font-mono text-[11px] text-brand-charcoal/45">{row.eventCode}</p></td><td className="px-4 py-4"><span>{row.entityLabel || row.sku || row.entityType}</span><p className="mt-1 break-all font-mono text-[11px] text-brand-charcoal/45">{row.entityId || row.batchId || "—"}</p></td><td className="px-4 py-4"><StatusBadge status={row.status} /></td><td className="px-4 py-4">{row.sourceModule}</td><td className="px-4 py-4"><button type="button" onClick={() => onDetail(row.id)} className="rounded-full border border-brand-softGray px-3 py-2 text-xs font-semibold">Lihat detail</button></td></tr>)}</tbody>
        </table>
      </div>
      <div className="divide-y divide-brand-softGray lg:hidden">{rows.map((row) => <article key={row.id} className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-brand-charcoal/50">{formatDate(row.createdAt)}</p><h2 className="mt-2 font-semibold">{eventLabel(row.eventCode, row.summary)}</h2></div><StatusBadge status={row.status} /></div><dl className="grid gap-2 text-sm"><Meta label="Admin" value={`${row.actorLabel} · ${getRoleLabel(row.actorRole)}`} /><Meta label="Objek" value={row.entityLabel || row.sku || row.entityType} /><Meta label="Modul" value={row.sourceModule} /></dl><button type="button" onClick={() => onDetail(row.id)} className="min-h-11 w-full rounded-full border border-brand-softGray text-sm font-semibold">Lihat detail</button></article>)}</div>
    </section>
  );
}

function AuditDetailDialog({ detail, onClose }: { detail: PimAuditDetail; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return (
    <dialog ref={ref} aria-labelledby="pim-audit-detail-title" onCancel={(event) => { event.preventDefault(); onClose(); }} className="m-0 ml-auto h-full max-h-none w-full max-w-3xl overflow-y-auto border-0 bg-white p-0 shadow-2xl backdrop:bg-black/40">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-brand-softGray bg-white p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-green">Detail audit · hanya-baca</p><h2 id="pim-audit-detail-title" className="mt-2 text-xl font-semibold">{eventLabel(detail.eventCode, detail.summary)}</h2><p className="mt-1 font-mono text-xs text-brand-charcoal/45">{detail.id}</p></div><button type="button" onClick={onClose} aria-label="Tutup detail audit" className="min-h-11 rounded-full border border-brand-softGray px-4 text-sm font-semibold">Tutup</button></div>
      <div className="space-y-7 p-5 sm:p-6">
        <section className="grid gap-3 sm:grid-cols-2"><Meta label="Kode aktivitas" value={`${detail.eventCode} · v${detail.eventVersion}`} /><Meta label="Kategori" value={detail.category} /><Meta label="Status" value={STATUS_LABELS[detail.status] || "Status belum dikenali"} /><Meta label="Waktu" value={formatDate(detail.createdAt)} /><Meta label="Admin" value={`${detail.actorLabel} · ${getRoleLabel(detail.actorRole)}`} /><Meta label="Modul" value={detail.sourceModule} /><Meta label="Objek" value={`${detail.entityType}${detail.entityLabel ? ` · ${detail.entityLabel}` : ""}`} /><Meta label="SKU" value={detail.sku || "—"} /><Meta label="ID kelompok" value={detail.batchId || "—"} mono /><Meta label="ID permintaan" value={detail.requestId || "—"} mono /><Meta label="ID operasi" value={detail.operationId || "—"} mono /><Meta label="Durasi" value={detail.durationMs === null ? "—" : `${detail.durationMs} ms`} /><Meta label="Kode kegagalan" value={detail.failureCode || "—"} /></section>
        <section><h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-charcoal/50">Ringkasan</h3><p className="mt-3 rounded-lg bg-brand-offWhite p-4 text-sm leading-6">{detail.summary}</p></section>
        <section><h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-charcoal/50">Perubahan field</h3>{detail.changes.length ? <div className="mt-3 space-y-3">{detail.changes.map((change) => <ChangeCard key={change.field} change={change} />)}</div> : <p className="mt-3 text-sm text-brand-charcoal/55">Tidak ada before/after field-level untuk event operasional ini.</p>}</section>
        {detail.entities.length ? <section><h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-charcoal/50">Item / entity terkait</h3><div className="mt-3 max-h-80 overflow-auto border border-brand-softGray"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-brand-offWhite"><tr><th className="p-3">Entity</th><th className="p-3">Label / SKU</th><th className="p-3">Product</th><th className="p-3">Variant</th><th className="p-3">Hasil</th></tr></thead><tbody>{detail.entities.map((entity, index) => <tr key={`${entity.entityType}-${entity.entityId}-${index}`} className="border-t"><td className="p-3">{entity.entityType}</td><td className="p-3">{entity.entityLabel || entity.sku || "—"}</td><td className="break-all p-3 font-mono">{entity.productId || "—"}</td><td className="break-all p-3 font-mono">{entity.variantId || "—"}</td><td className="p-3">{entity.resultStatus || entity.failureCode || "—"}</td></tr>)}</tbody></table></div></section> : null}
        <SafeNavigation detail={detail} />
        <details className="border border-brand-softGray p-4"><summary className="cursor-pointer text-sm font-semibold">Safe metadata</summary><pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-words bg-brand-offWhite p-4 text-xs leading-5">{JSON.stringify(detail.metadata, null, 2)}</pre></details>
      </div>
    </dialog>
  );
}

function ChangeCard({ change }: { change: PimAuditChange }) {
  return <article className="border border-brand-softGray p-4"><h4 className="font-semibold">{change.field}</h4><div className="mt-3 grid gap-3 sm:grid-cols-2"><ValueBox label="Sebelum" state={change.beforeState} value={change.beforeValue} /><ValueBox label="Sesudah" state={change.afterState} value={change.afterValue} /></div></article>;
}

function ValueBox({ label, state, value }: { label: string; state: string; value: unknown }) {
  return <div className="bg-brand-offWhite p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{label}</p><p className="mt-2 break-words text-sm">{displayValue(state, value)}</p></div>;
}

function SafeNavigation({ detail }: { detail: PimAuditDetail }) {
  return <section><h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-charcoal/50">Navigasi aman</h3><div className="mt-3 flex flex-wrap gap-2"><Link href="/admin/products" className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Buka Manajemen Produk</Link>{detail.productId ? <Link href={`/admin/products/audit-history?productId=${detail.productId}`} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Riwayat produk</Link> : null}{detail.variantId ? <Link href={`/admin/products/audit-history?variantId=${detail.variantId}`} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Riwayat varian</Link> : null}{detail.batchId ? <Link href={`/admin/products/audit-history?batchId=${detail.batchId}`} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Riwayat batch</Link> : null}{detail.category === "EXPORT" || detail.category === "RECONCILIATION" ? <Link href="/admin/products/export-reconciliation" className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Buka Ekspor & Pemeriksaan Data</Link> : null}</div></section>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "FAILED" || status === "INCOMPLETE" ? "border-red-200 bg-red-50 text-red-800" : status === "DENIED" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-brand-softGray bg-brand-offWhite text-brand-charcoal";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{STATUS_LABELS[status] || status}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-3 [&_input]:font-normal [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-brand-softGray [&_select]:bg-white [&_select]:px-3 [&_select]:font-normal">{label}{children}</label>;
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="grid gap-1"><dt className="text-xs font-semibold text-brand-charcoal/50">{label}</dt><dd className={mono ? "break-all font-mono text-xs" : "break-words text-sm"}>{value}</dd></div>;
}

function defaultFilters(): Filters {
  const today = localDate(new Date());
  const from = new Date(); from.setDate(from.getDate() - 30);
  return { search: "", from: localDate(from), to: today, actorId: "", actorRole: "", category: "", eventCode: "", status: "", sourceModule: "", entityType: "", productId: "", variantId: "", sku: "", batchId: "", requestId: "", operationId: "", sort: "newest" };
}

function filtersFromParams(params: URLSearchParams, fallback: Filters): Filters {
  return {
    search: params.get("search") ?? fallback.search,
    from: params.get("from") ?? fallback.from,
    to: params.get("to") ?? fallback.to,
    actorId: params.get("actorId") ?? fallback.actorId,
    actorRole: params.get("actorRole") ?? fallback.actorRole,
    category: params.get("category") ?? fallback.category,
    eventCode: params.get("eventCode") ?? fallback.eventCode,
    status: params.get("status") ?? fallback.status,
    sourceModule: params.get("sourceModule") ?? fallback.sourceModule,
    entityType: params.get("entityType") ?? fallback.entityType,
    productId: params.get("productId") ?? fallback.productId,
    variantId: params.get("variantId") ?? fallback.variantId,
    sku: params.get("sku") ?? fallback.sku,
    batchId: params.get("batchId") ?? fallback.batchId,
    requestId: params.get("requestId") ?? fallback.requestId,
    operationId: params.get("operationId") ?? fallback.operationId,
    sort: params.get("sort") === "oldest" ? "oldest" : "newest"
  };
}

function paramsFromFilters(filters: Filters) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to, sort: filters.sort, pageSize: "30" });
  for (const [key, value] of Object.entries(filters)) if (value && !["from", "to", "sort"].includes(key)) params.set(key, value);
  return params;
}

function update(setter: Dispatch<SetStateAction<Filters>>, key: Exclude<keyof Filters, "sort">, value: string) {
  setter((current) => ({ ...current, [key]: value }));
}

function displayValue(state: string, value: unknown) {
  if (state === "NULL") return "Kosong";
  if (state === "EMPTY_STRING") return "Teks kosong";
  if (state === "ZERO") return "0";
  if (state === "REDACTED") return "Disembunyikan";
  if (state === "NOT_APPLICABLE") return "Tidak berlaku";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function eventLabel(code: string, fallback: string) {
  return PIM_AUDIT_EVENT_REGISTRY[code as PimAuditEventCode]?.label || fallback || code;
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function localDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
