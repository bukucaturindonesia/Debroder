"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { getQuotationStatusLabel } from "@/lib/quotation-status-copy";
import { AdminAlert, AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import {
  isAdminRole,
  QUOTATION_ROLES
} from "@/components/admin/layout/admin-navigation";
import { QuotationItemManager } from "@/components/admin/QuotationItemManager";
import { QuotationProductItemPanel } from "@/components/admin/QuotationProductItemPanel";
import { QuotationServiceManager } from "@/components/admin/QuotationServiceManager";
import { QuotationLifecycleManager } from "@/components/admin/QuotationLifecycleManager";
import { QuotationVersionManager } from "@/components/admin/QuotationVersionManager";
import { MockupApprovalManager } from "@/components/admin/MockupApprovalManager";

type Quotation = {
  id: string;
  quotation_number: string;
  customer_name: string;
  company_name: string | null;
  customer_email: string | null;
  customer_phone: string;
  billing_address: string | null;
  shipping_address: string | null;
  po_number: string | null;
  status: string;
  currency: string;
  valid_until: string | null;
  public_notes: string | null;
  internal_notes: string | null;
  product_subtotal: number;
  service_subtotal: number;
  additional_cost: number;
  discount_total: number;
  confirmed_total: number | null;
  estimated_total: number | null;
  has_pending_pricing: boolean;
  created_at: string;
  updated_at: string;
};

type QuotationItem = {
  id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  color_name_snapshot: string | null;
  size_name_snapshot: string | null;
  sku_snapshot: string | null;
  quantity: number;
  unit_price: number | null;
  pricing_status: string;
  subtotal: number | null;
  customer_notes: string | null;
  sort_order: number;
};

type StatusHistory = {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
};

const PRICING_LABELS: Record<string, string> = {
  confirmed: "Harga pasti",
  estimated: "Estimasi",
  pending: "Menunggu harga"
};

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "Menunggu harga";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {})
  }).format(new Date(value));
}

