/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { createSupabaseClient, ORDER_UPLOADS_BUCKET } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/url";

const orderStatuses = [
  ["baru", "Baru"],
  ["menunggu_pembayaran", "Menunggu pembayaran"],
  ["sudah_dibayar", "Sudah dibayar"],
  ["masuk_produksi", "Masuk produksi"],
  ["proses_produksi", "Proses produksi"],
  ["quality_check", "Quality check"],
  ["siap_diambil", "Siap diambil"],
  ["siap_dikirim", "Siap dikirim"],
  ["selesai", "Selesai"],
  ["dibatalkan", "Dibatalkan"]
] as const;

const paymentStatuses: Array<[PaymentStatus, string]> = [
  ["belum_bayar", "Belum bayar"],
  ["menunggu_verifikasi", "Menunggu verifikasi"],
  ["terverifikasi", "Terverifikasi"],
  ["ditolak", "Ditolak"]
];

type OrderStatus = (typeof orderStatuses)[number][0];
type PaymentStatus = "belum_bayar" | "menunggu_verifikasi" | "terverifikasi" | "ditolak";
type OrderItem = {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  color: string;
  size: string;
  notes: string;
};
type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  status: OrderStatus;
  total_amount: number;
  admin_notes: string;
  customer_notes: string;
  delivery_method: "pickup" | "shipping";
  shipping_address: string;
  design_file_path?: string | null;
  design_file_url?: string | null;
  payment_status: PaymentStatus;
  payment_proof_path?: string | null;
  payment_proof_url?: string | null;
  payment_submitted_at?: string | null;
  created_at: string;
  items?: OrderItem[];
};
type OrderHistory = {
  id: string;
  from_status?: string | null;
  to_status: string;
  note: string;
  created_at: string;
};
type OrderForm = Pick<Order, "order_number" | "customer_name" | "customer_phone" | "customer_email" | "status" | "total_amount" | "admin_notes" | "customer_notes" | "delivery_method" | "shipping_address" | "payment_status">;

const emptyForm: OrderForm = {
  order_number: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  status: "baru",
  total_amount: 0,
  admin_notes: "",
  customer_notes: "",
  delivery_method: "pickup",
  shipping_address: "",
  payment_status: "belum_bayar"
};

function statusLabel(status: string) {
  return orderStatuses.find(([value]) => value === status)?.[1] || status;
}

function paymentStatusLabel(status: PaymentStatus) {
  return paymentStatuses.find(([value]) => value === status)?.[1] || status;
}

function generatedOrderNumber() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `DBR-${stamp}-${String(Date.now()).slice(-5)}`;
}

