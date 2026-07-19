"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import {
  pimMainCategories,
  pimModels,
  pimSampleProducts,
  pimServiceMethods,
  pimSetupSteps
} from "@/lib/pim-blueprint";

type SetupStats = {
  productCategories: number;
  models: number;
  services: number;
  products: number;
  media: number;
  stores: number;
};

const emptyStats: SetupStats = {
  productCategories: 0,
  models: 0,
  services: 0,
  products: 0,
  media: 0,
  stores: 0
};

function slugList(values: { slug: string }[]) {
  return values.map((item) => item.slug);
}

async function countActive(table: string) {
  const supabase = createSupabaseClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("status_aktif", true);
  return count || 0;
}

async function countActiveProductCategories() {
  const supabase = createSupabaseClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("product_categories")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  return count || 0;
}

export function PimManagerAdmin() {
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState(false);
  const [stats, setStats] = useState<SetupStats>(emptyStats);

  const groupedModels = useMemo(() => {
    return pimMainCategories.map((category) => ({
      category,
      models: pimModels.filter((model) => model.categoryKey === category.slug)
    }));
  }, []);

  async function loadStats() {
    const [productCategories, models, services, products, media, stores] = await Promise.all([
      countActiveProductCategories(),
      countActive("service_categories"),
      countActive("services"),
      countActive("products"),
      countActive("media_assets"),
      countActive("stores")
    ]);
    setStats({ productCategories, models, services, products, media, stores });
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function upsertModel(model: (typeof pimModels)[number], sortOrder: number) {
    const supabase = createSupabaseClient();
    if (!supabase) return "Supabase belum siap.";

    const payload = {
      nama_kategori: model.name,
      deskripsi: model.description,
      category_key: model.categoryKey,
      slug: model.slug,
      link_slug: model.linkSlug,
      gambar_url: "/brand/debroder/open-graph-logo.png",
      image_alt: model.name,
      object_fit: "cover",
      object_position: "center center",
      urutan: sortOrder,
      status_aktif: true,
      updated_at: new Date().toISOString()
    };

    const { data } = await supabase
      .from("service_categories")
      .select("id")
      .eq("slug", model.slug)
      .eq("category_key", model.categoryKey)
      .limit(1);

    if (data?.[0]?.id) {
      const { error } = await supabase
        .from("service_categories")
        .update(payload)
        .eq("id", data[0].id);
      return error?.message || null;
    }

    const { error } = await supabase.from("service_categories").insert(payload);
    return error?.message || null;
  }

  async function upsertService(service: (typeof pimServiceMethods)[number], sortOrder: number) {
    const supabase = createSupabaseClient();
    if (!supabase) return "Supabase belum siap.";

    const payload = {
      nama: service.name,
      slug: service.slug,
      category_key: service.categoryKey,
      deskripsi: service.description,
      detail_body: service.description,
      production_estimate: service.productionEstimate || "Sesuai antrean produksi",
      image_url: "/brand/debroder/open-graph-logo.png",
      image_alt: service.name,
      object_fit: "cover",
      object_position: "center center",
      urutan: sortOrder,
      status_aktif: true,
      updated_at: new Date().toISOString()
    };

    const { data } = await supabase
      .from("services")
      .select("id")
      .eq("slug", service.slug)
      .limit(1);

    if (data?.[0]?.id) {
      const { error } = await supabase.from("services").update(payload).eq("id", data[0].id);
      return error?.message || null;
    }

    const { error } = await supabase.from("services").insert(payload);
    return error?.message || null;
  }

  async function applyBlueprint() {
    const supabase = createSupabaseClient();
    if (!supabase || working) return;
    setWorking(true);
    setStatus("Menerapkan struktur PIM DEBRODER...");

    const allowedSlugs = slugList(pimMainCategories);
    const allowedModelKeys = pimModels.map((model) => `${model.categoryKey}:${model.slug}`);
    const allowedServiceSlugs = pimServiceMethods.map((service) => service.slug);
    const categoryPayload = pimMainCategories.map((category, index) => ({
      name: category.name,
      slug: category.slug,
      description: category.description,
      is_active: true,
      sort_order: (index + 1) * 10,
      show_in_collection: true,
      collection_limit: category.collectionLimit || 8,
      collection_sort: "sort_order",
      collection_section_order: (index + 1) * 10,
      updated_at: new Date().toISOString()
    }));

    await supabase.from("service_categories")
      .update({ category_key: "kaos-polos", link_slug: "kaos-polos", updated_at: new Date().toISOString() })
      .or("category_key.eq.polo-shirt,link_slug.eq.polo-shirt");

    await supabase.from("service_categories")
      .update({ category_key: "headwear", link_slug: "headwear", updated_at: new Date().toISOString() })
      .or("category_key.eq.aksesori-lainnya,category_key.eq.tas-aksesori,link_slug.eq.aksesori-lainnya,link_slug.eq.tas-aksesori");

    const { error: categoryError } = await supabase
      .from("product_categories")
      .upsert(categoryPayload, { onConflict: "slug" });

    if (categoryError) {
      setWorking(false);
      setStatus(`Kategori utama gagal diterapkan: ${categoryError.message}`);
      return;
    }

    const { data: existingCategories } = await supabase
      .from("product_categories")
      .select("id,slug");

    const categoryIdBySlug = new Map((existingCategories || []).map((category) => [String(category.slug), String(category.id)]));
    const kaosPolosId = categoryIdBySlug.get("kaos-polos");
    const headwearId = categoryIdBySlug.get("headwear");
    const legacyPoloId = categoryIdBySlug.get("polo-shirt");
    const legacyAccessoryIds = [categoryIdBySlug.get("aksesori-lainnya"), categoryIdBySlug.get("tas-aksesori")].filter(Boolean) as string[];

    if (kaosPolosId) {
      await supabase.from("products")
        .update({ category_key: "kaos-polos", product_category_id: kaosPolosId, subcategory: "Polo Shirt NSA", updated_at: new Date().toISOString() })
        .eq("category_key", "polo-shirt");

      if (legacyPoloId) {
        await supabase.from("products")
          .update({ category_key: "kaos-polos", product_category_id: kaosPolosId, subcategory: "Polo Shirt NSA", updated_at: new Date().toISOString() })
          .eq("product_category_id", legacyPoloId);
      }
    }

    if (headwearId) {
      await supabase.from("products")
        .update({ category_key: "headwear", product_category_id: headwearId, updated_at: new Date().toISOString() })
        .in("category_key", ["aksesori-lainnya", "tas-aksesori"]);

      if (legacyAccessoryIds.length) {
        await supabase.from("products")
          .update({ category_key: "headwear", product_category_id: headwearId, updated_at: new Date().toISOString() })
          .in("product_category_id", legacyAccessoryIds);
      }
    }

    await Promise.all((existingCategories || [])
      .filter((category) => !allowedSlugs.includes(String(category.slug)))
      .map((category) => supabase
        .from("product_categories")
        .update({ is_active: false, show_in_collection: false, updated_at: new Date().toISOString() })
        .eq("id", category.id)
      ));

    for (const [index, model] of pimModels.entries()) {
      const errorMessage = await upsertModel(model, (index + 1) * 10);
      if (errorMessage) {
        setWorking(false);
        setStatus(`Model gagal diterapkan: ${errorMessage}`);
        return;
      }
    }

    const { data: existingModels } = await supabase
      .from("service_categories")
      .select("id,slug,category_key");

    await Promise.all((existingModels || [])
      .filter((model) => !allowedModelKeys.includes(`${String(model.category_key || "")}:${String(model.slug || "")}`))
      .map((model) => supabase
        .from("service_categories")
        .update({ status_aktif: false, updated_at: new Date().toISOString() })
        .eq("id", model.id)
      ));

    for (const [index, service] of pimServiceMethods.entries()) {
      const errorMessage = await upsertService(service, (index + 1) * 10);
      if (errorMessage) {
        setWorking(false);
        setStatus(`Layanan gagal diterapkan: ${errorMessage}`);
        return;
      }
    }

    const { data: existingServices } = await supabase
      .from("services")
      .select("id,slug");

    await Promise.all((existingServices || [])
      .filter((service) => !allowedServiceSlugs.includes(String(service.slug || "")))
      .map((service) => supabase
        .from("services")
        .update({ status_aktif: false, updated_at: new Date().toISOString() })
        .eq("id", service.id)
      ));

    setWorking(false);
    setStatus("Struktur produk berhasil diterapkan. Sekarang lanjut: Toko → Galeri Media → Produk.");
    await loadStats();
  }

  return (
    <div className="mt-6 grid gap-6">
      {status ? <p role="status" className="border border-brand-softGray bg-white p-4 text-sm font-semibold">{status}</p> : null}

      <section className="bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-charcoal/45">PIM MANAGER</p>
            <h2 className="mt-2 text-2xl font-semibold">Setup Struktur DEBRODER</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">
              Halaman ini mengunci logika admin: Produk = barang yang dijual, Kategori = kelompok besar, Model = turunan kategori, Layanan = teknik pengerjaan.
            </p>
          </div>
          <button
            type="button"
            onClick={applyBlueprint}
            disabled={working}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50"
          >
            {working ? "Menerapkan..." : "Terapkan Struktur PIM"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["Kategori", stats.productCategories],
            ["Model", stats.models],
            ["Layanan", stats.services],
            ["Produk", stats.products],
            ["Media", stats.media],
            ["Store", stats.stores]
          ].map(([label, value]) => (
            <div key={String(label)} className="border border-brand-softGray bg-brand-offWhite p-4">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-charcoal/45">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {["Produk = barang yang dijual", "Kategori = kelompok besar", "Model = turunan kategori", "Layanan = teknik pengerjaan"].map((rule) => (
          <div key={rule} className="border border-brand-softGray bg-white p-5">
            <p className="text-sm font-semibold">{rule}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-white p-5 sm:p-7">
          <h3 className="text-xl font-semibold">Urutan setup yang benar</h3>
          <div className="mt-5 grid gap-3">
            {pimSetupSteps.map((step, index) => (
              <div key={step} className="flex gap-3 border border-brand-softGray p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-charcoal text-xs font-semibold text-white">{index + 1}</span>
                <p className="text-sm font-semibold leading-6">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/admin/store" className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Store</Link>
            <Link href="/admin/media" className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Galeri Media</Link>
            <Link href="/admin/categories" className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Kategori / Model</Link>
            <Link href="/admin/services" className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Layanan</Link>
            <Link href="/admin/products" className="rounded-full bg-brand-charcoal px-4 py-2 text-xs font-semibold text-white">PIM / Produk</Link>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-7">
          <h3 className="text-xl font-semibold">Contoh produk pertama</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-softGray text-xs uppercase tracking-wide text-brand-charcoal/45">
                  <th className="p-3">Produk</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Layanan</th>
                </tr>
              </thead>
              <tbody>
                {pimSampleProducts.map((product) => (
                  <tr key={product.name} className="border-b border-brand-softGray/70">
                    <td className="p-3 font-semibold">{product.name}</td>
                    <td className="p-3 text-brand-charcoal/70">{product.category}</td>
                    <td className="p-3 text-brand-charcoal/70">{product.model}</td>
                    <td className="p-3 text-brand-charcoal/70">{product.services}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-white p-5 sm:p-7">
        <h3 className="text-xl font-semibold">Kategori utama dan model</h3>
        <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Kategori utama hanya kelompok besar. Item seperti Hoodie, Jersey Futsal, Topi Trucker, dan Kaos Cotton Combed masuk sebagai model.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupedModels.map(({ category, models }) => (
            <div key={category.slug} className="border border-brand-softGray p-4">
              <p className="font-semibold">{category.name}</p>
              <p className="mt-1 text-xs text-brand-charcoal/50">/{category.slug}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {models.map((model) => (
                  <span key={model.slug} className="rounded-full bg-brand-offWhite px-3 py-1 text-xs font-semibold text-brand-charcoal/70">{model.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-5 sm:p-7">
        <h3 className="text-xl font-semibold">Layanan / Metode Produksi</h3>
        <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Layanan tidak boleh menjadi kategori utama produk. Layanan dipakai sebagai metode pengerjaan pada produk.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {pimServiceMethods.map((service) => (
            <div key={service.slug} className="border border-brand-softGray bg-brand-offWhite p-4">
              <p className="font-semibold">{service.name}</p>
              <p className="mt-1 text-xs text-brand-charcoal/50">/{service.slug}</p>
              <p className="mt-3 text-sm leading-6 text-brand-charcoal/60">{service.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
