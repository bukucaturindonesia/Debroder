"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";

const searchItems = [
  { title: "Kaos Polos", href: "/kaos-polos", description: "Kaos polos, cotton combed, kaos anak, lengan panjang, dan Polo Shirt NSA.", keywords: ["kaos", "baju", "cotton combed", "polo", "polo shirt nsa"] },
  { title: "Jersey", href: "/jersey", description: "Custom jersey untuk tim, komunitas, dan instansi.", keywords: ["jersey", "tim", "olahraga"] },
  { title: "Jaket & Hoodie", href: "/jaket-hoodie", description: "Jaket dan hoodie untuk merchandise, komunitas, dan brand.", keywords: ["jaket", "jacket", "hoodie"] },
  { title: "Kemeja", href: "/kemeja", description: "Kemeja custom untuk kantor, komunitas, dan seragam.", keywords: ["kemeja", "pdh", "pdl", "seragam"] },
  { title: "Headwear", href: "/headwear", description: "Topi dan headwear untuk kebutuhan apparel custom.", keywords: ["headwear", "topi", "cap", "hat"] },
  { title: "Sablon DTF", href: "/sablon-dtf", description: "Sablon custom untuk brand, event, dan komunitas.", keywords: ["sablon", "dtf", "custom"] },
  { title: "Maklon DTF", href: "/maklon-dtf", description: "Partner produksi DTF untuk brand apparel.", keywords: ["maklon", "dtf", "produksi"] },
  { title: "Cetak Sublim", href: "/cetak-sublim", description: "Cetak sublim untuk jersey dan apparel custom.", keywords: ["sublim", "cetak"] },
  { title: "Toko DEBRODER", href: "/store", description: "Pettarani, Tello, Landak, dan Parepare.", keywords: ["lokasi", "alamat", "toko", "store"] },
  { title: "Cara Pemesanan", href: "/cara-order", description: "Panduan pemesanan DEBRODER.", keywords: ["cara", "order", "pesan"] },
  { title: "Lacak Pesanan", href: "/track-order", description: "Periksa status pesanan tanpa perlu login.", keywords: ["lacak", "pelacakan", "tracking", "status", "order", "pesanan"] },
  { title: "Keranjang Belanja", href: "/keranjang", description: "Periksa produk, jumlah, dan rincian harga sebelum checkout.", keywords: ["keranjang", "cart", "pesanan", "checkout"] }
];

export function HeaderSearchModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchItems.slice(0, 6);
    return searchItems.filter((item) =>
      [item.title, item.description, ...item.keywords].join(" ").toLowerCase().includes(normalized)
    );
  }, [query]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function openResult(href: string) {
    onClose();
    router.push(href);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && results[0]) {
      event.preventDefault();
      openResult(results[0].href);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-[#050706]/55 px-4 py-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Pencarian DEBRODER" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mx-auto mt-14 max-w-2xl overflow-hidden rounded-lg bg-white">
        <div className="flex items-center gap-3 border-b border-black/10 p-4">
          <BrandIcon name="search" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label="Cari layanan, produk, atau store"
            placeholder="Cari produk atau layanan"
            className="min-h-11 flex-1 bg-transparent text-base outline-none placeholder:text-black/40"
          />
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f3f3ef]" aria-label="Tutup pencarian" onClick={onClose}>
            <BrandIcon name="close" />
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-3">
          {results.length ? (
            <div className="grid gap-1">
              {results.map((item) => (
                <button key={`${item.title}-${item.href}`} type="button" className="rounded-md p-4 text-left transition hover:bg-brand-offWhite" onClick={() => openResult(item.href)}>
                  <span className="text-base font-semibold">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-black/55">{item.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-brand-offWhite p-4 text-sm text-black/65">Tidak ada hasil. Coba kata kunci lain.</p>
          )}
        </div>
      </div>
    </div>
  );
}
