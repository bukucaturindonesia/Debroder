"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  JOB_ORDER_PRIORITY_LABELS,
  JOB_ORDER_STATUS_LABELS,
  formatJobOrderDate,
  type JobOrderPriority,
  type JobOrderStatus
} from "@/lib/job-orders";
import { WORK_ITEM_STATUS_LABELS, type WorkItemStatus } from "@/lib/work-items";
import { isWaitingForQc, type ProductionBoardTab } from "@/lib/production";

type JobRow = {
  id: string;
  job_order_number: string;
  status: JobOrderStatus;
  priority: JobOrderPriority;
  target_date: string | null;
  progress_percentage: number;
  order_snapshot: Record<string, unknown>;
  started_at: string | null;
  paused_at: string | null;
  updated_at: string;
};

type WorkRow = {
  id: string;
  job_order_id: string;
  work_item_number: string;
  title: string;
  quantity: number;
  unit: string;
  assigned_to: string | null;
  status: WorkItemStatus;
  target_date: string | null;
};

type ProfileRow = { id: string; email: string | null };

function snapshotOrder(value: Record<string, unknown>) {
  const candidate = value.order;
  return candidate && typeof candidate === "object" && !Array.isArray(candidate)
    ? (candidate as Record<string, unknown>)
    : {};
}

