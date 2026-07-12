"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import {
  getQuotationStatusCopy,
  getQuotationStatusErrorMessage,
  getQuotationStatusTransitions
} from "@/lib/quotation-status-copy";

type Quotation = {
  id: string;
  customer_name: string;
  company_name: string | null;
  customer_email: string | null;
  customer_phone: string;
  billing_address: string | null;
  shipping_address: string | null;
  po_number: string | null;
  valid_until: string | null;
  public_notes: string | null;
  internal_notes: string | null;
  additional_cost: number;
  discount_total: number;
  status: string;
  archived_at: string | null;
};

type EditState = {
  customer_name: string;
  company_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address: string;
  shipping_address: string;
  po_number: string;
  valid_until: string;
  public_notes: string;
  internal_notes: string;
  additional_cost: string;
  discount_total: string;
};

function dateInput(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function nonNegative(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export function QuotationLifecycleManager() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"edit" | "status" | "archive">("edit");
  const [form, setForm] = useState<EditState | null>(null);
  const [statusTarget, setStatusTarget] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function loadQuotation() {
    const supabase = createSupabaseClient();
    if (!supabase || !quotationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("quotations")
      .select("id,customer_name,company_name,customer_email,customer_phone,billing_address,shipping_address,po_number,valid_until,public_notes,internal_notes,additional_cost,discount_total,status,archived_at")
      .eq("id", quotationId)
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      setMessage("Data penawaran belum berhasil dimuat.");
      return;
    }

    const row = data as Quotation;
    setQuotation(row);
    setForm({
      customer_name: row.customer_name,
      company_name: row.company_name || "",
      customer_email: row.customer_email || "",
      customer_phone: row.customer_phone,
      billing_address: row.billing_address || "",
      shipping_address: row.shipping_address || "",
      po_number: row.po_number || "",
      valid_until: dateInput(row.valid_until),
      public_notes: row.public_notes || "",
      internal_notes: row.internal_notes || "",
      additional_cost: String(row.additional_cost || 0),
      discount_total: String(row.discount_total || 0)
    });
    setStatusTarget(getQuotationStatusTransitions(row.status)[0]?.value || "");
  }

  useEffect(() => {
    void loadQuotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quotation || !form || working || quotation.status !== "draft") return;

    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setMessage("Nama pelanggan dan WhatsApp wajib diisi.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    setMessage("");

    const { error } = await supabase
      .from("quotations")
      .update({
        customer_name: form.customer_name.trim(),
        company_name: form.company_name.trim() || null,
        customer_email: form.customer_email.trim() || null,
        customer_phone: form.customer_phone.trim(),
        billing_address: form.billing_address.trim() || null,
        shipping_address: form.shipping_address.trim() || null,
        po_number: form.po_number.trim() || null,
        valid_until: form.valid_until
          ? new Date(`${form.valid_until}T23:59:59`).toISOString()
          : null,
        public_notes: form.public_notes.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
        additional_cost: nonNegative(form.additional_cost),
        discount_total: nonNegative(form.discount_total),
        updated_at: new Date().toISOString()
      })
      .eq("id", quotation.id)
      .is("archived_at", null);

    if (error) {
      setWorking(false);
      setMessage("Perubahan penawaran gagal disimpan.");
      return;
    }

    const { error: totalError } = await supabase.rpc("refresh_quotation_totals", {
      p_quotation_id: quotation.id
    });

    setWorking(false);

    if (totalError) {
      setMessage("Data tersimpan, tetapi total penawaran belum berhasil diperbarui.");
      return;
    }

    setMessage("Penawaran berhasil diperbarui.");
    await loadQuotation();
    window.location.reload();
  }

  async function transitionStatus() {
    if (!quotation || !statusTarget || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    setMessage("");

    const selectedTransition = getQuotationStatusTransitions(
      quotation.status
    ).find((item) => item.value === statusTarget);

    if (selectedTransition?.noteRequired && !statusNote.trim()) {
      setWorking(false);
      setMessage("Catatan perubahan wajib diisi untuk tindakan ini.");
      return;
    }

    const { error } = await supabase.rpc("transition_quotation_status", {
      p_quotation_id: quotation.id,
      p_to_status: statusTarget,
      p_note: statusNote.trim() || null
    });

    setWorking(false);

    if (error) {
      setMessage(getQuotationStatusErrorMessage(error.message));
      return;
    }

    setStatusNote("");
    setMessage(
      `Status penawaran berhasil diubah menjadi ${
        getQuotationStatusCopy(statusTarget).adminLabel
      }.`
    );
    await loadQuotation();
    window.location.reload();
  }

  async function archiveQuotation() {
    if (!quotation || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    setMessage("");

    const { error } = await supabase.rpc("archive_quotation", {
      p_quotation_id: quotation.id,
      p_reason: archiveReason.trim() || null
    });

    setWorking(false);

    if (error) {
      setMessage("Penawaran gagal dipindahkan ke Gudang Arsip.");
      return;
    }

    router.replace("/admin/orders/quotations/archive");
    router.refresh();
  }

  if (loading || !quotation || !form) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold opacity-50"
      >
        Memuat...
      </button>
    );
  }

  const editable = quotation.status === "draft";
  const transitions = getQuotationStatusTransitions(quotation.status);
  const currentStatusCopy = getQuotationStatusCopy(quotation.status);
  const selectedTransition =
    transitions.find((item) => item.value === statusTarget) || null;
  const inputClass =
    "mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 text-sm outline-none focus:border-brand-charcoal disabled:bg-brand-offWhite";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
        className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold transition hover:border-brand-charcoal"
      >
        Kelola Penawaran
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/45 p-4 sm:p-8">
          <section className="mx-auto max-w-4xl border border-brand-softGray bg-brand-offWhite shadow-2xl">
            <header className="flex flex-col gap-5 border-b border-brand-softGray bg-white p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                  Penawaran Resmi
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Kelola Penawaran</h2>
                <p className="mt-2 text-sm text-brand-charcoal/60">
                  Perbarui data, jalankan tahapan penawaran, atau pindahkan penawaran ke Gudang Arsip.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={working}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-softGray bg-white text-xl"
                aria-label="Tutup"
              >
                ×
              </button>
            </header>

            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap gap-2">
                {[
                  ["edit", "Edit Data"],
                  ["status", "Status"],
                  ["archive", "Arsipkan"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value as typeof tab)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      tab === value
                        ? "bg-brand-charcoal text-white"
                        : "border border-brand-softGray bg-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {message ? (
                <div className="mt-5 border border-brand-softGray bg-white p-4 text-sm font-semibold">
                  {message}
                </div>
              ) : null}

              {tab === "edit" ? (
                <form onSubmit={saveEdit} className="mt-6 grid gap-5">
                  {!editable ? (
                    <div className="border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                      Data penawaran hanya dapat diedit saat masih berstatus Draft Penawaran.
                    </div>
                  ) : null}

                  <fieldset disabled={!editable || working} className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold">
                      Nama pelanggan *
                      <input
                        value={form.customer_name}
                        onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      Perusahaan
                      <input
                        value={form.company_name}
                        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      WhatsApp *
                      <input
                        value={form.customer_phone}
                        onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      Email
                      <input
                        type="email"
                        value={form.customer_email}
                        onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      Nomor PO
                      <input
                        value={form.po_number}
                        onChange={(e) => setForm({ ...form, po_number: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      Berlaku sampai
                      <input
                        type="date"
                        value={form.valid_until}
                        onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      Biaya tambahan
                      <input
                        type="number"
                        min="0"
                        value={form.additional_cost}
                        onChange={(e) => setForm({ ...form, additional_cost: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      Potongan
                      <input
                        type="number"
                        min="0"
                        value={form.discount_total}
                        onChange={(e) => setForm({ ...form, discount_total: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    {[
                      ["billing_address", "Alamat penagihan"],
                      ["shipping_address", "Alamat pengiriman"],
                      ["public_notes", "Catatan pelanggan"],
                      ["internal_notes", "Catatan internal"]
                    ].map(([key, label]) => (
                      <label key={key} className="text-sm font-semibold md:col-span-2">
                        {label}
                        <textarea
                          rows={3}
                          value={form[key as keyof EditState]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 text-sm outline-none focus:border-brand-charcoal disabled:bg-brand-offWhite"
                        />
                      </label>
                    ))}
                  </fieldset>

                  <button
                    type="submit"
                    disabled={!editable || working}
                    className="w-fit rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
                  >
                    {working ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </form>
              ) : null}

              {tab === "status" ? (
                <div className="mt-6 grid gap-5">
                  <div className="border border-brand-softGray bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
                      Status saat ini
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {currentStatusCopy.adminLabel}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/60">
                      {currentStatusCopy.adminDescription}
                    </p>
                  </div>

                  {transitions.length ? (
                    <>
                      <label className="text-sm font-semibold">
                        Langkah berikutnya
                        <select
                          value={statusTarget}
                          onChange={(e) => setStatusTarget(e.target.value)}
                          className={inputClass}
                        >
                          {transitions.map((transition) => (
                            <option
                              key={transition.value}
                              value={transition.value}
                            >
                              {transition.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedTransition ? (
                        <div className="border border-brand-softGray bg-white p-4">
                          <p className="text-sm font-semibold">
                            {selectedTransition.label}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
                            {selectedTransition.description}
                          </p>
                        </div>
                      ) : null}

                      <label className="text-sm font-semibold">
                        Catatan perubahan
                        {selectedTransition?.noteRequired ? (
                          <span className="ml-1 text-red-700">*</span>
                        ) : (
                          <span className="ml-1 font-normal text-brand-charcoal/50">
                            (opsional)
                          </span>
                        )}
                        <textarea
                          rows={4}
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder={
                            selectedTransition?.notePlaceholder ||
                            "Tuliskan catatan perubahan, bila diperlukan"
                          }
                          className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 text-sm"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void transitionStatus()}
                        disabled={working || !statusTarget}
                        className="w-fit rounded-full bg-brand-charcoal px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
                      >
                        {working
                          ? "Menyimpan perubahan..."
                          : selectedTransition?.buttonLabel ||
                            "Simpan Perubahan Status"}
                      </button>
                    </>
                  ) : (
                    <div className="border border-dashed border-brand-softGray bg-white p-6 text-center">
                      <p className="font-semibold">Tidak ada tindakan status lanjutan untuk penawaran ini.</p>
                    </div>
                  )}
                </div>
              ) : null}

              {tab === "archive" ? (
                <div className="mt-6">
                  <div className="border border-amber-200 bg-amber-50 p-5">
                    <h3 className="text-xl font-semibold text-amber-900">Pindahkan penawaran ke Gudang Arsip?</h3>
                    <p className="mt-2 text-sm leading-6 text-amber-900/80">
                      Penawaran akan hilang dari daftar aktif, tetapi tetap dapat dipulihkan dari Gudang Arsip.
                    </p>
                  </div>
                  <label className="mt-5 block text-sm font-semibold">
                    Alasan arsip
                    <textarea
                      rows={4}
                      value={archiveReason}
                      onChange={(e) => setArchiveReason(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void archiveQuotation()}
                    disabled={working}
                    className="mt-5 rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
                  >
                    {working ? "Mengarsipkan..." : "Pindahkan ke Gudang Arsip"}
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
