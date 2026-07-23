import Link from "next/link";
import { buildCompactOrderJourney, buildOrderJourney } from "@/lib/order-journey";
import type { OrderActiveStageResolution, OrderPrimaryAction } from "@/lib/order-active-stage";

export type GuidedOrderDomain = {
  id: string;
  status: string;
  updated_at?: string | null;
};

type Props = {
  order: {
    id: string;
    order_number: string;
    status: string;
    delivery_method: string;
    payment_status: string;
    payment_method: string | null;
  };
  activeStage: OrderActiveStageResolution;
  jobOrder: GuidedOrderDomain | null;
  qualityControl: (GuidedOrderDomain & { result?: string | null }) | null;
  fulfillment: (GuidedOrderDomain & {
    method?: string;
    final_verified_at?: string | null;
    tracking_number?: string | null;
    courier?: string | null;
  }) | null;
};

const ACTION_LABELS: Record<Exclude<OrderPrimaryAction, null>, string> = {
  verify_whatsapp: "Buka Verifikasi WhatsApp",
  review_order: "Periksa Pesanan Sekarang",
  set_shipping_quote: "Tetapkan Ongkir Sekarang",
  prepare_quote: "Siapkan Penawaran Harga",
  approve_quote: "Menunggu Persetujuan Pelanggan",
  approve_total: "Menunggu Persetujuan Pelanggan",
  open_payment: "Buka Pembayaran",
  review_payment: "Periksa Pembayaran Sekarang",
  resubmit_payment: "Menunggu Perbaikan Pelanggan",
  create_job_order: "Buat Surat Perintah Kerja",
  prepare_goods: "Lanjutkan Persiapan Barang",
  run_production: "Buka Proses Produksi",
  run_quality_control: "Buka Pemeriksaan Kualitas",
  pack_order: "Lanjutkan Pengemasan",
  run_final_check: "Lakukan Pengecekan Akhir",
  dispatch_order: "Siapkan Penyerahan",
  handover_pickup: "Konfirmasi Serah Terima",
  contact_admin: "Lihat Penyelesaian Pesanan",
  track_only: "Lihat Riwayat Pesanan"
};

