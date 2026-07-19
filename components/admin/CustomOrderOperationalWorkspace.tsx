"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAdminAccess } from "@/components/admin/layout/AdminAccessContext";
import {
  EDITABLE_PRICING_KINDS,
  createEmptyPricingLine,
  editableLinesFromSnapshot,
  normalizeDraftLines,
  productSnapshotsFromOrderItems,
  serviceSummariesFromSnapshot,
  validatePricingWorkspace,
  type EditablePricingKind,
  type EditablePricingLine,
  type OrderProductSnapshot,
  type PricingConfirmations,
  type PricingTotals,
  type ServiceSummary
} from "@/lib/admin-order-pricing";
import { createSupabaseClient } from "@/lib/supabase";
import { getOrderStatusLabel } from "@/lib/ui-language";

type Ref = { id: string; status: string; updated_at: string | null } | null;
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
  jobOrder: Ref;
  qualityControl: (Ref & { result?: string | null }) | null;
  fulfillment: Ref;
};

type Flow = {
  updated_at: string;
  custom_project_snapshot: unknown;
  custom_review_started_at: string | null;
  custom_review_completed_at: string | null;
  custom_quote_version: number | null;
  custom_quote_status: string | null;
  custom_quote_locked_at: string | null;
  custom_pricing_draft: unknown;
  custom_pricing_draft_version: number;
  custom_pricing_draft_updated_at: string | null;
  total_amount: number;
  finalVerifiedAt: string | null;
};

type StageAction = "start" | "review" | "pricing" | "link";
type Stage = { index: number; title: string; blocker: string; label: string; href: string; action: StageAction };

const STAGES = [
  "Pesanan Masuk",
  "Pemeriksaan Pesanan",
  "Penetapan Harga",
  "Persetujuan Pelanggan",
  "Pembayaran",
  "Surat Perintah Kerja",
  "Produksi",
  "Pemeriksaan Kualitas",
  "Pengemasan",
  "Pengecekan Akhir",
  "Pengiriman / Ambil di Toko",
  "Selesai"
];

const KIND_LABEL: Record<EditablePricingKind, string> = {
  SERVICE: "Layanan",
  PERSONALIZATION: "Personalisasi",
  SETUP_FEE: "Biaya persiapan",
  DESIGN_FEE: "Biaya desain",
  DISCOUNT: "Diskon",
  ADJUSTMENT: "Penyesuaian",
  SHIPPING: "Ongkir",
  OTHER: "Lainnya"
};

const EMPTY_TOTALS: PricingTotals = {
  product: 0,
  service: 0,
  personalization: 0,
  setupDesign: 0,
  adjustment: 0,
  discount: 0,
  shipping: 0,
  other: 0,
  final: 0
};

