"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

type ProductItem = {
  id: string;
  product_name_snapshot: string;
  color_name_snapshot: string | null;
  variant_name_snapshot: string | null;
  size_name_snapshot: string | null;
  quantity: number;
};

type ServiceCatalog = {
  id: string;
  name: string;
  pricing_type: string;
  base_price: number;
  estimated_min_price: number | null;
  estimated_max_price: number | null;
  minimum_quantity: number;
  maximum_quantity: number | null;
  requires_review: boolean;
  requires_notes: boolean;
};

type PricingRule = {
  id: string;
  service_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number | null;
  flat_price: number | null;
  quote_required: boolean;
};

type QuotationService = {
  id: string;
  quotation_item_id: string;
  custom_service_id: string | null;
  service_name_snapshot: string;
  quantity: number;
  position: string | null;
  pricing_status: "confirmed" | "estimated" | "pending";
  unit_price: number | null;
  flat_price: number | null;
  subtotal: number | null;
  notes: string | null;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
};

type FormState = {
  quotationItemId: string;
  customServiceId: string;
  quantity: string;
  position: string;
  pricingStatus: "confirmed" | "estimated" | "pending";
  unitPrice: string;
  flatPrice: string;
  notes: string;
};

const SUPER_ROLES = ["owner", "superadmin", "super_admin"];

