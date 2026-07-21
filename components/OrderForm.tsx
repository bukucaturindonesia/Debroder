"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";

/**
 * Compatibility-only component.
 *
 * The original implementation created orders and submitted payment proofs
 * through retired anonymous RPCs and uploaded directly to `order-uploads`.
 * It is intentionally fail-closed. Public purchases must use the canonical
 * product detail, cart, checkout, confirmation, and payment-token flows.
 */
export function OrderForm({
  products,
  initialProduct
}: {
  products: Product[];
  initialProduct?: string;
}) {
  const selected = products.find(
    (product) =>
      product.id === initialProduct ||
      product.slug === initialProduct ||
      product.nama === initialProduct
  );
  const productHref = selected?.slug ? `/produk/${selected.slug}` : "/koleksi";

  return (
    <section className="bg-white p-6 sm:p-8" role="status">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-green">
        Jalur pemesanan diperbarui
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Gunakan checkout resmi DEBRODER</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-charcoal/65">
        Form lama ini sudah dipensiunkan agar pesanan, stok, harga, pembayaran,
        dan pelacakan tetap memakai satu sistem yang aman.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={productHref}
          className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white"
        >
          {selected ? "Pilih Varian Produk" : "Buka Koleksi"}
        </Link>
        <Link
          href="/keranjang"
          className="inline-flex min-h-11 items-center rounded-full border border-brand-charcoal px-6 text-sm font-semibold text-brand-charcoal"
        >
          Buka Keranjang
        </Link>
      </div>
    </section>
  );
}
