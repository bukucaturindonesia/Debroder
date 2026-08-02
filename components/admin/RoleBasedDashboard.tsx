"use client";

import Link from "next/link";
import { useAdminAccess } from "@/components/admin/layout/AdminAccessContext";
import { canAccessAdminPath } from "@/components/admin/layout/admin-navigation";
import type { AdminRole } from "@/lib/access-control";

type DashboardDefinition = {
  eyebrow: string;
  title: string;
  description: string;
  priorities: readonly { label: string; description: string; href: string }[];
};

const ROLE_DASHBOARDS: Partial<Record<AdminRole, DashboardDefinition>> = {
  head_store: {
    eyebrow: "OPERASIONAL SELURUH TOKO",
    title: "Dashboard Head Store",
    description: "Pusat supervisi order, produksi, fulfillment, dan stok lintas toko.",
    priorities: [
      { label: "Kotak Tugas", description: "Tinjau pekerjaan operasional yang memerlukan tindakan.", href: "/admin/order-tasks" },
      { label: "Pesanan", description: "Pantau pesanan dan hambatan per toko.", href: "/admin/orders" },
      { label: "Produksi & QC", description: "Periksa progres produksi dan hasil pemeriksaan kualitas.", href: "/admin/production" },
      { label: "Pickup & Pengiriman", description: "Pantau fulfillment dan pekerjaan toko.", href: "/admin/fulfillments" },
      { label: "Stok", description: "Tinjau lokasi, transfer, dan risiko stok.", href: "/admin/inventory-operations" }
    ]
  },
  store_admin: {
    eyebrow: "OPERASIONAL TOKO",
    title: "Dashboard Store Admin",
    description: "Hanya pekerjaan dan data untuk toko canonical yang ditetapkan.",
    priorities: [
      { label: "Tugas Saya", description: "Order dan tugas toko yang perlu segera ditangani.", href: "/admin/order-tasks" },
      { label: "Pesanan Toko", description: "Pesanan yang terhubung dengan scope toko ini.", href: "/admin/orders" },
      { label: "Pickup & Pengiriman", description: "Persiapan, kedatangan, dan serah terima yang eligible.", href: "/admin/fulfillments" },
      { label: "Stok Toko", description: "Saldo, reservasi, dan transfer dalam scope toko.", href: "/admin/inventory-operations" }
    ]
  },
  product_content_manager: {
    eyebrow: "PRODUK DAN KONTEN",
    title: "Dashboard Product & Content",
    description: "Kelola draft katalog, media, dan konten publik sesuai capability yang diberikan.",
    priorities: [
      { label: "Product Library", description: "Periksa draft, kelengkapan media, dan kesiapan produk.", href: "/admin/products" },
      { label: "Landing Page", description: "Kelola section dan konten homepage.", href: "/admin/homepage-sections" },
      { label: "Media Library", description: "Tinjau aset yang hilang atau belum sesuai.", href: "/admin/media" },
      { label: "Hero & Banner", description: "Kelola campaign dan jadwal publikasi.", href: "/admin/page-hero" }
    ]
  },
  order_cs_admin: {
    eyebrow: "PESANAN DAN PELANGGAN",
    title: "Dashboard Order & CS",
    description: "Pusat order, quotation, komunikasi pelanggan, produksi, dan fulfillment.",
    priorities: [
      { label: "Pesanan", description: "Pesanan baru dan pesanan yang memerlukan respons.", href: "/admin/orders" },
      { label: "Quotation", description: "Draft dan approval quotation yang belum selesai.", href: "/admin/orders/quotations" },
      { label: "Produksi & QC", description: "Pantau mockup, produksi, dan kualitas.", href: "/admin/job-orders" },
      { label: "Pickup & Pengiriman", description: "Pantau fulfillment serta komunikasi pelanggan.", href: "/admin/fulfillments" }
    ]
  },
  finance_admin: {
    eyebrow: "PEMBAYARAN DAN KEUANGAN",
    title: "Dashboard Finance",
    description: "Pusat verifikasi pembayaran, refund, dan rekonsiliasi melalui workflow canonical.",
    priorities: [
      { label: "Tugas Verifikasi", description: "Pembayaran eligible yang menunggu pemeriksaan.", href: "/admin/payments" },
      { label: "Refund", description: "Permintaan refund dan bukti pendukung.", href: "/admin/refunds" },
      { label: "Pesanan — Read", description: "Referensi order tanpa hak mengubah produk.", href: "/admin/orders" },
      { label: "Laporan", description: "Ringkasan keuangan sesuai data yang tersedia.", href: "/admin/reports" }
    ]
  }
};

export function RoleBasedDashboard() {
  const access = useAdminAccess();
  const definition = ROLE_DASHBOARDS[access.role];
  if (!definition) return null;
  const priorities = definition.priorities.filter((item) => canAccessAdminPath(item.href, access.permissions));

  return (
    <main className="space-y-6">
      <header className="border border-brand-softGray bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">{definition.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold">{definition.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-charcoal/65">{definition.description}</p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <div className="bg-brand-offWhite p-4"><dt className="text-xs uppercase text-brand-charcoal/50">Akun</dt><dd className="mt-1 font-semibold">{access.displayName}</dd></div>
          <div className="bg-brand-offWhite p-4"><dt className="text-xs uppercase text-brand-charcoal/50">Role</dt><dd className="mt-1 font-semibold">{access.roleLabel}</dd></div>
          <div className="bg-brand-offWhite p-4"><dt className="text-xs uppercase text-brand-charcoal/50">Scope</dt><dd className="mt-1 font-semibold">{access.scopeLabel}</dd></div>
        </dl>
      </header>

      <section aria-labelledby="priority-title">
        <h2 id="priority-title" className="text-xl font-semibold">Prioritas kerja</h2>
        {priorities.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {priorities.map((item) => (
              <article key={item.href} className="border border-brand-softGray bg-white p-5">
                <h3 className="font-semibold">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">{item.description}</p>
                <Link className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold underline" href={item.href}>Buka area kerja</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 border border-brand-softGray bg-white p-6 text-sm text-brand-charcoal/65">Belum ada area kerja yang diberikan kepada role ini.</div>
        )}
      </section>
    </main>
  );
}