export function QuotationDetailAdmin() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();

  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function loadQuotation() {
    if (!quotationId) {
      setNotFound(true);
      setMessage("ID quotation tidak tersedia.");
      setLoading(false);
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      setMessage("Supabase belum dikonfigurasi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setMessage("");

    const [quotationResult, itemResult, historyResult] = await Promise.all([
      supabase
        .from("quotations")
        .select(
          "id,quotation_number,customer_name,company_name,customer_email,customer_phone,billing_address,shipping_address,po_number,status,currency,valid_until,public_notes,internal_notes,product_subtotal,service_subtotal,additional_cost,discount_total,confirmed_total,estimated_total,has_pending_pricing,created_at,updated_at"
        )
        .eq("id", quotationId)
        .maybeSingle(),
      supabase
        .from("quotation_items")
        .select(
          "id,product_name_snapshot,variant_name_snapshot,color_name_snapshot,size_name_snapshot,sku_snapshot,quantity,unit_price,pricing_status,subtotal,customer_notes,sort_order,archived_at"
        )
        .eq("quotation_id", quotationId)
        .is("archived_at", null)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("quotation_status_history")
        .select("id,from_status,to_status,note,created_at")
        .eq("quotation_id", quotationId)
        .order("created_at", { ascending: false })
    ]);

    setLoading(false);

    if (quotationResult.error) {
      setMessage("Detail penawaran gagal dimuat.");
      return;
    }

    if (!quotationResult.data) {
      setQuotation(null);
      setItems([]);
      setHistory([]);
      setNotFound(true);
      setMessage("Penawaran tidak ditemukan atau tautannya sudah tidak berlaku.");
      return;
    }

    if (itemResult.error || historyResult.error) {
      setMessage("Sebagian rincian quotation belum berhasil dimuat.");
    }

    setQuotation(quotationResult.data as Quotation);
    setItems((itemResult.data || []) as QuotationItem[]);
    setHistory((historyResult.data || []) as StatusHistory[]);
  }

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const supabase = createSupabaseClient();
      if (!supabase) {
        if (active) {
          setMessage("Supabase belum dikonfigurasi.");
          setCheckingAccess(false);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (
        error ||
        !profile ||
        !isAdminRole(profile.role) ||
        !QUOTATION_ROLES.includes(profile.role)
      ) {
        setMessage("Akses detail quotation ditolak.");
        setCheckingAccess(false);
        setLoading(false);
        return;
      }

      setAllowed(true);
      setCheckingAccess(false);
      await loadQuotation();
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [quotationId, router]);

  if (checkingAccess) {
    return (
      <main className="text-brand-charcoal">
        <AdminLoadingState label="Memeriksa akses quotation..." />
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="text-brand-charcoal">
        <AdminAlert type="error">
          {message || "Akses detail quotation ditolak."}
        </AdminAlert>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="text-brand-charcoal">
        <AdminLoadingState label="Memuat detail quotation..." />
      </main>
    );
  }

  if (notFound || !quotation) {
    return (
      <main className="text-brand-charcoal">
        <AdminErrorState
          title="Penawaran tidak ditemukan"
          description={message}
          action={
            <Link
              href="/admin/orders/quotations"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white"
            >
              Kembali ke Daftar
            </Link>
          }
        />
      </main>
    );
  }

  const displayedTotal =
    quotation.confirmed_total !== null
      ? quotation.confirmed_total
      : quotation.estimated_total;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Penawaran Resmi"
          title={quotation.quotation_number}
          description={`${quotation.customer_name}${
            quotation.company_name ? ` · ${quotation.company_name}` : ""
          }`}
          actions={
            <>
              <MockupApprovalManager />
              <QuotationVersionManager />
              <QuotationLifecycleManager />
              <Link
                href="/admin/orders/quotations"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
              >
                Kembali
              </Link>
              <button
                type="button"
                onClick={() => void loadQuotation()}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-charcoal bg-white px-5 text-sm font-semibold"
              >
                Refresh
              </button>
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-brand-softGray bg-white px-3 py-1.5 text-xs font-semibold">
            {getQuotationStatusLabel(quotation.status, "admin")}
          </span>
          {quotation.has_pending_pricing ? (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              Ada harga pending
            </span>
          ) : null}
        </div>

        {message ? <AdminAlert type="warning">{message}</AdminAlert> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
          <div className="grid content-start gap-6">
            <section className="border border-brand-softGray bg-white p-5 sm:p-7">
              <h2 className="text-2xl font-semibold">Data Pelanggan</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <DataPoint label="Nama" value={quotation.customer_name} />
                <DataPoint label="Perusahaan" value={quotation.company_name} />
                <DataPoint label="WhatsApp" value={quotation.customer_phone} />
                <DataPoint label="Email" value={quotation.customer_email} />
                <DataPoint label="Nomor PO" value={quotation.po_number} />
                <DataPoint
                  label="Berlaku sampai"
                  value={formatDate(quotation.valid_until)}
                />
              </dl>
            </section>

            <section className="border border-brand-softGray bg-white p-5 sm:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                    Rincian Quotation
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Produk & Layanan
                  </h2>
                  <p className="mt-2 text-sm text-brand-charcoal/60">
                    {items.length} item produk tersimpan
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <QuotationItemManager />
                  <QuotationServiceManager />
                  <QuotationProductItemPanel />
                </div>
              </div>

              {items.length ? (
                <div className="mt-6 divide-y divide-brand-softGray border-y border-brand-softGray">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {item.product_name_snapshot}
                        </h3>
                        <p className="mt-1 text-sm text-brand-charcoal/60">
                          {[
                            item.color_name_snapshot ||
                              item.variant_name_snapshot,
                            item.size_name_snapshot,
                            item.sku_snapshot
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Tanpa varian"}
                        </p>
                        {item.customer_notes ? (
                          <p className="mt-2 text-sm text-brand-charcoal/60">
                            Catatan: {item.customer_notes}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-end justify-between gap-6 md:block md:text-right">
                        <div>
                          <p className="text-sm font-semibold">
                            {item.quantity} pcs
                          </p>
                          <p className="mt-1 text-xs font-semibold text-brand-charcoal/50">
                            {PRICING_LABELS[item.pricing_status] ||
                              item.pricing_status}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatMoney(item.subtotal)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 border border-dashed border-brand-softGray bg-brand-offWhite p-8 text-center">
                  <p className="font-semibold">Belum ada produk</p>
                  <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
                    Gunakan tombol Tambah Produk di kanan atas bagian ini.
                  </p>
                </div>
              )}
            </section>

            <section className="border border-brand-softGray bg-white p-5 sm:p-7">
              <h2 className="text-2xl font-semibold">Catatan & Alamat</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <InfoBlock
                  label="Alamat penagihan"
                  value={quotation.billing_address}
                />
                <InfoBlock
                  label="Alamat pengiriman"
                  value={quotation.shipping_address}
                />
                <InfoBlock
                  label="Catatan pelanggan"
                  value={quotation.public_notes}
                />
                <InfoBlock
                  label="Catatan internal"
                  value={quotation.internal_notes}
                />
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-6">
            <section className="border border-brand-softGray bg-white p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                Ringkasan Harga
              </p>
              <p className="mt-3 text-3xl font-semibold">
                {formatMoney(displayedTotal)}
              </p>
              <dl className="mt-6 grid gap-3 text-sm">
                <SummaryRow
                  label="Subtotal produk"
                  value={quotation.product_subtotal}
                />
                <SummaryRow
                  label="Subtotal layanan"
                  value={quotation.service_subtotal}
                />
                <SummaryRow
                  label="Biaya tambahan"
                  value={quotation.additional_cost}
                />
                <SummaryRow
                  label="Potongan"
                  value={-quotation.discount_total}
                />
              </dl>
              {quotation.has_pending_pricing ? (
                <p className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  Total belum final karena masih ada harga yang harus ditentukan.
                </p>
              ) : null}
            </section>

            <section className="border border-brand-softGray bg-white p-5 sm:p-7">
              <h2 className="text-xl font-semibold">Riwayat Status</h2>
              {history.length ? (
                <div className="mt-5 grid gap-4">
                  {history.map((entry) => (
                    <article
                      key={entry.id}
                      className="border-l-2 border-brand-charcoal pl-4"
                    >
                      <p className="text-sm font-semibold">
                        {entry.from_status
                          ? `${
                              getQuotationStatusLabel(entry.from_status, "admin")
                            } → `
                          : ""}
                        {getQuotationStatusLabel(entry.to_status, "admin")}
                      </p>
                      <p className="mt-1 text-xs text-brand-charcoal/55">
                        {formatDate(entry.created_at, true)}
                      </p>
                      {entry.note ? (
                        <p className="mt-2 text-sm text-brand-charcoal/65">
                          {entry.note}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-brand-charcoal/60">
                  Belum ada perubahan status.
                </p>
              )}
            </section>

            <section className="border border-brand-softGray bg-white p-5 text-sm text-brand-charcoal/60">
              <p>Dibuat: {formatDate(quotation.created_at, true)}</p>
              <p className="mt-2">
                Diperbarui: {formatDate(quotation.updated_at, true)}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function DataPoint({
  label,
  value
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
        {label}
      </dt>
      <dd className="mt-2 font-semibold">{value || "-"}</dd>
    </div>
  );
}

function InfoBlock({
  label,
  value
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="border border-brand-softGray bg-brand-offWhite p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6">
        {value || "-"}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-brand-softGray pb-3 last:border-0 last:pb-0">
      <dt className="text-brand-charcoal/60">{label}</dt>
      <dd className="font-semibold">{formatMoney(value)}</dd>
    </div>
  );
}
