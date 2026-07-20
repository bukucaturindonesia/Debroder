"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { resolveOrderActiveStageFromServer, type OrderActiveStageResolution } from "@/lib/order-active-stage";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { PaymentTrackingManager } from "@/components/admin/PaymentTrackingManager";
import { RepeatOrderDialog } from "@/components/admin/RepeatOrderDialog";
import { CustomerOrderHistory } from "@/components/admin/CustomerOrderHistory";
import { CommerceOrderOperations } from "@/components/admin/CommerceOrderOperations";
import { OrderTrackingLinkManager } from "@/components/admin/OrderTrackingLinkManager";
import { OrderOperationalWorkspace } from "@/components/admin/OrderOperationalWorkspace";
import { CustomOrderOperationalWorkspace } from "@/components/admin/CustomOrderOperationalWorkspace";
import { AdminGuidedOrderFlow } from "@/components/admin/AdminGuidedOrderFlow";
import { AdminOrderSectionBoundary } from "@/components/admin/AdminOrderSectionBoundary";
import {
  adminOrderCompatibilityWarning,
  resolveAdminOrderWorkspaceKind
} from "@/lib/admin-order-detail";
import {
  getOrderStatusLabel,
  getPricingStatusLabel
} from "@/lib/ui-language";

// Keep the named workspace exports loaded as a React #130 module-integrity guard.
// They are no longer rendered in parallel; AdminGuidedOrderFlow is the only visible cockpit.
[OrderOperationalWorkspace, CustomOrderOperationalWorkspace].forEach((workspace) => {
  if (typeof workspace !== "function") throw new Error("Admin order workspace export tidak valid");
});

type Order = {
  id: string;
  order_number: string;
  quotation_id: string | null;
  customer_name: string;
  company_name: string | null;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: string;
  delivery_method: string;
  customer_notes: string;
  admin_notes: string;
  status: string;
  pricing_status: "final" | "estimated" | "quotation_required";
  custom_quote_status: string | null;
  custom_project_snapshot: unknown;
  subtotal_amount: number;
  total_amount: number;
  payment_required_amount: number | null;
  payment_effective_total: number;
  payment_production_eligible: boolean;
  payment_requirement_met: boolean;
  payment_balance: number;
  payment_method: string | null;
  payment_status: string;
  currency: string;
  converted_at: string | null;
  archived_at: string | null;
  checkout_source: string | null;
  whatsapp_confirmed_at: string | null;
};

type Item = {
  id: string;
  product_name: string;
  variant_name: string | null;
  color: string;
  size: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string;
  config_snapshot: unknown;
  required_services: unknown;
  estimated_total: number | null;
  pricing_status: "final" | "estimated" | "quotation_required";
  custom_project_id: string | null;
  custom_project_item_id: string | null;
};

type SnapshotLine = {
  key: string;
  label: string;
  kind: string;
  quantity: number;
  unitPrice: number | null;
  subtotal: number | null;
  serviceId: string | null;
  serviceSlug: string | null;
  placementName: string | null;
  printSizeName: string | null;
};

type SnapshotItem = {
  id: string;
  productName: string;
  personalization: string | null;
  uploads: Array<{ id: string; fileName: string; mimeType: string; fileSize: number }>;
  selectedServices: Array<{ id: string; packageName: string; serviceId: string; placementId: string | null; printSizeId: string | null; note: string | null; assignedQuantity: number }>;
};

