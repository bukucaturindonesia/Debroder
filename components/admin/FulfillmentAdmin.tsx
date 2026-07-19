"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  FULFILLMENT_METHOD_LABELS,
  FULFILLMENT_STATUS_LABELS,
  formatFulfillmentDate,
  isFulfillmentRole,
  isFulfillmentSuperAdmin,
  type FulfillmentFileRow,
  type FulfillmentItemRow,
  type FulfillmentMethod,
  type FulfillmentRow
} from "@/lib/fulfillments";
import type { JobOrderRow } from "@/lib/job-orders";
import type { WorkItemRow } from "@/lib/work-items";

type Tab = "ready" | "records" | "archive";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  company_name: string | null;
  customer_phone: string;
  delivery_method: string;
  shipping_address: string;
  status: string;
  archived_at: string | null;
  created_at: string;
};

type QcPassedRow = {
  id: string;
  work_item_id: string;
  attempt_number: number;
  passed_quantity: number;
  result: string;
  archived_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
};

type EligibleItem = {
  workItem: WorkItemRow;
  passedQuantity: number;
  allocatedQuantity: number;
  remainingQuantity: number;
};

type EligibleOrder = {
  order: OrderRow;
  jobOrder: JobOrderRow;
  items: EligibleItem[];
};

type CreateForm = {
  order_id: string;
  method: FulfillmentMethod;
  receiver_name: string;
  receiver_phone: string;
  destination: string;
  courier: string;
  package_count: number;
  scheduled_at: string;
  notes: string;
  quantities: Record<string, number>;
};

type DeleteTarget = {
  record: FulfillmentRow;
  confirmation: string;
};

const EMPTY_CREATE: CreateForm = {
  order_id: "",
  method: "shipping",
  receiver_name: "",
  receiver_phone: "",
  destination: "",
  courier: "",
  package_count: 1,
  scheduled_at: "",
  notes: "",
  quantities: {}
};

