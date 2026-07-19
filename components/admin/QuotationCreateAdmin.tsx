"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { setAdminFlash } from "@/components/admin/layout/admin-flash";
import {
  isAdminRole,
  QUOTATION_ROLES
} from "@/components/admin/layout/admin-navigation";

type FormState = {
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

const initialForm: FormState = {
  customer_name: "",
  company_name: "",
  customer_email: "",
  customer_phone: "",
  billing_address: "",
  shipping_address: "",
  po_number: "",
  valid_until: "",
  public_notes: "",
  internal_notes: "",
  additional_cost: "0",
  discount_total: "0"
};

function toNonNegativeInteger(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

export function QuotationCreateAdmin() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const supabase = createSupabaseClient();
      if (!supabase) {
        if (active) {
          setMessage("Layanan data belum tersedia. Hubungi pengelola sistem.");
          setCheckingAccess(false);
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
        setMessage("Akses membuat quotation ditolak.");
        setCheckingAccess(false);
        return;
      }

      setUserId(user.id);
      setAllowed(true);
      setCheckingAccess(false);
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!form.customer_name.trim()) {
      setMessage("Nama pelanggan wajib diisi.");
      return;
    }

    if (!form.customer_phone.trim()) {
      setMessage("Nomor WhatsApp pelanggan wajib diisi.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase || !userId) {
      setMessage("Sesi admin belum siap.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      customer_name: form.customer_name.trim(),
      company_name: form.company_name.trim() || null,
      customer_email: form.customer_email.trim() || null,
      customer_phone: form.customer_phone.trim(),
      billing_address: form.billing_address.trim() || null,
      shipping_address: form.shipping_address.trim() || null,
      po_number: form.po_number.trim() || null,
      status: "draft",
      currency: "IDR",
      valid_until: form.valid_until
        ? new Date(`${form.valid_until}T23:59:59`).toISOString()
        : null,
      public_notes: form.public_notes.trim() || null,
      internal_notes: form.internal_notes.trim() || null,
      product_subtotal: 0,
      service_subtotal: 0,
      additional_cost: toNonNegativeInteger(form.additional_cost),
      discount_total: toNonNegativeInteger(form.discount_total),
      confirmed_total: null,
      estimated_total: null,
      has_pending_pricing: true,
      created_by: userId,
      updated_by: userId
    };

    const { data, error } = await supabase
      .from("quotations")
      .insert(payload)
      .select("id,quotation_number")
      .single();

    if (error || !data) {
      setSaving(false);
      setMessage("Penawaran belum dapat dibuat. Periksa data lalu coba kembali.");
      return;
    }

    setAdminFlash(
      `Draft ${data.quotation_number} berhasil dibuat.`,
      "success"
    );
    router.replace(`/admin/orders/quotations/${data.id}`);
    router.refresh();
  }

  if (checkingAccess) {
    return (
      <main className="text-brand-charcoal">
        <AdminLoadingState label="Memeriksa akses pembuatan quotation..." />
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="text-brand-charcoal">
        <AdminAlert type="error">
          {message || "Akses membuat quotation ditolak."}
        </AdminAlert>
      </main>
    );
  }

  const inputClass =
    "mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 text-sm outline-none focus:border-brand-charcoal disabled:bg-brand-offWhite disabled:text-brand-charcoal/50";
  const textareaClass =
    "mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 text-sm outline-none focus:border-brand-charcoal disabled:bg-brand-offWhite disabled:text-brand-charcoal/50";

  return (
    <main className="text-brand-charcoal">
      <div className="mx-auto grid max-w-5xl gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · PENAWARAN HARGA RESMI"
          title="Buat Penawaran Baru"
          description="Buat data awal pelanggan. Produk, varian, ukuran, layanan, dan harga dilanjutkan pada halaman detail."
        />

        {message ? <AdminAlert type="error">{message}</AdminAlert> : null}

        <form
          onSubmit={submit}
          aria-busy={saving}
          className="grid gap-6 border border-brand-softGray bg-white p-5 sm:p-7"
        >
          <fieldset disabled={saving} className="contents">
            <section>
              <h2 className="text-xl font-semibold">Data Pelanggan</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Nama pelanggan *
                  <input
                    value={form.customer_name}
                    onChange={(event) =>
                      updateField("customer_name", event.target.value)
                    }
                    autoComplete="name"
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Nama perusahaan
                  <input
                    value={form.company_name}
                    onChange={(event) =>
                      updateField("company_name", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-semibold">
                  WhatsApp *
                  <input
                    value={form.customer_phone}
                    onChange={(event) =>
                      updateField("customer_phone", event.target.value)
                    }
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08xxxxxxxxxx"
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Email
                  <input
                    type="email"
                    value={form.customer_email}
                    onChange={(event) =>
                      updateField("customer_email", event.target.value)
                    }
                    autoComplete="email"
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Nomor PO pelanggan
                  <input
                    value={form.po_number}
                    onChange={(event) =>
                      updateField("po_number", event.target.value)
                    }
                    placeholder="Opsional, isi bila pelanggan memiliki PO"
                    className={inputClass}
                  />
                  <span className="mt-2 block text-xs font-medium leading-5 text-brand-charcoal/55">
                    Kosongkan untuk pelanggan perorangan atau pelanggan yang belum mengirim Purchase Order.
                  </span>
                </label>
                <label className="text-sm font-semibold">
                  Berlaku sampai
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(event) =>
                      updateField("valid_until", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </section>

            <section className="border-t border-brand-softGray pt-6">
              <h2 className="text-xl font-semibold">Alamat</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Alamat penagihan
                  <textarea
                    rows={4}
                    value={form.billing_address}
                    onChange={(event) =>
                      updateField("billing_address", event.target.value)
                    }
                    className={textareaClass}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Alamat pengiriman
                  <textarea
                    rows={4}
                    value={form.shipping_address}
                    onChange={(event) =>
                      updateField("shipping_address", event.target.value)
                    }
                    className={textareaClass}
                  />
                </label>
              </div>
            </section>

            <section className="border-t border-brand-softGray pt-6">
              <h2 className="text-xl font-semibold">Biaya & Catatan Awal</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Biaya tambahan
                  <input
                    type="number"
                    min={0}
                    value={form.additional_cost}
                    onChange={(event) =>
                      updateField("additional_cost", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Potongan harga
                  <input
                    type="number"
                    min={0}
                    value={form.discount_total}
                    onChange={(event) =>
                      updateField("discount_total", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-semibold md:col-span-2">
                  Catatan untuk pelanggan
                  <textarea
                    rows={4}
                    value={form.public_notes}
                    onChange={(event) =>
                      updateField("public_notes", event.target.value)
                    }
                    className={textareaClass}
                  />
                </label>
                <label className="text-sm font-semibold md:col-span-2">
                  Catatan internal
                  <textarea
                    rows={4}
                    value={form.internal_notes}
                    onChange={(event) =>
                      updateField("internal_notes", event.target.value)
                    }
                    className={textareaClass}
                  />
                </label>
              </div>
            </section>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-brand-softGray pt-6 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Menyimpan Draft..." : "Buat Draft Penawaran"}
            </button>
            <Link
              href="/admin/orders/quotations"
              aria-disabled={saving}
              className={`inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-6 text-sm font-semibold ${
                saving ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Batal
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
