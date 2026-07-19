"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type Product = {
  id: string;
  nama: string;
  sku?: string | null;
  minimum_order_qty?: number | null;
};

type PriceTier = {
  id?: string;
  product_id: string;
  min_quantity: number;
  max_quantity?: number | null;
  unit_price?: number | null;
  quote_required: boolean;
  status: string;
  sort_order: number;
};

type MinimumRule = {
  id?: string;
  product_id: string;
  minimum_quantity: number;
  minimum_for_tier_quantity?: number | null;
  quotation_quantity?: number | null;
  status: string;
};

type Service = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: string;
  pricing_type: string;
  base_price: number;
  estimated_min_price?: number | null;
  estimated_max_price?: number | null;
  minimum_quantity: number;
  maximum_quantity?: number | null;
  requires_review: boolean;
  requires_upload: boolean;
  requires_notes: boolean;
  is_stackable: boolean;
  sort_order: number;
};

type ServiceRule = {
  id?: string;
  service_id: string;
  min_quantity: number;
  max_quantity?: number | null;
  unit_price?: number | null;
  flat_price?: number | null;
  quote_required: boolean;
  status: string;
  sort_order: number;
};

type Status = { type: "success" | "error" | "info"; text: string };

const emptyTier = (productId = ""): PriceTier => ({
  product_id: productId,
  min_quantity: 1,
  max_quantity: null,
  unit_price: 0,
  quote_required: false,
  status: "active",
  sort_order: 0
});

const emptyRule = (productId = ""): MinimumRule => ({
  product_id: productId,
  minimum_quantity: 1,
  minimum_for_tier_quantity: null,
  quotation_quantity: null,
  status: "active"
});

