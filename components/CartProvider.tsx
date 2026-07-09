"use client";

import Link from "next/link";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { SafeImage } from "@/components/SafeImage";
import { fallbackImages, pageHeroImageFallbacks } from "@/lib/fallback-data";
import { contactLinks } from "@/lib/contact";
import { absoluteUrl } from "@/lib/site";
import { formatRupiah, whatsappLinkWithMessage } from "@/lib/url";

export type CartProductInput = {
  id?: string;
  name: string;
  category?: string;
  priceLabel?: string;
  priceValue?: number;
  href?: string;
  imageUrl?: string;
  imageAlt?: string;
};

type CartServiceSelection = {
  id: string;
  quantity: number;
  position: string;
  notes: string;
};

type CartItemRole = "primary" | "additional";

type CartItem = CartProductInput & {
  cartId: string;
  role: CartItemRole;
  quantity: number;
  color: string;
  size: string;
  notes: string;
  services: CartServiceSelection[];
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  isOpen: boolean;
  addItem: (product: CartProductInput, role?: CartItemRole) => void;
  updateItem: (cartId: string, updates: Partial<CartItem>) => void;
  removeItem: (cartId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

type ServiceOption = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  defaultPosition: string;
  pricePerPcs: number;
};

type SearchSuggestion = {
  id: string;
  name: string;
  label: string;
  href: string;
  imageUrl: string;
};

const storageKey = "debroder-cart-v3";
const legacyStorageKeys = ["debroder-cart-v2", "debroder-cart-v1"];
const CartContext = createContext<CartContextValue | null>(null);

const serviceOptions: ServiceOption[] = [
  {
    id: "sablon-dtf-depan-kecil",
    name: "Sablon DTF Depan Kecil",
    shortName: "Sablon DTF",
    description: "Logo kecil, dada kiri, atau artwork kecil.",
    defaultPosition: "Depan kecil",
    pricePerPcs: 15000
  },
  {
    id: "bordir-komputer-logo-kecil",
    name: "Bordir Komputer Logo Kecil",
    shortName: "Bordir Komputer",
    description: "Estimasi normal untuk logo kecil.",
    defaultPosition: "Dada kiri",
    pricePerPcs: 20000
  },
  {
    id: "sablon-dtf-belakang-besar",
    name: "Sablon DTF Belakang Besar",
    shortName: "DTF Belakang Besar",
    description: "Artwork besar untuk bagian belakang.",
    defaultPosition: "Belakang besar",
    pricePerPcs: 25000
  },
  {
    id: "bordir-komputer-logo-besar",
    name: "Bordir Komputer Logo Besar",
    shortName: "Bordir Logo Besar",
    description: "Estimasi normal untuk bordir lebih besar/lebih detail.",
    defaultPosition: "Logo besar",
    pricePerPcs: 30000
  },
  {
    id: "sublim-printing",
    name: "Sublim Printing",
    shortName: "Sublim",
    description: "Estimasi normal untuk jersey/apparel full color.",
    defaultPosition: "Full body",
    pricePerPcs: 35000
  }
];

const searchSuggestions: SearchSuggestion[] = [
  {
    id: "jersey-custom",
    name: "Jersey Custom",
    label: "Jersey tim, komunitas, dan event",
    href: "/jersey",
    imageUrl: pageHeroImageFallbacks.jersey || fallbackImages.product
  },
  {
    id: "kaos-polos",
    name: "Kaos Polos",
    label: "NSA, cotton combed, dan warna lengkap",
    href: "/kaos-polos",
    imageUrl: pageHeroImageFallbacks["kaos-polos"] || fallbackImages.product
  },
  {
    id: "polo-shirt-nsa",
    name: "Polo Shirt NSA",
    label: "Model di kategori Kaos Polos",
    href: "/kaos-polos",
    imageUrl: pageHeroImageFallbacks["kaos-polos"] || fallbackImages.product
  },
  {
    id: "headwear",
    name: "Headwear",
    label: "Topi, cap, dan aksesori kepala",
    href: "/headwear",
    imageUrl: pageHeroImageFallbacks.headwear || fallbackImages.product
  },
  {
    id: "jaket-hoodie",
    name: "Jaket & Hoodie",
    label: "Outerwear custom untuk brand dan tim",
    href: "/jaket-hoodie",
    imageUrl: pageHeroImageFallbacks["jaket-hoodie"] || fallbackImages.product
  },
  {
    id: "sablon-dtf",
    name: "Sablon DTF",
    label: "Custom desain dengan hasil tajam",
    href: "/sablon-dtf",
    imageUrl: pageHeroImageFallbacks["sablon-dtf"] || fallbackImages.product
  }
];

function normalizeNumber(value: number, fallback = 1) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function createCartId(product: CartProductInput) {
  return `${product.id || product.href || product.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePrice(value?: string | number | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value || "").replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function itemUnitPrice(item: Pick<CartItem, "priceValue" | "priceLabel">) {
  return Number(item.priceValue || 0) || parsePrice(item.priceLabel);
}

function serviceById(serviceId: string) {
  return serviceOptions.find((service) => service.id === serviceId) || null;
}

function normalizeServices(services: unknown, quantity: number): CartServiceSelection[] {
  if (!Array.isArray(services)) return [];
  return services
    .map((raw) => {
      const service = raw as Partial<CartServiceSelection>;
      if (!service.id || !serviceById(service.id)) return null;
      return {
        id: service.id,
        quantity: normalizeNumber(Number(service.quantity || quantity), quantity),
        position: service.position || serviceById(service.id)?.defaultPosition || "",
        notes: service.notes || ""
      };
    })
    .filter(Boolean) as CartServiceSelection[];
}

function selectedServices(item: CartItem) {
  return item.services
    .map((selection) => {
      const service = serviceById(selection.id);
      return service ? { service, selection } : null;
    })
    .filter(Boolean) as { service: ServiceOption; selection: CartServiceSelection }[];
}

function itemProductSubtotal(item: CartItem) {
  return itemUnitPrice(item) * item.quantity;
}

function itemServiceSubtotal(item: CartItem) {
  return selectedServices(item).reduce((total, entry) => total + entry.service.pricePerPcs * entry.selection.quantity, 0);
}

function cartTotals(items: CartItem[]) {
  const productSubtotal = items.reduce((total, item) => total + itemProductSubtotal(item), 0);
  const serviceSubtotal = items.reduce((total, item) => total + itemServiceSubtotal(item), 0);
  const normalTotal = productSubtotal + serviceSubtotal;
  const hasServices = serviceSubtotal > 0;
  return { productSubtotal, serviceSubtotal, normalTotal, hasServices };
}

function safeCurrency(value: number) {
  return value > 0 ? formatRupiah(value) : "Konfirmasi admin";
}

function labelForItem(item: CartItem) {
  return [item.category, item.priceLabel].filter(Boolean).join(" · ");
}

function ensureRoles(items: CartItem[]) {
  let hasPrimary = false;
  return items.map((item, index) => {
    const quantity = normalizeNumber(Number(item.quantity || 1));
    const role: CartItemRole = !hasPrimary && (item.role === "primary" || index === 0) ? "primary" : "additional";
    if (role === "primary") hasPrimary = true;
    return {
      ...item,
      role,
      quantity,
      color: item.color || "",
      size: item.size || "",
      notes: item.notes || "",
      services: normalizeServices(item.services, quantity)
    };
  });
}

function serviceIsSelected(item: CartItem, serviceId: string) {
  return item.services.some((service) => service.id === serviceId);
}

function toggleService(item: CartItem, service: ServiceOption) {
  const exists = serviceIsSelected(item, service.id);
  return exists
    ? item.services.filter((selection) => selection.id !== service.id)
    : [
        ...item.services,
        {
          id: service.id,
          quantity: item.quantity,
          position: service.defaultPosition,
          notes: ""
        }
      ];
}

function updateService(item: CartItem, serviceId: string, updates: Partial<CartServiceSelection>) {
  return item.services.map((service) =>
    service.id === serviceId
      ? { ...service, ...updates, quantity: normalizeNumber(Number(updates.quantity ?? service.quantity), item.quantity) }
      : service
  );
}

function buildItemMessage(item: CartItem) {
  const lines = [`Produk: ${item.name}`];
  if (item.category) lines.push(`Kategori: ${item.category}`);
  if (item.priceLabel) lines.push(`Harga produk: ${item.priceLabel}`);
  lines.push(`Jumlah: ${item.quantity} pcs`);
  if (item.color.trim()) lines.push(`Warna: ${item.color.trim()}`);
  if (item.size.trim()) lines.push(`Ukuran: ${item.size.trim()}`);
  if (item.notes.trim()) lines.push(`Catatan produk: ${item.notes.trim()}`);
  const productSubtotal = itemProductSubtotal(item);
  if (productSubtotal > 0) lines.push(`Subtotal produk: ${formatRupiah(productSubtotal)}`);
  if (item.href) lines.push(`Link produk: ${absoluteUrl(item.href)}`);

  const services = selectedServices(item);
  if (services.length) {
    lines.push("");
    lines.push("Pilihan produksi:");
    services.forEach(({ service, selection }) => {
      lines.push(`- ${service.name}`);
      lines.push(`  Jumlah pengerjaan: ${selection.quantity} pcs`);
      if (selection.position.trim()) lines.push(`  Posisi: ${selection.position.trim()}`);
      if (selection.notes.trim()) lines.push(`  Catatan: ${selection.notes.trim()}`);
      lines.push(`  Harga normal: ${formatRupiah(service.pricePerPcs)} / pcs`);
      lines.push(`  Subtotal produksi: ${formatRupiah(service.pricePerPcs * selection.quantity)}`);
    });
  }

  return lines;
}

function buildMessage(items: CartItem[]) {
  const normalized = ensureRoles(items);
  const primary = normalized.filter((item) => item.role === "primary");
  const additional = normalized.filter((item) => item.role === "additional");
  const totals = cartTotals(normalized);
  const lines = [
    totals.hasServices
      ? "Halo DEBRODER, saya ingin pesan dan mendapatkan harga terbaik:"
      : "Halo DEBRODER, saya ingin pesan produk:"
  ];

  if (primary.length) {
    lines.push("");
    lines.push("PESANAN UTAMA");
    primary.forEach((item, index) => {
      if (index > 0) lines.push("");
      lines.push(`${index + 1}. ${item.name}`);
      lines.push(...buildItemMessage(item).slice(1));
    });
  }

  if (additional.length) {
    lines.push("");
    lines.push("ITEM TAMBAHAN");
    additional.forEach((item, index) => {
      if (index > 0) lines.push("");
      lines.push(`${index + 1}. ${item.name}`);
      lines.push(...buildItemMessage(item).slice(1));
    });
  }

  lines.push("");
  lines.push("ESTIMASI NORMAL");
  lines.push(`Subtotal produk: ${safeCurrency(totals.productSubtotal)}`);
  if (totals.serviceSubtotal > 0) lines.push(`Subtotal pilihan produksi: ${formatRupiah(totals.serviceSubtotal)}`);
  lines.push(`${totals.hasServices ? "Estimasi normal" : "Total"}: ${safeCurrency(totals.normalTotal)}`);

  if (totals.hasServices) {
    lines.push("");
    lines.push("Saya ingin mendapatkan harga terbaik untuk pesanan ini.");
  }

  lines.push("");
  lines.push("Nama:");
  lines.push("Kebutuhan deadline:");
  lines.push("Catatan tambahan:");
  return lines.join("\n");
}

function CartIcon() {
  return <BrandIcon name="cart" />;
}

function QuantityControl({ value, onChange, ariaLabel }: { value: number; onChange: (value: number) => void; ariaLabel: string }) {
  return (
    <div className="inline-flex min-h-10 items-center overflow-hidden rounded-full border border-black/10 bg-white">
      <button type="button" className="grid h-10 w-10 place-items-center text-lg transition hover:bg-black/5" aria-label={`Kurangi ${ariaLabel}`} onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <input value={value} onChange={(event) => onChange(normalizeNumber(Number(event.target.value || 1)))} className="h-10 w-12 border-x border-black/10 text-center text-sm font-semibold outline-none" aria-label={ariaLabel} inputMode="numeric" />
      <button type="button" className="grid h-10 w-10 place-items-center text-lg transition hover:bg-black/5" aria-label={`Tambah ${ariaLabel}`} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function CartProductHeader({ item, compact = false }: { item: CartItem; compact?: boolean }) {
  const unitPrice = itemUnitPrice(item);
  const subtotal = itemProductSubtotal(item);
  const cart = useCart();

  return (
    <div className="flex gap-4 sm:gap-5">
      <div className={`${compact ? "h-24 w-24" : "h-32 w-28 sm:h-40 sm:w-36"} relative shrink-0 overflow-hidden bg-[#f2f2ee]`}>
        <SafeImage src={item.imageUrl || fallbackImages.product} fallbackSrc={fallbackImages.product} alt={item.imageAlt || item.name} fill className="object-cover" sizes={compact ? "96px" : "144px"} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {item.role === "primary" ? <span className="mb-2 inline-flex rounded-full bg-[#e9f4ee] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#063d24]">Pesanan Utama</span> : null}
            <h3 className="text-base font-semibold leading-tight sm:text-lg">{item.name}</h3>
            {labelForItem(item) ? <p className="mt-1 text-sm leading-6 text-black/55">{labelForItem(item)}</p> : null}
          </div>
          <button type="button" className="text-xs font-semibold text-red-700 underline-offset-4 hover:underline" onClick={() => cart.removeItem(item.cartId)}>Hapus</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <QuantityControl value={item.quantity} ariaLabel={`jumlah ${item.name}`} onChange={(quantity) => cart.updateItem(item.cartId, { quantity })} />
          <div className="text-right text-sm">
            <p className="text-black/50">{unitPrice > 0 ? `${formatRupiah(unitPrice)} / pcs` : "Harga dikonfirmasi"}</p>
            <p className="mt-1 font-semibold">Subtotal {safeCurrency(subtotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetails({ item }: { item: CartItem }) {
  const cart = useCart();
  return (
    <div className="mt-6 grid gap-3 border-t border-black/10 pt-5 sm:grid-cols-2">
      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
        Warna
        <input value={item.color} onChange={(event) => cart.updateItem(item.cartId, { color: event.target.value })} placeholder="Contoh: Hitam" className="min-h-11 rounded-xl border border-black/10 px-4 text-sm font-normal normal-case tracking-normal text-black outline-none transition focus:border-[#063d24]" />
      </label>
      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
        Ukuran
        <input value={item.size} onChange={(event) => cart.updateItem(item.cartId, { size: event.target.value })} placeholder="Contoh: L / Mix size" className="min-h-11 rounded-xl border border-black/10 px-4 text-sm font-normal normal-case tracking-normal text-black outline-none transition focus:border-[#063d24]" />
      </label>
      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45 sm:col-span-2">
        Catatan produk
        <textarea value={item.notes} onChange={(event) => cart.updateItem(item.cartId, { notes: event.target.value })} placeholder="Contoh: 5 baju sablon depan kecil, 5 baju bordir dada kiri. Deadline 7 hari." rows={3} className="rounded-xl border border-black/10 p-4 text-sm font-normal normal-case leading-6 tracking-normal text-black outline-none transition focus:border-[#063d24]" />
      </label>
    </div>
  );
}

function ProductionChoices({ item }: { item: CartItem }) {
  const cart = useCart();
  const totalProductionQty = item.services.reduce((total, service) => total + service.quantity, 0);

  return (
    <section className="mt-6 border-t border-black/10 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#063d24]">Pilihan Produksi</p>
          <p className="mt-1 text-sm leading-6 text-black/55">Pilih metode produksi jika produk ingin dicustom. Jumlah bisa dibuat mix, misalnya 5 pcs sablon dan 5 pcs bordir.</p>
        </div>
        {totalProductionQty > 0 ? <p className="rounded-full bg-[#f5f5ef] px-3 py-1 text-xs font-semibold text-black/55">Total produksi dipilih: {totalProductionQty} pcs</p> : null}
      </div>
      <div className="mt-4 grid gap-3">
        {serviceOptions.map((service) => {
          const selected = item.services.find((entry) => entry.id === service.id);
          const selectedQty = selected?.quantity || item.quantity;
          return (
            <article key={`${item.cartId}-${service.id}`} className={`rounded-2xl border bg-white p-4 transition ${selected ? "border-[#063d24] ring-1 ring-[#063d24]/15" : "border-black/10 hover:border-black/25"}`}>
              <div className="flex items-start justify-between gap-4">
                <label className="flex min-w-0 cursor-pointer gap-3">
                  <input type="checkbox" checked={Boolean(selected)} onChange={() => cart.updateItem(item.cartId, { services: toggleService(item, service) })} className="mt-1 h-4 w-4 accent-[#063d24]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-5">{service.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-black/55">Harga normal {formatRupiah(service.pricePerPcs)} / pcs · {service.description}</span>
                  </span>
                </label>
                <span className="shrink-0 text-sm font-semibold">{selected ? formatRupiah(service.pricePerPcs * selectedQty) : formatRupiah(service.pricePerPcs)}</span>
              </div>
              {selected ? (
                <div className="mt-4 grid gap-3 rounded-xl bg-[#f8f8f4] p-3 sm:grid-cols-[160px_1fr]">
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                    Jumlah pcs
                    <input value={selected.quantity} onChange={(event) => cart.updateItem(item.cartId, { services: updateService(item, service.id, { quantity: normalizeNumber(Number(event.target.value || 1), item.quantity) }) })} className="min-h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-black outline-none focus:border-[#063d24]" inputMode="numeric" />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                    Posisi / detail
                    <input value={selected.position} onChange={(event) => cart.updateItem(item.cartId, { services: updateService(item, service.id, { position: event.target.value }) })} placeholder="Contoh: dada kiri / belakang besar" className="min-h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-normal normal-case tracking-normal text-black outline-none focus:border-[#063d24]" />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45 sm:col-span-2">
                    Catatan produksi
                    <input value={selected.notes} onChange={(event) => cart.updateItem(item.cartId, { services: updateService(item, service.id, { notes: event.target.value }) })} placeholder="Contoh: logo perusahaan warna putih" className="min-h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-normal normal-case tracking-normal text-black outline-none focus:border-[#063d24]" />
                  </label>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FullCartItem({ item }: { item: CartItem }) {
  return (
    <article className="rounded-[28px] border border-black/10 bg-white p-4 sm:p-6">
      <CartProductHeader item={item} />
      <ProductDetails item={item} />
      <ProductionChoices item={item} />
    </article>
  );
}

function CartSummary({ compact = false }: { compact?: boolean }) {
  const cart = useCart();
  const totals = cartTotals(cart.items);
  const checkoutHref = cart.items.length ? whatsappLinkWithMessage(contactLinks.whatsapp, buildMessage(cart.items)) : "#";

  return (
    <aside className={`rounded-[28px] border border-black/10 bg-white ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <h2 className="text-2xl font-semibold tracking-tight">Summary</h2>
      <div className="mt-6 grid gap-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-black/60">Subtotal Produk</span>
          <span className="font-semibold">{safeCurrency(totals.productSubtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-black/60">Pilihan Produksi</span>
          <span className="font-semibold">{totals.serviceSubtotal > 0 ? formatRupiah(totals.serviceSubtotal) : "—"}</span>
        </div>
        <div className="border-t border-black/10 pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">{totals.hasServices ? "Estimasi Normal" : "Total"}</span>
            <span className="text-xl font-bold text-[#063d24]">{safeCurrency(totals.normalTotal)}</span>
          </div>
        </div>
      </div>
      {totals.hasServices ? (
        <div className="mt-5 rounded-2xl bg-[#fff7e6] p-4 text-xs leading-6 text-[#6a4300]">
          Harga final bisa lebih hemat setelah admin mengecek detail desain, jumlah pesanan, dan kebutuhan produksi.
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-[#f5f5ef] p-4 text-xs leading-6 text-black/58">
          Jika hanya pesan produk tanpa pilihan produksi, biaya mengikuti harga produk yang tertera.
        </div>
      )}
      <a href={checkoutHref} target={cart.items.length ? "_blank" : undefined} rel={cart.items.length ? "noopener noreferrer" : undefined} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-center text-sm font-semibold ${cart.items.length ? "bg-[#063d24] text-white" : "pointer-events-none bg-black/10 text-black/35"}`}>
        {totals.hasServices ? "Pesan dan Dapatkan Harga Terbaik Kami" : "Pesan Produk via WhatsApp"}
      </a>
      {!compact ? <p className="mt-4 text-center text-[11px] leading-5 text-black/45">Order akhir tetap lewat WhatsApp. Tidak perlu login.</p> : null}
    </aside>
  );
}

function EmptyCart({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-[28px] bg-white p-8 text-center ${fullPage ? "min-h-[420px]" : "min-h-[280px]"}`}>
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f5f5ef]"><CartIcon /></div>
        <p className="mt-5 text-lg font-semibold">Keranjang masih kosong</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/55">Tambahkan produk dulu. Produk pertama akan menjadi Pesanan Utama.</p>
        <Link href="/koleksi" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#063d24] px-6 text-sm font-semibold text-white">Lihat Koleksi</Link>
      </div>
    </div>
  );
}

function SearchSuggestionsRow() {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Kamu mungkin mencari</h2>
        <p className="hidden text-sm text-black/50 sm:block">Geser kiri kanan untuk melihat lainnya.</p>
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {searchSuggestions.map((item) => (
          <Link key={item.id} href={item.href} className="group min-w-[240px] snap-start sm:min-w-[320px]">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#f1f1ec]">
              <SafeImage src={item.imageUrl} fallbackSrc={fallbackImages.product} alt={item.name} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="320px" />
            </div>
            <div className="mt-3">
              <p className="text-base font-semibold">{item.name}</p>
              <p className="mt-1 text-sm leading-6 text-black/55">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FullCartLayout() {
  const cart = useCart();
  const primaryItems = cart.items.filter((item) => item.role === "primary");
  const additionalItems = cart.items.filter((item) => item.role === "additional");

  if (!cart.items.length) {
    return (
      <>
        <EmptyCart fullPage />
        <SearchSuggestionsRow />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <h2 className="mb-5 text-2xl font-semibold tracking-tight">Bag</h2>
          <div className="grid gap-5">
            {primaryItems.map((item) => <FullCartItem key={item.cartId} item={item} />)}
            {additionalItems.length ? (
              <section className="grid gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/45">Item Tambahan</p>
                  <p className="mt-1 text-sm leading-6 text-black/55">Item ini ikut dikirim ke WhatsApp, tapi Pesanan Utama tetap menjadi fokus order.</p>
                </div>
                {additionalItems.map((item) => <FullCartItem key={item.cartId} item={item} />)}
              </section>
            ) : null}
          </div>
        </div>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <CartSummary />
        </div>
      </div>
      <SearchSuggestionsRow />
    </>
  );
}

function MiniCartContent() {
  const cart = useCart();
  const primary = cart.items.find((item) => item.role === "primary");
  const additionalCount = cart.items.filter((item) => item.role === "additional").length;
  const totals = cartTotals(cart.items);
  const checkoutHref = cart.items.length ? whatsappLinkWithMessage(contactLinks.whatsapp, buildMessage(cart.items)) : "#";

  if (!primary) return <EmptyCart />;

  return (
    <div className="grid gap-5">
      <section className="rounded-[24px] border border-black/10 bg-white p-4">
        <CartProductHeader item={primary} compact />
        {additionalCount > 0 ? <p className="mt-4 rounded-full bg-[#f5f5ef] px-3 py-2 text-xs text-black/60">+ {additionalCount} item tambahan ikut di keranjang.</p> : null}
      </section>
      <section className="rounded-[24px] border border-black/10 bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-black/60">Subtotal Produk</span>
          <span className="font-semibold">{safeCurrency(totals.productSubtotal)}</span>
        </div>
        {totals.serviceSubtotal > 0 ? (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-black/60">Pilihan Produksi</span>
            <span className="font-semibold">{formatRupiah(totals.serviceSubtotal)}</span>
          </div>
        ) : null}
        <div className="mt-4 border-t border-black/10 pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">{totals.hasServices ? "Estimasi Normal" : "Total"}</span>
            <span className="text-lg font-bold text-[#063d24]">{safeCurrency(totals.normalTotal)}</span>
          </div>
        </div>
        <Link href="/keranjang" onClick={cart.closeCart} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold transition hover:border-black">Lihat Keranjang</Link>
        <a href={checkoutHref} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#063d24] px-5 text-center text-sm font-semibold text-white">
          {totals.hasServices ? "Dapatkan Harga Terbaik" : "Pesan via WhatsApp"}
        </a>
      </section>
    </div>
  );
}

function CartDrawer() {
  const { isOpen, closeCart } = useCart();

  return (
    <>
      <div className={`fixed inset-0 z-[150] bg-black/35 transition ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`} onMouseDown={(event) => event.target === event.currentTarget && closeCart()} />
      <aside className={`fixed right-0 top-0 z-[160] flex h-dvh w-full max-w-md flex-col bg-[#f7f7f2] shadow-[-18px_0_50px_rgba(0,0,0,0.14)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`} role="dialog" aria-modal="true" aria-label="Keranjang belanja">
        <div className="flex items-center justify-between border-b border-black/10 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Keranjang</p>
            <h2 className="mt-1 text-2xl font-semibold">Pesanan DEBRODER</h2>
          </div>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-xl leading-none transition hover:bg-[#f5f5ef]" aria-label="Tutup keranjang" onClick={closeCart}>×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <MiniCartContent />
        </div>
      </aside>
    </>
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey) || legacyStorageKeys.map((key) => window.localStorage.getItem(key)).find(Boolean);
      if (raw) setItems(ensureRoles(JSON.parse(raw)));
    } catch {
      setItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Cart remains usable in memory if storage is unavailable.
    }
  }, [isLoaded, items]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    isOpen,
    addItem: (product, requestedRole) => {
      setItems((current) => {
        const hasPrimary = current.some((item) => item.role === "primary");
        const role = requestedRole || (hasPrimary ? "additional" : "primary");
        return ensureRoles([
          ...current,
          {
            ...product,
            cartId: createCartId(product),
            role,
            quantity: 1,
            color: "",
            size: "",
            notes: "",
            services: []
          }
        ]);
      });
      setIsOpen(true);
    },
    updateItem: (cartId, updates) => {
      setItems((current) => ensureRoles(current.map((item) => {
        if (item.cartId !== cartId) return item;
        const nextQuantity = normalizeNumber(Number(updates.quantity ?? item.quantity));
        return {
          ...item,
          ...updates,
          quantity: nextQuantity,
          services: updates.services ? updates.services : item.services
        };
      })));
    },
    removeItem: (cartId) => {
      setItems((current) => ensureRoles(current.filter((item) => item.cartId !== cartId)));
    },
    clearCart: () => setItems([]),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false)
  }), [isOpen, items]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

export function CartNavButton() {
  const { itemCount, openCart } = useCart();
  return (
    <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f5f5ef]" aria-label={`Buka keranjang, ${itemCount} item`} onClick={openCart}>
      <CartIcon />
      {itemCount > 0 ? <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#063d24] px-1 text-[10px] font-bold text-white">{itemCount}</span> : null}
    </button>
  );
}

export function AddToCartButton({ product, className, children = "Tambah" }: { product: CartProductInput; className?: string; children?: ReactNode }) {
  const { addItem } = useCart();
  return <button type="button" className={className} onClick={() => addItem(product)}>{children}</button>;
}

export function CartPageContent() {
  return <FullCartLayout />;
}
