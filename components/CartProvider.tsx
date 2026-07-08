"use client";

import Link from "next/link";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { SafeImage } from "@/components/SafeImage";
import { fallbackImages } from "@/lib/fallback-data";
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
};

type CartItemRole = "primary" | "additional";

type CartItem = CartProductInput & {
  cartId: string;
  role: CartItemRole;
  quantity: number;
  color: string;
  size: string;
  printLocation: string;
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
  pricePerPcs: number;
};

type ProductRecommendation = {
  id: string;
  name: string;
  category: string;
  priceLabel: string;
  priceValue: number;
  href: string;
};

const storageKey = "debroder-cart-v2";
const legacyStorageKey = "debroder-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

const serviceOptions: ServiceOption[] = [
  {
    id: "sablon-dtf-depan-kecil",
    name: "Sablon DTF Depan Kecil",
    shortName: "Sablon DTF",
    description: "Logo kecil/dada kiri atau artwork kecil.",
    pricePerPcs: 15000
  },
  {
    id: "bordir-komputer-logo-kecil",
    name: "Bordir Komputer Logo Kecil",
    shortName: "Bordir Komputer",
    description: "Estimasi normal untuk logo kecil.",
    pricePerPcs: 20000
  },
  {
    id: "sablon-dtf-belakang-besar",
    name: "Sablon DTF Belakang Besar",
    shortName: "DTF Belakang Besar",
    description: "Artwork besar untuk bagian belakang.",
    pricePerPcs: 25000
  },
  {
    id: "bordir-komputer-logo-besar",
    name: "Bordir Komputer Logo Besar",
    shortName: "Bordir Logo Besar",
    description: "Estimasi normal untuk bordir lebih besar/lebih detail.",
    pricePerPcs: 30000
  },
  {
    id: "sublim-printing",
    name: "Sublim Printing",
    shortName: "Sublim",
    description: "Estimasi normal untuk jersey/apparel full color.",
    pricePerPcs: 35000
  }
];

const productRecommendations: ProductRecommendation[] = [
  {
    id: "topi-trucker-rekomendasi",
    name: "Topi Trucker",
    category: "Headwear",
    priceLabel: "Mulai Rp 35.000",
    priceValue: 35000,
    href: "/headwear"
  },
  {
    id: "polo-shirt-rekomendasi",
    name: "Polo Shirt",
    category: "Polo Shirt",
    priceLabel: "Mulai Rp 80.000",
    priceValue: 80000,
    href: "/polo-shirt"
  },
  {
    id: "kaos-polos-navy-rekomendasi",
    name: "Kaos Polos Navy",
    category: "Kaos Polos",
    priceLabel: "Mulai Rp 45.000",
    priceValue: 45000,
    href: "/kaos-polos"
  }
];

function normalizeNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
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

function selectedServices(item: CartItem) {
  return item.services.map((service) => serviceById(service.id)).filter(Boolean) as ServiceOption[];
}

function itemProductSubtotal(item: CartItem) {
  return itemUnitPrice(item) * item.quantity;
}

function itemServiceSubtotal(item: CartItem) {
  return selectedServices(item).reduce((total, service) => total + service.pricePerPcs * item.quantity, 0);
}

function itemNormalSubtotal(item: CartItem) {
  return itemProductSubtotal(item) + itemServiceSubtotal(item);
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
    const role: CartItemRole = !hasPrimary && (item.role === "primary" || index === 0) ? "primary" : "additional";
    if (role === "primary") hasPrimary = true;
    return {
      ...item,
      role,
      quantity: normalizeNumber(Number(item.quantity || 1)),
      color: item.color || "",
      size: item.size || "",
      printLocation: item.printLocation || "",
      notes: item.notes || "",
      services: Array.isArray(item.services) ? item.services : []
    };
  });
}

