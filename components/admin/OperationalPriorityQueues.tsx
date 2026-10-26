import Link from "next/link";
import type { DashboardQueueItem } from "@/lib/global-admin-dashboard/contracts";
import { groupOperationalQueues } from "@/lib/global-admin-dashboard/priority-queues";

export function OperationalPriorityQueues({ queues }: { queues: readonly DashboardQueueItem[] }) {
  const areas = groupOperationalQueues(queues);
  return (
    <section className="mt-6 min-w-0" aria-labelledby="operational-priorities-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="operational-priorities-title" className="text-lg font-semibold">Prioritas Operasional</h2>
          <p className="mt-1 text-sm text-[var(--gad-muted)]">Pilih antrean untuk melihat detail dan tindakan yang tersedia.</p>
        </div>
        <Link href="/admin/order-tasks" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--gad-border)] px-4 text-sm font-semibold">Lihat semua tugas</Link>
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        {areas.map((area) => (
          <section key={area.key} aria-labelledby={`operational-priority-${area.key}`} className="min-w-0 rounded-lg border border-[var(--gad-border)] bg-[var(--gad-surface)] p-4">
            <h3 id={`operational-priority-${area.key}`} className="text-base font-semibold">{area.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--gad-muted)]">{area.description}</p>
            {area.queues.length ? (
              <ul className="mt-4 grid gap-3">
                {area.queues.map((queue) => (
                  <li key={queue.key} className="min-w-0 rounded-lg border border-[var(--gad-border)] p-3">
                    <h4 className="break-words text-sm font-semibold">{queue.label}</h4>
                    <p className="mt-2 text-xl font-semibold">{new Intl.NumberFormat("id-ID").format(queue.count)}</p>
                    {queue.href ? (
                      <Link href={queue.href} aria-label={`${queue.actionLabel}: ${queue.label}`} className="mt-1 inline-flex min-h-11 max-w-full items-center break-words text-sm font-semibold underline underline-offset-4">{queue.actionLabel}</Link>
                    ) : <p className="mt-3 text-sm text-[var(--gad-muted)]">Tindakan belum tersedia</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 text-sm leading-6 text-[var(--gad-muted)]">{area.emptyMessage}</p>}
          </section>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--gad-muted)]">Satu pesanan dapat muncul pada beberapa antrean. Jumlah antrean tidak dijumlahkan sebagai total pesanan.</p>
    </section>
  );
}
