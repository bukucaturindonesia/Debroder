"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { operationsApiFetch } from "@/lib/admin-operations-api";
import { orderTaskStatusLabel, orderTaskTypeLabel, type OrderTaskRow } from "@/lib/order-tasks";

type TaskWithOrder = OrderTaskRow & {
  escalated_at: string | null;
  orders: { order_number: string; customer_name: string; status: string; payment_status: string; delivery_method: string } | null;
};
type Response = { tasks: TaskWithOrder[]; counts: { active: number; overdue: number; mine: number }; role: string; userId: string };

export function OrderTaskInboxAdmin() {
  const [rows, setRows] = useState<TaskWithOrder[]>([]);
  const [counts, setCounts] = useState({ active: 0, overdue: 0, mine: 0 });
  const [scope, setScope] = useState<"active" | "resolved">("active");
  const [assigned, setAssigned] = useState<"all" | "me" | "unassigned">("all");
  const [priority, setPriority] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope });
      if (assigned !== "all") params.set("assigned", assigned);
      if (priority !== "all") params.set("priority", priority);
      if (search.trim()) params.set("search", search.trim());
      const payload = await operationsApiFetch<Response>(`/api/admin/order-tasks?${params}`);
      setRows(payload.tasks);
      setCounts(payload.counts);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Tugas belum dapat dimuat." });
    } finally {
      setLoading(false);
    }
  }, [assigned, priority, scope, search]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);

  async function action(task: TaskWithOrder, value: "acknowledge" | "start" | "block" | "resolve" | "assign") {
    const reason = value === "block" || value === "resolve" ? window.prompt(value === "block" ? "Alasan tugas terhambat:" : "Catatan penyelesaian:") : null;
    if ((value === "block" || value === "resolve") && (!reason || reason.trim().length < 3)) return;
    setWorking(task.id);
    try {
      await operationsApiFetch(`/api/admin/order-tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: value, reason, assignedTo: value === "assign" ? "self" : null })
      });
      setNotice({ type: "success", text: "Tugas berhasil diperbarui." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Tugas belum dapat diperbarui." });
    } finally { setWorking(""); }
  }

  const grouped = useMemo(() => [...rows].sort((a, b) => taskRank(a) - taskRank(b)), [rows]);

  return <main className="grid gap-6 text-brand-charcoal">
    <AdminPageHeader eyebrow="OPERASIONAL" title="Kotak Tugas" description="Satu antrean resmi untuk handoff pelanggan–admin. Tugas ditampilkan berdasarkan role, penugasan, prioritas, dan SLA." />
    {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}
    <section className="grid gap-3 sm:grid-cols-3">
      <Summary label="Tugas Aktif" value={counts.active} />
      <Summary label="Terlambat" value={counts.overdue} danger />
      <Summary label="Tugas Saya" value={counts.mine} />
    </section>
    <section className="grid gap-3 border border-brand-softGray bg-white p-4 lg:grid-cols-[1fr_auto_auto_auto]">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tugas" className="min-h-11 border border-brand-softGray px-4" />
      <select value={scope} onChange={(e) => setScope(e.target.value as "active" | "resolved")} className="min-h-11 border border-brand-softGray bg-white px-3"><option value="active">Aktif</option><option value="resolved">Selesai</option></select>
      <select value={assigned} onChange={(e) => setAssigned(e.target.value as typeof assigned)} className="min-h-11 border border-brand-softGray bg-white px-3"><option value="all">Semua penugasan</option><option value="me">Tugas saya</option><option value="unassigned">Belum diambil</option></select>
      <select value={priority} onChange={(e) => setPriority(e.target.value)} className="min-h-11 border border-brand-softGray bg-white px-3"><option value="all">Semua prioritas</option><option value="urgent">Mendesak</option><option value="high">Tinggi</option><option value="normal">Normal</option><option value="low">Rendah</option></select>
    </section>
    {loading ? <AdminLoadingState label="Memuat kotak tugas..." /> : grouped.length ? <section className="grid gap-4">{grouped.map((task) => {
      const overdue = Boolean(task.due_at && new Date(task.due_at).getTime() < Date.now() && !task.resolved_at);
      return <article key={task.id} className={`border bg-white p-5 ${overdue ? "border-red-300" : "border-brand-softGray"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge text={orderTaskTypeLabel(task.task_type)} /><Badge text={task.priority === "urgent" ? "Mendesak" : task.priority} danger={task.priority === "urgent" || overdue} /></div><h2 className="mt-3 text-lg font-semibold">{task.title}</h2><p className="mt-1 text-sm text-brand-charcoal/60">{task.orders?.order_number} · {task.orders?.customer_name}</p></div><div className="text-right text-xs text-brand-charcoal/55"><p>{orderTaskStatusLabel(task.status)}</p><p className={overdue ? "mt-1 font-semibold text-red-700" : "mt-1"}>{task.due_at ? `${overdue ? "Terlambat · " : "Batas · "}${dateTime(task.due_at)}` : "Tanpa SLA"}</p></div></div>
        <p className="mt-4 text-sm leading-6 text-brand-charcoal/70">{task.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {task.related_path ? <Link href={task.related_path} className="inline-flex min-h-10 items-center rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white">Buka Pesanan</Link> : null}
          {task.status === "open" ? <button data-admin-mutation="true" disabled={working===task.id} onClick={() => void action(task,"acknowledge")} className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold">Terima Tugas</button> : null}
          {task.status === "open" && !task.assigned_to ? <button data-admin-mutation="true" disabled={working===task.id} onClick={() => void action(task,"assign")} className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold">Ambil Tugas</button> : null}
          {["open","acknowledged","blocked"].includes(task.status) ? <button data-admin-mutation="true" disabled={working===task.id} onClick={() => void action(task,"start")} className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold">Mulai</button> : null}
          {["open","acknowledged","in_progress"].includes(task.status) ? <button data-admin-mutation="true" disabled={working===task.id} onClick={() => void action(task,"block")} className="min-h-10 rounded-full border border-amber-300 px-4 text-xs font-semibold text-amber-800">Tandai Terhambat</button> : null}
          {["open","acknowledged","in_progress","blocked"].includes(task.status) ? <button data-admin-mutation="true" disabled={working===task.id} onClick={() => void action(task,"resolve")} className="min-h-10 rounded-full bg-brand-green px-4 text-xs font-semibold text-white">Selesaikan</button> : null}
        </div>
      </article>;
    })}</section> : <AdminEmptyState title="Tidak ada tugas pada antrean ini" description="Tugas baru akan muncul otomatis ketika pelanggan atau Admin menghasilkan handoff berikutnya." />}
  </main>;
}

function taskRank(task: TaskWithOrder) { const p = { urgent: 0, high: 1, normal: 2, low: 3 }[task.priority] ?? 4; return (task.due_at && new Date(task.due_at).getTime() < Date.now() ? -10 : 0) + p; }
function Summary({ label, value, danger }: { label: string; value: number; danger?: boolean }) { return <div className={`border bg-white p-5 ${danger && value ? "border-red-300" : "border-brand-softGray"}`}><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{label}</p><p className={`mt-2 text-3xl font-semibold ${danger && value ? "text-red-700" : ""}`}>{value}</p></div>; }
function Badge({ text, danger }: { text: string; danger?: boolean }) { return <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${danger ? "border-red-200 bg-red-50 text-red-700" : "border-brand-softGray bg-brand-offWhite"}`}>{text}</span>; }
function dateTime(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(value)); }
