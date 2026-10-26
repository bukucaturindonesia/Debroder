"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/customer-account/CustomerAccountFrame";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { AccountOrderCards, type AccountOrderSummary } from "@/components/customer-account/AccountOrders";

type Address = { id: string };

export function AccountDashboard() {
  const auth = useCustomerAuth();
  const [orders, setOrders] = useState<AccountOrderSummary[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.accessToken) return;
    let active = true;
    const headers = { authorization: `Bearer ${auth.accessToken}` };
    setLoading(true);
    setError("");

    void Promise.all([
      fetch("/api/customer/orders", { cache: "no-store", headers }).then(readJson),
      fetch("/api/customer/addresses", { cache: "no-store", headers }).then(readJson)
    ]).then(([orderPayload, addressPayload]) => {
      if (!active) return;
      setOrders(Array.isArray(orderPayload.orders) ? orderPayload.orders as AccountOrderSummary[] : []);
      setAddresses(Array.isArray(addressPayload.addresses) ? addressPayload.addresses as Address[] : []);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Ringkasan akun belum dapat dimuat.");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [auth.accessToken]);

  const active = orders.filter((order) => !["completed", "cancelled", "canceled", "refunded"].includes(order.status)).length;
  return (
    <AccountPanel eyebrow="Ringkasan" title={`Halo, ${auth.profile?.fullName.split(" ")[0] || "Pelanggan"}`} description="Semua pesanan yang memakai email terverifikasi Anda ditautkan secara otomatis ke akun ini.">
      {loading ? <p role="status" className="mb-5 text-sm text-black/55">Memuat ringkasan akun...</p> : null}
      {error ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pesanan aktif" value={loading || error ? "—" : String(active)} />
        <Stat label="Semua pesanan" value={loading || error ? "—" : String(orders.length)} />
        <Stat label="Alamat tersimpan" value={loading || error ? "—" : String(addresses.length)} />
      </div>
      {!loading && !error ? <section className="mt-8" aria-labelledby="recent-orders-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="recent-orders-title" className="text-lg font-semibold">Pesanan terbaru</h2><Link href="/account/orders" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Lihat semua</Link></div>
        {orders.length ? <AccountOrderCards orders={orders.slice(0, 3)} /> : <div className="customer-empty rounded-functional bg-brand-offWhite p-5"><p className="font-semibold">Belum ada pesanan.</p><p className="mt-2 text-sm text-black/60">Temukan produk di koleksi Debroder untuk memulai.</p><Link href="/koleksi" className="public-button public-button--primary mt-4">Jelajahi koleksi</Link></div>}
      </section> : null}
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link href="/account/orders" className="rounded-2xl border border-black/10 p-5 transition hover:border-black"><p className="font-semibold">Lihat pesanan</p><p className="mt-2 text-sm leading-6 text-black/55">Status pembayaran, produksi, pengiriman, dan invoice.</p></Link>
        <Link href="/account/addresses" className="rounded-2xl border border-black/10 p-5 transition hover:border-black"><p className="font-semibold">Kelola alamat</p><p className="mt-2 text-sm leading-6 text-black/55">Simpan alamat untuk mengisi checkout lebih cepat.</p></Link>
      </div>
      <div className="mt-7 rounded-2xl bg-brand-offWhite p-5 text-sm leading-6 text-black/65">
        Checkout tetap dapat digunakan sebagai tamu. WhatsApp hanya menjadi kontak transaksi dan bantuan, bukan verifikasi akun atau pesanan.
      </div>
    </AccountPanel>
  );
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Ringkasan akun belum dapat dimuat.");
  }
  return payload;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-brand-offWhite p-5"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/45">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></div>;
}