export function FulfillmentAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedOrder = searchParams.get("order") || "";

  const [tab, setTab] = useState<Tab>("ready");
  const [fulfillments, setFulfillments] = useState<FulfillmentRow[]>([]);
  const [fulfillmentItems, setFulfillmentItems] = useState<FulfillmentItemRow[]>([]);
  const [files, setFiles] = useState<FulfillmentFileRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrderRow[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([]);
  const [qcRecords, setQcRecords] = useState<QcPassedRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ ...EMPTY_CREATE });
  const [restoreTarget, setRestoreTarget] = useState<FulfillmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const canManage = isFulfillmentRole(role);
  const canDelete = isFulfillmentSuperAdmin(role);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setNotice({ type: "error", text: "Layanan data belum tersedia. Hubungi pengelola sistem." });
      return;
    }

    setLoading(true);
    setNotice(null);
    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data.session?.user.id;

    const [profileResult, fulfillmentResult, itemResult, fileResult, orderResult, jobResult, workResult, qcResult, profileListResult] = await Promise.all([
      userId
        ? supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("fulfillments")
        .select("id,fulfillment_number,order_id,job_order_id,method,status,receiver_name,receiver_phone,destination,courier,tracking_number,package_count,scheduled_at,packing_at,ready_at,shipped_at,delivered_at,picked_up_at,problem_at,cancelled_at,cancel_reason,notes,idempotency_key,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .order("created_at", { ascending: false }),
      supabase
        .from("fulfillment_items")
        .select("id,fulfillment_id,work_item_id,order_item_id,quantity,created_at"),
      supabase
        .from("fulfillment_files")
        .select("id,fulfillment_id,file_type,bucket,path,file_name,mime_type,size_bytes,uploaded_by,uploaded_at"),
      supabase
        .from("orders")
        .select("id,order_number,customer_name,company_name,customer_phone,delivery_method,shipping_address,status,archived_at,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("job_orders")
        .select("id,job_order_number,order_id,quotation_id,approved_mockup_set_id,status,priority,target_date,internal_notes,production_notes,order_snapshot,mockup_snapshot,payment_snapshot,progress_percentage,ready_by,ready_at,released_by,released_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .order("created_at", { ascending: false }),
      supabase
        .from("work_items")
        .select("id,work_item_number,job_order_id,source_order_item_id,source_order_item_service_id,source_mockup_part_id,title,description,quantity,unit,assigned_to,target_date,priority,status,instruction_snapshot,approved_design_snapshot,ready_by,ready_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .order("created_at", { ascending: false }),
      supabase
        .from("qc_records")
        .select("id,work_item_id,attempt_number,passed_quantity,result,archived_at")
        .eq("result", "passed")
        .order("attempt_number", { ascending: false }),
      supabase.from("profiles").select("id,email,role")
    ]);

    setLoading(false);
    const firstError = fulfillmentResult.error || itemResult.error || fileResult.error || orderResult.error || jobResult.error || workResult.error || qcResult.error;
    if (firstError) {
      setNotice({ type: "error", text: `Data pengiriman dan pickup belum dapat dimuat: ${firstError.message}` });
      return;
    }

    setRole(typeof profileResult.data?.role === "string" ? profileResult.data.role : null);
    setFulfillments((fulfillmentResult.data || []) as FulfillmentRow[]);
    setFulfillmentItems((itemResult.data || []) as FulfillmentItemRow[]);
    setFiles((fileResult.data || []) as FulfillmentFileRow[]);
    setOrders((orderResult.data || []) as OrderRow[]);
    setJobOrders((jobResult.data || []) as JobOrderRow[]);
    setWorkItems((workResult.data || []) as WorkItemRow[]);
    setQcRecords((qcResult.data || []) as QcPassedRow[]);
    setProfiles((profileListResult.data || []) as ProfileRow[]);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const fulfillmentMap = useMemo(() => {
    const map: Record<string, FulfillmentRow> = {};
    for (const row of fulfillments) map[row.id] = row;
    return map;
  }, [fulfillments]);

  const orderMap = useMemo(() => {
    const map: Record<string, OrderRow> = {};
    for (const row of orders) map[row.id] = row;
    return map;
  }, [orders]);

  const actorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const profile of profiles) map[profile.id] = profile.email?.trim() || "Akun tanpa email";
    return map;
  }, [profiles]);

  const fileCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const file of files) map[file.fulfillment_id] = (map[file.fulfillment_id] || 0) + 1;
    return map;
  }, [files]);

  const latestPassedMap = useMemo(() => {
    const map: Record<string, QcPassedRow> = {};
    for (const record of qcRecords) {
      if (!record.archived_at && !map[record.work_item_id]) map[record.work_item_id] = record;
    }
    return map;
  }, [qcRecords]);

  const allocatedMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of fulfillmentItems) {
      if (!item.work_item_id) continue;
      const parent = fulfillmentMap[item.fulfillment_id];
      if (!parent || parent.status === "cancelled") continue;
      if (parent.archived_at && !["delivered", "picked_up"].includes(parent.status)) continue;
      map[item.work_item_id] = (map[item.work_item_id] || 0) + item.quantity;
    }
    return map;
  }, [fulfillmentItems, fulfillmentMap]);

  const eligibleOrders = useMemo<EligibleOrder[]>(() => {
    const rows: EligibleOrder[] = [];
    for (const order of orders) {
      if (order.archived_at || ["dibatalkan", "selesai"].includes(order.status)) continue;
      const jobOrder = jobOrders.find(
        (job: JobOrderRow) => job.order_id === order.id && !job.archived_at && ["in_progress", "completed"].includes(job.status)
      );
      if (!jobOrder) continue;
      const activeItems = workItems.filter(
        (item: WorkItemRow) => item.job_order_id === jobOrder.id && !item.archived_at && item.status !== "cancelled"
      );
      if (activeItems.length === 0 || activeItems.some((item: WorkItemRow) => item.status !== "completed")) continue;
      const items = activeItems
        .map((workItem: WorkItemRow) => {
          const passedQuantity = latestPassedMap[workItem.id]?.passed_quantity || 0;
          const allocatedQuantity = allocatedMap[workItem.id] || 0;
          return {
            workItem,
            passedQuantity,
            allocatedQuantity,
            remainingQuantity: Math.max(passedQuantity - allocatedQuantity, 0)
          };
        })
        .filter((item: EligibleItem) => item.remainingQuantity > 0);
      if (items.length > 0) rows.push({ order, jobOrder, items });
    }
    return rows;
  }, [allocatedMap, jobOrders, latestPassedMap, orders, workItems]);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleEligible = useMemo(() => {
    return eligibleOrders.filter(({ order, jobOrder, items }: EligibleOrder) => {
      if (!normalizedSearch) return true;
      return [
        order.order_number,
        order.customer_name,
        order.company_name || "",
        jobOrder.job_order_number,
        ...items.flatMap((item: EligibleItem) => [item.workItem.work_item_number, item.workItem.title])
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [eligibleOrders, normalizedSearch]);

  const visibleRecords = useMemo(() => {
    const archived = tab === "archive";
    return fulfillments.filter((record: FulfillmentRow) => {
      if (Boolean(record.archived_at) !== archived) return false;
      if (!normalizedSearch) return true;
      const order = orderMap[record.order_id];
      return [
        record.fulfillment_number,
        order?.order_number || "",
        order?.customer_name || "",
        FULFILLMENT_METHOD_LABELS[record.method],
        FULFILLMENT_STATUS_LABELS[record.status],
        record.tracking_number || ""
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [fulfillments, normalizedSearch, orderMap, tab]);

  useEffect(() => {
    if (!requestedOrder || loading || createOpen) return;
    const eligible = eligibleOrders.find((row: EligibleOrder) => row.order.id === requestedOrder);
    if (!eligible) return;
    openCreate(eligible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleOrders, loading, requestedOrder]);

  function openCreate(eligible: EligibleOrder) {
    const method: FulfillmentMethod = eligible.order.delivery_method === "pickup" ? "pickup" : "shipping";
    const quantities: Record<string, number> = {};
    for (const item of eligible.items) quantities[item.workItem.id] = item.remainingQuantity;
    setCreateForm({
      order_id: eligible.order.id,
      method,
      receiver_name: eligible.order.customer_name,
      receiver_phone: eligible.order.customer_phone,
      destination: method === "shipping" ? eligible.order.shipping_address || "" : "",
      courier: "",
      package_count: 1,
      scheduled_at: "",
      notes: "",
      quantities
    });
    setCreateOpen(true);
    setNotice(null);
  }

  async function createFulfillment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || working || !createForm.order_id) return;
    const selectedItems = Object.entries(createForm.quantities)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([work_item_id, quantity]) => ({ work_item_id, quantity: Number(quantity) }));
    if (selectedItems.length === 0) {
      setNotice({ type: "error", text: "Pilih minimal satu pekerjaan untuk diserahkan." });
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const idempotencyKey = `fulfillment:${createForm.order_id}:${Date.now()}`;
    const result = await supabase.rpc("create_fulfillment", {
      p_order_id: createForm.order_id,
      p_method: createForm.method,
      p_receiver_name: createForm.receiver_name.trim(),
      p_receiver_phone: createForm.receiver_phone.trim(),
      p_destination: createForm.destination.trim() || null,
      p_courier: createForm.courier.trim() || null,
      p_package_count: createForm.package_count,
      p_scheduled_at: createForm.scheduled_at ? new Date(createForm.scheduled_at).toISOString() : null,
      p_notes: createForm.notes.trim() || null,
      p_items: selectedItems,
      p_idempotency_key: idempotencyKey
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Dokumen pengiriman belum dapat dibuat. Periksa data lalu coba lagi." });
      return;
    }
    const id = typeof result.data?.id === "string" ? result.data.id : null;
    setCreateOpen(false);
    setCreateForm({ ...EMPTY_CREATE });
    if (id) router.push(`/admin/fulfillments/${id}`);
    else await loadData();
  }

  async function restoreRecord(record: FulfillmentRow) {
    if (!canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("restore_fulfillment", { p_fulfillment_id: record.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Dokumen pengiriman belum dapat dipulihkan. Coba lagi." });
      return;
    }
    setRestoreTarget(null);
    setNotice({ type: "success", text: `${record.fulfillment_number} berhasil dipulihkan.` });
    await loadData();
  }

  async function deletePermanently() {
    if (!deleteTarget || !canDelete || working) return;
    if (deleteTarget.confirmation !== deleteTarget.record.fulfillment_number) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("permanently_delete_fulfillment", {
      p_fulfillment_id: deleteTarget.record.id
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Dokumen pengiriman belum dapat dihapus permanen." });
      return;
    }
    setDeleteTarget(null);
    setNotice({ type: "success", text: "Dokumen penyerahan dihapus permanen dan audit penghapusan disimpan." });
    await loadData();
  }

  if (loading) return <AdminLoadingState label="Memuat pengiriman dan pickup..." />;

  const selectedEligible = eligibleOrders.find((row) => row.order.id === createForm.order_id) || null;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 11"
          title="Pengiriman & Ambil di Toko"
          description="Kelola pengemasan, pengiriman, pengambilan di toko, bukti serah terima, dan penyelesaian pesanan setelah pemeriksaan kualitas lulus."
          actions={
            <button
              type="button"
              onClick={() => setTab("archive")}
              className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
            >
              Gudang Arsip
            </button>
          }
        />

        {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}
        {!canManage ? <AdminAlert type="warning">Akun ini tidak mempunyai hak untuk mengelola pengiriman atau pengambilan di toko.</AdminAlert> : null}

        <section className="border border-brand-softGray bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {([
                ["ready", "Siap Diserahkan"],
                ["records", "Pengiriman / Ambil di Toko"],
                ["archive", "Gudang Arsip"]
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                    tab === value ? "bg-brand-green text-white" : "border border-brand-softGray bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nomor, pelanggan, resi, atau pekerjaan"
              className="min-h-11 w-full rounded-full border border-brand-softGray px-5 text-sm lg:max-w-md"
            />
          </div>
        </section>

        {tab === "ready" ? (
          visibleEligible.length === 0 ? (
            <AdminEmptyState
              title="Belum ada pesanan siap diserahkan"
              description="Pesanan muncul setelah seluruh pekerjaan aktif selesai dan memiliki hasil pemeriksaan kualitas lulus yang belum dialokasikan."
            />
          ) : (
            <section className="grid gap-4">
              {visibleEligible.map((eligible: EligibleOrder) => (
                <article key={eligible.order.id} className="border border-brand-softGray bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/50">
                        {eligible.jobOrder.job_order_number}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">{eligible.order.order_number}</h2>
                      <p className="mt-1 text-sm text-brand-charcoal/65">
                        {eligible.order.customer_name}{eligible.order.company_name ? ` · ${eligible.order.company_name}` : ""}
                      </p>
                      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                        {eligible.items.map((item: EligibleItem) => (
                          <p key={item.workItem.id}>
                            <span className="font-semibold">{item.workItem.work_item_number}</span> · {item.workItem.title} · tersisa {item.remainingQuantity} {item.workItem.unit}
                          </p>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreate(eligible)}
                      disabled={!canManage}
                      className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
                    >
                      Buat Pengiriman / Pickup
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )
        ) : visibleRecords.length === 0 ? (
          <AdminEmptyState
            title={tab === "archive" ? "Gudang Arsip masih kosong" : "Belum ada dokumen penyerahan"}
            description={tab === "archive" ? "Dokumen yang diarsipkan akan tampil di sini." : "Buat dokumen dari tab Siap Diserahkan."}
          />
        ) : (
          <section className="grid gap-4">
            {visibleRecords.map((record: FulfillmentRow) => {
              const order = orderMap[record.order_id];
              return (
                <article key={record.id} className="border border-brand-softGray bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/50">
                        {FULFILLMENT_METHOD_LABELS[record.method]}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">{record.fulfillment_number}</h2>
                      <p className="mt-1 text-sm text-brand-charcoal/65">
                        {order?.order_number || "Pesanan"} · {order?.customer_name || record.receiver_name || "-"}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <span>Status: <strong>{FULFILLMENT_STATUS_LABELS[record.status]}</strong></span>
                        <span>Paket: <strong>{record.package_count}</strong></span>
                        <span>Dibuat: <strong>{formatFulfillmentDate(record.created_at)}</strong></span>
                        {record.tracking_number ? <span>Resi: <strong>{record.tracking_number}</strong></span> : null}
                      </div>
                      {record.archived_at ? (
                        <p className="mt-3 text-sm text-amber-800">
                          Diarsipkan {formatFulfillmentDate(record.archived_at)} oleh {record.archived_by ? actorMap[record.archived_by] || "Akun tidak ditemukan" : "-"}
                          {record.archive_reason ? ` · ${record.archive_reason}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/fulfillments/${record.id}`}
                        className="rounded-full border border-brand-softGray px-5 py-2.5 text-sm font-semibold"
                      >
                        Buka Detail
                      </Link>
                      {record.archived_at ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setRestoreTarget(record)}
                            disabled={!canManage || working}
                            className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
                          >
                            Pulihkan
                          </button>
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ record, confirmation: "" })}
                              disabled={working}
                              className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-45"
                            >
                              Hapus Permanen
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {createOpen && selectedEligible ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={createFulfillment} className="mx-auto max-w-3xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Buat Pengiriman / Pengambilan</h2>
            <p className="mt-2 text-sm text-brand-charcoal/65">
              {selectedEligible.order.order_number} · {selectedEligible.order.customer_name}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Metode">
                <select
                  value={createForm.method}
                  onChange={(event) => setCreateForm((current) => ({ ...current, method: event.target.value as FulfillmentMethod }))}
                  className="min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                >
                  <option value="shipping">Pengiriman</option>
                  <option value="pickup">Ambil di Toko</option>
                </select>
              </Field>
              <Field label="Jumlah paket">
                <input
                  type="number"
                  min={1}
                  value={createForm.package_count}
                  onChange={(event) => setCreateForm((current) => ({ ...current, package_count: Number(event.target.value) }))}
                  className="min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </Field>
              <Field label="Nama penerima">
                <input
                  required
                  value={createForm.receiver_name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, receiver_name: event.target.value }))}
                  className="min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </Field>
              <Field label="Nomor penerima">
                <input
                  required
                  value={createForm.receiver_phone}
                  onChange={(event) => setCreateForm((current) => ({ ...current, receiver_phone: event.target.value }))}
                  className="min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </Field>
              {createForm.method === "shipping" ? (
                <Field label="Alamat tujuan" wide>
                  <textarea
                    required
                    rows={3}
                    value={createForm.destination}
                    onChange={(event) => setCreateForm((current) => ({ ...current, destination: event.target.value }))}
                    className="w-full rounded-lg border border-brand-softGray px-4 py-3"
                  />
                </Field>
              ) : null}
              <Field label="Kurir awal">
                <input
                  value={createForm.courier}
                  onChange={(event) => setCreateForm((current) => ({ ...current, courier: event.target.value }))}
                  className="min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </Field>
              <Field label="Jadwal">
                <input
                  type="datetime-local"
                  value={createForm.scheduled_at}
                  onChange={(event) => setCreateForm((current) => ({ ...current, scheduled_at: event.target.value }))}
                  className="min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </Field>
            </div>

            <section className="mt-6 border border-brand-softGray p-4">
              <h3 className="font-semibold">Item yang diserahkan</h3>
              <div className="mt-4 grid gap-3">
                {selectedEligible.items.map((item: EligibleItem) => (
                  <label key={item.workItem.id} className="grid gap-3 border-t border-brand-softGray pt-3 sm:grid-cols-[1fr_150px] sm:items-center">
                    <span className="text-sm">
                      <strong>{item.workItem.work_item_number}</strong> · {item.workItem.title}<br />
                      <span className="text-brand-charcoal/60">Maksimal {item.remainingQuantity} {item.workItem.unit}</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={item.remainingQuantity}
                      value={createForm.quantities[item.workItem.id] ?? 0}
                      onChange={(event) => setCreateForm((current) => ({
                        ...current,
                        quantities: { ...current.quantities, [item.workItem.id]: Number(event.target.value) }
                      }))}
                      className="min-h-11 rounded-lg border border-brand-softGray px-4"
                    />
                  </label>
                ))}
              </div>
            </section>

            <Field label="Catatan" wide className="mt-5">
              <textarea
                rows={4}
                value={createForm.notes}
                onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
                className="w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </Field>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={working}
                className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {working ? "Menyimpan..." : "Buat Dokumen Penyerahan"}
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={working}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {restoreTarget ? (
        <ConfirmModal
          title={`Pulihkan ${restoreTarget.fulfillment_number}?`}
          description="Dokumen akan kembali ke daftar aktif. Database akan memeriksa ulang alokasi jumlah sebelum pemulihan."
          working={working}
          confirmLabel="Pulihkan"
          onConfirm={() => void restoreRecord(restoreTarget)}
          onCancel={() => setRestoreTarget(null)}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Hapus Permanen?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              Hanya dokumen Persiapan atau Dibatalkan yang sudah diarsipkan dan tidak memiliki file bukti yang dapat dihapus. Audit penghapusan tetap disimpan.
            </p>
            {fileCountMap[deleteTarget.record.id] ? (
              <AdminAlert type="warning">Hapus {fileCountMap[deleteTarget.record.id]} file bukti melalui halaman detail terlebih dahulu.</AdminAlert>
            ) : null}
            <label className="mt-5 block text-sm font-semibold">
              Ketik {deleteTarget.record.fulfillment_number}
              <input
                value={deleteTarget.confirmation}
                onChange={(event) => setDeleteTarget({ ...deleteTarget, confirmation: event.target.value })}
                className="mt-2 min-h-11 w-full rounded-lg border border-red-300 px-4"
              />
            </label>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void deletePermanently()}
                disabled={working || deleteTarget.confirmation !== deleteTarget.record.fulfillment_number || Boolean(fileCountMap[deleteTarget.record.id])}
                className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                Hapus Permanen
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
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

function Field({
  label,
  children,
  wide = false,
  className = ""
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-semibold ${wide ? "sm:col-span-2" : ""} ${className}`}>
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ConfirmModal({
  title,
  description,
  working,
  confirmLabel,
  onConfirm,
  onCancel
}: {
  title: string;
  description: string;
  working: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
      <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={working}
            className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
          >
            {working ? "Memproses..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
          >
            Batal
          </button>
        </div>
      </section>
    </div>
  );
}