function money(value: number | null) {
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

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function QuotationServiceManager() {
  const params = useParams<{ id?: string | string[] }>();
  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalog[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [services, setServices] = useState<QuotationService[]>([]);
  const [quotationStatus, setQuotationStatus] = useState("");
  const [role, setRole] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "archive">("active");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"add" | "edit" | null>(null);
  const [editingService, setEditingService] = useState<QuotationService | null>(null);
  const [archiveService, setArchiveService] = useState<QuotationService | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteService, setDeleteService] = useState<QuotationService | null>(null);
  const [form, setForm] = useState<FormState>({
    quotationItemId: "",
    customServiceId: "",
    quantity: "1",
    position: "",
    pricingStatus: "confirmed",
    unitPrice: "",
    flatPrice: "",
    notes: ""
  });

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase || !quotationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    const [
      quotationResult,
      itemResult,
      serviceResult,
      catalogResult,
      rulesResult,
      profileResult
    ] = await Promise.all([
      supabase.from("quotations").select("status").eq("id", quotationId).maybeSingle(),
      supabase
        .from("quotation_items")
        .select("id,product_name_snapshot,color_name_snapshot,variant_name_snapshot,size_name_snapshot,quantity")
        .eq("quotation_id", quotationId)
        .is("archived_at", null)
        .order("sort_order", { ascending: true }),
      supabase
        .from("quotation_item_services")
        .select("id,quotation_item_id,custom_service_id,service_name_snapshot,quantity,position,pricing_status,unit_price,flat_price,subtotal,notes,archived_at,archived_by,archive_reason,quotation_items!inner(quotation_id)")
        .eq("quotation_items.quotation_id", quotationId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("custom_services")
        .select("id,name,pricing_type,base_price,estimated_min_price,estimated_max_price,minimum_quantity,maximum_quantity,requires_review,requires_notes")
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("service_pricing_rules")
        .select("id,service_id,min_quantity,max_quantity,unit_price,flat_price,quote_required")
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("min_quantity", { ascending: true }),
      user
        ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    setLoading(false);

    const error =
      quotationResult.error ||
      itemResult.error ||
      serviceResult.error ||
      catalogResult.error ||
      rulesResult.error ||
      profileResult.error;

    if (error) {
      setMessage("Data layanan quotation belum berhasil dimuat.");
      return;
    }

    const nextItems = (itemResult.data || []) as ProductItem[];
    const nextCatalog = (catalogResult.data || []) as ServiceCatalog[];
    setQuotationStatus(String(quotationResult.data?.status || ""));
    setProductItems(nextItems);
    setServices((serviceResult.data || []) as unknown as QuotationService[]);
    setCatalog(nextCatalog);
    setRules((rulesResult.data || []) as PricingRule[]);
    setRole(String(profileResult.data?.role || ""));

    if (!form.quotationItemId && nextItems[0]) {
      setForm((state) => ({ ...state, quotationItemId: nextItems[0].id }));
    }
    if (!form.customServiceId && nextCatalog[0]) {
      setForm((state) => ({ ...state, customServiceId: nextCatalog[0].id }));
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  const activeServices = services.filter((item) => !item.archived_at);
  const archivedServices = services.filter((item) => Boolean(item.archived_at));
  const editable = quotationStatus === "draft";
  const isSuperAdmin = SUPER_ROLES.includes(role);
  const selectedCatalog =
    catalog.find((item) => item.id === form.customServiceId) || null;

  function computeDefaultPricing(
    service: ServiceCatalog,
    quantity: number
  ): Pick<FormState, "pricingStatus" | "unitPrice" | "flatPrice"> {
    const rule = rules
      .filter((item) => item.service_id === service.id)
      .find(
        (item) =>
          quantity >= item.min_quantity &&
          (item.max_quantity === null || quantity <= item.max_quantity)
      );

    if (rule?.quote_required) {
      return { pricingStatus: "pending", unitPrice: "", flatPrice: "" };
    }

    const pricingStatus: FormState["pricingStatus"] = service.requires_review
      ? "estimated"
      : "confirmed";

    if (service.pricing_type === "fixed_per_order") {
      return {
        pricingStatus,
        unitPrice: "",
        flatPrice: String(rule?.flat_price ?? service.base_price ?? 0)
      };
    }

    return {
      pricingStatus,
      unitPrice: String(rule?.unit_price ?? service.base_price ?? 0),
      flatPrice: ""
    };
  }

  function openAdd() {
    const firstItem = productItems[0];
    const firstService = catalog[0];
    if (!firstItem || !firstService) {
      setMessage("Tambahkan produk aktif dan pastikan katalog layanan tersedia.");
      return;
    }
    const quantity = Math.max(firstService.minimum_quantity || 1, firstItem.quantity || 1);
    const pricing = computeDefaultPricing(firstService, quantity);
    setForm({
      quotationItemId: firstItem.id,
      customServiceId: firstService.id,
      quantity: String(quantity),
      position: "",
      pricingStatus: pricing.pricingStatus,
      unitPrice: pricing.unitPrice,
      flatPrice: pricing.flatPrice,
      notes: ""
    });
    setEditingService(null);
    setMode("add");
    setMessage("");
  }

  function openEdit(service: QuotationService) {
    setEditingService(service);
    setForm({
      quotationItemId: service.quotation_item_id,
      customServiceId: service.custom_service_id || "",
      quantity: String(service.quantity),
      position: service.position || "",
      pricingStatus: service.pricing_status,
      unitPrice: service.unit_price === null ? "" : String(service.unit_price),
      flatPrice: service.flat_price === null ? "" : String(service.flat_price),
      notes: service.notes || ""
    });
    setMode("edit");
    setMessage("");
  }

  function updateCatalog(serviceId: string) {
    const service = catalog.find((item) => item.id === serviceId);
    if (!service) return;
    const parent = productItems.find((item) => item.id === form.quotationItemId);
    const quantity = Math.max(
      service.minimum_quantity || 1,
      parent?.quantity || Number(form.quantity) || 1
    );
    const pricing = computeDefaultPricing(service, quantity);
    setForm((state) => ({
      ...state,
      customServiceId: serviceId,
      quantity: String(quantity),
      pricingStatus: pricing.pricingStatus,
      unitPrice: pricing.unitPrice,
      flatPrice: pricing.flatPrice
    }));
  }

  function updateQuantity(value: string) {
    const quantity = Math.max(1, Math.floor(numberValue(value)));
    if (!selectedCatalog) {
      setForm((state) => ({ ...state, quantity: value }));
      return;
    }
    const pricing = computeDefaultPricing(selectedCatalog, quantity);
    setForm((state) => ({
      ...state,
      quantity: value,
      pricingStatus: pricing.pricingStatus,
      unitPrice: pricing.unitPrice,
      flatPrice: pricing.flatPrice
    }));
  }

  function calculateSubtotal() {
    if (form.pricingStatus === "pending") return null;
    const quantity = Math.max(1, Math.floor(numberValue(form.quantity)));
    const flat = numberValue(form.flatPrice);
    const unit = numberValue(form.unitPrice);
    return flat > 0 ? flat : unit * quantity;
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable || workingId || !selectedCatalog) return;

    const quantity = Math.floor(numberValue(form.quantity));
    if (quantity < selectedCatalog.minimum_quantity) {
      setMessage(`Minimum layanan ini ${selectedCatalog.minimum_quantity} pcs.`);
      return;
    }
    if (
      selectedCatalog.maximum_quantity !== null &&
      quantity > selectedCatalog.maximum_quantity
    ) {
      setMessage(`Maksimum layanan ini ${selectedCatalog.maximum_quantity} pcs.`);
      return;
    }
    if (selectedCatalog.requires_notes && !form.notes.trim()) {
      setMessage("Catatan wajib diisi untuk layanan ini.");
      return;
    }
    if (!form.quotationItemId) {
      setMessage("Pilih produk tujuan layanan.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;

    const actionId = editingService?.id || "new-service";
    setWorkingId(actionId);
    setMessage("");

    const subtotal = calculateSubtotal();
    const payload = {
      quotation_item_id: form.quotationItemId,
      custom_service_id: selectedCatalog.id,
      service_name_snapshot: selectedCatalog.name,
      quantity,
      position: form.position.trim() || null,
      pricing_status: form.pricingStatus,
      unit_price:
        form.pricingStatus === "pending" || !form.unitPrice
          ? null
          : numberValue(form.unitPrice),
      flat_price:
        form.pricingStatus === "pending" || !form.flatPrice
          ? null
          : numberValue(form.flatPrice),
      subtotal,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString()
    };

    const result =
      mode === "edit" && editingService
        ? await supabase
            .from("quotation_item_services")
            .update(payload)
            .eq("id", editingService.id)
            .is("archived_at", null)
        : await supabase.from("quotation_item_services").insert(payload);

    if (result.error) {
      setWorkingId(null);
      setMessage("Layanan gagal disimpan. Periksa data dan coba kembali.");
      return;
    }

    const { error: totalError } = await supabase.rpc("refresh_quotation_totals", {
      p_quotation_id: quotationId
    });

    setWorkingId(null);

    if (totalError) {
      setMessage("Layanan tersimpan, tetapi total quotation belum diperbarui.");
      return;
    }

    setMode(null);
    setEditingService(null);
    setMessage(
      mode === "edit"
        ? "Perubahan layanan berhasil disimpan."
        : "Layanan berhasil ditambahkan."
    );
    await loadData();
    window.location.reload();
  }

  async function archiveSelected() {
    if (!archiveService || workingId || !editable) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(archiveService.id);
    const { error } = await supabase.rpc("archive_quotation_item_service", {
      p_service_id: archiveService.id,
      p_reason: archiveReason.trim() || null
    });
    setWorkingId(null);

    if (error) {
      setMessage("Layanan gagal diarsipkan.");
      return;
    }

    setArchiveService(null);
    setArchiveReason("");
    setTab("archive");
    setMessage("Layanan dipindahkan ke Gudang Arsip.");
    await loadData();
    window.location.reload();
  }

  async function restoreService(service: QuotationService) {
    if (workingId || !editable) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(service.id);
    const { error } = await supabase.rpc("restore_quotation_item_service", {
      p_service_id: service.id
    });
    setWorkingId(null);

    if (error) {
      setMessage("Layanan gagal dipulihkan.");
      return;
    }

    setTab("active");
    setMessage("Layanan berhasil dipulihkan.");
    await loadData();
    window.location.reload();
  }

  async function permanentlyDelete() {
    if (!deleteService || workingId || !isSuperAdmin) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(deleteService.id);
    const { error } = await supabase.rpc(
      "permanently_delete_quotation_item_service",
      { p_service_id: deleteService.id }
    );
    setWorkingId(null);

    if (error) {
      setMessage("Hapus permanen ditolak atau gagal diproses.");
      return;
    }

    setDeleteService(null);
    setMessage("Layanan berhasil dihapus permanen.");
    await loadData();
    window.location.reload();
  }

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold opacity-50"
      >
        Memuat layanan...
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
        Kelola Layanan
      </button>

      {open ? (
        <div className="fixed inset-0 z-[85] overflow-y-auto bg-black/45 p-4 sm:p-8">
          <section className="mx-auto max-w-5xl border border-brand-softGray bg-brand-offWhite shadow-2xl">
            <header className="flex flex-col gap-5 border-b border-brand-softGray bg-white p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                  Penawaran Harga Resmi
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Kelola Layanan</h2>
                <p className="mt-2 text-sm text-brand-charcoal/60">
                  Tambah, edit, arsipkan, pulihkan, dan hapus permanen sesuai role.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openAdd}
                  disabled={!editable || !productItems.length || !catalog.length}
                  className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
                >
                  Tambah Layanan
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={Boolean(workingId)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-softGray bg-white text-xl"
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>
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
                  Aktif ({activeServices.length})
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
                  Gudang Arsip ({archivedServices.length})
                </button>
              </div>

              {message ? (
                <div className="mt-5 border border-brand-softGray bg-white p-4 text-sm font-semibold">
                  {message}
                </div>
              ) : null}

              {!editable ? (
                <div className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Perubahan layanan dikunci karena quotation tidak berstatus Draft.
                </div>
              ) : null}

              {!productItems.length ? (
                <div className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Tambahkan minimal satu produk aktif sebelum menambahkan layanan.
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                {(tab === "active" ? activeServices : archivedServices).map(
                  (service) => {
                    const parent = productItems.find(
                      (item) => item.id === service.quotation_item_id
                    );
                    return (
                      <article
                        key={service.id}
                        className="border border-brand-softGray bg-white p-4 sm:p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {service.service_name_snapshot}
                            </h3>
                            <p className="mt-1 text-sm text-brand-charcoal/60">
                              {parent?.product_name_snapshot || "Produk terkait"} ·{" "}
                              {service.quantity} pcs
                              {service.position ? ` · ${service.position}` : ""}
                            </p>
                            <p className="mt-2 text-sm font-semibold">
                              {money(service.subtotal)} ·{" "}
                              {service.pricing_status === "confirmed"
                                ? "Harga pasti"
                                : service.pricing_status === "estimated"
                                  ? "Estimasi"
                                  : "Menunggu harga"}
                            </p>
                            {service.notes ? (
                              <p className="mt-2 text-sm text-brand-charcoal/60">
                                Catatan: {service.notes}
                              </p>
                            ) : null}
                            {service.archived_at ? (
                              <div className="mt-3 text-xs leading-5 text-brand-charcoal/55">
                                <p>Diarsipkan: {formatDate(service.archived_at)}</p>
                                <p>Oleh: {service.archived_by || "-"}</p>
                                <p>Alasan: {service.archive_reason || "-"}</p>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {tab === "active" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(service)}
                                  disabled={!editable || Boolean(workingId)}
                                  className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setArchiveService(service);
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
                                  onClick={() => void restoreService(service)}
                                  disabled={!editable || Boolean(workingId)}
                                  className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
                                >
                                  {workingId === service.id
                                    ? "Memulihkan..."
                                    : "Pulihkan"}
                                </button>
                                {isSuperAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteService(service)}
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
                    );
                  }
                )}

                {(tab === "active" ? activeServices : archivedServices).length ===
                0 ? (
                  <div className="border border-dashed border-brand-softGray bg-white p-8 text-center">
                    <p className="font-semibold">
                      {tab === "active"
                        ? "Belum ada layanan aktif"
                        : "Gudang Arsip layanan kosong"}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {mode ? (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/55 p-4 sm:p-8">
          <form
            onSubmit={saveService}
            className="mx-auto max-w-2xl border border-brand-softGray bg-white p-6 shadow-2xl sm:p-7"
          >
            <h2 className="text-2xl font-semibold">
              {mode === "add" ? "Tambah Layanan" : "Edit Layanan"}
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">
                Produk tujuan
                <select
                  value={form.quotationItemId}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      quotationItemId: event.target.value
                    }))
                  }
                  disabled={mode === "edit"}
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 disabled:bg-brand-offWhite"
                >
                  {productItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.product_name_snapshot} ·{" "}
                      {item.color_name_snapshot ||
                        item.variant_name_snapshot ||
                        "Tanpa warna"}{" "}
                      · {item.size_name_snapshot || "Tanpa ukuran"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold sm:col-span-2">
                Jenis layanan
                <select
                  value={form.customServiceId}
                  onChange={(event) => updateCatalog(event.target.value)}
                  disabled={mode === "edit"}
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 disabled:bg-brand-offWhite"
                >
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Quantity
                <input
                  type="number"
                  min={selectedCatalog?.minimum_quantity || 1}
                  max={selectedCatalog?.maximum_quantity || undefined}
                  value={form.quantity}
                  onChange={(event) => updateQuantity(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </label>

              <label className="text-sm font-semibold">
                Posisi
                <input
                  value={form.position}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, position: event.target.value }))
                  }
                  placeholder="Contoh: dada kiri"
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </label>

              <label className="text-sm font-semibold">
                Status harga
                <select
                  value={form.pricingStatus}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      pricingStatus: event.target.value as FormState["pricingStatus"]
                    }))
                  }
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                >
                  <option value="confirmed">Harga pasti</option>
                  <option value="estimated">Estimasi</option>
                  <option value="pending">Menunggu harga</option>
                </select>
              </label>

              <label className="text-sm font-semibold">
                Harga per item
                <input
                  type="number"
                  min="0"
                  value={form.unitPrice}
                  disabled={
                    form.pricingStatus === "pending" ||
                    Boolean(form.flatPrice)
                  }
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      unitPrice: event.target.value,
                      flatPrice: ""
                    }))
                  }
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 disabled:bg-brand-offWhite"
                />
              </label>

              <label className="text-sm font-semibold sm:col-span-2">
                Harga flat per order
                <input
                  type="number"
                  min="0"
                  value={form.flatPrice}
                  disabled={
                    form.pricingStatus === "pending" ||
                    Boolean(form.unitPrice)
                  }
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      flatPrice: event.target.value,
                      unitPrice: ""
                    }))
                  }
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 disabled:bg-brand-offWhite"
                />
              </label>

              <label className="text-sm font-semibold sm:col-span-2">
                Catatan
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, notes: event.target.value }))
                  }
                  className="mt-2 min-h-24 w-full rounded-lg border border-brand-softGray px-4 py-3"
                  placeholder="Detail ukuran desain, warna tinta, teknik, atau kebutuhan khusus"
                />
              </label>
            </div>

            <section className="mt-5 border border-brand-softGray bg-brand-offWhite p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
                Pratinjau subtotal
              </p>
              <p className="mt-2 text-xl font-semibold">
                {money(calculateSubtotal())}
              </p>
            </section>

            {message ? (
              <div className="mt-5 border border-brand-softGray p-4 text-sm font-semibold">
                {message}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={Boolean(workingId)}
                className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {workingId
                  ? "Menyimpan..."
                  : mode === "add"
                    ? "Simpan Layanan"
                    : "Simpan Perubahan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setEditingService(null);
                }}
                disabled={Boolean(workingId)}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {archiveService ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/55 p-4">
          <section className="w-full max-w-lg border border-amber-200 bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Arsipkan Layanan?</h2>
            <p className="mt-3 text-sm text-brand-charcoal/65">
              Layanan dapat dipulihkan kembali dari Gudang Arsip.
            </p>
            <textarea
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              className="mt-5 min-h-24 w-full rounded-lg border border-brand-softGray px-4 py-3"
              placeholder="Alasan arsip"
            />
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
                onClick={() => setArchiveService(null)}
                disabled={Boolean(workingId)}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteService ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg border border-red-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              Super Admin Only
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Hapus Permanen?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              <strong>{deleteService.service_name_snapshot}</strong> akan hilang
              permanen dan tidak dapat dipulihkan.
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
                onClick={() => setDeleteService(null)}
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
