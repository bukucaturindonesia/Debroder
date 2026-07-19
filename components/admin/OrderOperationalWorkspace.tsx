import Link from "next/link";
import { formatAdminOrderDateTime } from "@/lib/admin-order-detail";
import { FULFILLMENT_STATUS_LABELS } from "@/lib/fulfillments";
import { JOB_ORDER_STATUS_LABELS } from "@/lib/job-orders";
import { QC_RESULT_LABELS, QC_WORKFLOW_LABELS } from "@/lib/quality-control";
import { getOrderStatusLabel } from "@/lib/ui-language";

type DomainRef = { id: string; status: string; updated_at: string | null } | null;

type Props = {
  order: {
    id: string;
    status: string;
    pricing_status: string;
    payment_balance: number;
    payment_effective_total: number;
    payment_production_eligible: boolean;
    payment_method: string | null;
    payment_status: string;
    checkout_source: string | null;
    whatsapp_confirmed_at: string | null;
  };
  jobOrder: DomainRef;
  qualityControl: (DomainRef & { result?: string | null }) | null;
  fulfillment: DomainRef;
};

const STAGES = [
  "Pesanan Masuk", "Pemeriksaan", "Penetapan Harga", "Persetujuan", "Pembayaran", "Surat Perintah Kerja",
  "Produksi", "Pemeriksaan Kualitas", "Pengemasan", "Pengiriman / Ambil di Toko", "Selesai"
];

const READY_STOCK_STAGES = [
  "Pesanan Masuk", "Pemeriksaan", "Penetapan Harga", "Persetujuan", "Pembayaran", "Persiapan",
  "Pemeriksaan Barang", "Pengemasan", "Pemeriksaan Akhir", "Pengiriman / Ambil di Toko", "Selesai"
];

export function OrderOperationalWorkspace({ order, jobOrder, qualityControl, fulfillment }: Props) {
  const state = resolveOperationalState(order, jobOrder, qualityControl, fulfillment);
  const stages = order.checkout_source === "public_checkout" ? READY_STOCK_STAGES : STAGES;
  return (
    <section className="border border-brand-softGray bg-white p-5 sm:p-7" aria-labelledby="operational-workspace-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Pusat Kendali Pesanan</p>
          <h2 id="operational-workspace-title" className="mt-2 text-2xl font-semibold">{state.stage}</h2>
          <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Status pesanan: <strong>{getOrderStatusLabel(order.status)}</strong>. Progres mengikuti data pesanan dan dokumen operasional terbaru.</p>
        </div>
        <div className="grid min-w-0 gap-2 text-sm lg:w-[360px]">
          <StatusLine label="Hambatan" value={state.blocker} tone={state.blocker === "Tidak ada" ? "ok" : "warning"} />
          <StatusLine label="Aksi berikutnya" value={state.nextLabel} tone="normal" />
        </div>
      </div>

      <ol className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {stages.map((stage, index) => {
          const current = index === state.index;
          const done = index < state.index;
          return <li key={stage} className={`border p-3 text-xs font-semibold ${current ? "border-brand-green bg-emerald-50 text-brand-green" : done ? "border-brand-softGray bg-brand-offWhite" : "border-brand-softGray text-brand-charcoal/45"}`} aria-current={current ? "step" : undefined}><span className="mr-2">{done ? "✓" : index + 1}</span>{stage}</li>;
        })}
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={state.nextHref} className="inline-flex min-h-11 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white">{state.nextLabel}</Link>
        {state.correctionHref ? <Link href={state.correctionHref} className="inline-flex min-h-11 items-center rounded-full border border-brand-charcoal px-5 text-sm font-semibold">Koreksi Tahap</Link> : null}
        <a href="#order-history" className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Lihat Riwayat</a>
      </div>

      <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
        <DomainCard label="Surat Perintah Kerja" value={jobOrder ? labelFromMap(jobOrder.status, JOB_ORDER_STATUS_LABELS) : "Belum dibuat"} updatedAt={jobOrder?.updated_at} />
        <DomainCard label="Pemeriksaan Kualitas" value={qualityControl ? `${labelFromMap(qualityControl.status, QC_WORKFLOW_LABELS)}${qualityControl.result ? ` · ${labelFromMap(qualityControl.result, QC_RESULT_LABELS)}` : ""}` : "Belum tersedia"} updatedAt={qualityControl?.updated_at ?? null} />
        <DomainCard label="Pengiriman" value={fulfillment ? labelFromMap(fulfillment.status, FULFILLMENT_STATUS_LABELS) : "Belum dibuat"} updatedAt={fulfillment?.updated_at} />
      </div>
    </section>
  );
}

