"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminGuidedOrderFlow } from "@/components/admin/AdminGuidedOrderFlow";
import { AdminOrderSectionBoundary } from "@/components/admin/AdminOrderSectionBoundary";
import { CommerceOrderOperations } from "@/components/admin/CommerceOrderOperations";
import { CustomerOrderHistory } from "@/components/admin/CustomerOrderHistory";
import { PaymentTrackingManager } from "@/components/admin/PaymentTrackingManager";
import { RepeatOrderDialog } from "@/components/admin/RepeatOrderDialog";
import { OrderTrackingLinkManager } from "@/components/admin/OrderTrackingLinkManager";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { CarrierTrackingActions } from "@/components/tracking/CarrierTrackingActions";
import { adminOrderCompatibilityWarning, resolveAdminOrderWorkspaceKind } from "@/lib/admin-order-detail";
import { phase13ApiFetch } from "@/lib/admin-phase13-api";
import type {
  AdminOrderDetailReadModel,
  AdminOrderDomainSummary,
  AdminOrderFulfillmentSummary,
  AdminOrderPaymentSummary,
  AdminOrderQualityControlSummary,
  AdminOrderReadModelItem,
  AdminOrderReadModelOrder
} from "@/lib/admin-orders/contracts";
import type { OrderActiveStageResolution } from "@/lib/order-active-stage";
import { getOrderStatusLabel, getPricingStatusLabel } from "@/lib/ui-language";

type CommandTab = "summary" | "payment" | "operations" | "fulfillment" | "history";

const TAB_LABELS: Array<{ key: CommandTab; label: string }> = [
  { key: "summary", label: "Ringkasan" },
  { key: "payment", label: "Pembayaran" },
  { key: "operations", label: "Barang / Produksi" },
  { key: "fulfillment", label: "Pengiriman / Pickup" },
  { key: "history", label: "Riwayat" }
];