export function CustomOrderOperationalWorkspace(props: Props) {
  const { readOnly } = useAdminAccess();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [products, setProducts] = useState<OrderProductSnapshot[]>([]);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [lines, setLines] = useState<EditablePricingLine[]>([]);
  const [selected, setSelected] = useState(0);
  const [confirmations, setConfirmations] = useState<PricingConfirmations>({ product: false, service: false });
  const [reviewNote, setReviewNote] = useState("");
  const [validDays, setValidDays] = useState(7);
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [serverBlockers, setServerBlockers] = useState<string[]>([]);
  const [serverTotals, setServerTotals] = useState<PricingTotals | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const finalizeKey = useRef(randomKey());

  const load = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const [orderResult, itemResult, fulfillmentResult] = await Promise.all([
      supabase
        .from("orders")
        .select("updated_at,custom_project_snapshot,custom_review_started_at,custom_review_completed_at,custom_quote_version,custom_quote_status,custom_quote_locked_at,custom_pricing_draft,custom_pricing_draft_version,custom_pricing_draft_updated_at,total_amount")
        .eq("id", props.order.id)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("id,product_name,variant_name,color,size,sku,quantity,unit_price,subtotal,config_snapshot,required_services")
        .eq("order_id", props.order.id)
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("fulfillments")
        .select("final_verified_at")
        .eq("order_id", props.order.id)
        .is("archived_at", null)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (orderResult.error || !orderResult.data || itemResult.error) {
      setMessage("Tahap pesanan atau rincian produk belum dapat dimuat.");
      return;
    }

    const orderRow = orderResult.data as Omit<Flow, "finalVerifiedAt">;
    const productRows = (itemResult.data || []) as Array<Record<string, unknown>>;
    const nextProducts = productSnapshotsFromOrderItems(productRows);
    const nextServices = serviceSummariesFromSnapshot(orderRow.custom_project_snapshot);
    const draft = asRecord(orderRow.custom_pricing_draft);
    const savedLines = normalizeDraftLines(draft?.editable_lines);
    const savedConfirmations = asRecord(draft?.confirmations);
    const savedTotals = pricingTotals(draft?.totals);
    const savedBlockers = stringArray(draft?.blockers);

    setFlow({
      ...orderRow,
      custom_pricing_draft_version: orderRow.custom_pricing_draft_version || 0,
      finalVerifiedAt: fulfillmentResult.data?.final_verified_at ?? null
    });
    setProducts(nextProducts);
    setServices(nextServices);
    setLines(draft ? savedLines : editableLinesFromSnapshot(orderRow.custom_project_snapshot));
    setConfirmations({
      product: savedConfirmations?.product === true,
      service: nextServices.length === 0 ? true : savedConfirmations?.service === true
    });
    setValidDays(integer(draft?.valid_days) ?? 7);
    setCustomerNote(text(draft?.customer_note));
    setInternalNote(text(draft?.internal_note));
    setServerTotals(savedTotals);
    setServerBlockers(savedBlockers);
    setDraftDirty(false);
    finalizeKey.current = randomKey();
  }, [props.order.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const custom = Array.isArray(flow?.custom_project_snapshot) && flow.custom_project_snapshot.length > 0;
  const stage = resolveStage(props, flow, custom);
  useEffect(() => {
    setSelected(stage.index);
  }, [stage.index]);

  const clientValidation = useMemo(() => validatePricingWorkspace({
    products,
    lines,
    confirmations,
    validDays,
    requiresServiceConfirmation: services.length > 0
  }), [confirmations, lines, products, services.length, validDays]);
  const displayedTotals = draftDirty || !serverTotals ? clientValidation.totals : serverTotals;
  const finalBlockers = draftDirty ? clientValidation.blockers : unique([...clientValidation.blockers, ...serverBlockers]);
  const canFinalize = !readOnly
    && !draftDirty
    && (flow?.custom_pricing_draft_version ?? 0) > 0
    && clientValidation.canFinalize
    && serverBlockers.length === 0
    && stage.action === "pricing"
    && !working;

  function markDirty() {
    setDraftDirty(true);
    setServerBlockers([]);
    setServerTotals(null);
    finalizeKey.current = randomKey();
  }

  function changeConfirmations(next: PricingConfirmations) {
    setConfirmations(next);
    markDirty();
  }

  function changeLine(id: string, patch: Partial<EditablePricingLine>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
    markDirty();
  }

  function addLine(kind: EditablePricingKind = "SERVICE") {
    setLines((current) => [...current, createEmptyPricingLine(kind)]);
    markDirty();
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
    markDirty();
  }

  async function startReview() {
    if (!flow || working || readOnly) return;
    await execute("start_custom_order_review_v1", {
      p_order_id: props.order.id,
      p_expected_updated_at: flow.updated_at
    }, "Pemeriksaan pesanan dimulai.");
  }

  async function approveReview() {
    if (!flow || working || readOnly) return;
    if (!confirmations.product || (services.length > 0 && !confirmations.service)) {
      setMessage("Dua konfirmasi operasional harus selesai sebelum pemeriksaan disetujui.");
      return;
    }
    await execute("approve_custom_order_review_v1", {
      p_order_id: props.order.id,
      p_checklist: confirmations,
      p_note: reviewNote.trim() || null,
      p_expected_updated_at: flow.updated_at
    }, "Pemeriksaan pesanan disetujui.");
  }

  async function saveDraft() {
    if (!flow || working || readOnly) return;
    setWorking(true);
    setMessage("");
    const supabase = createSupabaseClient();
    if (!supabase) return setWorking(false);
    const result = await supabase.rpc("save_custom_order_pricing_draft_v1", {
      p_order_id: props.order.id,
      p_editable_lines: toRpcLines(lines),
      p_confirmations: confirmations,
      p_valid_days: validDays,
      p_customer_note: customerNote.trim() || null,
      p_internal_note: internalNote.trim() || null,
      p_expected_updated_at: flow.updated_at,
      p_expected_draft_version: flow.custom_pricing_draft_version
    });
    setWorking(false);
    if (result.error) {
      setMessage(operationalError(result.error.message));
      return;
    }
    setMessage("Draft harga tersimpan. Tahap pesanan dan penawaran pelanggan belum berubah.");
    await load();
  }

  async function finalizeQuotation() {
    if (!flow || !canFinalize) return;
    setWorking(true);
    setMessage("");
    const supabase = createSupabaseClient();
    if (!supabase) return setWorking(false);
    const result = await supabase.rpc("finalize_custom_order_pricing_v1", {
      p_order_id: props.order.id,
      p_expected_updated_at: flow.updated_at,
      p_expected_draft_version: flow.custom_pricing_draft_version,
      p_idempotency_key: finalizeKey.current
    });
    setWorking(false);
    if (result.error) {
      setMessage(operationalError(result.error.message));
      return;
    }
    setMessage("Harga final dikunci sebagai versi penawaran dan disiapkan untuk persetujuan pelanggan.");
    await load();
  }

  async function execute(rpc: string, payload: Record<string, unknown>, success: string) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setMessage("");
    const result = await supabase.rpc(rpc, payload);
    setWorking(false);
    if (result.error) {
      setMessage(operationalError(result.error.message));
      return;
    }
    setMessage(success);
    await load();
  }

  return (
    <section className="border border-brand-softGray bg-white">
      <header className="border-b border-brand-softGray p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Pusat Kendali Pesanan</p>
        <h2 className="mt-2 text-2xl font-semibold">{stage.title}</h2>
        <p className="mt-2 text-sm text-brand-charcoal/60">
          Satu tahap aktif mengikuti status pesanan yang tersimpan. Status saat ini: {displayStatus(props.order.status, stage)}.
        </p>
      </header>

      <nav aria-label="Tahap Custom Order" className="overflow-x-auto border-b border-brand-softGray p-3">
        <ol className="flex min-w-max gap-2">
          {STAGES.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                disabled={index > stage.index}
                onClick={() => setSelected(index)}
                aria-current={index === stage.index ? "step" : undefined}
                className={`min-h-10 rounded-full border px-4 text-xs font-semibold ${index === selected ? "border-brand-green bg-emerald-50 text-brand-green" : index < stage.index ? "border-brand-softGray bg-brand-offWhite" : "border-brand-softGray text-brand-charcoal/40"}`}
              >
                {index < stage.index ? "✓ " : `${index + 1}. `}{name}{index > stage.index ? " · terkunci" : ""}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-brand-softGray bg-brand-offWhite p-5 lg:sticky lg:top-20 lg:self-start lg:border-b-0 lg:border-r">
          <dl className="grid gap-3 text-sm">
            <Summary label="Status pesanan" value={displayStatus(props.order.status, stage)} />
            <Summary label="Produk" value={String(products.length)} />
            <Summary label="Layanan" value={String(services.length)} />
            <Summary label="Draft" value={flow?.custom_pricing_draft_version ? `v${flow.custom_pricing_draft_version}` : "Belum disimpan"} />
            <Summary label="Total terverifikasi" value={serverTotals ? money(serverTotals.final) : "Belum diverifikasi sistem"} />
            <Summary label="Penawaran harga" value={flow?.custom_quote_version ? `v${flow.custom_quote_version} · ${quoteStatusLabel(flow.custom_quote_status)}` : "Belum dikirim"} />
          </dl>
          <p className="mt-5 border border-brand-softGray bg-white p-3 text-sm">
            <span className="block text-xs text-brand-charcoal/50">Hambatan tahap</span>
            <strong>{stage.blocker}</strong>
          </p>
          {readOnly ? <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm">Akun ini hanya dapat melihat area kerja.</p> : null}
        </aside>

        <div className="min-w-0 p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{selected < stage.index ? "Tahap selesai · baca saja" : "Tahap aktif"}</p>
          <h3 className="mt-2 text-xl font-semibold">{STAGES[selected]}</h3>
          {selected < stage.index ? (
            <p className="mt-3 text-sm text-brand-charcoal/60">Pemilih tahap tidak mengubah status pesanan.</p>
          ) : stage.action === "start" ? (
            <SimpleAction text="Rincian pesanan tersedia dan siap diperiksa." button="Mulai Pemeriksaan" disabled={working || readOnly} working={working} onClick={() => void startReview()} message={message} />
          ) : stage.action === "review" ? (
            <ReviewWorkspace
              products={products}
              services={services}
              confirmations={confirmations}
              setConfirmations={changeConfirmations}
              note={reviewNote}
              setNote={setReviewNote}
              disabled={working || readOnly}
              working={working}
              message={message}
              onApprove={() => void approveReview()}
            />
          ) : stage.action === "pricing" ? (
            <PricingWorkspace
              products={products}
              services={services}
              lines={lines}
              confirmations={confirmations}
              setConfirmations={changeConfirmations}
              changeLine={changeLine}
              addLine={addLine}
              removeLine={removeLine}
              totals={displayedTotals}
              serverValidated={!draftDirty && Boolean(serverTotals)}
              blockers={finalBlockers}
              duplicateLineIds={clientValidation.duplicateLineIds}
              validDays={validDays}
              setValidDays={(value) => { setValidDays(value); markDirty(); }}
              customerNote={customerNote}
              setCustomerNote={(value) => { setCustomerNote(value); markDirty(); }}
              internalNote={internalNote}
              setInternalNote={(value) => { setInternalNote(value); markDirty(); }}
              saveDisabled={working || readOnly}
              finalizeDisabled={!canFinalize}
              working={working}
              message={message}
              onSave={() => void saveDraft()}
              onFinalize={() => void finalizeQuotation()}
            />
          ) : (
            <Link href={stage.href} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white">{stage.label}</Link>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewWorkspace(props: {
  products: OrderProductSnapshot[];
  services: ServiceSummary[];
  confirmations: PricingConfirmations;
  setConfirmations: (value: PricingConfirmations) => void;
  note: string;
  setNote: (value: string) => void;
  disabled: boolean;
  working: boolean;
  message: string;
  onApprove: () => void;
}) {
  return (
    <div className="mt-5 grid gap-5">
      <ProductSummary products={props.products} />
      <ServiceSummaryList services={props.services} />
      <ConfirmationFields {...props} />
      <label className="block text-sm font-semibold">Catatan pemeriksaan
        <textarea rows={3} value={props.note} onChange={(event) => props.setNote(event.target.value)} className="mt-2 w-full border border-brand-softGray p-3 font-normal" />
      </label>
      <SimpleAction text="" button="Setujui Pemeriksaan" disabled={props.disabled} working={props.working} onClick={props.onApprove} message={props.message} />
    </div>
  );
}

function PricingWorkspace(props: {
  products: OrderProductSnapshot[];
  services: ServiceSummary[];
  lines: EditablePricingLine[];
  confirmations: PricingConfirmations;
  setConfirmations: (value: PricingConfirmations) => void;
  changeLine: (id: string, patch: Partial<EditablePricingLine>) => void;
  addLine: (kind?: EditablePricingKind) => void;
  removeLine: (id: string) => void;
  totals: PricingTotals;
  serverValidated: boolean;
  blockers: string[];
  duplicateLineIds: string[];
  validDays: number;
  setValidDays: (value: number) => void;
  customerNote: string;
  setCustomerNote: (value: string) => void;
  internalNote: string;
  setInternalNote: (value: string) => void;
  saveDisabled: boolean;
  finalizeDisabled: boolean;
  working: boolean;
  message: string;
  onSave: () => void;
  onFinalize: () => void;
}) {
  return (
    <div className="mt-5 grid gap-6">
      <ProductSummary products={props.products} />
      <ServiceSummaryList services={props.services} />
      <ConfirmationFields {...props} disabled={props.saveDisabled} />

      <section className="border border-brand-softGray p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold">Editor Rincian Harga</h4>
            <p className="mt-1 text-sm text-brand-charcoal/55">Harga dasar produk dikunci dari rincian pesanan. Baris di bawah hanya memuat komponen non-produk.</p>
          </div>
          <button type="button" disabled={props.saveDisabled} onClick={() => props.addLine()} className="min-h-10 rounded-full border border-brand-charcoal px-4 text-sm font-semibold disabled:opacity-45">Tambah komponen</button>
        </div>

        <div className="mt-4 grid gap-3">
          {props.lines.length === 0 ? <p className="border border-dashed border-brand-softGray p-4 text-sm text-brand-charcoal/60">Belum ada biaya layanan atau komponen tambahan. Harga dasar produk tetap dihitung otomatis.</p> : null}
          {props.lines.map((line) => (
            <PriceLineEditor
              key={line.id}
              line={line}
              duplicate={props.duplicateLineIds.includes(line.id)}
              disabled={props.saveDisabled}
              onChange={(patch) => props.changeLine(line.id, patch)}
              onRemove={() => props.removeLine(line.id)}
            />
          ))}
        </div>
      </section>

      <TotalSummary totals={props.totals} serverValidated={props.serverValidated} />

      <section className="grid gap-4 border border-brand-softGray p-4 sm:grid-cols-2 sm:p-5">
        <label className="text-sm font-semibold">Masa berlaku penawaran
          <span className="mt-2 flex items-center gap-2">
            <input type="number" min={1} max={30} value={props.validDays} onChange={(event) => props.setValidDays(Number(event.target.value))} className="min-h-11 w-24 border border-brand-softGray px-3 font-normal" />
            <span className="font-normal text-brand-charcoal/60">hari</span>
          </span>
        </label>
        <label className="text-sm font-semibold">Catatan untuk pelanggan
          <textarea rows={3} value={props.customerNote} onChange={(event) => props.setCustomerNote(event.target.value)} className="mt-2 w-full border border-brand-softGray p-3 font-normal" />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Catatan internal admin
          <textarea rows={3} value={props.internalNote} onChange={(event) => props.setInternalNote(event.target.value)} className="mt-2 w-full border border-brand-softGray p-3 font-normal" />
          <span className="mt-1 block text-xs font-normal text-brand-charcoal/50">Tidak disertakan dalam rincian penawaran pelanggan.</span>
        </label>
      </section>

      {props.blockers.length > 0 ? (
        <div role="alert" className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Finalisasi masih diblokir</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{props.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-brand-softGray pt-5 sm:flex-row sm:justify-end">
        <button type="button" disabled={props.saveDisabled} onClick={props.onSave} className="min-h-11 rounded-full border border-brand-charcoal px-5 text-sm font-semibold disabled:opacity-45">{props.working ? "Menyimpan..." : "Simpan Draft Harga"}</button>
        <button type="button" disabled={props.finalizeDisabled} onClick={props.onFinalize} className="min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{props.working ? "Memproses..." : "Konfirmasi Harga & Kirim ke Pelanggan"}</button>
      </div>
      {props.message ? <p className="border border-brand-softGray bg-brand-offWhite p-3 text-sm">{props.message}</p> : null}
    </div>
  );
}

function ProductSummary({ products }: { products: OrderProductSnapshot[] }) {
  return (
    <section className="border border-brand-softGray p-4 sm:p-5">
      <h4 className="font-semibold">Ringkasan Produk</h4>
      <p className="mt-1 text-sm text-brand-charcoal/55">Harga dasar hanya dapat dilihat dan mengikuti rincian barang saat pesanan dibuat.</p>
      <div className="mt-4 divide-y divide-brand-softGray border-y border-brand-softGray">
        {products.length === 0 ? <p className="py-4 text-sm text-red-700">Product base line tidak tersedia.</p> : products.map((product) => (
          <article key={product.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="font-semibold">{product.productName}</p>
              <p className="mt-1 text-sm text-brand-charcoal/60">{[product.variantName, product.color, product.size, product.sku].filter(Boolean).join(" · ") || "Rincian varian tidak tersedia"}</p>
              <p className="mt-1 text-xs text-brand-charcoal/45">Sumber: rincian barang pesanan · terkunci</p>
            </div>
            <div className="text-sm sm:text-right">
              <p>{product.quantity} pcs × {product.unitPrice === null ? "Harga belum tersedia" : money(product.unitPrice)}</p>
              <p className="mt-1 font-semibold">{product.subtotal === null ? "Subtotal belum tersedia" : money(product.subtotal)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ServiceSummaryList({ services }: { services: ServiceSummary[] }) {
  return (
    <section className="border border-brand-softGray p-4 sm:p-5">
      <h4 className="font-semibold">Ringkasan Layanan</h4>
      {services.length === 0 ? <p className="mt-3 text-sm text-brand-charcoal/60">Tidak ada layanan custom terstruktur pada rincian pesanan. Konfirmasi layanan tidak diwajibkan.</p> : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <article key={service.id} className="border border-brand-softGray bg-brand-offWhite p-4 text-sm">
              <p className="font-semibold">{service.name}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                <CompactData label="Metode" value={service.method || "Dari rincian pesanan"} />
                <CompactData label="Ukuran" value={service.printSize || "-"} />
                <CompactData label="Placement" value={service.placement || "-"} />
                <CompactData label="Qty" value={service.quantity ? String(service.quantity) : "-"} />
                <CompactData label="Personalisasi" value={service.personalization || "-"} />
                <CompactData label="File" value={service.fileAvailable ? "Tersedia" : "Tidak tercatat"} />
                <CompactData label="Preset" value={service.preset || "-"} />
                <CompactData label="Catatan" value={service.note || "-"} />
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ConfirmationFields({ products, services, confirmations, setConfirmations, disabled }: {
  products: OrderProductSnapshot[];
  services: ServiceSummary[];
  confirmations: PricingConfirmations;
  setConfirmations: (value: PricingConfirmations) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Konfirmasi operasional</legend>
      <label className="flex min-h-12 gap-3 border border-brand-softGray p-3 text-sm">
        <input type="checkbox" disabled={disabled || products.length === 0} checked={confirmations.product} onChange={(event) => setConfirmations({ ...confirmations, product: event.target.checked })} className="mt-0.5 h-4 w-4" />
        Produk, varian, jumlah, dan harga dasar sudah sesuai
      </label>
      <label className="flex min-h-12 gap-3 border border-brand-softGray p-3 text-sm">
        <input type="checkbox" disabled={disabled || services.length === 0} checked={services.length === 0 || confirmations.service} onChange={(event) => setConfirmations({ ...confirmations, service: event.target.checked })} className="mt-0.5 h-4 w-4" />
        {services.length === 0 ? "Tidak ada layanan custom yang perlu dikonfirmasi" : "Layanan dan spesifikasi custom sudah sesuai"}
      </label>
    </fieldset>
  );
}

function PriceLineEditor({ line, duplicate, disabled, onChange, onRemove }: {
  line: EditablePricingLine;
  duplicate: boolean;
  disabled: boolean;
  onChange: (patch: Partial<EditablePricingLine>) => void;
  onRemove: () => void;
}) {
  const reasonRequired = line.kind === "ADJUSTMENT" || line.kind === "DISCOUNT" || line.kind === "OTHER";
  return (
    <article className={`grid gap-3 border p-4 ${duplicate ? "border-red-400 bg-red-50" : "border-brand-softGray"}`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Jenis komponen">
          <select value={line.kind} disabled={disabled} onChange={(event) => onChange({ kind: event.target.value as EditablePricingKind })} className="min-h-11 w-full border border-brand-softGray bg-white px-3">
            {EDITABLE_PRICING_KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
          </select>
        </Field>
        <Field label="Label">
          <input value={line.label} disabled={disabled} onChange={(event) => onChange({ label: event.target.value })} className="min-h-11 w-full border border-brand-softGray px-3" />
        </Field>
        <Field label="Quantity">
          <input type="number" min={1} step={1} value={line.quantity} disabled={disabled} onChange={(event) => onChange({ quantity: Number(event.target.value) })} className="min-h-11 w-full border border-brand-softGray px-3" />
        </Field>
        <Field label="Harga satuan (IDR)">
          <input type="number" step={1} value={line.unitPrice} disabled={disabled} onChange={(event) => onChange({ unitPrice: Number(event.target.value) })} className="min-h-11 w-full border border-brand-softGray px-3" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Service code">
          <input value={line.serviceCode} disabled={disabled} onChange={(event) => onChange({ serviceCode: event.target.value })} className="min-h-11 w-full border border-brand-softGray px-3" />
        </Field>
        <Field label="Placement">
          <input value={line.placement} disabled={disabled} onChange={(event) => onChange({ placement: event.target.value })} className="min-h-11 w-full border border-brand-softGray px-3" />
        </Field>
        <Field label="Print size">
          <input value={line.printSize} disabled={disabled} onChange={(event) => onChange({ printSize: event.target.value })} className="min-h-11 w-full border border-brand-softGray px-3" />
        </Field>
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-xs text-brand-charcoal/50">Subtotal</p><p className="mt-2 font-semibold">{money(lineSubtotalForDisplay(line))}</p></div>
          <button type="button" disabled={disabled} onClick={onRemove} className="min-h-10 rounded-full border border-red-300 px-4 text-sm font-semibold text-red-700 disabled:opacity-45">Hapus</button>
        </div>
      </div>
      {reasonRequired ? <Field label="Alasan (wajib, minimal 5 karakter)"><input value={line.reason} disabled={disabled} onChange={(event) => onChange({ reason: event.target.value })} className="min-h-11 w-full border border-brand-softGray px-3" /></Field> : null}
      <p className="text-xs text-brand-charcoal/45">Sumber: {pricingSourceLabel(line.source)} · dapat diubah</p>
    </article>
  );
}

function TotalSummary({ totals, serverValidated }: { totals: PricingTotals; serverValidated: boolean }) {
  const rows: Array<[string, number]> = [
    ["Subtotal produk", totals.product],
    ["Subtotal layanan", totals.service],
    ["Personalisasi", totals.personalization],
    ["Biaya persiapan / desain", totals.setupDesign],
    ["Penyesuaian", totals.adjustment],
    ["Diskon", -totals.discount],
    ["Ongkir", totals.shipping],
    ["Lainnya", totals.other]
  ];
  return (
    <section className="border border-brand-softGray bg-brand-offWhite p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Ringkasan Total</h4><span className={`text-xs font-semibold ${serverValidated ? "text-brand-green" : "text-amber-700"}`}>{serverValidated ? "Terverifikasi sistem" : "Pratinjau sementara · simpan draft untuk verifikasi sistem"}</span></div>
      <dl className="mt-4 grid gap-2 text-sm">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd className="font-semibold">{money(value)}</dd></div>)}</dl>
      <div className="mt-4 flex justify-between gap-4 border-t border-brand-charcoal pt-4 text-lg font-semibold"><span>Total final</span><span>{money(totals.final)}</span></div>
    </section>
  );
}

function resolveStage({ order, jobOrder: job, qualityControl: qc, fulfillment }: Props, flow: Flow | null, custom: boolean): Stage {
  if (new Set(["completed", "selesai", "picked_up", "delivered"]).has(order.status) || ["delivered", "picked_up"].includes(fulfillment?.status ?? "")) return stage(11, "Selesai", "Tidak ada", "Lihat Histori", "#order-history");
  if (["shipped", "in_transit", "ready_to_ship", "ready_for_pickup"].includes(fulfillment?.status ?? "")) return stage(10, "Pengiriman / Ambil di Toko", "Tidak ada", "Buka Pengiriman", `/admin/fulfillments/${fulfillment?.id}`);
  if (fulfillment?.status === "packing" && custom && !flow?.finalVerifiedAt) return stage(9, "Pengecekan Akhir", "Checklist akhir belum selesai", "Buka Pengecekan Akhir", `/admin/fulfillments/${fulfillment.id}`);
  if (["preparing", "packing", "problem"].includes(fulfillment?.status ?? "")) return stage(8, "Pengemasan", "Tidak ada", "Lanjutkan Pengiriman", `/admin/fulfillments/${fulfillment?.id}`);
  if (qc && qc.result !== "passed") return stage(7, "Pemeriksaan Kualitas", "Menunggu hasil pemeriksaan kualitas", "Buka Pemeriksaan Kualitas", `/admin/quality-control?job_order=${job?.id ?? ""}`);
  if (job && !["completed", "cancelled"].includes(job.status)) return stage(6, "Produksi", "Tidak ada", "Buka Surat Perintah Kerja", `/admin/job-orders/${job.id}`);
  if (!job && order.payment_production_eligible) return stage(5, "Surat Perintah Kerja", "Surat perintah kerja belum dibuat", "Buat / Buka Surat Perintah Kerja", `/admin/job-orders?order=${order.id}`);
  if (custom && !flow?.custom_review_started_at) return { ...stage(0, "Pesanan Masuk", order.whatsapp_confirmed_at ? "Tidak ada" : "Pelanggan belum diverifikasi", "Mulai Pemeriksaan", "#"), action: "start" };
  if (custom && !flow?.custom_review_completed_at) return { ...stage(1, "Pemeriksaan Pesanan", "Pemeriksaan belum disetujui", "Setujui Pemeriksaan", "#"), action: "review" };
  if (custom && flow?.custom_quote_status !== "sent" && flow?.custom_quote_status !== "locked") return { ...stage(2, "Penetapan Harga", flow?.custom_pricing_draft_version ? "Draft harus lolos verifikasi sistem" : "Draft harga belum disimpan", "Tetapkan Harga", "#"), action: "pricing" };
  if (custom && flow?.custom_quote_status === "sent") return stage(3, "Persetujuan Pelanggan", "Menunggu keputusan pelanggan", "Pantau Persetujuan", "#commerce");
  if (!order.payment_production_eligible) return stage(4, "Pembayaran", "Menunggu pembayaran", "Periksa Pembayaran", "#payment");
  return stage(1, "Pemeriksaan Pesanan", "Tidak ada", "Lanjutkan Pemeriksaan", "#order-data");
}

function stage(index: number, title: string, blocker: string, label: string, href: string): Stage {
  return { index, title, blocker, label, href, action: "link" };
}

function displayStatus(status: string, current: Stage) {
  return current.index === 2 && status === "under_review"
    ? "Sedang Diperiksa · Penetapan Harga"
    : getOrderStatusLabel(status);
}

function quoteStatusLabel(status: string | null) {
  if (status === "sent") return "Menunggu Persetujuan Pelanggan";
  if (status === "locked") return "Disetujui Pelanggan";
  if (status === "draft") return "Draft";
  return "Status penawaran belum dikenali";
}

function pricingSourceLabel(source: string) {
  if (source === "manual") return "Ditambahkan admin";
  if (source === "project_snapshot") return "Rincian proyek";
  if (source === "service_snapshot") return "Rincian layanan";
  return "Rincian pesanan";
}

function SimpleAction({ text: description, button, disabled, working, onClick, message }: { text: string; button: string; disabled: boolean; working: boolean; onClick: () => void; message: string }) {
  return <div><p className="mt-3 text-sm text-brand-charcoal/60">{description}</p><button type="button" disabled={disabled} onClick={onClick} className="mt-5 min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45">{working ? "Menyimpan..." : button}</button>{message ? <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm">{message}</p> : null}</div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-brand-charcoal/50">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>;
}

function CompactData({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-brand-charcoal/45">{label}</dt><dd className="mt-0.5 break-words">{value}</dd></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="text-xs font-semibold text-brand-charcoal/65"><span className="mb-1 block">{label}</span>{children}</label>;
}

function toRpcLines(lines: EditablePricingLine[]) {
  return lines.map((line) => ({
    id: line.id,
    kind: line.kind,
    label: line.label.trim(),
    source: line.source,
    quantity: line.quantity,
    unit: line.unit,
    unit_price: line.unitPrice,
    service_code: line.serviceCode.trim(),
    placement: line.placement.trim(),
    print_size: line.printSize.trim(),
    reason: line.reason.trim()
  }));
}

function lineSubtotalForDisplay(line: EditablePricingLine) {
  if (!Number.isSafeInteger(line.quantity) || !Number.isSafeInteger(line.unitPrice)) return 0;
  const value = line.quantity * line.unitPrice;
  return line.kind === "DISCOUNT" ? -Math.abs(value) : value;
}

function operationalError(message: string) {
  if (/diperbarui|versi draft|stale|conflict/i.test(message)) return "Harga telah diperbarui oleh admin lain. Muat ulang halaman sebelum melanjutkan.";
  if (/duplik|DTF/i.test(message)) return "Komponen harga terduplikasi. Periksa baris yang bertabrakan lalu simpan ulang draft.";
  if (/base|produk/i.test(message)) return "Harga dasar produk belum tersedia atau rincian produk tidak valid.";
  if (/berwenang|authorized|permission/i.test(message)) return "Akun ini tidak berwenang mengubah atau mengirim harga.";
  if (/total/i.test(message)) return "Total final harus lebih besar dari Rp0 dan seluruh nominal harus valid.";
  if (/stage|status|tahap|review/i.test(message)) return "Tahap pesanan tidak sesuai. Muat ulang rincian pesanan sebelum melanjutkan.";
  return "Harga belum dapat diproses. Draft tetap tersedia; periksa kembali lalu coba lagi.";
}

function pricingTotals(value: unknown): PricingTotals | null {
  const row = asRecord(value);
  if (!row) return null;
  const totals = { ...EMPTY_TOTALS };
  for (const key of Object.keys(totals) as Array<keyof PricingTotals>) {
    const next = integer(row[key]);
    if (next === null) return null;
    totals[key] = next;
  }
  return totals;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function integer(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isSafeInteger(numeric) ? numeric : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((candidate): candidate is string => typeof candidate === "string") : [];
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function randomKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `pricing-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}
