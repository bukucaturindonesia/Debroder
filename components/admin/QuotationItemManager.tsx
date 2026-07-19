"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

type ManagedItem = {
  id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  color_name_snapshot: string | null;
  size_name_snapshot: string | null;
  quantity: number;
  unit_price: number | null;
  pricing_status: "confirmed" | "estimated" | "pending";
  subtotal: number | null;
  customer_notes: string | null;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
};

type EditState = {
  quantity: string;
  unitPrice: string;
  pricingStatus: "confirmed" | "estimated" | "pending";
  customerNotes: string;
};

const SUPER_ROLES = ["owner", "superadmin", "super_admin"];

function formatMoney(value: number | null) {
  if (value === null) return "Menunggu harga";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function QuotationItemManager() {
  const params = useParams<{ id?: string | string[] }>();
  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [items, setItems] = useState<ManagedItem[]>([]);
  const [quotationStatus, setQuotationStatus] = useState("");
  const [role, setRole] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "archive">("active");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ManagedItem | null>(null);
  const [editState, setEditState] = useState<EditState>({
    quantity: "1",
    unitPrice: "",
    pricingStatus: "confirmed",
    customerNotes: ""
  });
  const [archiveItem, setArchiveItem] = useState<ManagedItem | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteItem, setDeleteItem] = useState<ManagedItem | null>(null);
  const [message, setMessage] = useState("");

  async function loadItems() {
    const supabase = createSupabaseClient();
    if (!supabase || !quotationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    const [quotationResult, itemResult, profileResult] = await Promise.all([
      supabase.from("quotations").select("status").eq("id", quotationId).maybeSingle(),
      supabase
        .from("quotation_items")
        .select("id,product_name_snapshot,variant_name_snapshot,color_name_snapshot,size_name_snapshot,quantity,unit_price,pricing_status,subtotal,customer_notes,archived_at,archived_by,archive_reason")
        .eq("quotation_id", quotationId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      user
        ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    setLoading(false);

    if (quotationResult.error || itemResult.error || profileResult.error) {
      setMessage("Data pengelolaan produk belum berhasil dimuat.");
      return;
    }

    setQuotationStatus(String(quotationResult.data?.status || ""));
    setItems((itemResult.data || []) as ManagedItem[]);
    setRole(String(profileResult.data?.role || ""));
  }

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  const activeItems = items.filter((item) => !item.archived_at);
  const archivedItems = items.filter((item) => Boolean(item.archived_at));
  const editable = quotationStatus === "draft";
  const isSuperAdmin = SUPER_ROLES.includes(role);

  function openEdit(item: ManagedItem) {
    setEditItem(item);
    setEditState({
      quantity: String(item.quantity),
      unitPrice: item.unit_price === null ? "" : String(item.unit_price),
      pricingStatus: item.pricing_status,
      customerNotes: item.customer_notes || ""
    });
    setMessage("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editItem || workingId || !editable) return;

    const quantity = Math.floor(Number(editState.quantity));
    const unitPrice =
      editState.pricingStatus === "pending" ? null : Number(editState.unitPrice);

    if (!Number.isFinite(quantity) || quantity < 1) {
      setMessage("Quantity minimal 1 pcs.");
      return;
    }

    if (
      editState.pricingStatus !== "pending" &&
      (!Number.isFinite(unitPrice) || Number(unitPrice) < 0)
    ) {
      setMessage("Harga satuan wajib diisi dengan angka yang valid.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(editItem.id);
    setMessage("");

    const subtotal =
      editState.pricingStatus === "pending"
        ? null
        : quantity * Number(unitPrice);

    const { error } = await supabase
      .from("quotation_items")
      .update({
        quantity,
        unit_price: unitPrice,
        pricing_status: editState.pricingStatus,
        subtotal,
        customer_notes: editState.customerNotes.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", editItem.id)
      .eq("quotation_id", quotationId)
      .is("archived_at", null);

    if (error) {
      setWorkingId(null);
      setMessage("Perubahan produk gagal disimpan.");
      return;
    }

    const { error: refreshError } = await supabase.rpc("refresh_quotation_totals", {
      p_quotation_id: quotationId
    });

    setWorkingId(null);

    if (refreshError) {
      setMessage("Produk berubah, tetapi total quotation belum berhasil diperbarui.");
      return;
    }

    setEditItem(null);
    setMessage("Perubahan produk berhasil disimpan.");
    await loadItems();
    window.location.reload();
  }

  async function archiveSelected() {
    if (!archiveItem || workingId || !editable) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(archiveItem.id);
    setMessage("");

    const { error } = await supabase.rpc("archive_quotation_item", {
      p_item_id: archiveItem.id,
      p_reason: archiveReason.trim() || null
    });

    setWorkingId(null);

    if (error) {
      setMessage("Produk gagal diarsipkan.");
      return;
    }

    setArchiveItem(null);
    setArchiveReason("");
    setTab("archive");
    setMessage("Produk berhasil dipindahkan ke Gudang Arsip.");
    await loadItems();
    window.location.reload();
  }

  async function restoreItem(item: ManagedItem) {
    if (workingId || !editable) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(item.id);
    setMessage("");

    const { error } = await supabase.rpc("restore_quotation_item", {
      p_item_id: item.id
    });

    setWorkingId(null);

    if (error) {
      setMessage("Produk gagal dipulihkan.");
      return;
    }

    setTab("active");
    setMessage("Produk berhasil dipulihkan ke daftar aktif.");
    await loadItems();
    window.location.reload();
  }

  async function permanentlyDelete() {
    if (!deleteItem || workingId || !isSuperAdmin) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(deleteItem.id);
    setMessage("");

    const { error } = await supabase.rpc("permanently_delete_quotation_item", {
      p_item_id: deleteItem.id
    });

    setWorkingId(null);

    if (error) {
      setMessage("Hapus permanen ditolak atau gagal diproses.");
      return;
    }

    setDeleteItem(null);
    setMessage("Produk berhasil dihapus permanen.");
    await loadItems();
    window.location.reload();
  }

  if (loading) {
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
        Kelola Produk
      </button>

      {open ? (
        <div className="fixed inset-0 z-[85] overflow-y-auto bg-black/45 p-4 sm:p-8">
          <section className="mx-auto max-w-4xl border border-brand-softGray bg-brand-offWhite shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-brand-softGray bg-white p-5 sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                  Penawaran Harga Resmi
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Kelola Produk</h2>
                <p className="mt-2 text-sm text-brand-charcoal/60">
                  Edit, arsipkan, pulihkan, atau hapus permanen sesuai role.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={Boolean(workingId)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-softGray bg-white text-xl"
                aria-label="Tutup"
              >
                ×
              </button>
            </header>

            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab("active")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    tab === "active"
                      ? "bg-brand-charcoal text-white"
                      : "border border-brand-softGray bg-white"
                  }`}
                >
                  Aktif ({activeItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("archive")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    tab === "archive"
                      ? "bg-brand-charcoal text-white"
                      : "border border-brand-softGray bg-white"
                  }`}
                >
                  Gudang Arsip ({archivedItems.length})
                </button>
              </div>

              {message ? (
                <div className="mt-5 border border-brand-softGray bg-white p-4 text-sm font-semibold">
                  {message}
                </div>
              ) : null}

              {!editable ? (
                <div className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Edit, arsip, dan restore dikunci karena quotation tidak lagi berstatus Draft.
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                {(tab === "active" ? activeItems : archivedItems).map((item) => (
                  <article key={item.id} className="border border-brand-softGray bg-white p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="font-semibold">{item.product_name_snapshot}</h3>
                        <p className="mt-1 text-sm text-brand-charcoal/60">
                          {[
                            item.color_name_snapshot || item.variant_name_snapshot,
                            item.size_name_snapshot,
                            `${item.quantity} pcs`
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {formatMoney(item.subtotal)}
                        </p>
                        {item.archived_at ? (
                          <div className="mt-3 text-xs leading-5 text-brand-charcoal/55">
                            <p>Diarsipkan: {formatDate(item.archived_at)}</p>
                            <p>Oleh: {item.archived_by || "-"}</p>
                            <p>Alasan: {item.archive_reason || "-"}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {tab === "active" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              disabled={!editable || Boolean(workingId)}
                              className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setArchiveItem(item);
                                setArchiveReason("");
                              }}
                              disabled={!editable || Boolean(workingId)}
                              className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-45"
                            >
                              Arsipkan
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void restoreItem(item)}
                              disabled={!editable || Boolean(workingId)}
                              className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
                            >
                              {workingId === item.id ? "Memulihkan..." : "Pulihkan"}
                            </button>
                            {isSuperAdmin ? (
                              <button
                                type="button"
                                onClick={() => setDeleteItem(item)}
                                disabled={Boolean(workingId)}
                                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-45"
                              >
                                Hapus Permanen
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                {(tab === "active" ? activeItems : archivedItems).length === 0 ? (
                  <div className="border border-dashed border-brand-softGray bg-white p-8 text-center">
                    <p className="font-semibold">
                      {tab === "active" ? "Belum ada produk aktif" : "Gudang Arsip kosong"}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {editItem ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/55 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-xl border border-brand-softGray bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Edit Produk</h2>
            <p className="mt-2 text-sm text-brand-charcoal/60">
              {editItem.product_name_snapshot}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Quantity
                <input
                  type="number"
                  min="1"
                  value={editState.quantity}
                  onChange={(event) =>
                    setEditState((state) => ({ ...state, quantity: event.target.value }))
                  }
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </label>
              <label className="text-sm font-semibold">
                Status harga
                <select
                  value={editState.pricingStatus}
                  onChange={(event) =>
                    setEditState((state) => ({
                      ...state,
                      pricingStatus: event.target.value as EditState["pricingStatus"]
                    }))
                  }
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                >
                  <option value="confirmed">Harga pasti</option>
                  <option value="estimated">Estimasi</option>
                  <option value="pending">Menunggu harga</option>
                </select>
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Harga satuan
                <input
                  type="number"
                  min="0"
                  value={editState.unitPrice}
                  disabled={editState.pricingStatus === "pending"}
                  onChange={(event) =>
                    setEditState((state) => ({ ...state, unitPrice: event.target.value }))
                  }
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 disabled:bg-brand-offWhite"
                />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Catatan pelanggan
                <textarea
                  value={editState.customerNotes}
                  onChange={(event) =>
                    setEditState((state) => ({
                      ...state,
                      customerNotes: event.target.value
                    }))
                  }
                  className="mt-2 min-h-24 w-full rounded-lg border border-brand-softGray px-4 py-3"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={Boolean(workingId)}
                className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {workingId ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                disabled={Boolean(workingId)}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {archiveItem ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/55 p-4">
          <section className="w-full max-w-lg border border-amber-200 bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Arsipkan Produk?</h2>
            <p className="mt-3 text-sm text-brand-charcoal/65">
              Produk tidak akan hilang permanen dan dapat dipulihkan dari Gudang Arsip.
            </p>
            <label className="mt-5 block text-sm font-semibold">
              Alasan arsip
              <textarea
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-lg border border-brand-softGray px-4 py-3"
                placeholder="Contoh: salah pilih ukuran"
              />
            </label>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void archiveSelected()}
                disabled={Boolean(workingId)}
                className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {workingId ? "Mengarsipkan..." : "Ya, Arsipkan"}
              </button>
              <button
                type="button"
                onClick={() => setArchiveItem(null)}
                disabled={Boolean(workingId)}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteItem ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg border border-red-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              Super Admin Only
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Hapus Permanen?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              <strong>{deleteItem.product_name_snapshot}</strong> akan dihapus permanen dan tidak dapat dipulihkan.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void permanentlyDelete()}
                disabled={Boolean(workingId)}
                className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {workingId ? "Menghapus..." : "Hapus Permanen"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                disabled={Boolean(workingId)}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
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
