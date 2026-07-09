"use client";

import { useMemo, useState } from "react";
import { useCart, type CartProductInput } from "@/components/CartProvider";

export type ProductColorOption = {
  name: string;
  hex: string;
};

type ProductPurchasePanelProps = {
  product: CartProductInput;
  colors?: string[];
  sizes?: string[];
  sizeGuide?: string[];
  bulkOrderNote?: string | null;
  whatsappUrl?: string;
};

const baseColors: ProductColorOption[] = [
  { name: "Hitam", hex: "#111111" },
  { name: "Putih", hex: "#F7F7F4" },
  { name: "Abu Muda", hex: "#D9D9D6" },
  { name: "Abu Tua", hex: "#6B7280" },
  { name: "Navy", hex: "#1F2A44" },
  { name: "Biru Royal", hex: "#1D4ED8" },
  { name: "Biru Muda", hex: "#7DD3FC" },
  { name: "Forest Green", hex: "#063D24" },
  { name: "Hijau Botol", hex: "#14532D" },
  { name: "Army", hex: "#4B5320" },
  { name: "Merah", hex: "#DC2626" },
  { name: "Maroon", hex: "#6F1D1B" },
  { name: "Kuning", hex: "#FACC15" },
  { name: "Orange", hex: "#F97316" },
  { name: "Cream", hex: "#EADFC8" },
  { name: "Beige", hex: "#D6C4A5" },
  { name: "Cokelat", hex: "#7C4A2D" },
  { name: "Ungu", hex: "#6D28D9" },
  { name: "Pink", hex: "#F9A8D4" },
  { name: "Tosca", hex: "#14B8A6" }
];

const defaultSizes = ["S", "M", "L", "XL", "2XL", "3XL", "Mix Size"];

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function colorHex(value: string) {
  const key = slugify(value);
  const direct = baseColors.find((color) => slugify(color.name) === key);
  if (direct) return direct.hex;
  const aliases: Record<string, string> = {
    black: "#111111",
    putih: "#F7F7F4",
    white: "#F7F7F4",
    grey: "#9CA3AF",
    gray: "#9CA3AF",
    abu: "#9CA3AF",
    navy: "#1F2A44",
    biru: "#1D4ED8",
    blue: "#1D4ED8",
    hijau: "#14532D",
    green: "#14532D",
    forest: "#063D24",
    merah: "#DC2626",
    red: "#DC2626",
    maroon: "#6F1D1B",
    kuning: "#FACC15",
    yellow: "#FACC15",
    orange: "#F97316",
    cream: "#EADFC8",
    beige: "#D6C4A5",
    cokelat: "#7C4A2D",
    brown: "#7C4A2D",
    ungu: "#6D28D9",
    purple: "#6D28D9",
    pink: "#F9A8D4",
    tosca: "#14B8A6",
    teal: "#14B8A6"
  };
  return aliases[key] || "#D9D9D6";
}

function uniqueList(values: string[]) {
  const map = new Map<string, string>();
  values.filter(Boolean).forEach((value) => {
    const clean = value.trim();
    if (clean) map.set(slugify(clean), clean);
  });
  return Array.from(map.values());
}

