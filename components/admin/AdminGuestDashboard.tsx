"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { loadProductManager, type ProductManagerPayload } from "@/lib/admin-product-api";

export function AdminGuestDashboard() {
  const [payload, setPayload] = useState<ProductManagerPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadProductManager()
      .then((data) => { if (active) setPayload(data); })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Dashboard read-only gagal dimuat.");
      });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const products = payload?.products || [];
    return [
      ["Product root", products.length],
      ["Draft", products.filter((item) => item.status === "draft").length],
      ["Active", products.filter((item) => item.status === "active").length],
      ["Archived", products.filter((item) => item.status === "archived").length],
      ["Color variant", products.reduce((sum, item) => sum + item.variantCount, 0)],
      ["Sellable SKU", products.reduce((sum, item) => sum + item.sellableCount, 0)]
    ] as const;
  }, [payload]);

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="ADMIN GUEST"
        title="Dashboard Full Panel Viewer"
        description="Akun ini dapat melihat seluruh Panel Admin dalam mode read-only. Data pelanggan sensitif dimasking, file privat tidak dibuka, dan seluruh mutation tetap ditolak."
      />

      {error ? <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value]) => (
          <article key={label} className="border border-brand-softGray bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{payload ? value : "—"}</p>
          </article>
        ))}
      </section>

      <section className="border border-brand-softGray bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">FULL PANEL VIEWER</p>
        <h2 className="mt-2 text-2xl font-semibold">Seluruh modul tersedia untuk dilihat</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/60">
          Gunakan sidebar untuk membuka Product Manager, PIM, CMS, Order, Payment, Produksi, Fulfillment, Access Control, Audit, Settings, dan laporan dalam tampilan yang sudah disanitasi.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin/products" className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Buka Product Manager</Link>
          <Link href="/admin/orders" className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Lihat Operasional</Link>
        </div>
      </section>
    </div>
  );
}
