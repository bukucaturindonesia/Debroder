"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { phase13ApiFetch } from "@/lib/admin-phase13-api";
import { formatAuditDate, getRoleLabel, type SystemAuditRow } from "@/lib/access-control";

type AuditResponse = { entries: SystemAuditRow[]; actorRole: string };

const ACTION_LABELS: Record<string, string> = {
  created: "Dibuat",
  updated: "Diubah",
  archived: "Diarsipkan",
  restored: "Dipulihkan",
  deleted: "Dihapus"
};

export function SystemAuditAdmin() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "120" });
      if (entity) params.set("entity", entity);
      if (action) params.set("action", action);
      if (actorRole) params.set("actorRole", actorRole);
      setData(await phase13ApiFetch<AuditResponse>(`/api/admin/audit-log?${params}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Audit sistem gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [action, actorRole, entity]);

  useEffect(() => { void load(); }, [load]);

  const entityOptions = useMemo(() => [...new Set((data?.entries ?? []).map((entry) => entry.entity_type))].sort(), [data?.entries]);
  const roleOptions = useMemo(() => [...new Set((data?.entries ?? []).map((entry) => entry.actor_role).filter(Boolean) as string[])].sort(), [data?.entries]);
  const normalizedSearch = search.trim().toLowerCase();
  const entries = useMemo(() => (data?.entries ?? []).filter((entry) => {
    if (!normalizedSearch) return true;
    return [entry.entity_type, entry.entity_id || "", entry.action, entry.actor_role || "", entry.actor_id || "", JSON.stringify(entry.metadata)]
      .join(" ").toLowerCase().includes(normalizedSearch);
  }), [data?.entries, normalizedSearch]);

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Phase 13" title="Audit Sistem" description="Riwayat lintas modul v1.2 bersifat append-only. Data audit tidak dapat diedit atau dihapus." />
      {error ? <AdminAlert type="error"><div className="flex items-center justify-between gap-3"><span>{error}</span><button type="button" className="underline" onClick={() => void load()}>Coba lagi</button></div></AdminAlert> : null}

      <section className="grid gap-4 border border-brand-softGray bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-2 text-sm font-semibold">Cari<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Entitas, actor, atau ID" className="min-h-11 border border-brand-softGray px-3 font-normal" /></label>
        <label className="grid gap-2 text-sm font-semibold">Entitas<select value={entity} onChange={(event) => setEntity(event.target.value)} className="min-h-11 border border-brand-softGray px-3 font-normal"><option value="">Semua entitas</option>{entityOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Aksi<select value={action} onChange={(event) => setAction(event.target.value)} className="min-h-11 border border-brand-softGray px-3 font-normal"><option value="">Semua aksi</option>{Object.entries(ACTION_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Role Actor<select value={actorRole} onChange={(event) => setActorRole(event.target.value)} className="min-h-11 border border-brand-softGray px-3 font-normal"><option value="">Semua role</option>{roleOptions.map((value) => <option key={value} value={value}>{getRoleLabel(value)}</option>)}</select></label>
      </section>

      {loading ? <AdminLoadingState label="Memuat audit sistem..." /> : entries.length === 0 ? <AdminEmptyState title="Audit tidak ditemukan" description="Belum ada riwayat atau filter tidak menemukan data yang sesuai." /> : (
        <section className="space-y-3">
          {entries.map((entry) => (
            <details key={entry.id} className="border border-brand-softGray bg-white">
              <summary className="cursor-pointer list-none p-5 sm:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">{entry.entity_type}</p><h2 className="mt-2 text-lg font-semibold">{ACTION_LABELS[entry.action] || entry.action}</h2><p className="mt-1 break-all font-mono text-xs text-brand-charcoal/45">{entry.entity_id || String(entry.metadata?.record_key || "Tanpa ID UUID")}</p></div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-brand-offWhite px-3 py-1.5">{getRoleLabel(entry.actor_role)}</span><span className="rounded-full border border-brand-softGray px-3 py-1.5">{formatAuditDate(entry.created_at)}</span></div>
                </div>
              </summary>
              <div className="grid gap-5 border-t border-brand-softGray p-5 sm:p-6 lg:grid-cols-2">
                <AuditJson title="Sebelum" value={entry.old_value} />
                <AuditJson title="Sesudah" value={entry.new_value} />
                <dl className="space-y-3 text-sm lg:col-span-2">
                  <AuditMeta label="Audit ID" value={entry.id} mono />
                  <AuditMeta label="Actor" value={entry.actor_id || "Sistem / trigger"} mono />
                  <AuditMeta label="Sumber" value={entry.source} />
                  <AuditMeta label="Alasan" value={entry.reason || "Tidak dicatat"} />
                  <AuditMeta label="Metadata" value={JSON.stringify(entry.metadata)} mono />
                </dl>
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}

function AuditJson({ title, value }: { title: string; value: Record<string, unknown> | null }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">{title}</p><pre className="mt-3 max-h-96 overflow-auto bg-brand-offWhite p-4 text-xs leading-6">{value ? JSON.stringify(value, null, 2) : "—"}</pre></div>;
}
function AuditMeta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="grid gap-1 sm:grid-cols-[140px_1fr]"><dt className="font-semibold text-brand-charcoal/55">{label}</dt><dd className={mono ? "break-all font-mono text-xs" : "break-words"}>{value}</dd></div>;
}