function sanitizeQuantity(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function formatGuideRow(row: string, index: number) {
  const [label, ...rest] = row.split(":");
  const hasValue = rest.length > 0;
  return {
    label: hasValue ? label.trim() : `Panduan ${index + 1}`,
    value: hasValue ? rest.join(":").trim() : row.trim()
  };
}

export function ProductPurchasePanel({
  product,
  colors = [],
  sizes = [],
  sizeGuide = [],
  bulkOrderNote,
  whatsappUrl
}: ProductPurchasePanelProps) {
  const cart = useCart();
  const colorOptions = useMemo(() => {
    const productColors = uniqueList(colors);
    const baseNames = baseColors.map((color) => color.name);
    return uniqueList([...productColors, ...baseNames]).slice(0, Math.max(20, productColors.length));
  }, [colors]);
  const sizeOptions = useMemo(() => uniqueList([...(sizes || []), ...defaultSizes]), [sizes]);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0] || "Hitam");
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "S");
  const [quantity, setQuantity] = useState(1);
  const guideRows = sizeGuide.length ? sizeGuide : sizeOptions.filter((size) => size !== "Mix Size").map((size) => `${size}: Sesuaikan dengan panduan ukuran produk ini.`);

  function addSelectedToCart() {
    cart.addItem({
      ...product,
      defaultColor: selectedColor,
      defaultSize: selectedSize,
      defaultQuantity: quantity
    });
  }

  return (
    <div className="mt-7 grid gap-6">
      <section>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-brand-charcoal">Warna: <span className="font-normal text-brand-charcoal/60">{selectedColor}</span></p>
          <span className="text-xs text-brand-charcoal/50">20 warna dasar</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {colorOptions.map((color) => {
            const selected = color === selectedColor;
            const hex = colorHex(color);
            return (
              <button
                key={color}
                type="button"
                title={color}
                aria-label={`Pilih warna ${color}`}
                aria-pressed={selected}
                onClick={() => setSelectedColor(color)}
                className={`grid h-9 w-9 place-items-center rounded-full transition ${selected ? "ring-2 ring-brand-green ring-offset-2 ring-offset-[#F7F7F4]" : "ring-1 ring-black/10 hover:ring-black/30"}`}
              >
                <span className="h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-brand-charcoal">Ukuran: <span className="font-normal text-brand-charcoal/60">{selectedSize}</span></p>
          <a href="#panduan-ukuran" className="text-xs font-semibold text-brand-charcoal underline-offset-4 hover:underline">Panduan Ukuran</a>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizeOptions.map((size) => {
            const selected = size === selectedSize;
            return (
              <button
                key={size}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedSize(size)}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold transition ${selected ? "bg-brand-charcoal text-white" : "bg-white/70 text-brand-charcoal ring-1 ring-black/10 hover:ring-black/25"}`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 rounded-[22px] bg-white/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-brand-charcoal">Jumlah</p>
          <div className="inline-flex min-h-11 items-center overflow-hidden rounded-full bg-white ring-1 ring-black/10">
            <button type="button" className="grid h-11 w-11 place-items-center text-lg transition hover:bg-black/5" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Kurangi jumlah">−</button>
            <input value={quantity} onChange={(event) => setQuantity(sanitizeQuantity(Number(event.target.value || 1)))} className="h-11 w-14 bg-transparent text-center text-sm font-semibold outline-none" inputMode="numeric" aria-label="Jumlah produk" />
            <button type="button" className="grid h-11 w-11 place-items-center text-lg transition hover:bg-black/5" onClick={() => setQuantity((value) => value + 1)} aria-label="Tambah jumlah">+</button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={addSelectedToCart} className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-green px-6 text-sm font-semibold text-white transition hover:bg-brand-charcoal">
            Tambah ke Keranjang
          </button>
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/70 px-6 text-sm font-semibold text-brand-charcoal ring-1 ring-black/10 transition hover:ring-black/25">
              Tanya via WhatsApp
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-[22px] bg-white/60 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e9f4ee] text-lg">👕</span>
          <div>
            <h2 className="text-sm font-semibold text-brand-charcoal">Pesanan Grosir Ada Diskon</h2>
            <p className="mt-1 text-sm leading-6 text-brand-charcoal/60">
              {bulkOrderNote || "Harga khusus tersedia untuk pembelian dalam jumlah banyak. Konsultasikan jumlah, warna, ukuran, dan kebutuhan produksi lewat WhatsApp."}
            </p>
          </div>
        </div>
      </section>

      <section id="panduan-ukuran" className="rounded-[22px] bg-white/50 p-4">
        <details>
          <summary className="cursor-pointer list-none text-sm font-semibold text-brand-charcoal">Panduan Ukuran</summary>
          <div className="mt-4 grid gap-2">
            {guideRows.map((row, index) => {
              const item = formatGuideRow(row, index);
              return (
                <div key={`${row}-${index}`} className="grid gap-1 rounded-2xl bg-white/70 p-3 text-sm sm:grid-cols-[100px_1fr] sm:gap-4">
                  <p className="font-semibold text-brand-charcoal">{item.label}</p>
                  <p className="text-brand-charcoal/60">{item.value}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-brand-charcoal/50">Panduan ini bisa disesuaikan dari admin untuk tiap produk.</p>
        </details>
      </section>
    </div>
  );
}