const emptyServiceRule = (serviceId = ""): ServiceRule => ({
  service_id: serviceId,
  min_quantity: 1,
  max_quantity: null,
  unit_price: 0,
  flat_price: null,
  quote_required: false,
  status: "active",
  sort_order: 0
});

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value?: number | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function BulkCustomManager() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"bulk" | "services">("bulk");
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [minimumRules, setMinimumRules] = useState<MinimumRule[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceRules, setServiceRules] = useState<ServiceRule[]>([]);

  const [productId, setProductId] = useState("");
  const [tierForm, setTierForm] = useState<PriceTier>(emptyTier());
  const [minimumForm, setMinimumForm] = useState<MinimumRule>(emptyRule());

  const [serviceId, setServiceId] = useState("");
  const [serviceForm, setServiceForm] = useState<Service | null>(null);
  const [serviceRuleForm, setServiceRuleForm] = useState<ServiceRule>(
    emptyServiceRule()
  );

  const productTiers = useMemo(
    () =>
      tiers
        .filter((item) => item.product_id === productId)
        .sort((a, b) => a.min_quantity - b.min_quantity),
    [tiers, productId]
  );

  const selectedServiceRules = useMemo(
    () =>
      serviceRules
        .filter((item) => item.service_id === serviceId)
        .sort((a, b) => a.min_quantity - b.min_quantity),
    [serviceRules, serviceId]
  );

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setStatus({ type: "error", text: "Layanan data belum tersedia. Hubungi pengelola sistem." });
      return;
    }

    setLoading(true);
    const [productResult, tierResult, minimumResult, serviceResult, serviceRuleResult] =
      await Promise.all([
        supabase.from("products").select("id,nama,sku,minimum_order_qty").order("nama"),
        supabase.from("product_price_tiers").select("*").order("sort_order"),
        supabase.from("product_minimum_rules").select("*"),
        supabase.from("custom_services").select("*").order("sort_order"),
        supabase.from("service_pricing_rules").select("*").order("sort_order")
      ]);

    setLoading(false);

    const error =
      productResult.error ||
      tierResult.error ||
      minimumResult.error ||
      serviceResult.error ||
      serviceRuleResult.error;

    if (error) {
      setStatus({ type: "error", text: "Pengaturan pesanan custom belum dapat dimuat. Coba lagi." });
      return;
    }

    const nextProducts = (productResult.data || []) as Product[];
    const nextTiers = (tierResult.data || []) as PriceTier[];
    const nextMinimumRules = (minimumResult.data || []) as MinimumRule[];
    const nextServices = (serviceResult.data || []) as Service[];
    const nextServiceRules = (serviceRuleResult.data || []) as ServiceRule[];

    setProducts(nextProducts);
    setTiers(nextTiers);
    setMinimumRules(nextMinimumRules);
    setServices(nextServices);
    setServiceRules(nextServiceRules);

    const nextProductId = productId || nextProducts[0]?.id || "";
    setProductId(nextProductId);

    const product = nextProducts.find((item) => item.id === nextProductId);
    const existingMinimum = nextMinimumRules.find(
      (item) => item.product_id === nextProductId
    );
    setMinimumForm(
      existingMinimum || {
        ...emptyRule(nextProductId),
        minimum_quantity: product?.minimum_order_qty || 1
      }
    );
    setTierForm(emptyTier(nextProductId));

    const nextServiceId = serviceId || nextServices[0]?.id || "";
    setServiceId(nextServiceId);
    setServiceForm(nextServices.find((item) => item.id === nextServiceId) || null);
    setServiceRuleForm(emptyServiceRule(nextServiceId));

    setStatus({ type: "success", text: "Panel Bulk & Custom siap." });
  }

  useEffect(() => {
    if (open) void loadData();
  }, [open]);

  useEffect(() => {
    const product = products.find((item) => item.id === productId);
    const existing = minimumRules.find((item) => item.product_id === productId);
    setMinimumForm(
      existing || {
        ...emptyRule(productId),
        minimum_quantity: product?.minimum_order_qty || 1
      }
    );
    setTierForm(emptyTier(productId));
  }, [productId]);

  useEffect(() => {
    setServiceForm(services.find((item) => item.id === serviceId) || null);
    setServiceRuleForm(emptyServiceRule(serviceId));
  }, [serviceId]);

  async function saveMinimum(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase || !productId) return;

    const payload = {
      product_id: productId,
      minimum_quantity: Math.max(1, minimumForm.minimum_quantity),
      minimum_for_tier_quantity: minimumForm.minimum_for_tier_quantity,
      quotation_quantity: minimumForm.quotation_quantity,
      status: "active",
      updated_at: new Date().toISOString()
    };

    const request = minimumForm.id
      ? supabase
          .from("product_minimum_rules")
          .update(payload)
          .eq("id", minimumForm.id)
      : supabase.from("product_minimum_rules").insert(payload);

    const [{ error }, productUpdate] = await Promise.all([
      request,
      supabase
        .from("products")
        .update({
          minimum_order_qty: payload.minimum_quantity,
          updated_at: new Date().toISOString()
        })
        .eq("id", productId)
    ]);

    if (error || productUpdate.error) {
      setStatus({
        type: "error",
        text: `Minimum order gagal disimpan: ${
          error?.message || productUpdate.error?.message
        }`
      });
      return;
    }

    setStatus({ type: "success", text: "Minimum order berhasil disimpan." });
    await loadData();
  }

  async function saveTier(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase || !productId) return;

    if (
      tierForm.max_quantity !== null &&
      tierForm.max_quantity !== undefined &&
      tierForm.max_quantity < tierForm.min_quantity
    ) {
      setStatus({
        type: "error",
        text: "Maksimum quantity tidak boleh lebih kecil dari minimum."
      });
      return;
    }

    const payload = {
      product_id: productId,
      min_quantity: Math.max(1, tierForm.min_quantity),
      max_quantity: tierForm.max_quantity,
      unit_price: tierForm.quote_required ? null : tierForm.unit_price,
      quote_required: tierForm.quote_required,
      status: "active",
      sort_order: tierForm.sort_order,
      updated_at: new Date().toISOString()
    };

    const request = tierForm.id
      ? supabase.from("product_price_tiers").update(payload).eq("id", tierForm.id)
      : supabase.from("product_price_tiers").insert(payload);

    const { error } = await request;
    if (error) {
      setStatus({ type: "error", text: "Tingkat harga belum dapat disimpan. Periksa data lalu coba lagi." });
      return;
    }

    setStatus({ type: "success", text: "Tier harga berhasil disimpan." });
    setTierForm(emptyTier(productId));
    await loadData();
  }

  async function deleteTier(id?: string) {
    if (!id || !window.confirm("Hapus tier harga ini?")) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from("product_price_tiers").delete().eq("id", id);
    if (error) {
      setStatus({ type: "error", text: "Tingkat harga belum dapat dihapus. Coba lagi." });
      return;
    }

    setStatus({ type: "success", text: "Tier harga dihapus." });
    await loadData();
  }

  async function saveService(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase || !serviceForm) return;

    const payload = {
      name: serviceForm.name,
      slug: serviceForm.slug,
      description: serviceForm.description || null,
      status: serviceForm.status,
      pricing_type: serviceForm.pricing_type,
      base_price: serviceForm.base_price,
      estimated_min_price: serviceForm.estimated_min_price,
      estimated_max_price: serviceForm.estimated_max_price,
      minimum_quantity: Math.max(1, serviceForm.minimum_quantity),
      maximum_quantity: serviceForm.maximum_quantity,
      requires_review: serviceForm.requires_review,
      requires_upload: serviceForm.requires_upload,
      requires_notes: serviceForm.requires_notes,
      is_stackable: serviceForm.is_stackable,
      sort_order: serviceForm.sort_order,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("custom_services")
      .update(payload)
      .eq("id", serviceForm.id);

    if (error) {
      setStatus({ type: "error", text: "Layanan belum dapat disimpan. Periksa data lalu coba lagi." });
      return;
    }

    setStatus({ type: "success", text: "Layanan custom berhasil disimpan." });
    await loadData();
  }

  async function saveServiceRule(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase || !serviceId) return;

    const payload = {
      service_id: serviceId,
      min_quantity: Math.max(1, serviceRuleForm.min_quantity),
      max_quantity: serviceRuleForm.max_quantity,
      unit_price: serviceRuleForm.quote_required ? null : serviceRuleForm.unit_price,
      flat_price: serviceRuleForm.quote_required ? null : serviceRuleForm.flat_price,
      quote_required: serviceRuleForm.quote_required,
      status: "active",
      sort_order: serviceRuleForm.sort_order,
      updated_at: new Date().toISOString()
    };

    const request = serviceRuleForm.id
      ? supabase
          .from("service_pricing_rules")
          .update(payload)
          .eq("id", serviceRuleForm.id)
      : supabase.from("service_pricing_rules").insert(payload);

    const { error } = await request;
    if (error) {
      setStatus({
        type: "error",
        text: "Aturan harga layanan belum dapat disimpan. Periksa data lalu coba lagi."
      });
      return;
    }

    setStatus({ type: "success", text: "Aturan harga layanan berhasil disimpan." });
    setServiceRuleForm(emptyServiceRule(serviceId));
    await loadData();
  }

  async function deleteServiceRule(id?: string) {
    if (!id || !window.confirm("Hapus aturan harga layanan ini?")) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from("service_pricing_rules")
      .delete()
      .eq("id", id);

    if (error) {
      setStatus({ type: "error", text: "Aturan belum dapat dihapus. Coba lagi." });
      return;
    }

    setStatus({ type: "success", text: "Aturan harga layanan dihapus." });
    await loadData();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-44 z-[109] rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        Bulk & Custom
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[140] overflow-y-auto bg-black/60 p-3 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Bulk dan custom admin"
        >
          <div className="mx-auto max-w-7xl bg-brand-offWhite p-4 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">
                  DEBRODER v1.1
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Bulk & Custom Ordering
                </h2>
                <p className="mt-2 text-sm text-black/60">
                  Kelola minimum order, harga bertingkat, layanan custom, dan
                  aturan harga layanan.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            {status ? (
              <p
                className={`mt-5 border p-4 text-sm font-semibold ${
                  status.type === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : status.type === "success"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "bg-white"
                }`}
              >
                {status.text}
              </p>
            ) : null}

            <div className="mt-5 flex gap-2 overflow-x-auto rounded-full bg-white p-2">
              <button
                type="button"
                onClick={() => setTab("bulk")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  tab === "bulk" ? "bg-brand-green text-white" : ""
                }`}
              >
                Harga Grosir
              </button>
              <button
                type="button"
                onClick={() => setTab("services")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  tab === "services" ? "bg-brand-green text-white" : ""
                }`}
              >
                Layanan Custom
              </button>
            </div>

            {loading ? (
              <p className="mt-5 bg-white p-5 text-sm">Memuat data...</p>
            ) : null}

            {!loading && tab === "bulk" ? (
              <section className="mt-5 grid gap-5 xl:grid-cols-2">
                <div className="grid gap-5">
                  <form onSubmit={saveMinimum} className="bg-white p-5">
                    <h3 className="text-lg font-semibold">Minimum Order</h3>

                    <label className="mt-4 block text-sm font-semibold">
                      Produk
                      <select
                        value={productId}
                        onChange={(event) => setProductId(event.target.value)}
                        className="mt-2 min-h-11 w-full border px-3"
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.nama}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <label className="text-sm font-semibold">
                        Minimum order
                        <input
                          type="number"
                          min={1}
                          value={minimumForm.minimum_quantity}
                          onChange={(event) =>
                            setMinimumForm((current) => ({
                              ...current,
                              minimum_quantity: numberValue(event.target.value, 1)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3"
                        />
                      </label>

                      <label className="text-sm font-semibold">
                        Minimum tier
                        <input
                          type="number"
                          min={1}
                          value={minimumForm.minimum_for_tier_quantity ?? ""}
                          onChange={(event) =>
                            setMinimumForm((current) => ({
                              ...current,
                              minimum_for_tier_quantity: nullableNumber(
                                event.target.value
                              )
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3"
                        />
                      </label>

                      <label className="text-sm font-semibold">
                        Mulai quotation
                        <input
                          type="number"
                          min={1}
                          value={minimumForm.quotation_quantity ?? ""}
                          onChange={(event) =>
                            setMinimumForm((current) => ({
                              ...current,
                              quotation_quantity: nullableNumber(event.target.value)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3"
                        />
                      </label>
                    </div>

                    <button className="mt-5 min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white">
                      Simpan minimum order
                    </button>
                  </form>

                  <form onSubmit={saveTier} className="bg-white p-5">
                    <h3 className="text-lg font-semibold">
                      {tierForm.id ? "Edit Tier Harga" : "Tambah Tier Harga"}
                    </h3>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="text-sm font-semibold">
                        Minimum qty
                        <input
                          type="number"
                          min={1}
                          value={tierForm.min_quantity}
                          onChange={(event) =>
                            setTierForm((current) => ({
                              ...current,
                              min_quantity: numberValue(event.target.value, 1)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3"
                        />
                      </label>

                      <label className="text-sm font-semibold">
                        Maksimum qty
                        <input
                          type="number"
                          min={1}
                          value={tierForm.max_quantity ?? ""}
                          onChange={(event) =>
                            setTierForm((current) => ({
                              ...current,
                              max_quantity: nullableNumber(event.target.value)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3"
                        />
                      </label>

                      <label className="text-sm font-semibold">
                        Harga per pcs
                        <input
                          type="number"
                          min={0}
                          disabled={tierForm.quote_required}
                          value={tierForm.unit_price ?? ""}
                          onChange={(event) =>
                            setTierForm((current) => ({
                              ...current,
                              unit_price: nullableNumber(event.target.value)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3 disabled:bg-black/5"
                        />
                      </label>

                      <label className="text-sm font-semibold">
                        Urutan
                        <input
                          type="number"
                          value={tierForm.sort_order}
                          onChange={(event) =>
                            setTierForm((current) => ({
                              ...current,
                              sort_order: numberValue(event.target.value)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3"
                        />
                      </label>

                      <label className="flex min-h-11 items-center gap-3 border px-3 text-sm font-semibold sm:mt-7">
                        <input
                          type="checkbox"
                          checked={tierForm.quote_required}
                          onChange={(event) =>
                            setTierForm((current) => ({
                              ...current,
                              quote_required: event.target.checked
                            }))
                          }
                        />
                        Wajib quotation
                      </label>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button className="min-h-11 rounded-full bg-black px-5 text-sm font-semibold text-white">
                        Simpan tier
                      </button>
                      {tierForm.id ? (
                        <button
                          type="button"
                          onClick={() => setTierForm(emptyTier(productId))}
                          className="min-h-11 rounded-full border px-5 text-sm font-semibold"
                        >
                          Batal edit
                        </button>
                      ) : null}
                    </div>
                  </form>
                </div>

                <div className="bg-white p-5">
                  <h3 className="text-lg font-semibold">Daftar Tier Harga</h3>
                  <div className="mt-4 grid gap-3">
                    {productTiers.length ? (
                      productTiers.map((tier) => (
                        <article
                          key={tier.id}
                          className="flex flex-wrap items-center gap-3 border p-4"
                        >
                          <div>
                            <p className="font-semibold">
                              {tier.min_quantity}–
                              {tier.max_quantity ?? "∞"} pcs
                            </p>
                            <p className="text-sm text-black/60">
                              {tier.quote_required
                                ? "Wajib quotation"
                                : `${money(tier.unit_price)} / pcs`}
                            </p>
                          </div>
                          <div className="ml-auto flex gap-2">
                            <button
                              type="button"
                              onClick={() => setTierForm({ ...tier })}
                              className="rounded-full bg-black px-3 py-2 text-xs font-semibold text-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteTier(tier.id)}
                              className="rounded-full bg-red-700 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Hapus
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="bg-brand-offWhite p-4 text-sm">
                        Belum ada tier harga untuk produk ini.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {!loading && tab === "services" ? (
              <section className="mt-5 grid gap-5 xl:grid-cols-2">
                <div className="grid gap-5">
                  <form onSubmit={saveService} className="bg-white p-5">
                    <h3 className="text-lg font-semibold">Pengaturan Layanan</h3>

                    <label className="mt-4 block text-sm font-semibold">
                      Pilih layanan
                      <select
                        value={serviceId}
                        onChange={(event) => setServiceId(event.target.value)}
                        className="mt-2 min-h-11 w-full border px-3"
                      >
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {serviceForm ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-semibold">
                          Nama
                          <input
                            value={serviceForm.name}
                            onChange={(event) =>
                              setServiceForm((current) =>
                                current
                                  ? { ...current, name: event.target.value }
                                  : current
                              )
                            }
                            className="mt-2 min-h-11 w-full border px-3"
                          />
                        </label>

                        <label className="text-sm font-semibold">
                          Tipe harga
                          <select
                            value={serviceForm.pricing_type}
                            onChange={(event) =>
                              setServiceForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      pricing_type: event.target.value
                                    }
                                  : current
                              )
                            }
                            className="mt-2 min-h-11 w-full border px-3"
                          >
                            <option value="fixed_per_item">Tetap per item</option>
                            <option value="flat">Flat</option>
                            <option value="tiered">Bertingkat</option>
                            <option value="quotation">Penawaran Harga</option>
                            <option value="estimated">Estimasi</option>
                          </select>
                        </label>

                        <label className="text-sm font-semibold">
                          Harga dasar
                          <input
                            type="number"
                            min={0}
                            value={serviceForm.base_price}
                            onChange={(event) =>
                              setServiceForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      base_price: numberValue(event.target.value)
                                    }
                                  : current
                              )
                            }
                            className="mt-2 min-h-11 w-full border px-3"
                          />
                        </label>

                        <label className="text-sm font-semibold">
                          Minimum qty
                          <input
                            type="number"
                            min={1}
                            value={serviceForm.minimum_quantity}
                            onChange={(event) =>
                              setServiceForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      minimum_quantity: numberValue(
                                        event.target.value,
                                        1
                                      )
                                    }
                                  : current
                              )
                            }
                            className="mt-2 min-h-11 w-full border px-3"
                          />
                        </label>

                        <label className="flex min-h-11 items-center gap-3 border px-3 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={serviceForm.requires_upload}
                            onChange={(event) =>
                              setServiceForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      requires_upload: event.target.checked
                                    }
                                  : current
                              )
                            }
                          />
                          Wajib upload desain
                        </label>

                        <label className="flex min-h-11 items-center gap-3 border px-3 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={serviceForm.requires_notes}
                            onChange={(event) =>
                              setServiceForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      requires_notes: event.target.checked
                                    }
                                  : current
                              )
                            }
                          />
                          Wajib catatan
                        </label>

                        <label className="flex min-h-11 items-center gap-3 border px-3 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={serviceForm.requires_review}
                            onChange={(event) =>
                              setServiceForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      requires_review: event.target.checked
                                    }
                                  : current
                              )
                            }
                          />
                          Perlu review admin
                        </label>

                        <label className="flex min-h-11 items-center gap-3 border px-3 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={serviceForm.is_stackable}
                            onChange={(event) =>
                              setServiceForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      is_stackable: event.target.checked
                                    }
                                  : current
                              )
                            }
                          />
                          Bisa digabung
                        </label>
                      </div>
                    ) : null}

                    <button className="mt-5 min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white">
                      Simpan layanan
                    </button>
                  </form>

                  <form onSubmit={saveServiceRule} className="bg-white p-5">
                    <h3 className="text-lg font-semibold">
                      {serviceRuleForm.id
                        ? "Edit Aturan Harga"
                        : "Tambah Aturan Harga"}
                    </h3>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="text-sm font-semibold">
                        Minimum qty
                        <input
                          type="number"
                          min={1}
                          value={serviceRuleForm.min_quantity}
                          onChange={(event) =>
                            setServiceRuleForm((current) => ({
                              ...current,
                              min_quantity: numberValue(event.target.value, 1)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3"
                        />
                      </label>

                      <label className="text-sm font-semibold">
                        Maksimum qty
                        <input
                          type="number"
                          min={1}
                          value={serviceRuleForm.max_quantity ?? ""}
                          onChange={(event) =>
                            setServiceRuleForm((current) => ({
                              ...current,
                              max_quantity: nullableNumber(event.target.value)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3"
                        />
                      </label>

                      <label className="text-sm font-semibold">
                        Harga per item
                        <input
                          type="number"
                          min={0}
                          disabled={serviceRuleForm.quote_required}
                          value={serviceRuleForm.unit_price ?? ""}
                          onChange={(event) =>
                            setServiceRuleForm((current) => ({
                              ...current,
                              unit_price: nullableNumber(event.target.value)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3 disabled:bg-black/5"
                        />
                      </label>

                      <label className="text-sm font-semibold">
                        Harga flat
                        <input
                          type="number"
                          min={0}
                          disabled={serviceRuleForm.quote_required}
                          value={serviceRuleForm.flat_price ?? ""}
                          onChange={(event) =>
                            setServiceRuleForm((current) => ({
                              ...current,
                              flat_price: nullableNumber(event.target.value)
                            }))
                          }
                          className="mt-2 min-h-11 w-full border px-3 disabled:bg-black/5"
                        />
                      </label>

                      <label className="flex min-h-11 items-center gap-3 border px-3 text-sm font-semibold sm:mt-7">
                        <input
                          type="checkbox"
                          checked={serviceRuleForm.quote_required}
                          onChange={(event) =>
                            setServiceRuleForm((current) => ({
                              ...current,
                              quote_required: event.target.checked
                            }))
                          }
                        />
                        Wajib quotation
                      </label>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button className="min-h-11 rounded-full bg-black px-5 text-sm font-semibold text-white">
                        Simpan aturan
                      </button>
                      {serviceRuleForm.id ? (
                        <button
                          type="button"
                          onClick={() =>
                            setServiceRuleForm(emptyServiceRule(serviceId))
                          }
                          className="min-h-11 rounded-full border px-5 text-sm font-semibold"
                        >
                          Batal edit
                        </button>
                      ) : null}
                    </div>
                  </form>
                </div>

                <div className="bg-white p-5">
                  <h3 className="text-lg font-semibold">
                    Aturan Harga Layanan
                  </h3>
                  <div className="mt-4 grid gap-3">
                    {selectedServiceRules.length ? (
                      selectedServiceRules.map((rule) => (
                        <article
                          key={rule.id}
                          className="flex flex-wrap items-center gap-3 border p-4"
                        >
                          <div>
                            <p className="font-semibold">
                              {rule.min_quantity}–
                              {rule.max_quantity ?? "∞"} item
                            </p>
                            <p className="text-sm text-black/60">
                              {rule.quote_required
                                ? "Wajib quotation"
                                : rule.flat_price
                                  ? `${money(rule.flat_price)} flat`
                                  : `${money(rule.unit_price)} / item`}
                            </p>
                          </div>

                          <div className="ml-auto flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setServiceRuleForm({ ...rule })
                              }
                              className="rounded-full bg-black px-3 py-2 text-xs font-semibold text-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void deleteServiceRule(rule.id)
                              }
                              className="rounded-full bg-red-700 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Hapus
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="bg-brand-offWhite p-4 text-sm">
                        Belum ada aturan harga untuk layanan ini.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