function resolveOperationalState(order: Props["order"], job: DomainRef, qc: Props["qualityControl"], fulfillment: DomainRef) {
  const readyStock = order.checkout_source === "public_checkout";
  const terminal = new Set(["completed", "selesai", "picked_up", "delivered"]);
  if (terminal.has(order.status) || ["delivered", "picked_up"].includes(fulfillment?.status ?? "")) return result(10, "Selesai", "Tidak ada", "Lihat Riwayat", "#order-history", null);
  if (["shipped", "in_transit", "ready_to_ship", "ready_for_pickup"].includes(fulfillment?.status ?? "")) return result(9, "Pengiriman / Ambil di Toko", "Tidak ada", "Buka Pengiriman", `/admin/fulfillments/${fulfillment?.id}`, `/admin/fulfillments/${fulfillment?.id}`);
  if (readyStock && fulfillment?.status === "preparing") return result(5, "Persiapan & Pemeriksaan Barang", "Tidak ada", "Lanjutkan Persiapan", `/admin/fulfillments/${fulfillment.id}`, `/admin/fulfillments/${fulfillment.id}`);
  if (["preparing", "packing", "problem"].includes(fulfillment?.status ?? "")) return result(8, readyStock ? "Pengemasan & Pemeriksaan Akhir" : "Pengemasan", fulfillment?.status === "problem" ? "Pengiriman bermasalah" : "Tidak ada", "Lanjutkan Pengiriman", `/admin/fulfillments/${fulfillment?.id}`, `/admin/fulfillments/${fulfillment?.id}`);
  if (qc && qc.result !== "passed") return result(7, "Pemeriksaan Kualitas", qc.result === "failed" ? "Tidak lulus pemeriksaan kualitas" : "Menunggu hasil pemeriksaan kualitas", "Buka Pemeriksaan Kualitas", `/admin/quality-control?job_order=${job?.id ?? ""}`, `/admin/quality-control?job_order=${job?.id ?? ""}`);
  if (job && !["completed", "cancelled"].includes(job.status)) return result(6, "Produksi", job.status === "on_hold" ? "Produksi ditahan" : "Tidak ada", "Buka Surat Perintah Kerja", `/admin/job-orders/${job.id}`, `/admin/job-orders/${job.id}`);
  if (order.checkout_source === "public_checkout" && !order.whatsapp_confirmed_at) return result(1, "Pemeriksaan Pesanan", "Pelanggan belum diverifikasi", "Verifikasi Pelanggan", `/admin/orders/${order.id}#commerce`, `/admin/orders/${order.id}#commerce`);
  if (order.pricing_status !== "final") return result(2, "Penetapan Harga", "Harga belum final", "Tinjau Harga", `/admin/orders/${order.id}#custom-pricing`, `/admin/orders/${order.id}#custom-pricing`);
  if (["awaiting_customer_approval"].includes(order.status)) return result(3, "Persetujuan", "Menunggu persetujuan pelanggan", "Pantau Persetujuan", `/admin/orders/${order.id}#commerce`, `/admin/orders/${order.id}#commerce`);
  if (readyStock && order.payment_method === "pay_at_store" && !fulfillment) return result(5, "Persiapan & Pemeriksaan Barang", "Pembayaran diterima saat pickup", "Buat Dokumen Fulfillment", `/admin/orders/${order.id}#commerce`, `/admin/orders/${order.id}#commerce`);
  if (!order.payment_production_eligible) return result(4, "Pembayaran", order.payment_effective_total > 0 ? "Syarat pembayaran belum terpenuhi" : "Menunggu pembayaran", "Periksa Pembayaran", `/admin/orders/${order.id}#payment`, `/admin/orders/${order.id}#payment`);
  if (readyStock && !fulfillment) return result(5, "Persiapan & Pemeriksaan Barang", "Dokumen fulfillment belum dibuat", "Buat Dokumen Fulfillment", `/admin/orders/${order.id}#commerce`, `/admin/orders/${order.id}#commerce`);
  if (!job) return result(5, "Surat Perintah Kerja", "Surat perintah kerja belum dibuat", "Buat Surat Perintah Kerja", `/admin/job-orders?order=${order.id}`, `/admin/job-orders?order=${order.id}`);
  return result(1, "Pemeriksaan Pesanan", "Tidak ada", "Lanjutkan Pemeriksaan", `/admin/orders/${order.id}#order-data`, `/admin/orders/${order.id}#order-data`);
}

function result(index: number, stage: string, blocker: string, nextLabel: string, nextHref: string, correctionHref: string | null) { return { index, stage, blocker, nextLabel, nextHref, correctionHref }; }
function StatusLine({ label, value, tone }: { label: string; value: string; tone: "ok" | "warning" | "normal" }) { return <div className={`border p-3 ${tone === "warning" ? "border-amber-300 bg-amber-50" : tone === "ok" ? "border-emerald-200 bg-emerald-50" : "border-brand-softGray"}`}><span className="text-xs text-brand-charcoal/50">{label}</span><p className="mt-1 font-semibold">{value}</p></div>; }
function DomainCard({ label, value, updatedAt }: { label: string; value: string; updatedAt: string | null | undefined }) { return <div className="border border-brand-softGray p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-charcoal/45">{label}</p><p className="mt-2 font-semibold">{value}</p>{updatedAt ? <p className="mt-1 text-xs text-brand-charcoal/50">Diperbarui {formatAdminOrderDateTime(updatedAt, { timeZone: "Asia/Makassar" })}</p> : null}</div>; }
function labelFromMap(value: string, labels: Readonly<Record<string, string>>) { return labels[value] || "Status belum dikenali"; }