type SnapshotProject = {
  id: string;
  status: string;
  estimatedMinTotal: number | null;
  estimatedMaxTotal: number | null;
  finalTotal: number | null;
  lines: SnapshotLine[];
  items: SnapshotItem[];
};

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function OrderDetailAdmin() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const orderId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [jobOrder, setJobOrder] = useState<{ id: string; status: string; updated_at: string | null } | null>(null);
  const [activeStage, setActiveStage] = useState<OrderActiveStageResolution | null>(null);
  const [qualityControl, setQualityControl] = useState<{ id: string; status: string; result: string | null; updated_at: string | null } | null>(null);
  const [fulfillment, setFulfillment] = useState<{ id: string; method: string; status: string; final_verified_at: string | null; tracking_number: string | null; updated_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [customerNotes, setCustomerNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const workspaceKind = resolveAdminOrderWorkspaceKind(order?.custom_project_snapshot);
  const compatibilityWarning = order ? adminOrderCompatibilityWarning(order.status) : null;
  const hasUnsavedChanges = Boolean(order && editOpen && (
    shippingAddress !== (order.shipping_address || "") ||
    deliveryMethod !== (order.delivery_method || "pickup") ||
    customerNotes !== (order.customer_notes || "") ||
    adminNotes !== (order.admin_notes || "")
  ));

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const interceptLink = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;
      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation(anchor.href);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", interceptLink, true); };
  }, [hasUnsavedChanges]);

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase || !orderId) return;
    setLoading(true);

    const [orderResult, itemResult, jobResult, fulfillmentResult, paymentResult, activeStageResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id,order_number,quotation_id,customer_name,company_name,customer_phone,customer_email,shipping_address,delivery_method,customer_notes,admin_notes,status,pricing_status,custom_quote_status,custom_project_snapshot,subtotal_amount,total_amount,payment_required_amount,payment_effective_total,payment_balance,payment_method,payment_status,payment_production_eligible,payment_requirement_met,currency,converted_at,archived_at,checkout_source,whatsapp_confirmed_at")
        .eq("id", orderId)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("id,product_name,variant_name,color,size,sku,quantity,unit_price,subtotal,notes,config_snapshot,required_services,estimated_total,pricing_status,custom_project_id,custom_project_item_id")
        .eq("order_id", orderId)
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
      supabase.from("job_orders").select("id,status,updated_at").eq("order_id", orderId).is("archived_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("fulfillments").select("id,method,status,final_verified_at,tracking_number,updated_at").eq("order_id", orderId).is("archived_at", null).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("order_payments").select("status,review_outcome,updated_at").eq("order_id", orderId).is("archived_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.rpc("resolve_order_active_stage_v1", { p_order_id: orderId })
    ]);

    setLoading(false);

    if (orderResult.error || !orderResult.data) {
      setOrder(null);
      return;
    }

    const row = orderResult.data as Order;
    setOrder(row);
    setItems((itemResult.data || []) as Item[]);
    const nextJob = jobResult.data as { id: string; status: string; updated_at: string | null } | null;
    setJobOrder(nextJob);
    const nextFulfillment = fulfillmentResult.data as { id: string; method: string; status: string; final_verified_at: string | null; tracking_number: string | null; updated_at: string | null } | null;
    setFulfillment(nextFulfillment);
    let nextQualityControl: { id: string; status: string; result: string | null; updated_at: string | null } | null = null;
    if (nextJob?.id) {
      const qcResult = await supabase.from("qc_records").select("id,status,result,updated_at").eq("job_order_id", nextJob.id).is("archived_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      nextQualityControl = qcResult.data as { id: string; status: string; result: string | null; updated_at: string | null } | null;
    }
    setQualityControl(nextQualityControl);
    setActiveStage(resolveOrderActiveStageFromServer({
      orderId: row.id,
      orderNumber: row.order_number,
      status: row.status,
      paymentStatus: row.payment_status,
      latestPaymentStatus: paymentResult.data?.status ?? null,
      latestPaymentReviewOutcome: paymentResult.data?.review_outcome ?? null,
      fulfillmentStatus: nextFulfillment?.status ?? null,
      fulfillmentMethod: nextFulfillment?.method ?? row.delivery_method,
      paymentMethod: row.payment_method,
      pricingStatus: row.pricing_status,
      customQuoteStatus: row.custom_quote_status,
      isCustom: resolveAdminOrderWorkspaceKind(row.custom_project_snapshot) === "custom",
      whatsappConfirmed: Boolean(row.whatsapp_confirmed_at),
      paymentRequirementMet: row.payment_requirement_met,
      paymentProductionEligible: row.payment_production_eligible,
      paymentEffectiveTotal: row.payment_effective_total,
      hasVerifiedPayment: row.payment_effective_total > 0,
      hasJobOrder: Boolean(nextJob),
      jobOrderStatus: nextJob?.status ?? null,
      qualityControlStatus: nextQualityControl?.result ?? nextQualityControl?.status ?? null,
      finalVerificationCompleted: Boolean(nextFulfillment?.final_verified_at),
      trackingNumber: nextFulfillment?.tracking_number ?? null,
      taskRevision: nextJob?.updated_at ?? paymentResult.data?.updated_at ?? row.status
    }, activeStageResult.error ? null : activeStageResult.data));
    setShippingAddress(row.shipping_address || "");
    setDeliveryMethod(row.delivery_method || "pickup");
    setCustomerNotes(row.customer_notes || "");
    setAdminNotes(row.admin_notes || "");
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (!order || !compatibilityWarning) return;
    console.warn("DEBRODER_ADMIN_ORDER_UNKNOWN_STATE", {
      orderId: order.id,
      status: order.status || null,
      workspaceKind
    });
  }, [compatibilityWarning, order, workspaceKind]);

  async function persistEdit() {
    if (!order || working || order.status !== "baru") return false;
    const supabase = createSupabaseClient();
    if (!supabase) return false;

    setWorking(true);
    const { error } = await supabase.rpc("update_order_delivery_details", {
      p_order_id: order.id,
      p_delivery_method: deliveryMethod,
      p_shipping_address: shippingAddress.trim(),
      p_customer_notes: customerNotes.trim(),
      p_admin_notes: adminNotes.trim()
    });

    setWorking(false);

    if (error) {
      setMessage("Perubahan pesanan gagal disimpan.");
      return false;
    }

    setEditOpen(false);
    setMessage("Perubahan pesanan berhasil disimpan.");
    await loadData();
    return true;
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistEdit();
  }

  async function saveAndNavigate() {
    const target = pendingNavigation;
    if (!target) return;
    if (await persistEdit()) window.location.assign(target);
  }

  async function cancelOrder() {
    if (!order || working || !cancelReason.trim()) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    const { error } = await supabase.rpc("cancel_order_transactional", {
      p_order_id: order.id,
      p_reason: cancelReason.trim()
    });
    setWorking(false);

    if (error) {
      setMessage("Pesanan belum dapat dibatalkan. Periksa status terbaru lalu coba lagi.");
      return;
    }

    setCancelOpen(false);
    setCancelReason("");
    setMessage("Pesanan dibatalkan dan reservasi aktif dilepas secara atomik.");
    await loadData();
  }

  async function archiveOrder() {
    if (!order || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    const { error } = await supabase.rpc("archive_order", {
      p_order_id: order.id,
      p_reason: archiveReason.trim() || null
    });
    setWorking(false);

    if (error) {
      setMessage("Pesanan belum dapat dipindahkan ke arsip. Coba lagi.");
      return;
    }

    router.replace("/admin/orders/archive");
    router.refresh();
  }

  if (loading) return <AdminLoadingState label="Memuat detail pesanan..." />;

  const terminalStatuses = new Set([
    "cancelled",
    "dibatalkan",
    "completed",
    "selesai",
    "expired",
    "picked_up"
  ]);
  const canCancel = !order?.archived_at && !terminalStatuses.has(order?.status || "");
  const canArchive = !order?.archived_at && terminalStatuses.has(order?.status || "");

  if (!order) {
    return (
      <AdminErrorState
        title="Pesanan tidak ditemukan"
        description="Pesanan mungkin sudah dihapus atau tautannya tidak valid."
        action={
          <Link
            href="/admin/orders"
            className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white"
          >
            Kembali ke Pesanan
          </Link>
        }
      />
    );
  }

  const customProjects = parseCustomProjects(order.custom_project_snapshot);
  const pricingIsFinal = order.pricing_status === "final";
  const estimate = projectEstimate(customProjects);
  const canOpenPayment = pricingIsFinal && (workspaceKind === "standard" || order.custom_quote_status === "locked");
  const canOpenJobOrder = Boolean(jobOrder)
    || (workspaceKind === "custom" && order.payment_production_eligible);
  const canOpenFulfillment = Boolean(fulfillment)
    || (workspaceKind === "standard" && order.payment_production_eligible)
    || new Set([
      "ready_for_pickup",
      "ready_to_ship",
      "shipped",
      "picked_up",
      "completed",
      "selesai"
    ]).has(order.status);

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Pesanan Resmi"
          title={order.order_number}
          description={`${order.customer_name}${order.company_name ? ` · ${order.company_name}` : ""}`}
          actions={
            <>
              <Link
                href="/admin/orders"
                className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
              >
                Kembali ke Pesanan
              </Link>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                disabled={order.status !== "baru"}
                className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold disabled:opacity-45"
              >
                Edit Pesanan
              </button>
              {canCancel ? (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex min-h-10 items-center rounded-full border border-red-300 bg-white px-5 text-sm font-semibold text-red-700"
                >
                  Batalkan Pesanan
                </button>
              ) : null}
              {canArchive ? (
                <button
                  type="button"
                  onClick={() => setArchiveOpen(true)}
                  className="inline-flex min-h-10 items-center rounded-full border border-amber-300 bg-white px-5 text-sm font-semibold text-amber-800"
                >
                  Arsipkan
                </button>
              ) : null}
            </>
          }
        />

        {message ? (
          <div className="border border-brand-softGray bg-white p-4 text-sm font-semibold">
            {message}
          </div>
        ) : null}

        {activeStage?.warning ? (
          <div role="alert" className="border border-red-300 bg-red-50 p-4 text-sm text-red-950">
            <p className="font-semibold">Peringatan integritas pesanan</p>
            <p className="mt-1">{activeStage.warning}</p>
          </div>
        ) : null}

        {compatibilityWarning ? (
          <div role="alert" className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Peringatan kompatibilitas order</p>
            <p className="mt-1">{compatibilityWarning}</p>
          </div>
        ) : null}

        {activeStage ? (
          <AdminOrderSectionBoundary label="Alur Kerja Terpandu">
            <AdminGuidedOrderFlow
              order={order}
              activeStage={activeStage}
              jobOrder={jobOrder}
              qualityControl={qualityControl}
              fulfillment={fulfillment}
            />
          </AdminOrderSectionBoundary>
        ) : null}

        <section id="order-details" className="scroll-mt-24 border border-brand-softGray bg-white p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Rincian Pesanan</p>
            <h2 className="mt-2 text-2xl font-semibold">Data pelanggan dan transaksi</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Informasi disusun setelah alur kerja agar admin memahami tindakan utama sebelum membaca rincian teknis.</p>
          </div>
          <dl className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Data label="Tahap Aktif" value={activeStage?.adminStatusLabel ?? getOrderStatusLabel(order.status)} />
          <Data label="Status Order" value={getOrderStatusLabel(order.status)} />
          <Data label="Penanggung Jawab" value={activeStage?.responsibilityLabel ?? "Belum ditentukan"} />
          <Data label="Tugas Aktif" value={activeStage?.adminTaskType ? activeStage.adminStatusLabel : "Tidak ada tugas aktif"} />
          <Data label="Status Harga" value={pricingStatusLabel(order.pricing_status)} />
          <Data label="Total Terkunci" value={pricingIsFinal ? money(order.total_amount) : "Menunggu penetapan harga"} />
          <Data label="Estimasi Proyek" value={estimate ?? (pricingIsFinal ? money(order.subtotal_amount) : "Belum tersedia")} />
          <Data label="Wajib Dibayar" value={pricingIsFinal ? money(order.payment_required_amount ?? order.total_amount) : "Pembayaran diblokir sampai harga final"} />
          <Data label="Sudah Dibayar" value={money(order.payment_effective_total)} />
          <Data label="Sisa Pembayaran" value={pricingIsFinal ? money(order.payment_balance) : "Belum berlaku"} />
          <Data label="WhatsApp" value={order.customer_phone} />
          <Data label="Email" value={order.customer_email || "-"} />
          <Data label="Metode Penyerahan" value={order.delivery_method === "pickup" ? "Ambil di Toko" : "Dikirim"} />
          <div className="min-w-0 sm:col-span-2 lg:col-span-3"><Data label="Alamat Pengiriman" value={order.shipping_address || "-"} /></div>
          </dl>
        </section>

        {canOpenPayment ? (
          <section id="payment-section" className="scroll-mt-24 border border-brand-softGray bg-white p-5 sm:p-7">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Tahap Pembayaran</p>
                <h2 className="mt-2 break-words text-2xl font-semibold">Pemeriksaan dan riwayat pembayaran</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">Buka bagian ini saat alur kerja meminta pemeriksaan pembayaran. Bukti pelanggan bukan konfirmasi dana masuk sampai mutasi diverifikasi.</p>
              </div>
              <AdminOrderSectionBoundary label="Pembayaran">
                <PaymentTrackingManager />
              </AdminOrderSectionBoundary>
            </div>
          </section>
        ) : null}

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <h2 className="text-2xl font-semibold">Produk PIM</h2>
          <p className="mt-2 text-sm text-brand-charcoal/60">
            Product line utama selalu berasal dari produk PIM. Snapshot menjaga nama, SKU, varian, jumlah, dan harga dasar saat order dibuat.
          </p>
          <div className="mt-6 divide-y divide-brand-softGray border-y border-brand-softGray">
            {items.map((item) => (
              <article key={item.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="font-semibold">{item.product_name}</h3>
                  <p className="mt-1 text-sm text-brand-charcoal/60">
                    {[item.variant_name, item.color, item.size, item.sku, `${item.quantity} pcs`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.custom_project_id ? <p className="mt-2 text-xs font-semibold text-[#063d24]">Custom Project · {pricingStatusLabel(item.pricing_status)}</p> : null}
                  {item.notes ? (
                    <p className="mt-2 text-sm text-brand-charcoal/60">{item.notes}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{money(item.subtotal)}</p>
                  <p className="mt-1 text-xs text-brand-charcoal/55">
                    {money(item.unit_price)} / pcs
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {customProjects.length ? (
          <section id="custom-pricing" className="scroll-mt-24 border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-2xl font-semibold">Breakdown Custom Canonical</h2>
            <p className="mt-2 text-sm text-brand-charcoal/60">Layanan, posisi, ukuran cetak, personalisasi, file, dan harga mengikuti rincian saat pesanan dibuat—bukan data PIM/CMS terbaru.</p>
            <div className="mt-6 grid gap-5">
              {customProjects.map((project) => (
                <article key={project.id} className="border border-brand-softGray p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/50">Custom Project</p><h3 className="mt-1 font-semibold">{project.id}</h3></div>
                    <span className="rounded-full bg-brand-offWhite px-3 py-1 text-xs font-semibold">{pricingStatusLabel(project.status)}</span>
                  </div>
                  <div className="mt-4 divide-y divide-brand-softGray border-y border-brand-softGray">
                    {project.lines.map((line) => (
                      <div key={line.key} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto]">
                        <div><p className="font-semibold">{line.label}</p><p className="mt-1 text-xs text-brand-charcoal/55">{pricingKindLabel(line.kind)} · {line.quantity} unit{line.serviceSlug ? ` · ${line.serviceSlug}` : ""}{line.placementName ? ` · ${line.placementName}` : ""}{line.printSizeName ? ` · ${line.printSizeName}` : ""}</p>{line.serviceId ? <p className="mt-1 break-all text-[11px] text-brand-charcoal/45">Service ID: {line.serviceId}</p> : null}</div>
                        <div className="sm:text-right"><p className="font-semibold">{line.subtotal === null ? "Menunggu penawaran" : money(line.subtotal)}</p>{line.unitPrice !== null ? <p className="mt-1 text-xs text-brand-charcoal/55">{money(line.unitPrice)} / unit</p> : null}</div>
                      </div>
                    ))}
                  </div>
                  {project.items.map((item) => (
                    <div key={item.id} className="mt-4 rounded-lg bg-brand-offWhite p-4 text-sm"><p className="font-semibold">{item.productName}</p>{item.selectedServices.length ? <div className="mt-3"><p className="font-semibold">Layanan yang dipilih saat pemesanan</p><ul className="mt-2 grid gap-2">{item.selectedServices.map((service) => { const serviceLine = project.lines.find((line) => line.serviceId === service.serviceId && line.kind === "service"); return <li key={service.id} className="border-l-2 border-brand-softGray pl-3"><p className="font-semibold">{serviceLine?.label || "Layanan custom"}</p><p className={`mt-1 text-xs ${service.assignedQuantity ? "text-brand-charcoal/60" : "font-semibold text-red-700"}`}>{service.packageName} · {service.assignedQuantity ? `${service.assignedQuantity} pcs dialokasikan` : "Belum dialokasikan—tidak ikut harga"}{service.placementId ? ` · Posisi ${service.placementId}` : ""}{service.printSizeId ? ` · Ukuran cetak ${service.printSizeId}` : ""}</p>{service.note ? <p className="mt-1 text-xs text-brand-charcoal/60">Catatan: {service.note}</p> : null}</li>; })}</ul></div> : null}{item.personalization ? <p className="mt-3 text-brand-charcoal/65">Personalisasi: {item.personalization}</p> : null}{item.uploads.length ? <div className="mt-3"><p className="font-semibold">File pelanggan</p><ul className="mt-1 grid gap-1 text-xs text-brand-charcoal/60">{item.uploads.map((upload) => <li key={upload.id}>{upload.fileName} · {upload.mimeType || "tipe tidak tersedia"} · {formatBytes(upload.fileSize)}</li>)}</ul></div> : null}</div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <AdminOrderSectionBoundary label="Tautan Pelacakan">
          <OrderTrackingLinkManager orderId={order.id} />
        </AdminOrderSectionBoundary>

        <div id="commerce" className="scroll-mt-24">
          {order.checkout_source === "public_checkout" ? (
            <section className="grid gap-4">
              <div className="border border-brand-softGray bg-white p-5 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Operasional Commerce</p>
                <h2 className="mt-2 text-2xl font-semibold">Tindakan pendukung tahap aktif</h2>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Form yang relevan tetap tersedia di sini. Gunakan tombol utama pada Alur Kerja Terpandu untuk langsung menuju bagian yang diperlukan.</p>
              </div>
            <AdminOrderSectionBoundary label="Operasional Commerce">
              <CommerceOrderOperations orderId={order.id} onChanged={loadData} />
            </AdminOrderSectionBoundary>
            </section>
          ) : null}
        </div>

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Dokumen Terkait</p>
          <h2 className="mt-2 text-2xl font-semibold">Akses lanjutan berdasarkan kebutuhan</h2>
          <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
            {canOpenJobOrder ? (
              <Link
                href={jobOrder ? `/admin/job-orders/${jobOrder.id}` : `/admin/job-orders?order=${order.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-5 text-sm font-semibold"
              >
                Surat Perintah Kerja
              </Link>
            ) : null}
            {canOpenFulfillment ? (
              <Link
                href={fulfillment ? `/admin/fulfillments/${fulfillment.id}#guided-action` : `/admin/fulfillments?order=${order.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-5 text-sm font-semibold"
              >
                Pengiriman / Pickup
              </Link>
            ) : null}
            {order.quotation_id ? <Link href={`/admin/orders/quotations/${order.quotation_id}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Penawaran Harga</Link> : null}
            {activeStage?.isTerminal ? <AdminOrderSectionBoundary label="Pesan Ulang"><RepeatOrderDialog orderId={order.id} /></AdminOrderSectionBoundary> : null}
          </div>
        </section>

        <div id="order-history" className="scroll-mt-24">
          <AdminOrderSectionBoundary label="Riwayat Pesanan">
            <CustomerOrderHistory orderId={order.id} />
          </AdminOrderSectionBoundary>
        </div>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={saveEdit} className="mx-auto max-w-xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Edit Pesanan</h2>
            <p className="mt-2 text-sm text-brand-charcoal/60">
              Produk dan harga tidak dapat diubah setelah konversi.
            </p>

            <label className="mt-5 block text-sm font-semibold">
              Metode penyerahan
              <select
                value={deliveryMethod}
                onChange={(event) => setDeliveryMethod(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              >
                <option value="pickup">Ambil di Toko</option>
                <option value="delivery">Dikirim</option>
              </select>
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Alamat pengiriman
              <textarea
                rows={4}
                value={shippingAddress}
                onChange={(event) => setShippingAddress(event.target.value)}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Catatan pelanggan
              <textarea
                rows={4}
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Catatan internal
              <textarea
                rows={4}
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={working}
                className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {working ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={working}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {pendingNavigation ? <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4"><section className="w-full max-w-lg bg-white p-6 shadow-2xl"><h2 className="text-2xl font-semibold">Perubahan belum disimpan</h2><p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Simpan perubahan sebelum membuka tujuan lain, buang draft lokal, atau tetap lanjut mengedit.</p><div className="mt-6 grid gap-2 sm:grid-cols-3"><button type="button" disabled={working} onClick={() => void saveAndNavigate()} className="min-h-11 rounded-full bg-brand-green px-4 text-sm font-semibold text-white disabled:opacity-45">Simpan dan Buka</button><button type="button" onClick={() => { const target=pendingNavigation; setEditOpen(false); setPendingNavigation(null); if(target) window.location.assign(target); }} className="min-h-11 rounded-full border border-red-200 px-4 text-sm font-semibold text-red-700">Buang dan Buka</button><button type="button" onClick={() => setPendingNavigation(null)} className="min-h-11 rounded-full border border-brand-softGray px-4 text-sm font-semibold">Tetap di Sini</button></div></section></div> : null}

      {cancelOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Batalkan Pesanan?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              Pembatalan bersifat terminal. Reservasi stok aktif dilepas tanpa mengubah stok fisik.
            </p>
            <textarea
              rows={4}
              required
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Alasan pembatalan wajib diisi"
              className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void cancelOrder()}
                disabled={working || !cancelReason.trim()}
                className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {working ? "Membatalkan..." : "Batalkan Pesanan"}
              </button>
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={working}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Kembali
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {archiveOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Arsipkan Pesanan?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              Pesanan dapat dipulihkan kembali melalui Gudang Arsip.
            </p>
            <textarea
              rows={4}
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              placeholder="Alasan arsip"
              className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void archiveOrder()}
                disabled={working}
                className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {working ? "Mengarsipkan..." : "Pindahkan ke Gudang Arsip"}
              </button>
              <button
                type="button"
                onClick={() => setArchiveOpen(false)}
                disabled={working}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function parseCustomProjects(value: unknown): SnapshotProject[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const project = record(candidate);
    const pricing = record(project?.pricing);
    if (!project || !pricing) return [];
    const lines = Array.isArray(pricing.lines) ? pricing.lines.flatMap((lineCandidate) => {
      const line = record(lineCandidate);
      if (!line) return [];
      return [{
        key: text(line.key) || cryptoSafeKey(line),
        label: text(line.label) || "Komponen harga",
        kind: text(line.kind) || "custom",
        quantity: numeric(line.quantity) ?? 0,
        unitPrice: numeric(line.unitPrice),
        subtotal: numeric(line.subtotal),
        serviceId: nullableText(line.serviceId),
        serviceSlug: nullableText(line.serviceSlug),
        placementName: nullableText(line.placementName),
        printSizeName: nullableText(line.printSizeName)
      } satisfies SnapshotLine];
    }) : [];
    const items = Array.isArray(project.items) ? project.items.flatMap((itemCandidate) => {
      const item = record(itemCandidate);
      if (!item) return [];
      const personalization = record(item.personalization);
      const ruleId = nullableText(personalization?.ruleId);
      const mode = text(personalization?.mode);
      const sharedValue = nullableText(personalization?.sharedValue);
      const entries = Array.isArray(personalization?.entries) ? personalization.entries.filter((entry): entry is string => typeof entry === "string" && entry.length > 0) : [];
      const uploads = Array.isArray(item.uploads) ? item.uploads.flatMap((uploadCandidate) => {
        const upload = record(uploadCandidate);
        if (!upload) return [];
        return [{ id: text(upload.id) || cryptoSafeKey(upload), fileName: text(upload.file_name) || "File pelanggan", mimeType: text(upload.mime_type), fileSize: numeric(upload.file_size) ?? 0 }];
      }) : [];
      const packageQuantities = new Map<string, number>();
      if (Array.isArray(item.allocations)) {
        for (const allocationCandidate of item.allocations) {
          const allocation = record(allocationCandidate);
          const packageId = text(allocation?.designPackageId);
          if (packageId) packageQuantities.set(packageId, (packageQuantities.get(packageId) ?? 0) + (numeric(allocation?.quantity) ?? 0));
        }
      }
      const selectedServices = Array.isArray(item.designPackages) ? item.designPackages.flatMap((packageCandidate) => {
        const designPackage = record(packageCandidate);
        if (!designPackage || !Array.isArray(designPackage.services)) return [];
        const packageId = text(designPackage.id);
        return designPackage.services.flatMap((serviceCandidate) => {
          const service = record(serviceCandidate);
          const serviceId = text(service?.serviceId);
          if (!service || !serviceId) return [];
          return [{ id: text(service.id) || cryptoSafeKey(service), packageName: text(designPackage.name) || "Paket Desain", serviceId, placementId: nullableText(service.placementId), printSizeId: nullableText(service.printSizeId), note: nullableText(service.note), assignedQuantity: packageQuantities.get(packageId) ?? 0 }];
        });
      }) : [];
      return [{
        id: text(item.id) || cryptoSafeKey(item),
        productName: text(item.productName) || "Produk Custom",
        personalization: ruleId ? (mode === "per_item" ? `${entries.length} nilai per item` : sharedValue || "Dikonfigurasi") : null,
        uploads,
        selectedServices
      } satisfies SnapshotItem];
    }) : [];
    return [{
      id: text(project.id) || cryptoSafeKey(project),
      status: text(pricing.status) || "unknown",
      estimatedMinTotal: numeric(pricing.estimatedMinTotal),
      estimatedMaxTotal: numeric(pricing.estimatedMaxTotal),
      finalTotal: numeric(pricing.finalTotal),
      lines,
      items
    } satisfies SnapshotProject];
  });
}

function projectEstimate(projects: SnapshotProject[]) {
  if (!projects.length) return null;
  const minimums = projects.map((project) => project.status === "final" ? project.finalTotal : project.estimatedMinTotal);
  const maximums = projects.map((project) => project.status === "final" ? project.finalTotal : project.estimatedMaxTotal);
  if (minimums.some((value) => value === null) || maximums.some((value) => value === null)) return "Menunggu penawaran Admin";
  const minimum = minimums.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const maximum = maximums.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return minimum === maximum ? money(minimum) : `${money(minimum)} – ${money(maximum)}`;
}

function pricingStatusLabel(value: string) {
  return getPricingStatusLabel(value);
}

function pricingKindLabel(value: string) {
  const labels: Record<string, string> = { product: "Produk", service: "Layanan", placement: "Posisi Cetak", print_size: "Ukuran Cetak", personalization: "Personalisasi" };
  return labels[value] ?? "Rincian Harga";
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown) {
  const valueText = text(value);
  return valueText || null;
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cryptoSafeKey(value: Record<string, unknown>) {
  return JSON.stringify(value).slice(0, 160);
}

function formatBytes(value: number) {
  if (!value) return "ukuran tidak tersedia";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