export function AdminGuidedOrderFlow({ order, activeStage, jobOrder, qualityControl, fulfillment }: Props) {
  const fulfillmentMethod = fulfillment?.method ?? order.delivery_method;
  const compactJourney = buildCompactOrderJourney({ stage: activeStage, fulfillmentMethod });
  const detailedJourney = buildOrderJourney({ stage: activeStage, fulfillmentMethod });
  const action = resolveAction(order.id, activeStage.primaryAction, jobOrder?.id, fulfillment?.id);
  const terminal = activeStage.isTerminal;
  const terminalPaymentAction = terminal && ["pending", "pending_verification", "menunggu_verifikasi", "rejected", "ditolak"].includes(order.payment_status)
    ? { href: `/admin/orders/${order.id}?tab=payment#payment`, label: "Selesaikan Pemeriksaan Pembayaran", shortLabel: "Periksa Pembayaran" }
    : null;
  const visibleAction = terminalPaymentAction ?? action;

  return (
    <section id="guided-workflow" className="scroll-mt-24 border border-brand-softGray bg-white" aria-labelledby="guided-workflow-title">
      <div className="p-5 sm:p-7">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-start">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">Order Command Center</p>
            <p className="mt-3 text-sm font-semibold text-brand-charcoal/55">Tahap saat ini</p>
            <h2 id="guided-workflow-title" className="mt-1 break-words text-2xl font-semibold sm:text-3xl">{activeStage.adminStatusLabel}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-charcoal/65">{adminInstruction(activeStage)}</p>

            {activeStage.blockingReason || activeStage.warning ? (
              <div className="mt-5 border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Yang masih harus diselesaikan</p>
                <p className="mt-1 leading-6">{activeStage.blockingReason || activeStage.warning}</p>
              </div>
            ) : null}

            <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
              {visibleAction && (!terminal || terminalPaymentAction) ? (
                <Link href={visibleAction.href} className="inline-flex min-h-12 min-w-0 items-center justify-center rounded-full bg-brand-charcoal px-6 text-center text-sm font-semibold text-white transition hover:bg-black/75">
                  {visibleAction.label}
                </Link>
              ) : null}
              <Link href={`/admin/orders/${order.id}?view=full`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-brand-softGray px-6 text-sm font-semibold">
                Buka Detail Lengkap
              </Link>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Info label="Penanggung jawab" value={adminResponsibility(activeStage)} />
            <Info label="Berikutnya" value={activeStage.nextStage} />
            <Info label="Pembayaran" value={humanStatus(order.payment_status)} />
            <Info label="Fulfillment" value={fulfillment ? humanStatus(fulfillment.status) : "Belum tersedia"} />
          </div>
        </div>

        <ol className="mt-7 grid gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Tahap utama pesanan admin">
          {compactJourney.map((step) => {
            const current = step.state === "current" || step.state === "stopped";
            return (
              <li key={step.id} className={`min-w-0 border p-3 ${current ? "border-brand-charcoal bg-brand-offWhite" : "border-brand-softGray bg-white"}`} aria-current={current ? "step" : undefined}>
                <div className="flex items-center gap-2">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${step.state === "done" ? "bg-emerald-100 text-emerald-900" : current ? "bg-brand-charcoal text-white" : "bg-brand-offWhite text-brand-charcoal/45"}`}>
                    {step.state === "done" ? "✓" : step.position}
                  </span>
                  <p className="break-words text-xs font-semibold">{step.label}</p>
                </div>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-charcoal/45">
                  {step.state === "done" ? "Selesai" : step.state === "current" ? "Sedang Berjalan" : step.state === "stopped" ? "Dihentikan" : step.state === "skipped" ? "Tidak Dilanjutkan" : "Berikutnya"}
                </p>
              </li>
            );
          })}
        </ol>

        <details className="group mt-5 border border-brand-softGray bg-brand-offWhite p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
            Lihat seluruh perjalanan dan domain operasional
            <span className="text-xl leading-none transition group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p className="mt-2 text-xs leading-5 text-brand-charcoal/55">Semua tahap tetap terlihat dan tersusun di rincian perjalanan. Halaman utama hanya menonjolkan satu tindakan operasional.</p>
          <ol className="mt-4 grid gap-3" aria-label="Urutan proses pesanan admin">
            {detailedJourney.map((step) => {
              const current = step.state === "current" || step.state === "stopped";
              return (
                <li key={step.id} className={`grid min-w-0 gap-3 border p-4 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center ${current ? "border-brand-charcoal bg-white" : "border-brand-softGray bg-white/75"}`} aria-current={current ? "step" : undefined}>
                  <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold ${step.state === "done" ? "bg-emerald-100 text-emerald-900" : current ? "bg-brand-charcoal text-white" : "bg-brand-offWhite text-brand-charcoal/45"}`}>
                    {step.state === "done" ? "✓" : step.position}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{step.label}</p>
                    <p className="mt-1 break-words text-sm leading-6 text-brand-charcoal/60">{step.description}</p>
                  </div>
                  <span className="w-fit rounded-full bg-brand-offWhite px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-charcoal/55">
                    {step.state === "done" ? "Selesai" : step.state === "current" ? "Saat Ini" : step.state === "stopped" ? "Dihentikan" : step.state === "skipped" ? "Tidak Dilanjutkan" : "Berikutnya"}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-3">
            <Domain label="Surat Perintah Kerja" value={jobOrder ? humanStatus(jobOrder.status) : "Belum diperlukan"} />
            <Domain label="Pemeriksaan Kualitas" value={qualityControl ? humanStatus(qualityControl.result ?? qualityControl.status) : "Belum diperlukan"} />
            <Domain label="Pengiriman / Pickup" value={fulfillment ? humanStatus(fulfillment.status) : activeStage.lifecycleKind === "ready_stock" && !terminal ? "Dibuat otomatis saat syarat terpenuhi" : "Belum diperlukan"} />
          </div>
        </details>
      </div>
    </section>
  );
}

function resolveAction(orderId: string, action: OrderPrimaryAction, jobOrderId?: string, fulfillmentId?: string) {
  if (!action) return null;
  const fulfillmentHref = fulfillmentId ? `/admin/fulfillments/${fulfillmentId}?focus=${action}#guided-action` : `/admin/orders/${orderId}?tab=operations#operations`;
  const hrefs: Record<Exclude<OrderPrimaryAction, null>, string> = {
    verify_whatsapp: `/admin/orders/${orderId}?tab=operations#operations`,
    review_order: `/admin/orders/${orderId}?tab=summary#summary`,
    set_shipping_quote: `/admin/orders/${orderId}?tab=operations#operations`,
    prepare_quote: `/admin/orders/${orderId}?view=full#custom-pricing`,
    approve_quote: `/admin/orders/${orderId}#guided-workflow`,
    approve_total: `/admin/orders/${orderId}#guided-workflow`,
    open_payment: `/admin/orders/${orderId}?tab=payment#payment`,
    review_payment: `/admin/orders/${orderId}?tab=payment#payment`,
    resubmit_payment: `/admin/orders/${orderId}#guided-workflow`,
    create_job_order: jobOrderId ? `/admin/job-orders/${jobOrderId}` : `/admin/job-orders?order=${orderId}`,
    prepare_goods: fulfillmentHref,
    run_production: jobOrderId ? `/admin/job-orders/${jobOrderId}` : `/admin/job-orders?order=${orderId}`,
    run_quality_control: `/admin/quality-control${jobOrderId ? `?job_order=${jobOrderId}` : ""}`,
    pack_order: fulfillmentHref,
    run_final_check: fulfillmentHref,
    dispatch_order: fulfillmentHref,
    handover_pickup: fulfillmentHref,
    contact_admin: `/admin/orders/${orderId}?tab=history#history`,
    track_only: `/admin/orders/${orderId}?tab=history#history`
  };
  return { href: hrefs[action], label: ACTION_LABELS[action], shortLabel: shortAction(action) };
}

function shortAction(action: Exclude<OrderPrimaryAction, null>) {
  return {
    verify_whatsapp: "Buka Verifikasi", review_order: "Buka Pemeriksaan", set_shipping_quote: "Isi Ongkir",
    prepare_quote: "Buka Penawaran", approve_quote: "Pantau", approve_total: "Pantau", open_payment: "Buka Pembayaran",
    review_payment: "Verifikasi", resubmit_payment: "Pantau", create_job_order: "Buat SPK", prepare_goods: "Lanjutkan",
    run_production: "Buka Produksi", run_quality_control: "Buka QC", pack_order: "Lanjutkan", run_final_check: "Periksa",
    dispatch_order: "Siapkan", handover_pickup: "Serahkan", contact_admin: "Lihat", track_only: "Riwayat"
  }[action];
}

function adminInstruction(stage: OrderActiveStageResolution) {
  if (stage.isTerminal) return stage.activeStage === "completed"
    ? "Pesanan telah selesai. Tidak ada tindakan operasional baru. Gunakan riwayat untuk pemeriksaan setelah penjualan."
    : "Pesanan sudah tidak aktif. Jangan melanjutkan produksi, pengemasan, atau pengiriman. Temuan pembayaran yang masih terbuka harus ditutup tanpa mengaktifkan kembali pesanan.";
  if (stage.responsibility === "customer") return `Tidak ada tindakan admin utama saat ini. Pelanggan sedang menyelesaikan tahap ${stage.customerStatusLabel.toLowerCase()}.`;
  return stage.nextStep;
}

function adminResponsibility(stage: OrderActiveStageResolution) {
  if (stage.isTerminal) return "Tidak ada tindakan operasional";
  if (stage.responsibility === "customer") return "Pelanggan";
  if (stage.responsibility === "debroder") return "Tim DEBRODER";
  return "Tidak ada";
}

function humanStatus(value: string | null | undefined) {
  if (!value) return "Belum tersedia";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border border-brand-softGray bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{label}</p><p className="mt-2 break-words text-sm font-semibold">{value}</p></div>;
}

function Domain({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border border-brand-softGray bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-charcoal/45">{label}</p><p className="mt-2 break-words text-sm font-semibold">{value}</p></div>;
}
