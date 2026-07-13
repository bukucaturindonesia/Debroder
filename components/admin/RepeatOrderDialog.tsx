"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { repeatOrderApiFetch } from "@/lib/admin-repeat-order-api";
import {
  canCreateRepeatOrder,
  type RepeatOrderPreview
} from "@/lib/repeat-orders";

function money(value: number | null, currency = "IDR") {
  if (value === null) return "Perlu pemeriksaan";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function createIdempotencyKey(orderId: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `repeat-order:${orderId}:${random}`;
}

export function RepeatOrderDialog({
  orderId,
  compact = false,
  onCreated
}: {
  orderId: string;
  compact?: boolean;
  onCreated?: (quotationId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<RepeatOrderPreview | null>(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    id: string;
    number: string;
    warning: string | null;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const canCreate = useMemo(() => canCreateRepeatOrder(role), [role]);

  async function loadPreview() {
    setLoading(true);
    setError("");
    try {
      const payload = await repeatOrderApiFetch<{
        preview: RepeatOrderPreview;
        role: string;
      }>(`/api/admin/repeat-orders/${orderId}`);
      setPreview(payload.preview);
      setRole(payload.role);
      setIdempotencyKey(createIdempotencyKey(orderId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Preview Repeat Order gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !preview && !loading) void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function createRepeatOrder() {
    if (!preview || !canCreate || working || reason.trim().length < 3) return;
    setWorking(true);
    setError("");
    try {
      const payload = await repeatOrderApiFetch<{
        quotation: {
          id: string;
          quotation_number: string;
        };
        pricingWarning: string | null;
      }>("/api/admin/repeat-orders", {
        method: "POST",
        body: JSON.stringify({
          sourceOrderId: preview.source.id,
          reason: reason.trim(),
          idempotencyKey
        })
      });
      setSuccess({
        id: payload.quotation.id,
        number: payload.quotation.quotation_number,
        warning: payload.pricingWarning
      });
      onCreated?.(payload.quotation.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Repeat Order gagal dibuat.");
    } finally {
      setWorking(false);
    }
  }

  function close() {
    if (working) return;
    setOpen(false);
    setPreview(null);
    setSuccess(null);
    setError("");
    setReason("");
    setIdempotencyKey("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex min-h-10 items-center justify-center rounded-full border border-brand-green/30 bg-brand-green/5 px-4 text-sm font-semibold text-brand-green"
            : "inline-flex min-h-10 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white"
        }
      >
        Repeat Order
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <section className="mx-auto w-full max-w-4xl bg-white p-5 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">
                  Phase 14 · Repeat Order
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Konfirmasi Repeat Order</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/65">
                  Sistem membuat quotation baru yang terhubung ke order lama. Produk memakai harga aktif bila dapat dihitung; layanan, stok berubah, dan desain tetap wajib diperiksa sebelum menjadi pesanan resmi.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={working}
                aria-label="Tutup dialog"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-softGray text-lg"
              >
                ×
              </button>
            </div>

            {loading ? (
              <div className="mt-8 border border-brand-softGray bg-brand-offWhite p-8 text-center text-sm font-semibold">
                Memeriksa order lama, harga aktif, stok, layanan, dan referensi desain...
              </div>
            ) : null}

            {error ? (
              <div role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-6 border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-semibold text-emerald-900">Repeat Order berhasil dibuat</h3>
                <p className="mt-2 text-sm text-emerald-800">
                  Quotation baru: <strong>{success.number}</strong>. Order lama tidak berubah.
                </p>
                {success.warning ? (
                  <p className="mt-2 text-sm text-amber-800">{success.warning}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/admin/orders/quotations/${success.id}`}
                    className="inline-flex min-h-10 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white"
                  >
                    Buka Quotation Baru
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : null}

            {preview && !success ? (
              <div className="mt-7 grid gap-6">
                <section className="grid gap-4 border border-brand-softGray bg-brand-offWhite p-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Data label="Order sumber" value={preview.source.order_number} />
                  <Data label="Pelanggan" value={preview.source.customer_name} />
                  <Data label="Status" value={preview.source.status} />
                  <Data label="Repeat sebelumnya" value={String(preview.history.length)} />
                </section>

                <section className="border border-brand-softGray">
                  <div className="border-b border-brand-softGray bg-brand-offWhite px-5 py-4">
                    <h3 className="font-semibold">Produk dan validasi harga aktif</h3>
                  </div>
                  <div className="divide-y divide-brand-softGray">
                    {preview.items.map((item) => (
                      <article key={item.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                        <div>
                          <h4 className="font-semibold">{item.product_name}</h4>
                          <p className="mt-1 text-sm text-brand-charcoal/60">
                            {[item.variant_name, item.color, item.size, `${item.quantity} pcs`]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {item.message ? (
                            <p className={`mt-2 text-xs font-semibold ${item.availability === "available" ? "text-amber-700" : "text-red-700"}`}>
                              {item.message}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs font-semibold text-emerald-700">Harga dan stok aktif tersedia.</p>
                          )}
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs text-brand-charcoal/50">Harga lama</p>
                          <p className="font-semibold">{money(item.source_unit_price, preview.source.currency)}</p>
                          <p className="mt-2 text-xs text-brand-charcoal/50">Harga aktif</p>
                          <p className="font-semibold">{money(item.current_unit_price, preview.source.currency)}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {preview.services.length ? (
                  <section className="border border-brand-softGray bg-white p-5">
                    <h3 className="font-semibold">Layanan dari order lama</h3>
                    <div className="mt-4 grid gap-3">
                      {preview.services.map((service) => (
                        <div key={service.id} className="border-t border-brand-softGray pt-3 text-sm">
                          <strong>{service.service_name}</strong> · {service.quantity} pcs
                          {service.position ? ` · ${service.position}` : ""}
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs font-semibold text-amber-700">
                      Harga layanan dibuat pending dan harus diperiksa ulang pada quotation baru.
                    </p>
                  </section>
                ) : null}

                {preview.warnings.length ? (
                  <section className="border border-amber-200 bg-amber-50 p-5">
                    <h3 className="font-semibold text-amber-900">Hal yang wajib diperiksa</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-amber-900">
                      {preview.warnings.map((warning) => (
                        <li key={warning}>• {warning}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {!canCreate ? (
                  <div className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                    Role Anda dapat melihat order, tetapi tidak diizinkan membuat Repeat Order.
                  </div>
                ) : !preview.eligible ? (
                  <div className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                    Order ini belum memenuhi syarat Repeat Order.
                  </div>
                ) : (
                  <label className="block text-sm font-semibold">
                    Alasan Repeat Order
                    <textarea
                      rows={4}
                      maxLength={500}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Contoh: pelanggan ingin memesan ulang desain dan kombinasi yang sama untuk batch Agustus."
                      className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 font-normal"
                    />
                    <span className="mt-1 block text-xs font-normal text-brand-charcoal/50">
                      {reason.trim().length}/500 karakter
                    </span>
                  </label>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-brand-softGray pt-5">
                  <button
                    type="button"
                    onClick={close}
                    disabled={working}
                    className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-6 text-sm font-semibold"
                  >
                    Batal
                  </button>
                  {canCreate && preview.eligible ? (
                    <button
                      type="button"
                      onClick={() => void createRepeatOrder()}
                      disabled={working || reason.trim().length < 3}
                      className="inline-flex min-h-11 items-center rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {working ? "Membuat Repeat Order..." : "Konfirmasi & Buat Quotation Baru"}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{label}</dt>
      <dd className="mt-2 text-sm font-semibold">{value}</dd>
    </div>
  );
}