function buildItemMessage(item: CartItem) {
  const lines = [
    `Produk: ${item.name}`
  ];
  if (item.category) lines.push(`Kategori: ${item.category}`);
  if (item.priceLabel) lines.push(`Harga produk: ${item.priceLabel}`);
  lines.push(`Jumlah: ${item.quantity} pcs`);
  if (item.color.trim()) lines.push(`Warna: ${item.color.trim()}`);
  if (item.size.trim()) lines.push(`Ukuran: ${item.size.trim()}`);
  if (item.printLocation.trim()) lines.push(`Area produksi: ${item.printLocation.trim()}`);
  if (item.notes.trim()) lines.push(`Catatan: ${item.notes.trim()}`);
  const productSubtotal = itemProductSubtotal(item);
  if (productSubtotal > 0) lines.push(`Subtotal produk: ${formatRupiah(productSubtotal)}`);
  if (item.href) lines.push(`Link produk: ${absoluteUrl(item.href)}`);

  const services = selectedServices(item);
  if (services.length) {
    lines.push("");
    lines.push("Layanan tambahan:");
    services.forEach((service) => {
      lines.push(`- ${service.name}`);
      lines.push(`  Harga normal: ${formatRupiah(service.pricePerPcs)} / pcs`);
      lines.push(`  Subtotal layanan: ${formatRupiah(service.pricePerPcs * item.quantity)}`);
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
  if (totals.serviceSubtotal > 0) lines.push(`Subtotal layanan: ${formatRupiah(totals.serviceSubtotal)}`);
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

function toggleService(item: CartItem, serviceId: string) {
  const exists = item.services.some((service) => service.id === serviceId);
  return exists
    ? item.services.filter((service) => service.id !== serviceId)
    : [...item.services, { id: serviceId }];
}

function serviceIsSelected(item: CartItem, serviceId: string) {
  return item.services.some((service) => service.id === serviceId);
}

function ItemEditor({ item, compact = false }: { item: CartItem; compact?: boolean }) {
  const cart = useCart();
  const unitPrice = itemUnitPrice(item);
  const productSubtotal = itemProductSubtotal(item);
  const serviceSubtotal = itemServiceSubtotal(item);

  return (
    <article className={`border border-black/10 bg-white ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          {item.imageUrl ? (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-[#f5f5ef] sm:h-24 sm:w-24">
              <SafeImage src={item.imageUrl} fallbackSrc={fallbackImages.product} alt={item.imageAlt || item.name} fill className="object-cover" sizes="96px" />
            </div>
          ) : null}
          <div className="min-w-0">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${item.role === "primary" ? "bg-[#e8f5ee] text-[#063d24]" : "bg-[#f3f3ef] text-black/55"}`}>
              {item.role === "primary" ? "Pesanan Utama" : "Item Tambahan"}
            </span>
            <h3 className="mt-3 text-base font-semibold leading-snug sm:text-lg">{item.name}</h3>
            {labelForItem(item) ? <p className="mt-1 text-xs leading-5 text-black/50 sm:text-sm">{labelForItem(item)}</p> : null}
          </div>
        </div>
        <button type="button" className="shrink-0 text-xs font-semibold text-[#b00000] underline-offset-4 hover:underline" onClick={() => cart.removeItem(item.cartId)}>
          Hapus
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold text-black/60">
          Jumlah
          <input type="number" min={1} value={item.quantity} onChange={(event) => cart.updateItem(item.cartId, { quantity: normalizeNumber(Number(event.target.value)) })} className="min-h-11 border border-black/10 px-3 text-sm font-normal text-black outline-none focus:border-black" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-black/60">
          Warna
          <input value={item.color} onChange={(event) => cart.updateItem(item.cartId, { color: event.target.value })} placeholder="Contoh: Hitam" className="min-h-11 border border-black/10 px-3 text-sm font-normal text-black outline-none focus:border-black" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-black/60">
          Ukuran
          <input value={item.size} onChange={(event) => cart.updateItem(item.cartId, { size: event.target.value })} placeholder="Contoh: L / M 12 pcs" className="min-h-11 border border-black/10 px-3 text-sm font-normal text-black outline-none focus:border-black" />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold text-black/60">
          Area produksi / posisi desain
          <input value={item.printLocation} onChange={(event) => cart.updateItem(item.cartId, { printLocation: event.target.value })} placeholder="Depan, belakang, lengan" className="min-h-11 border border-black/10 px-3 text-sm font-normal text-black outline-none focus:border-black" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-black/60">
          Catatan desain
          <input value={item.notes} onChange={(event) => cart.updateItem(item.cartId, { notes: event.target.value })} placeholder="Logo dada kiri, desain menyusul via WA" className="min-h-11 border border-black/10 px-3 text-sm font-normal text-black outline-none focus:border-black" />
        </label>
      </div>

      <div className="mt-5 border-t border-black/10 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/50">Layanan Tambahan</p>
            <p className="mt-1 text-xs leading-5 text-black/55">Pilih jika dibutuhkan. Harga normal dihitung otomatis, harga terbaik dikonfirmasi via WhatsApp.</p>
          </div>
          <p className="shrink-0 text-sm font-semibold">{serviceSubtotal > 0 ? formatRupiah(serviceSubtotal) : "Opsional"}</p>
        </div>
        <div className="mt-4 grid gap-2">
          {serviceOptions.slice(0, compact ? 3 : serviceOptions.length).map((service) => (
            <label key={`${item.cartId}-${service.id}`} className="flex cursor-pointer items-start justify-between gap-3 border border-black/10 p-3 transition hover:border-black/30">
              <span className="flex min-w-0 gap-3">
                <input type="checkbox" checked={serviceIsSelected(item, service.id)} onChange={() => cart.updateItem(item.cartId, { services: toggleService(item, service.id) })} className="mt-1 h-4 w-4 accent-[#063d24]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5">{service.name}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-black/55">Harga normal: {formatRupiah(service.pricePerPcs)} / pcs · {service.description}</span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold">{formatRupiah(service.pricePerPcs * item.quantity)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 text-sm">
        <div className="text-black/55">
          Harga produk: <span className="font-semibold text-black">{unitPrice > 0 ? `${formatRupiah(unitPrice)} / pcs` : "Konfirmasi admin"}</span>
        </div>
        <div className="font-semibold">Subtotal produk: {safeCurrency(productSubtotal)}</div>
      </div>
      {item.href ? <Link href={item.href} className="mt-4 inline-block text-xs font-semibold text-[#063d24] underline-offset-4 hover:underline" onClick={cart.closeCart}>Lihat detail produk</Link> : null}
    </article>
  );
}

function Recommendations({ compact = false }: { compact?: boolean }) {
  const cart = useCart();
  const primary = cart.items.find((item) => item.role === "primary");

  function addServiceRecommendation(serviceId: string) {
    if (!primary) return;
    if (serviceIsSelected(primary, serviceId)) return;
    cart.updateItem(primary.cartId, { services: [...primary.services, { id: serviceId }] });
  }

  return (
    <section className="border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/50">Rekomendasi Tambahan</p>
          <h3 className="mt-1 text-lg font-semibold">Lengkapi kebutuhanmu</h3>
        </div>
        <p className="hidden text-xs text-black/50 sm:block">Tidak otomatis masuk pesanan.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {serviceOptions.slice(0, compact ? 2 : 3).map((service) => {
          const selected = primary ? serviceIsSelected(primary, service.id) : false;
          return (
            <button key={`recommend-service-${service.id}`} type="button" disabled={!primary || selected} onClick={() => addServiceRecommendation(service.id)} className="border border-black/10 p-4 text-left transition hover:border-black disabled:cursor-default disabled:opacity-55">
              <p className="text-sm font-semibold">{service.shortName}</p>
              <p className="mt-1 text-xs leading-5 text-black/55">Harga normal {formatRupiah(service.pricePerPcs)} / pcs</p>
              <span className="mt-3 inline-block text-xs font-bold text-[#063d24]">{selected ? "Sudah dipilih" : "Tambah layanan"}</span>
            </button>
          );
        })}
        {productRecommendations.slice(0, compact ? 2 : 3).map((product) => (
          <button key={`recommend-product-${product.id}`} type="button" onClick={() => cart.addItem(product, "additional")} className="border border-black/10 p-4 text-left transition hover:border-black">
            <p className="text-sm font-semibold">{product.name}</p>
            <p className="mt-1 text-xs leading-5 text-black/55">{product.category} · {product.priceLabel}</p>
            <span className="mt-3 inline-block text-xs font-bold text-[#063d24]">Tambah item</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CartSummary({ compact = false }: { compact?: boolean }) {
  const cart = useCart();
  const totals = cartTotals(cart.items);
  const checkoutHref = cart.items.length ? whatsappLinkWithMessage(contactLinks.whatsapp, buildMessage(cart.items)) : "#";

  return (
    <aside className={`border border-black/10 bg-white ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/50">Ringkasan Estimasi</p>
      <div className="mt-5 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-black/58">Subtotal Produk</span>
          <span className="font-semibold">{safeCurrency(totals.productSubtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-black/58">Subtotal Layanan</span>
          <span className="font-semibold">{totals.serviceSubtotal > 0 ? formatRupiah(totals.serviceSubtotal) : "Rp 0"}</span>
        </div>
        <div className="mt-2 border-t border-black/10 pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">{totals.hasServices ? "Estimasi Normal" : "Total"}</span>
            <span className="text-xl font-bold text-[#063d24]">{safeCurrency(totals.normalTotal)}</span>
          </div>
        </div>
      </div>
      {totals.hasServices ? (
        <div className="mt-5 bg-[#fff7e6] p-4 text-xs leading-6 text-[#6a4300]">
          Harga final bisa lebih hemat setelah admin mengecek detail desain, jumlah pesanan, dan kebutuhan produksi.
        </div>
      ) : (
        <div className="mt-5 bg-[#f5f5ef] p-4 text-xs leading-6 text-black/58">
          Jika hanya pesan produk tanpa layanan tambahan, biaya mengikuti harga produk yang tertera.
        </div>
      )}
      <a href={checkoutHref} target={cart.items.length ? "_blank" : undefined} rel={cart.items.length ? "noopener noreferrer" : undefined} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-center text-sm font-semibold ${cart.items.length ? "bg-[#063d24] text-white" : "pointer-events-none bg-black/10 text-black/35"}`}>
        {totals.hasServices ? "Pesan dan Dapatkan Harga Terbaik Kami" : "Pesan Produk via WhatsApp"}
      </a>
      {cart.items.length ? <Link href="/keranjang" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold transition hover:border-black" onClick={cart.closeCart}>Lihat Keranjang Penuh</Link> : null}
      <p className="mt-4 text-center text-[11px] leading-5 text-black/45">Order akhir tetap lewat WhatsApp. Tidak perlu login.</p>
    </aside>
  );
}

function EmptyCart({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div className={`grid place-items-center bg-white p-8 text-center ${fullPage ? "min-h-[420px]" : "min-h-[280px]"}`}>
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f5f5ef]"><CartIcon /></div>
        <p className="mt-5 text-lg font-semibold">Keranjang masih kosong</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/55">Tambahkan produk dulu. Produk pertama akan menjadi Pesanan Utama, rekomendasi tambahan tetap muncul di bawah.</p>
        <Link href="/koleksi" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#063d24] px-6 text-sm font-semibold text-white">Lihat Koleksi</Link>
      </div>
    </div>
  );
}

function CartOrderLayout({ fullPage = false }: { fullPage?: boolean }) {
  const cart = useCart();
  const primaryItems = cart.items.filter((item) => item.role === "primary");
  const additionalItems = cart.items.filter((item) => item.role === "additional");

  if (!cart.items.length) return <EmptyCart fullPage={fullPage} />;

  return (
    <div className={fullPage ? "grid gap-6 lg:grid-cols-[1fr_380px]" : "grid gap-5"}>
      <div className="grid gap-5">
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#063d24]">Pesanan Utama</p>
              <p className="mt-1 text-xs text-black/50">Produk utama selalu tampil paling atas agar tidak membingungkan.</p>
            </div>
            <button type="button" className="text-xs font-semibold text-black/55 underline-offset-4 hover:text-black hover:underline" onClick={cart.clearCart}>Kosongkan</button>
          </div>
          {primaryItems.map((item) => <ItemEditor key={item.cartId} item={item} compact={!fullPage} />)}
        </section>

        {additionalItems.length ? (
          <section className="grid gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/50">Item Tambahan</p>
              <p className="mt-1 text-xs text-black/50">Item ini ditambahkan dari rekomendasi atau produk lain.</p>
            </div>
            {additionalItems.map((item) => <ItemEditor key={item.cartId} item={item} compact={!fullPage} />)}
          </section>
        ) : null}

        <Recommendations compact={!fullPage} />
      </div>
      <div className={fullPage ? "lg:sticky lg:top-28 lg:self-start" : ""}>
        <CartSummary compact={!fullPage} />
      </div>
    </div>
  );
}

function CartDrawer() {
  const { isOpen, closeCart } = useCart();

  return (
    <>
      <div className={`fixed inset-0 z-[150] bg-black/45 transition ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`} onMouseDown={(event) => event.target === event.currentTarget && closeCart()} />
      <aside className={`fixed right-0 top-0 z-[160] flex h-dvh w-full max-w-xl flex-col bg-[#f7f7f2] shadow-[-18px_0_50px_rgba(0,0,0,0.18)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`} role="dialog" aria-modal="true" aria-label="Keranjang belanja">
        <div className="flex items-center justify-between border-b border-black/10 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Keranjang Belanja</p>
            <h2 className="mt-1 text-2xl font-semibold">Pesanan DEBRODER</h2>
          </div>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-xl leading-none transition hover:bg-[#f5f5ef]" aria-label="Tutup keranjang" onClick={closeCart}>
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <CartOrderLayout />
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
      const raw = window.localStorage.getItem(storageKey) || window.localStorage.getItem(legacyStorageKey);
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
            printLocation: "",
            notes: "",
            services: []
          }
        ]);
      });
      setIsOpen(true);
    },
    updateItem: (cartId, updates) => {
      setItems((current) => ensureRoles(current.map((item) => item.cartId === cartId ? { ...item, ...updates, quantity: normalizeNumber(Number(updates.quantity ?? item.quantity)) } : item)));
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
  return (
    <button type="button" className={className} onClick={() => addItem(product)}>
      {children}
    </button>
  );
}

export function CartPageContent() {
  return <CartOrderLayout fullPage />;
}