export function ProductionStatusAdmin() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [workItems, setWorkItems] = useState<WorkRow[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<ProductionBoardTab>("active");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    setNotice(null);
    const [jobsResult, workResult, profilesResult] = await Promise.all([
      supabase
        .from("job_orders")
        .select("id,job_order_number,status,priority,target_date,progress_percentage,order_snapshot,started_at,paused_at,updated_at")
        .is("archived_at", null)
        .in("status", ["ready", "released", "in_progress", "on_hold"])
        .order("updated_at", { ascending: false }),
      supabase
        .from("work_items")
        .select("id,job_order_id,work_item_number,title,quantity,unit,assigned_to,status,target_date")
        .is("archived_at", null)
        .neq("status", "cancelled")
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("id,email")
    ]);
    setLoading(false);
    const firstError = jobsResult.error || workResult.error || profilesResult.error;
    if (firstError) {
      setNotice("Ringkasan produksi belum dapat dimuat. Muat ulang halaman atau coba lagi.");
      return;
    }
    setJobs((jobsResult.data || []) as JobRow[]);
    setWorkItems((workResult.data || []) as WorkRow[]);
    const map: Record<string, string> = {};
    for (const profile of (profilesResult.data || []) as ProfileRow[]) {
      map[profile.id] = profile.email?.trim() || "Akun tanpa email";
    }
    setActors(map);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const byJob = useMemo(() => {
    const map: Record<string, WorkRow[]> = {};
    for (const item of workItems) (map[item.job_order_id] ||= []).push(item);
    return map;
  }, [workItems]);

  const counts = useMemo(
    () => ({
      active: jobs.filter((job) => ["released", "in_progress"].includes(job.status)).length,
      ready: jobs.filter((job) => job.status === "ready").length,
      hold: jobs.filter((job) => job.status === "on_hold").length,
      awaiting_qc: jobs.filter((job) =>
        isWaitingForQc((byJob[job.id] || []).map((item) => item.status))
      ).length
    }),
    [byJob, jobs]
  );

  const normalized = query.trim().toLowerCase();
  const visibleJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const statuses = (byJob[job.id] || []).map((item) => item.status);
        const matchesTab =
          tab === "active"
            ? ["released", "in_progress"].includes(job.status)
            : tab === "ready"
              ? job.status === "ready"
              : tab === "hold"
                ? job.status === "on_hold"
                : isWaitingForQc(statuses);
        if (!matchesTab) return false;
        if (!normalized) return true;
        const order = snapshotOrder(job.order_snapshot);
        return [job.job_order_number, order.order_number, order.customer_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      }),
    [byJob, jobs, normalized, tab]
  );

  if (loading) return <AdminLoadingState label="Memuat dashboard produksi..." />;

  return (
    <main className="grid gap-6 text-brand-charcoal">
      <AdminPageHeader
        eyebrow="DEBRODER v1.2 · Phase 9"
        title="Status Produksi"
        description="Pantau Surat Perintah Kerja, progres pekerjaan, pekerjaan tertahan, dan serah-terima ke Pemeriksaan Kualitas."
        actions={
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
          >
            Muat Ulang
          </button>
        }
      />

      {notice ? <AdminAlert type="error">{notice}</AdminAlert> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Produksi Aktif" value={counts.active} />
        <Metric label="Siap Dirilis" value={counts.ready} />
        <Metric label="Ditahan" value={counts.hold} />
        <Metric label="Menunggu QC" value={counts.awaiting_qc} />
      </section>

      <section className="border border-brand-softGray bg-white p-5">
        <div className="flex flex-wrap gap-2">
          {([
            ["active", `Aktif (${counts.active})`],
            ["ready", `Siap Dirilis (${counts.ready})`],
            ["hold", `Ditahan (${counts.hold})`],
            ["awaiting_qc", `Menunggu QC (${counts.awaiting_qc})`]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === value ? "bg-brand-charcoal text-white" : "border border-brand-softGray bg-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari Surat Perintah Kerja, pesanan, atau pelanggan"
          className="mt-4 min-h-11 w-full rounded-lg border border-brand-softGray px-4 text-sm"
        />
      </section>

      {visibleJobs.length ? (
        <section className="grid gap-4">
          {visibleJobs.map((job) => {
            const items = byJob[job.id] || [];
            const order = snapshotOrder(job.order_snapshot);
            const statusCounts = items.reduce<Record<string, number>>((acc, item) => {
              acc[item.status] = (acc[item.status] || 0) + 1;
              return acc;
            }, {});
            const assignees = Array.from(
              new Set(items.map((item) => item.assigned_to && actors[item.assigned_to]).filter(Boolean))
            );
            return (
              <article key={job.id} className="border border-brand-softGray bg-white p-5 sm:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">
                      {JOB_ORDER_STATUS_LABELS[job.status]}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">{job.job_order_number}</h2>
                    <p className="mt-1 text-sm text-brand-charcoal/60">
                      {String(order.order_number || "Pesanan")}
                      {order.customer_name ? ` · ${String(order.customer_name)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/job-orders/${job.id}`} className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white">
                      Buka Job Order
                    </Link>
                    <Link href={`/admin/work-items?job_order=${job.id}`} className="rounded-full border border-brand-softGray px-5 py-2.5 text-sm font-semibold">
                      Pekerjaan
                    </Link>
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-brand-offWhite">
                  <div
                    className="h-full bg-brand-green"
                    style={{ width: `${Math.min(100, Math.max(0, Number(job.progress_percentage || 0)))}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs font-semibold text-brand-charcoal/55">
                  <span>Progress milestone {Number(job.progress_percentage || 0)}%</span>
                  <span>{items.length} pekerjaan</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Data label="Prioritas" value={JOB_ORDER_PRIORITY_LABELS[job.priority]} />
                  <Data label="Target" value={job.target_date || "Belum ditentukan"} />
                  <Data label="Mulai" value={formatJobOrderDate(job.started_at)} />
                  <Data label="Update" value={formatJobOrderDate(job.updated_at)} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <span key={status} className="rounded-full border border-brand-softGray bg-brand-offWhite px-3 py-1.5 text-xs font-semibold">
                      {WORK_ITEM_STATUS_LABELS[status as WorkItemStatus] || "Status pekerjaan belum dikenali"}: {count}
                    </span>
                  ))}
                </div>

                {assignees.length ? (
                  <p className="mt-4 text-xs text-brand-charcoal/55">Penanggung jawab: {assignees.join(", ")}</p>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <AdminEmptyState
          title="Tidak ada produksi pada tampilan ini"
          description="Ubah filter atau pastikan Surat Perintah Kerja dan pekerjaan turunannya telah melewati tahap persiapan."
        />
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-brand-softGray bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
