"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { operationsApiFetch } from "@/lib/admin-operations-api";

type Location = { id: string; code: string; name: string; location_type: string; is_pickup_enabled: boolean };
type Transfer = { id: string; transfer_number: string; status: string; created_at: string; received_at: string | null; orders: { order_number?: string } | null; from_location: { name?: string } | null; to_location: { name?: string } | null };
type Preparation = {
  id: string; order_id: string; status: string; ready_at: string | null; pickup_deadline: string | null;
  extension_requested_at: string | null; requested_deadline: string | null; extension_reason: string | null;
  orders: { order_number?: string; customer_name?: string; payment_method?: string; payment_status?: string; status?: string } | null;
  inventory_locations: { name?: string; code?: string } | null;
  pickup_preparation_items: Array<{ id: string; required_quantity: number; reserved_quantity: number; product_variant_sizes: { sku?: string; size_name?: string } | null }>;
};
type Payload = { locations: Location[]; transfers: Transfer[]; preparations: Preparation[]; balances: unknown[]; role: string };

export function InventoryOperationsAdmin() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [orderId, setOrderId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await operationsApiFetch<Payload>("/api/admin/inventory-operations")); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Operasional stok belum dapat dimuat." }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function run(action: string, body: Record<string, unknown>, key: string) {
    setWorking(key); setNotice(null);
    try {
      await operationsApiFetch("/api/admin/inventory-operations", { method: "POST", body: JSON.stringify({ action, ...body }) });
      setNotice({ type: "success", text: "Operasi stok dan pickup berhasil diproses." });
      await load();
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Operasi belum dapat diproses." }); }
    finally { setWorking(""); }
  }

  const activePreparations = useMemo(() => data?.preparations.filter((row) => !["handed_over", "cancelled"].includes(row.status)) ?? [], [data]);
  if (loading) return <AdminLoadingState label="Memuat stok lokasi dan pickup..." />;

  return <main className="grid gap-6 text-brand-charcoal">
    <AdminPageHeader eyebrow="STOK FISIK" title="Stok Lokasi & Pickup" description="Ready Stock tidak otomatis berarti siap diambil. Barang harus tersedia, direservasi, diperiksa, dan dikonfirmasi pada lokasi pickup." actions={<button data-admin-mutation="true" onClick={() => void run("process_deadlines", {}, "deadlines")} disabled={working==="deadlines"} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Proses Deadline Pickup</button>} />
    {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}
    <section className="border border-brand-softGray bg-white p-5">
      <h2 className="font-semibold">Mulai Persiapan Pickup</h2>
      <p className="mt-1 text-sm text-brand-charcoal/60">Masukkan ID order dari halaman detail pesanan. Sistem akan menentukan lokasi toko dan kebutuhan stok.</p>
      <div className="mt-4 flex flex-wrap gap-3"><input value={orderId} onChange={(e)=>setOrderId(e.target.value)} placeholder="UUID order" className="min-h-11 min-w-[280px] flex-1 border border-brand-softGray px-4" /><button data-admin-mutation="true" disabled={!/^[0-9a-f-]{36}$/i.test(orderId)||working==="initialize"} onClick={()=>void run("initialize_pickup",{orderId},"initialize")} className="min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45">Siapkan Pickup</button></div>
    </section>
    <section className="grid gap-4">
      <h2 className="text-xl font-semibold">Persiapan Aktif</h2>
      {activePreparations.length ? activePreparations.map((prep) => {
        const missing = prep.pickup_preparation_items.reduce((sum,item)=>sum+Math.max(0,item.required_quantity-item.reserved_quantity),0);
        return <article key={prep.id} className="border border-brand-softGray bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{prep.status.replaceAll("_"," ")}</p><h3 className="mt-2 text-lg font-semibold">{prep.orders?.order_number} · {prep.orders?.customer_name}</h3><p className="mt-1 text-sm text-brand-charcoal/60">Lokasi: {prep.inventory_locations?.name ?? "Belum tersedia"} · Kekurangan: {missing} pcs</p></div><div className="text-right text-xs text-brand-charcoal/55"><p>{prep.pickup_deadline ? `Batas ${dateTime(prep.pickup_deadline)}` : "Belum siap diambil"}</p>{prep.extension_requested_at ? <p className="mt-1 font-semibold text-amber-700">Perpanjangan diminta</p> : null}</div></div>
          <details className="mt-4 rounded-xl bg-brand-offWhite p-4"><summary className="cursor-pointer font-semibold">Lihat kebutuhan barang</summary><div className="mt-3 grid gap-2 text-sm">{prep.pickup_preparation_items.map((item)=><p key={item.id}>{item.product_variant_sizes?.sku ?? "SKU"} · {item.product_variant_sizes?.size_name ?? "Ukuran"}: {item.reserved_quantity}/{item.required_quantity} pcs</p>)}</div></details>
          <div className="mt-4 flex flex-wrap gap-2">
            {prep.status === "transfer_required" ? <button data-admin-mutation="true" disabled={working===prep.id} onClick={()=>void run("create_pickup_transfer",{preparationId:prep.id,idempotencyKey:`pickup-${prep.id}-${Date.now()}`},prep.id)} className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold">Buat Transfer Stok</button> : null}
            {prep.status === "checking" ? <button data-admin-mutation="true" disabled={working===prep.id} onClick={()=>void run("mark_pickup_ready",{preparationId:prep.id,deadlineHours:72},prep.id)} className="min-h-10 rounded-full bg-brand-green px-4 text-xs font-semibold text-white">Tandai Siap Diambil</button> : null}
            {["ready_for_pickup","no_show"].includes(prep.status) ? <button data-admin-mutation="true" disabled={working===prep.id} onClick={()=>void run("complete_handover",{preparationId:prep.id,note:"Diserahkan melalui panel operasional"},prep.id)} className="min-h-10 rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white">Selesaikan Serah Terima</button> : null}
            {prep.extension_requested_at ? <><button data-admin-mutation="true" disabled={working===prep.id} onClick={()=>void run("decide_extension",{preparationId:prep.id,approve:true,deadline:prep.requested_deadline,reason:"Disetujui Admin"},prep.id)} className="min-h-10 rounded-full border border-emerald-300 px-4 text-xs font-semibold text-emerald-800">Setujui Perpanjangan</button><button data-admin-mutation="true" disabled={working===prep.id} onClick={()=>void run("decide_extension",{preparationId:prep.id,approve:false,deadline:prep.pickup_deadline,reason:"Ditolak Admin"},prep.id)} className="min-h-10 rounded-full border border-red-300 px-4 text-xs font-semibold text-red-700">Tolak</button></> : null}
          </div>
        </article>;
      }) : <AdminEmptyState title="Belum ada persiapan pickup aktif" description="Persiapan akan muncul setelah Admin memulainya dari order pickup." />}
    </section>
    <section className="grid gap-4"><h2 className="text-xl font-semibold">Transfer Stok</h2>{data?.transfers.length ? data.transfers.map((transfer)=><article key={transfer.id} className="flex flex-wrap items-center justify-between gap-4 border border-brand-softGray bg-white p-5"><div><h3 className="font-semibold">{transfer.transfer_number}</h3><p className="mt-1 text-sm text-brand-charcoal/60">{transfer.from_location?.name} → {transfer.to_location?.name} · {transfer.orders?.order_number ?? "Tanpa order"}</p></div><div className="flex items-center gap-3"><span className="rounded-full border border-brand-softGray px-3 py-1 text-xs font-semibold">{transfer.status.replaceAll("_"," ")}</span>{transfer.status==="in_transit"?<button data-admin-mutation="true" disabled={working===transfer.id} onClick={()=>void run("receive_transfer",{transferId:transfer.id,note:"Diterima di lokasi tujuan"},transfer.id)} className="min-h-10 rounded-full bg-brand-green px-4 text-xs font-semibold text-white">Terima Stok</button>:null}</div></article>) : <AdminEmptyState title="Belum ada transfer stok" description="Transfer akan muncul ketika stok pickup perlu dipindahkan antar lokasi." />}</section>
  </main>;
}
function dateTime(value:string){return new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Makassar"}).format(new Date(value));}
