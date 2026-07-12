"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

type ManagedItem = {
  id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  color_name_snapshot: string | null;
  size_name_snapshot: string | null;
  quantity: number;
  subtotal: number | null;
};

function formatMoney(value: number | null) {
  if (value === null) return "Menunggu harga";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

export function QuotationItemManager() {
  const params = useParams<{ id?: string | string[] }>();
  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [items, setItems] = useState<ManagedItem[]>([]);
  const [quotationStatus, setQuotationStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<ManagedItem | null>(null);
  const [message, setMessage] = useState("");

  async function loadItems() {
    const supabase = createSupabaseClient();
    if (!supabase || !quotationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [quotationResult, itemResult] = await Promise.all([
      supabase
        .from("quotations")
        .select("status")
        .eq("id", quotationId)
        .maybeSingle(),
      supabase
        .from("quotation_items")
        .select(
          "id,product_name_snapshot,variant_name_snapshot,color_name_snapshot,size_name_snapshot,quantity,subtotal"
        )
        .eq("quotation_id", quotationId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    ]);

    setLoading(false);

    if (quotationResult.error || itemResult.error) {
      setMessage(
        `Item quotation gagal dimuat: ${
          quotationResult.error?.message || itemResult.error?.message || "Kesalahan tidak diketahui"
        }`
      );
      return;
    }

    setQuotationStatus(String(quotationResult.data?.status || ""));
    setItems((itemResult.data || []) as ManagedItem[]);
  }

  useEffect(() => {
    void loadItems();
    // loadItems only depends on the resolved quotation id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  async function deleteItem() {
    if (!confirmItem || deletingId || quotationStatus !== "draft") return;

    const supabase = createSupabaseClient();
    if (!supabase) {
      setMessage("Supabase belum dikonfigurasi.");
      return;
    }

    setDeletingId(confirmItem.id);
    setMessage("");

    const { error } = await supabase
      .from("quotation_items")
      .delete()
      .eq("id", confirmItem.id)
      .eq("quotation_id", quotationId);

    if (error) {
      setDeletingId(null);
      setMessage(`Produk gagal dihapus: ${error.message}`);
      return;
    }

    const { error: refreshError } = await supabase.rpc(
      "refresh_quotation_totals",
      { p_quotation_id: quotationId }
    );

    if (refreshError) {
      setDeletingId(null);
      setMessage(
        `Produk terhapus, tetapi total gagal diperbarui: ${refreshError.message}`
      );
      return;
    }

    setItems((current) => current.filter((item) => item.id !== confirmItem.id));
    setConfirmItem(null);
    setDeletingId(null);
    setMessage("Produk berhasil dihapus dan total quotation diperbarui.");
    window.location.reload();
  }

  const editable = quotationStatus === "draft";

  if (loading || !items.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage("");
          setOpen(true);
        }}
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold text-brand-charcoal transition hover:border-brand-charcoal"
      >
        Kelola Produk
      </button>

      {open ? (
        <div className="fixed inset-0 z-[85] overflow-y-auto bg-black/45 p-4 sm:p-8">
          <div className="mx-auto max-w-3xl border border-brand-softGray bg-brand-offWhite shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-brand-softGray bg-white p-5 sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                  Formal Quotation
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-brand-charcoal">
                  Kelola Produk
                </h2>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/65">
                  Produk hanya dapat dihapus ketika quotation masih berstatus Draft.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!deletingId) {
                    setConfirmItem(null);
                    setOpen(false);
                  }
                }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-softGray bg-white text-xl"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:p-7">
              {message ? (
                <div
                  role="status"
                  className={`border p-4 text-sm font-semibold ${
                    message.includes("berhasil")
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              {!editable ? (
                <div className="border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Penghapusan dikunci karena quotation sudah tidak berstatus Draft.
                </div>
              ) : null}

              {items.map((item) => (
                <article
                  key={item.id}
                  className="border border-brand-softGray bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-brand-charcoal">
                        {item.product_name_snapshot}
                      </h3>
                      <p className="mt-1 text-sm text-brand-charcoal/60">
                        {[
                          item.color_name_snapshot || item.variant_name_snapshot,
                          item.size_name_snapshot,
                          `${item.quantity} pcs`
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-brand-charcoal">
                        {formatMoney(item.subtotal)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfirmItem(item)}
                      disabled={!editable || Boolean(deletingId)}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {confirmItem ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/55 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-quotation-item-title"
            className="w-full max-w-lg border border-red-200 bg-white p-6 shadow-2xl sm:p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              Konfirmasi Penghapusan
            </p>
            <h2
              id="delete-quotation-item-title"
              className="mt-2 text-2xl font-semibold text-brand-charcoal"
            >
              Hapus produk dari quotation?
            </h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              <strong>{confirmItem.product_name_snapshot}</strong> sebanyak {confirmItem.quantity} pcs akan dihapus permanen dari quotation. Total harga akan dihitung ulang.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void deleteItem()}
                disabled={Boolean(deletingId)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-6 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deletingId ? "Menghapus..." : "Ya, Hapus Produk"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                disabled={Boolean(deletingId)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-6 text-sm font-semibold text-brand-charcoal disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
