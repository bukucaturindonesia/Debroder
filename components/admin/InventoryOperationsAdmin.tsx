"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
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
type InventoryAction = "process_deadlines" | "initialize_pickup" | "create_pickup_transfer" | "receive_transfer" | "mark_pickup_ready" | "complete_handover" | "decide_extension";
type PreparationIdentity = Pick<Preparation, "order_id" | "status"> & { orderStatus?: string | null };

const ORDER_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TERMINAL_PREPARATION_STATUSES = new Set(["handed_over", "cancelled"]);
const TERMINAL_ORDER_STATUSES = new Set(["completed", "selesai", "cancelled", "dibatalkan", "expired"]);

export function normalizeInventoryOrderId(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return ORDER_UUID_PATTERN.test(normalized) ? normalized : "";
}

export function buildInitializePickupRequest(value: string) {
  const orderId = normalizeInventoryOrderId(value);
  return orderId ? { action: "initialize_pickup" as const, orderId } : null;
}

export function isTerminalInventoryOrder(status: string | null | undefined) {
  return TERMINAL_ORDER_STATUSES.has(String(status || "").toLowerCase());
}

export function hasActivePickupPreparation(preparations: readonly PreparationIdentity[], orderId: string) {
  return preparations.some((preparation) =>
    preparation.order_id === orderId &&
    !TERMINAL_PREPARATION_STATUSES.has(preparation.status) &&
    !isTerminalInventoryOrder(preparation.orderStatus)
  );
}

export function inventoryActionSuccessMessage(action: InventoryAction, body: Record<string, unknown>) {
  if (action === "initialize_pickup") return "Persiapan pickup berhasil dimulai.";
  if (action === "create_pickup_transfer") return "Transfer stok pickup berhasil dibuat.";
  if (action === "receive_transfer") return "Transfer stok berhasil diterima.";
  if (action === "mark_pickup_ready") return "Pickup berhasil ditandai siap diambil.";
  if (action === "complete_handover") return "Serah terima pickup berhasil diselesaikan.";
  if (action === "decide_extension") return body.approve === true ? "Perpanjangan pickup berhasil disetujui." : "Perpanjangan pickup berhasil ditolak.";
  return "Deadline pickup berhasil diproses.";
}

export function InventoryOperationsAdmin({ initialOrderId = "" }: { initialOrderId?: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [orderId, setOrderId] = useState(() => normalizeInventoryOrderId(initialOrderId));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await operationsApiFetch<Payload>("/api/admin/inventory-operations");
      setData(payload);
      return payload;
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Operasional stok belum dapat dimuat." });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function run(action: InventoryAction, body: Record<string, unknown>, key: string) {
    setWorking(key); setNotice(null);
    try {
      await operationsApiFetch("/api/admin/inventory-operations", { method: "POST", body: JSON.stringify({ action, ...body }) });
      const refreshed = await load();
      if (!refreshed) return;
      if (action === "initialize_pickup") {
        const submittedOrderId = normalizeInventoryOrderId(typeof body.orderId === "string" ? body.orderId : "");
        const identities = refreshed.preparations.map((preparation) => ({
          order_id: preparation.order_id,
          status: preparation.status,
          orderStatus: preparation.orders?.status
        }));
        if (!submittedOrderId || !hasActivePickupPreparation(identities, submittedOrderId)) {
          setNotice({ type: "error", text: "Persiapan pickup belum ditemukan setelah proses. Muat ulang data dan periksa order yang dipilih." });
          return;
        }
      }
      setNotice({ type: "success", text: inventoryActionSuccessMessage(action, body) });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Operasi belum dapat diproses." }); }
    finally { setWorking(""); }
  }

  const initializeRequest = buildInitializePickupRequest(orderId);
  const selectedPreparation = useMemo(
    () => data?.preparations.find((row) => row.order_id === orderId) || null,
    [data, orderId]
  );
  const selectedOrderTerminal = Boolean(
    selectedPreparation && (
      TERMINAL_PREPARATION_STATUSES.has(selectedPreparation.status) ||
      isTerminalInventoryOrder(selectedPreparation.orders?.status)
    )
  );
  const activePreparations = useMemo(() => data?.preparations.filter((row) =>
    !TERMINAL_PREPARATION_STATUSES.has(row.status) &&
    !isTerminalInventoryOrder(row.orders?.status)
  ) ?? [], [data]);
  if (loading) return <AdminLoadingState label="Memuat stok lokasi dan pickup..." />;

  return <main className="grid gap-6 text-brand-charcoal">
    <AdminPageHeader eyebrow="STOK FISIK" title="Stok Lokasi & Pickup" description="Ready Stock tidak otomatis berarti siap diambil. Barang harus tersedia, direservasi, diperiksa, dan dikonfirmasi pada lokasi pickup." actions={<button data-admin-mutation="true" onClick={() => void run("process_deadlines", {}, "deadlines")} disabled={working==="deadlines"} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Proses Deadline Pickup</button>} />
    {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}
    <section className="border border-brand-softGray bg-white p-5">
      <h2 className="font-semibold">Mulai Persiapan Pickup</h2>
      <p className="mt-1 text-sm text-brand-charcoal/60">ID order dari halaman detail pesanan akan terisi otomatis. Admin tetap harus menekan Siapkan Pickup untuk memulai proses.</p>
      {selectedOrderTerminal ? <AdminAlert type="success">Pesanan ini sudah selesai. Persiapan pickup tidak dapat dibuka kembali.</AdminAlert> : null}
      <div className="mt-4 flex flex-wrap gap-3"><input value={orderId} onChange={(event: ChangeEvent<HTMLInputElement>)=>setOrderId(event.target.value)} placeholder="UUID order" className="min-h-11 min-w-[280px] flex-1 border border-brand-softGray px-4" /><button data-admin-mutation="true" disabled={!initializeRequest||selectedOrderTerminal||working==="initialize"} onClick={()=>{const request=buildInitializePickupRequest(orderId);if(request)void run(request.action,{orderId:request.orderId},"initialize");}} className="min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45">{selectedOrderTerminal ? "Pesanan Selesai" : "Siapkan Pickup"}</button></div>
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