export function OrderManagementAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [form, setForm] = useState<OrderForm>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemProductId, setItemProductId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemColor, setItemColor] = useState("");
  const [itemSize, setItemSize] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadOrders(preferredId?: string | null) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const [orderResult, productResult] = await Promise.all([
      supabase.from("orders").select("*,items:order_items(*)").order("created_at", { ascending: false }),
      supabase.from("products").select("*").eq("status_aktif", true).order("nama", { ascending: true })
    ]);
    setLoading(false);

    if (orderResult.error) {
      setStatus(`Order Management belum siap: ${orderResult.error.message}`);
      return;
    }

    const rawOrders = (orderResult.data || []) as Order[];
    const filePaths = Array.from(new Set(rawOrders.flatMap((order) => [order.design_file_path, order.payment_proof_path].filter((path): path is string => Boolean(path)))));
    const signedUrlMap = new Map<string, string>();
    if (filePaths.length) {
      const { data: signedFiles } = await supabase.storage.from(ORDER_UPLOADS_BUCKET).createSignedUrls(filePaths, 3600);
      (signedFiles || []).forEach((file) => {
        if (file.path && file.signedUrl) signedUrlMap.set(file.path, file.signedUrl);
      });
    }
    const nextOrders = rawOrders.map((order) => ({
      ...order,
      design_file_url: order.design_file_path ? signedUrlMap.get(order.design_file_path) || null : null,
      payment_proof_url: order.payment_proof_path ? signedUrlMap.get(order.payment_proof_path) || null : null
    }));
    setOrders(nextOrders);
    setProducts((productResult.data || []) as Product[]);
    const nextSelectedId = preferredId ?? selectedId;
    if (nextSelectedId && nextOrders.some((order) => order.id === nextSelectedId)) {
      setSelectedId(nextSelectedId);
      await loadHistory(nextSelectedId);
    } else if (nextOrders[0]) {
      setSelectedId(nextOrders[0].id);
      await loadHistory(nextOrders[0].id);
    } else {
      setSelectedId(null);
      setHistory([]);
    }
  }

  async function loadHistory(orderId: string) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
    setHistory((data || []) as OrderHistory[]);
  }

  useEffect(() => {
    loadOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial admin bootstrap

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = !query || `${order.order_number} ${order.customer_name} ${order.customer_phone}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const selectedOrder = orders.find((order) => order.id === selectedId) || null;

  function update<K extends keyof OrderForm>(key: K, value: OrderForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function editOrder(order: Order) {
    setEditingId(order.id);
    setSelectedId(order.id);
    setForm({
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email || "",
      status: order.status,
      total_amount: Number(order.total_amount || 0),
      admin_notes: order.admin_notes || "",
      customer_notes: order.customer_notes || "",
      delivery_method: order.delivery_method || "pickup",
      shipping_address: order.shipping_address || "",
      payment_status: order.payment_status || "belum_bayar"
    });
    loadHistory(order.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveOrder(event: FormEvent) {
    event.preventDefault();
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setStatus("Nama dan nomor pelanggan wajib diisi.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    const previous = editingId ? orders.find((order) => order.id === editingId) : null;
    const payload = {
      order_number: form.order_number.trim() || generatedOrderNumber(),
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      customer_email: form.customer_email?.trim() || null,
      status: form.status,
      total_amount: Number(form.total_amount || 0),
      admin_notes: form.admin_notes.trim(),
      customer_notes: form.customer_notes.trim(),
      delivery_method: form.delivery_method,
      shipping_address: form.shipping_address.trim(),
      payment_status: form.payment_status,
      created_by: previous ? undefined : session.session?.user.id || null
    };
    const result = editingId
      ? await supabase.from("orders").update(payload).eq("id", editingId).select("id").single()
      : await supabase.from("orders").insert(payload).select("id").single();

    if (result.error || !result.data) {
      setSaving(false);
      setStatus(`Pesanan gagal disimpan: ${result.error?.message || "data tidak ditemukan"}`);
      return;
    }

    if (!previous || previous.status !== form.status) {
      await supabase.from("order_status_history").insert({
        order_id: result.data.id,
        from_status: previous?.status || null,
        to_status: form.status,
        note: form.admin_notes.trim(),
        changed_by: session.session?.user.id || null
      });
    }

    setSaving(false);
    setStatus("Pesanan disimpan ke Supabase.");
    resetForm();
    await loadOrders(result.data.id);
  }

  async function deleteOrder(order: Order) {
    if (!window.confirm(`Hapus pesanan ${order.order_number}?`)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    setStatus(error ? `Pesanan gagal dihapus: ${error.message}` : "Pesanan dihapus.");
    if (!error) await loadOrders(null);
  }

  function chooseProduct(productId: string) {
    setItemProductId(productId);
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setItemName(product.nama);
    setItemPrice(Number(product.price || product.harga || product.base_price || 0));
  }

  async function recalculateTotal(orderId: string) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from("order_items").select("subtotal").eq("order_id", orderId);
    const total = (data || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    await supabase.from("orders").update({ total_amount: total }).eq("id", orderId);
  }

  async function addItem(event: FormEvent) {
    event.preventDefault();
    if (!selectedOrder || !itemName.trim() || itemQuantity < 1) {
      setStatus("Pilih pesanan dan isi item dengan benar.");
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("order_items").insert({
      order_id: selectedOrder.id,
      product_id: itemProductId || null,
      product_name: itemName.trim(),
      quantity: itemQuantity,
      unit_price: itemPrice,
      subtotal: itemQuantity * itemPrice,
      color: itemColor.trim(),
      size: itemSize.trim(),
      notes: itemNotes.trim()
    });
    if (error) {
      setStatus(`Item gagal ditambahkan: ${error.message}`);
      return;
    }
    await recalculateTotal(selectedOrder.id);
    setItemProductId("");
    setItemName("");
    setItemQuantity(1);
    setItemPrice(0);
    setItemColor("");
    setItemSize("");
    setItemNotes("");
    setStatus("Item pesanan ditambahkan.");
    await loadOrders(selectedOrder.id);
  }

  async function deleteItem(item: OrderItem) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("order_items").delete().eq("id", item.id);
    if (error) {
      setStatus(`Item gagal dihapus: ${error.message}`);
      return;
    }
    await recalculateTotal(item.order_id);
    setStatus("Item pesanan dihapus.");
    await loadOrders(item.order_id);
  }

  return (
    <div className="mt-6 grid gap-6">
      {status ? <p role="status" className="border border-brand-softGray bg-white p-4 text-sm font-semibold">{status}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,.75fr)_minmax(0,1.25fr)]">
        <form onSubmit={saveOrder} className="bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{editingId ? "Edit pesanan" : "Pesanan manual"}</h2>{editingId ? <button type="button" onClick={resetForm} className="text-sm font-semibold underline">Batal</button> : null}</div>
          <div className="mt-5 grid gap-4">
            <Field label="Nomor pesanan"><input value={form.order_number} placeholder="Otomatis jika kosong" onChange={(event) => update("order_number", event.target.value)} /></Field>
            <Field label="Nama pelanggan"><input required value={form.customer_name} onChange={(event) => update("customer_name", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Telepon"><input required value={form.customer_phone} onChange={(event) => update("customer_phone", event.target.value)} /></Field><Field label="Email"><input type="email" value={form.customer_email || ""} onChange={(event) => update("customer_email", event.target.value)} /></Field></div>
            <Field label="Status"><select value={form.status} onChange={(event) => update("status", event.target.value as OrderStatus)}>{orderStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Status pembayaran"><select value={form.payment_status} onChange={(event) => update("payment_status", event.target.value as PaymentStatus)}>{paymentStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Metode ambil/kirim"><select value={form.delivery_method} onChange={(event) => update("delivery_method", event.target.value as OrderForm["delivery_method"])}><option value="pickup">Ambil di store</option><option value="shipping">Kirim ke alamat</option></select></Field>
            {form.delivery_method === "shipping" ? <Field label="Alamat pengiriman"><textarea rows={3} value={form.shipping_address} onChange={(event) => update("shipping_address", event.target.value)} /></Field> : null}
            <Field label="Catatan customer"><textarea rows={3} value={form.customer_notes} onChange={(event) => update("customer_notes", event.target.value)} /></Field>
            <Field label="Catatan admin"><textarea rows={4} value={form.admin_notes} onChange={(event) => update("admin_notes", event.target.value)} /></Field>
            <button disabled={saving} className="min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan pesanan"}</button>
          </div>
        </form>

        <section className="bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor, nama, atau telepon" className="min-h-11 flex-1 rounded-lg border border-brand-softGray px-4 text-sm" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm"><option value="all">Semua status</option>{orderStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {loading ? <div className="mt-5 h-36 animate-pulse bg-brand-offWhite" /> : visibleOrders.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead><tr className="border-b border-brand-softGray text-xs uppercase tracking-[0.12em] text-brand-charcoal/50"><th className="py-3 pr-3">Pesanan</th><th className="py-3 pr-3">Pelanggan</th><th className="py-3 pr-3">Status</th><th className="py-3 pr-3">Pembayaran</th><th className="py-3 pr-3">Total</th><th className="py-3">Aksi</th></tr></thead><tbody>{visibleOrders.map((order) => <tr key={order.id} className={`border-b border-brand-softGray ${selectedId === order.id ? "bg-brand-offWhite" : ""}`}><td className="py-4 pr-3 font-semibold"><button type="button" onClick={() => { setSelectedId(order.id); loadHistory(order.id); }} className="text-left hover:underline">{order.order_number}</button></td><td className="py-4 pr-3"><p className="font-medium">{order.customer_name}</p><p className="text-xs text-brand-charcoal/50">{order.customer_phone}</p></td><td className="py-4 pr-3">{statusLabel(order.status)}</td><td className="py-4 pr-3">{paymentStatusLabel(order.payment_status)}</td><td className="py-4 pr-3">{formatRupiah(order.total_amount)}</td><td className="py-4"><div className="flex gap-2"><button type="button" onClick={() => editOrder(order)} className="rounded-full border border-brand-softGray px-3 py-1.5 text-xs font-semibold">Edit</button><button type="button" onClick={() => deleteOrder(order)} className="px-2 text-xs font-semibold text-red-700">Hapus</button></div></td></tr>)}</tbody></table></div> : <p className="mt-5 bg-brand-offWhite p-5 text-sm text-brand-charcoal/60">Belum ada pesanan.</p>}
        </section>
      </div>

      {selectedOrder ? <section className="grid gap-6 xl:grid-cols-[1fr_.7fr]">
        <div className="bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-charcoal/45">Detail pesanan</p><h2 className="mt-2 text-xl font-semibold">{selectedOrder.order_number}</h2></div><p className="text-xl font-semibold">{formatRupiah(selectedOrder.total_amount)}</p></div>
          <div className="mt-5 grid gap-4 bg-brand-offWhite p-4 sm:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-brand-charcoal/45">Customer</p><p className="mt-2 font-semibold">{selectedOrder.customer_name}</p><p className="mt-1 text-sm text-brand-charcoal/65">{selectedOrder.customer_phone}{selectedOrder.customer_email ? ` / ${selectedOrder.customer_email}` : ""}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-brand-charcoal/45">Penerimaan</p><p className="mt-2 font-semibold">{selectedOrder.delivery_method === "shipping" ? "Dikirim" : "Ambil di store"}</p>{selectedOrder.shipping_address ? <p className="mt-1 text-sm text-brand-charcoal/65">{selectedOrder.shipping_address}</p> : null}</div>
            {selectedOrder.customer_notes ? <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-[.12em] text-brand-charcoal/45">Catatan customer</p><p className="mt-2 whitespace-pre-line text-sm text-brand-charcoal/70">{selectedOrder.customer_notes}</p></div> : null}
            <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-brand-charcoal/45">Pembayaran</p><p className="mt-2 font-semibold">{paymentStatusLabel(selectedOrder.payment_status)}</p>{selectedOrder.payment_submitted_at ? <p className="mt-1 text-xs text-brand-charcoal/50">Dikirim {new Date(selectedOrder.payment_submitted_at).toLocaleString("id-ID")}</p> : null}</div>
            <div className="flex flex-wrap items-end gap-2">{selectedOrder.design_file_url ? <a href={selectedOrder.design_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center border border-brand-charcoal px-4 text-xs font-semibold">Lihat desain</a> : null}{selectedOrder.payment_proof_url ? <a href={selectedOrder.payment_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center bg-brand-green px-4 text-xs font-semibold text-white">Lihat bukti bayar</a> : null}</div>
            {selectedOrder.payment_proof_url ? <a href={selectedOrder.payment_proof_url} target="_blank" rel="noopener noreferrer" className="sm:col-span-2"><img src={selectedOrder.payment_proof_url} alt={`Bukti pembayaran ${selectedOrder.order_number}`} className="max-h-80 w-full bg-white object-contain" /></a> : null}
          </div>
          <form onSubmit={addItem} className="mt-5 grid gap-3 border-y border-brand-softGray py-5 sm:grid-cols-2">
            <Field label="Pilih produk"><select value={itemProductId} onChange={(event) => chooseProduct(event.target.value)}><option value="">Item manual</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nama}</option>)}</select></Field>
            <Field label="Nama item"><input required value={itemName} onChange={(event) => setItemName(event.target.value)} /></Field>
            <Field label="Jumlah"><input type="number" min="1" value={itemQuantity} onChange={(event) => setItemQuantity(Number(event.target.value))} /></Field>
            <Field label="Harga satuan"><input type="number" min="0" value={itemPrice} onChange={(event) => setItemPrice(Number(event.target.value))} /></Field>
            <Field label="Warna"><input value={itemColor} onChange={(event) => setItemColor(event.target.value)} /></Field>
            <Field label="Ukuran"><input value={itemSize} onChange={(event) => setItemSize(event.target.value)} /></Field>
            <Field label="Catatan item"><input value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} /></Field>
            <button className="min-h-11 self-end rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Tambah item</button>
          </form>
          {selectedOrder.items?.length ? <div className="mt-5 grid gap-3">{selectedOrder.items.map((item) => <article key={item.id} className="flex items-center justify-between gap-4 border border-brand-softGray p-4"><div><h3 className="font-semibold">{item.product_name}</h3><p className="mt-1 text-xs text-brand-charcoal/55">{item.quantity} x {formatRupiah(item.unit_price)}{item.color ? ` / Warna: ${item.color}` : ""}{item.size ? ` / Ukuran: ${item.size}` : ""}{item.notes ? ` / ${item.notes}` : ""}</p></div><div className="text-right"><p className="font-semibold">{formatRupiah(item.subtotal)}</p><button type="button" onClick={() => deleteItem(item)} className="mt-2 text-xs font-semibold text-red-700">Hapus</button></div></article>)}</div> : <p className="mt-5 bg-brand-offWhite p-4 text-sm text-brand-charcoal/60">Belum ada item pesanan.</p>}
        </div>

        <div className="bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">Riwayat status</h2>{history.length ? <div className="mt-5 grid gap-4">{history.map((entry) => <article key={entry.id} className="border-l-2 border-brand-green pl-4"><p className="text-sm font-semibold">{statusLabel(entry.to_status)}</p><p className="mt-1 text-xs text-brand-charcoal/50">{new Date(entry.created_at).toLocaleString("id-ID")}</p>{entry.note ? <p className="mt-2 text-sm text-brand-charcoal/65">{entry.note}</p> : null}</article>)}</div> : <p className="mt-5 text-sm text-brand-charcoal/60">Belum ada riwayat status.</p>}</div>
      </section> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-4 [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:border-brand-softGray [&_select]:bg-white [&_select]:px-4 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:p-4 [&_input]:font-normal [&_select]:font-normal [&_textarea]:font-normal">{label}{children}</label>;
}
