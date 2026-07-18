import Link from "next/link";
import { formatAdminOrderDateTime } from "@/lib/admin-order-detail";

type DomainRef = { id: string; status: string; updated_at: string | null } | null;

type Props = {
  order: {
    id: string;
    status: string;
    pricing_status: string;
    payment_balance: number;
    payment_effective_total: number;
    payment_production_eligible: boolean;
    checkout_source: string | null;
    whatsapp_confirmed_at: string | null;
  };
  jobOrder: DomainRef;
  qualityControl: (DomainRef & { result?: string | null }) | null;
  fulfillment: DomainRef;
};

const STAGES = [
  "Order Masuk", "Review", "Harga", "Persetujuan", "Pembayaran", "Job Order",
  "Produksi", "Quality Control", "Packing", "Pengiriman / Pickup", "Selesai"
];

export function OrderOperationalWorkspace({ order, jobOrder, qualityControl, fulfillment }: Props) {
  const state = resolveOperationalState(order, jobOrder, qualityControl, fulfillment);
  return (
    <section className="border border-brand-softGray bg-white p-5 sm:p-7" aria-labelledby="operational-workspace-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Pusat Kendali Order</p>
          <h2 id="operational-workspace-title" className="mt-2 text-2xl font-semibold">{state.stage}</h2>
          <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Status canonical: <strong>{order.status}</strong>. Progres diambil dari order dan dokumen operasional server-side.</p>
        </div>
        <div className="grid min-w-0 gap-2 text-sm lg:w-[360px]">
          <StatusLine label="Hambatan" value={state.blocker} tone={state.blocker === "Tidak ada" ? "ok" : "warning"} />
          <StatusLine label="Aksi berikutnya" value={state.nextLabel} tone="normal" />
        </div>
      </div>

      <ol className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {STAGES.map((stage, index) => {
          const current = index === state.index;
          const done = index < state.index;
          return <li key={stage} className={`border p-3 text-xs font-semibold ${current ? "border-brand-green bg-emerald-50 text-brand-green" : done ? "border-brand-softGray bg-brand-offWhite" : "border-brand-softGray text-brand-charcoal/45"}`} aria-current={current ? "step" : undefined}><span className="mr-2">{done ? "✓" : index + 1}</span>{stage}</li>;
        })}
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={state.nextHref} className="inline-flex min-h-11 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white">{state.nextLabel}</Link>
        {state.correctionHref ? <Link href={state.correctionHref} className="inline-flex min-h-11 items-center rounded-full border border-brand-charcoal px-5 text-sm font-semibold">Koreksi Tahap</Link> : null}
        <a href="#order-history" className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Lihat Histori</a>
      </div>

      <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
        <DomainCard label="Job Order" value={jobOrder?.status ?? "Belum dibuat"} updatedAt={jobOrder?.updated_at} />
        <DomainCard label="Quality Control" value={qualityControl ? `${qualityControl.status}${qualityControl.result ? ` · ${qualityControl.result}` : ""}` : "Belum tersedia"} updatedAt={qualityControl?.updated_at ?? null} />
        <DomainCard label="Fulfillment" value={fulfillment?.status ?? "Belum dibuat"} updatedAt={fulfillment?.updated_at} />
      </div>
    </section>
  );
}

function resolveOperationalState(order: Props["order"], job: DomainRef, qc: Props["qualityControl"], fulfillment: DomainRef) {
  const terminal = new Set(["completed", "selesai", "picked_up", "delivered"]);
  if (terminal.has(order.status) || ["delivered", "picked_up"].includes(fulfillment?.status ?? "")) return result(10, "Selesai", "Tidak ada", "Lihat Histori", "#order-history", null);
  if (["shipped", "in_transit", "ready_to_ship", "ready_for_pickup"].includes(fulfillment?.status ?? "")) return result(9, "Pengiriman / Pickup", "Tidak ada", "Buka Fulfillment", `/admin/fulfillments/${fulfillment?.id}`, `/admin/fulfillments/${fulfillment?.id}`);
  if (["preparing", "packing", "problem"].includes(fulfillment?.status ?? "")) return result(8, "Packing", fulfillment?.status === "problem" ? "Fulfillment bermasalah" : "Tidak ada", "Lanjutkan Fulfillment", `/admin/fulfillments/${fulfillment?.id}`, `/admin/fulfillments/${fulfillment?.id}`);
  if (qc && qc.result !== "passed") return result(7, "Quality Control", qc.result === "failed" ? "QC tidak lulus" : "Menunggu hasil QC", "Buka Quality Control", `/admin/quality-control?job_order=${job?.id ?? ""}`, `/admin/quality-control?job_order=${job?.id ?? ""}`);
  if (job && !["completed", "cancelled"].includes(job.status)) return result(6, "Produksi", job.status === "on_hold" ? "Produksi ditahan" : "Tidak ada", "Buka Job Order", `/admin/job-orders/${job.id}`, `/admin/job-orders/${job.id}`);
  if (order.checkout_source === "public_checkout" && !order.whatsapp_confirmed_at) return result(1, "Review Pesanan", "Pelanggan belum diverifikasi", "Verifikasi Pelanggan", `/admin/orders/${order.id}#commerce`, `/admin/orders/${order.id}#commerce`);
  if (order.pricing_status !== "final") return result(2, "Penetapan Harga", "Harga belum final", "Tinjau Harga", `/admin/orders/${order.id}#custom-pricing`, `/admin/orders/${order.id}#custom-pricing`);
  if (["awaiting_customer_approval"].includes(order.status)) return result(3, "Persetujuan", "Menunggu persetujuan pelanggan", "Pantau Persetujuan", `/admin/orders/${order.id}#commerce`, `/admin/orders/${order.id}#commerce`);
  if (!order.payment_production_eligible) return result(4, "Pembayaran", order.payment_effective_total > 0 ? "Syarat pembayaran belum terpenuhi" : "Menunggu pembayaran", "Periksa Pembayaran", `/admin/orders/${order.id}#payment`, `/admin/orders/${order.id}#payment`);
  if (!job) return result(5, "Job Order", "Job Order belum dibuat", "Buat / Buka Job Order", `/admin/job-orders?order=${order.id}`, `/admin/job-orders?order=${order.id}`);
  return result(1, "Review Pesanan", "Tidak ada", "Lanjutkan Review", `/admin/orders/${order.id}#order-data`, `/admin/orders/${order.id}#order-data`);
}

function result(index: number, stage: string, blocker: string, nextLabel: string, nextHref: string, correctionHref: string | null) { return { index, stage, blocker, nextLabel, nextHref, correctionHref }; }
function StatusLine({ label, value, tone }: { label: string; value: string; tone: "ok" | "warning" | "normal" }) { return <div className={`border p-3 ${tone === "warning" ? "border-amber-300 bg-amber-50" : tone === "ok" ? "border-emerald-200 bg-emerald-50" : "border-brand-softGray"}`}><span className="text-xs text-brand-charcoal/50">{label}</span><p className="mt-1 font-semibold">{value}</p></div>; }
function DomainCard({ label, value, updatedAt }: { label: string; value: string; updatedAt: string | null | undefined }) { return <div className="border border-brand-softGray p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-charcoal/45">{label}</p><p className="mt-2 font-semibold">{value}</p>{updatedAt ? <p className="mt-1 text-xs text-brand-charcoal/50">Diperbarui {formatAdminOrderDateTime(updatedAt, { timeZone: "Asia/Makassar" })}</p> : null}</div>; }
