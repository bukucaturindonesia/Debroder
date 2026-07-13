"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { PaymentTrackingManager } from "@/components/admin/PaymentTrackingManager";
import { RepeatOrderDialog } from "@/components/admin/RepeatOrderDialog";
import { CustomerOrderHistory } from "@/components/admin/CustomerOrderHistory";

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
  total_amount: number;
  currency: string;
  converted_at: string | null;
  archived_at: string | null;
};

type Item = {
  id: string;
  product_name: string;
  variant_name: string | null;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string;
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
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [customerNotes, setCustomerNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [archiveReason, setArchiveReason] = useState("");

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase || !orderId) return;
    setLoading(true);

    const [orderResult, itemResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id,order_number,quotation_id,customer_name,company_name,customer_phone,customer_email,shipping_address,delivery_method,customer_notes,admin_notes,status,total_amount,currency,converted_at,archived_at")
        .eq("id", orderId)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("id,product_name,variant_name,color,size,quantity,unit_price,subtotal,notes")
        .eq("order_id", orderId)
        .is("archived_at", null)
        .order("created_at", { ascending: true })
    ]);

    setLoading(false);

    if (orderResult.error || !orderResult.data) {
      setOrder(null);
      return;
    }

    const row = orderResult.data as Order;
    setOrder(row);
    setItems((itemResult.data || []) as Item[]);
    setShippingAddress(row.shipping_address || "");
    setDeliveryMethod(row.delivery_method || "pickup");
    setCustomerNotes(row.customer_notes || "");
    setAdminNotes(row.admin_notes || "");
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || working || order.status !== "baru") return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

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
      return;
    }

    setEditOpen(false);
    setMessage("Perubahan pesanan berhasil disimpan.");
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
      setMessage("Pesanan gagal dipindahkan ke Gudang Arsip.");
      return;
    }

    router.replace("/admin/orders/archive");
    router.refresh();
  }

  if (loading) return <AdminLoadingState label="Memuat detail pesanan..." />;

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

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Pesanan Resmi"
          title={order.order_number}
          description={`${order.customer_name}${order.company_name ? ` · ${order.company_name}` : ""}`}
          actions={
            <>
              <RepeatOrderDialog orderId={order.id} />
              <PaymentTrackingManager />
              <Link
                href={`/admin/job-orders?order=${order.id}`}
                className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
              >
                Job Order
              </Link>
              <Link
                href={`/admin/fulfillments?order=${order.id}`}
                className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
              >
                Pengiriman / Pickup
              </Link>
              {order.quotation_id ? (
                <Link
                  href={`/admin/orders/quotations/${order.quotation_id}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
                >
                  Buka Penawaran
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                disabled={order.status !== "baru"}
                className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold disabled:opacity-45"
              >
                Edit Pesanan
              </button>
              <button
                type="button"
                onClick={() => setArchiveOpen(true)}
                className="inline-flex min-h-10 items-center rounded-full border border-amber-300 bg-white px-5 text-sm font-semibold text-amber-800"
              >
                Arsipkan
              </button>
            </>
          }
        />

        {message ? (
          <div className="border border-brand-softGray bg-white p-4 text-sm font-semibold">
            {message}
          </div>
        ) : null}

        <section className="grid gap-5 border border-brand-softGray bg-white p-5 sm:grid-cols-2 sm:p-7">
          <Data label="Status" value={order.status === "baru" ? "Pesanan Baru" : order.status} />
          <Data label="Total Terkunci" value={money(order.total_amount)} />
          <Data label="WhatsApp" value={order.customer_phone} />
          <Data label="Email" value={order.customer_email || "-"} />
          <Data label="Metode Penyerahan" value={order.delivery_method === "pickup" ? "Ambil di Toko" : "Dikirim"} />
          <Data label="Alamat Pengiriman" value={order.shipping_address || "-"} />
        </section>

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <h2 className="text-2xl font-semibold">Produk Terkunci</h2>
          <p className="mt-2 text-sm text-brand-charcoal/60">
            Data produk, jumlah, varian, ukuran, dan harga disalin dari versi penawaran yang disetujui.
          </p>
          <div className="mt-6 divide-y divide-brand-softGray border-y border-brand-softGray">
            {items.map((item) => (
              <article key={item.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="font-semibold">{item.product_name}</h3>
                  <p className="mt-1 text-sm text-brand-charcoal/60">
                    {[item.variant_name, item.color, item.size, `${item.quantity} pcs`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
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

        <CustomerOrderHistory orderId={order.id} />
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