export function OrderCommandCenterAdmin({ orderId }: { orderId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedTab = commandTab(searchParams.get("tab"));
  const [tab, setTab] = useState<CommandTab>(requestedTab ?? "summary");
  const [order, setOrder] = useState<AdminOrderReadModelOrder | null>(null);
  const [items, setItems] = useState<AdminOrderReadModelItem[]>([]);
  const [jobOrder, setJobOrder] = useState<AdminOrderDomainSummary | null>(null);
  const [qualityControl, setQualityControl] = useState<AdminOrderQualityControlSummary | null>(null);
  const [fulfillment, setFulfillment] = useState<AdminOrderFulfillmentSummary | null>(null);
  const [latestPayment, setLatestPayment] = useState<AdminOrderPaymentSummary | null>(null);
  const [activeStage, setActiveStage] = useState<OrderActiveStageResolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError("");

    try {
      const readModel = await phase13ApiFetch<AdminOrderDetailReadModel>(
        `/api/admin/orders/${encodeURIComponent(orderId)}`
      );
      setOrder(readModel.order);
      setItems(readModel.items);
      setJobOrder(readModel.job_order);
      setFulfillment(readModel.fulfillment);
      setLatestPayment(readModel.latest_payment);
      setQualityControl(readModel.quality_control);
      setActiveStage(readModel.active_stage);
      setTab(requestedTab ?? defaultTab(readModel.active_stage));
    } catch {
      setOrder(null);
      setError("Pesanan tidak ditemukan atau belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [orderId, requestedTab]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function selectTab(nextTab: CommandTab) {
    setTab(nextTab);
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", nextTab);
    router.replace(`?${next.toString()}#${nextTab}`, { scroll: false });
  }

  if (loading) return <AdminLoadingState label="Memuat Order Command Center..." />;
  if (!order || !activeStage) {
    return (
      <AdminErrorState
        title="Pesanan tidak ditemukan"
        description={error || "Pesanan mungkin sudah diarsipkan atau tautannya tidak valid."}
        action={<Link href="/admin/orders" className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white">Kembali ke Pesanan</Link>}
      />
    );
  }

  const workspaceKind = resolveAdminOrderWorkspaceKind(order.custom_project_snapshot);
  const compatibilityWarning = adminOrderCompatibilityWarning(order.status);
  const pricingIsFinal = order.pricing_status === "final";
  const canOpenPayment = pricingIsFinal && (workspaceKind === "standard" || order.custom_quote_status === "locked");
  const canOpenFulfillment = Boolean(fulfillment)
    || (workspaceKind === "standard" && order.payment_production_eligible);

  return (
    <main className="grid min-w-0 gap-6 text-brand-charcoal">
      <AdminPageHeader
        eyebrow="DEBRODER · ORDER COMMAND CENTER"
        title={order.order_number}
        description={`${order.customer_name}${order.company_name ? ` · ${order.company_name}` : ""}`}
        actions={
          <>
            <Link href="/admin/orders" className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">Kembali</Link>
            <Link href={`/admin/orders/${order.id}?view=full`} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">Detail Lengkap</Link>
          </>
        }
      />

      {compatibilityWarning ? (
        <div role="alert" className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Peringatan kompatibilitas order</p>
          <p className="mt-1">{compatibilityWarning}</p>
        </div>
      ) : null}

      {activeStage.warning ? (
        <div role="alert" className="border border-red-300 bg-red-50 p-4 text-sm text-red-950">
          <p className="font-semibold">Peringatan integritas pesanan</p>
          <p className="mt-1">{activeStage.warning}</p>
        </div>
      ) : null}

      <AdminOrderSectionBoundary label="Order Command Center">
        <AdminGuidedOrderFlow
          order={order}
          activeStage={activeStage}
          jobOrder={jobOrder}
          qualityControl={qualityControl}
          fulfillment={fulfillment}
        />
      </AdminOrderSectionBoundary>

      <nav className="sticky top-0 z-20 overflow-x-auto border border-brand-softGray bg-white p-2 shadow-sm" aria-label="Bagian pesanan">
        <div className="flex min-w-max gap-2">
          {TAB_LABELS.map((item) => {
            const disabled = item.key === "payment" && !canOpenPayment;
            return (
              <button
                key={item.key}
                type="button"
                disabled={disabled}
                onClick={() => selectTab(item.key)}
                className={`min-h-11 rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35 ${tab === item.key ? "bg-brand-charcoal text-white" : "border border-brand-softGray bg-white"}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {tab === "summary" ? (
        <section id="summary" className="scroll-mt-24 grid gap-5">
          <section className="border border-brand-softGray bg-white p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Ringkasan</p>
            <h2 className="mt-2 text-2xl font-semibold">Informasi penting pesanan</h2>
            <dl className="mt-6 grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Data label="Tahap aktif" value={activeStage.adminStatusLabel} />
              <Data label="Status order" value={getOrderStatusLabel(order.status)} />
              <Data label="Status pembayaran" value={humanStatus(latestPayment?.status ?? order.payment_status)} />
              <Data label="Status fulfillment" value={fulfillment ? humanStatus(fulfillment.status) : "Belum tersedia"} />
              <Data label="Total" value={pricingIsFinal ? money(order.total_amount) : "Menunggu harga final"} />
              <Data label="Sudah dibayar" value={money(order.payment_effective_total)} />
              <Data label="Sisa pembayaran" value={pricingIsFinal ? money(order.payment_balance) : "Belum berlaku"} />
              <Data label="Metode penyerahan" value={order.delivery_method === "pickup" ? "Ambil di Toko" : "Dikirim"} />
              <Data label="WhatsApp" value={order.customer_phone} />
              <Data label="Email" value={order.customer_email || "-"} />
              <div className="min-w-0 sm:col-span-2"><Data label="Alamat" value={order.shipping_address || "-"} /></div>
            </dl>
          </section>

          <section className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-2xl font-semibold">Produk pesanan</h2>
            <div className="mt-5 divide-y divide-brand-softGray border-y border-brand-softGray">
              {items.map((item) => (
                <article key={item.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{item.product_name}</h3>
                    <p className="mt-1 break-words text-sm text-brand-charcoal/60">{[item.variant_name || item.color, item.size, item.sku, `${item.quantity} pcs`].filter(Boolean).join(" · ")}</p>
                    {item.custom_project_id ? <p className="mt-1 text-xs font-semibold text-[#063d24]">Custom Project · {getPricingStatusLabel(item.pricing_status)}</p> : null}
                    {item.notes ? <p className="mt-2 text-sm text-brand-charcoal/60">{item.notes}</p> : null}
                  </div>
                  <div className="md:text-right"><p className="font-semibold">{money(item.subtotal)}</p><p className="mt-1 text-xs text-brand-charcoal/55">{money(item.unit_price)} / pcs</p></div>
                </article>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {tab === "payment" ? (
        <section id="payment" className="scroll-mt-24 border border-brand-softGray bg-white p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Pembayaran</p>
          <h2 className="mt-2 text-2xl font-semibold">Pemeriksaan pembayaran</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">Bukti pelanggan belum berarti dana terverifikasi. Selesaikan pemeriksaan mutasi pada panel ini.</p>
          <div className="mt-6"><AdminOrderSectionBoundary label="Pembayaran"><PaymentTrackingManager /></AdminOrderSectionBoundary></div>
        </section>
      ) : null}

      {tab === "operations" ? (
        <section id="operations" className="scroll-mt-24 grid gap-5">
          <section className="border border-brand-softGray bg-white p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Barang / Produksi</p>
            <h2 className="mt-2 text-2xl font-semibold">Operasional tahap aktif</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {jobOrder ? <Link href={`/admin/job-orders/${jobOrder.id}`} className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Buka Surat Perintah Kerja</Link> : null}
              {qualityControl ? <Link href={`/admin/quality-control?job_order=${jobOrder?.id ?? ""}`} className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Buka Pemeriksaan Kualitas</Link> : null}
              {workspaceKind === "custom" ? <Link href={`/admin/orders/${order.id}?view=full#custom-pricing`} className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Rincian Custom Lengkap</Link> : null}
            </div>
          </section>
          {order.checkout_source === "public_checkout" ? (
            <AdminOrderSectionBoundary label="Operasional Commerce">
              <CommerceOrderOperations orderId={order.id} onChanged={loadData} />
            </AdminOrderSectionBoundary>
          ) : null}
        </section>
      ) : null}

      {tab === "fulfillment" ? (
        <section id="fulfillment" className="scroll-mt-24 grid gap-5">
          <section className="border border-brand-softGray bg-white p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Pengiriman / Pickup</p>
            <h2 className="mt-2 text-2xl font-semibold">Status penyerahan</h2>
            {fulfillment ? (
              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Data label="Status" value={humanStatus(fulfillment.status)} />
                  <Data label="Metode" value={fulfillment.method === "pickup" ? "Ambil di Toko" : "Pengiriman Kurir"} />
                  <Data label="Kurir" value={fulfillment.courier || "Belum ditetapkan"} />
                  <Data label="Nomor resi" value={fulfillment.tracking_number || "Belum tersedia"} />
                </dl>
                <div className="grid gap-3">
                  <Link href={`/admin/fulfillments/${fulfillment.id}#guided-action`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Buka Tindakan Pengiriman</Link>
                  <CarrierTrackingActions courier={fulfillment.courier} trackingNumber={fulfillment.tracking_number} compact />
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-brand-charcoal/60">{canOpenFulfillment ? "Dokumen fulfillment sedang disiapkan otomatis. Muat ulang setelah syarat operasional terpenuhi." : "Fulfillment belum diperlukan pada tahap ini."}</p>
            )}
          </section>
          <AdminOrderSectionBoundary label="Tautan Pelacakan Pelanggan"><OrderTrackingLinkManager orderId={order.id} /></AdminOrderSectionBoundary>
        </section>
      ) : null}

      {tab === "history" ? (
        <section id="history" className="scroll-mt-24 grid gap-5">
          <AdminOrderSectionBoundary label="Riwayat Pesanan"><CustomerOrderHistory orderId={order.id} /></AdminOrderSectionBoundary>
          {activeStage.isTerminal ? <section className="border border-brand-softGray bg-white p-5"><RepeatOrderDialog orderId={order.id} /></section> : null}
        </section>
      ) : null}
    </main>
  );
}

function commandTab(value: string | null): CommandTab | null {
  return TAB_LABELS.some((item) => item.key === value) ? value as CommandTab : null;
}

function defaultTab(stage: OrderActiveStageResolution): CommandTab {
  if (["payment_pending", "payment_review", "payment_correction", "payment_balance_due"].includes(stage.activeStage)) return "payment";
  if (["ready_to_ship", "shipping", "ready_for_pickup"].includes(stage.activeStage)) return "fulfillment";
  if (["job_order_required", "preparing_goods", "production", "quality_control", "packing", "final_check", "final_check_completed"].includes(stage.activeStage)) return "operations";
  if (stage.isTerminal) return "history";
  return "summary";
}

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function humanStatus(value: string | null | undefined) {
  if (!value) return "Belum tersedia";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Data({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{label}</dt><dd className="mt-2 break-words text-sm font-semibold">{value}</dd></div>;
}
