"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { SafeImage } from "@/components/SafeImage";
import { calculateCartTierPrice } from "@/lib/cart-tier-pricing";
import type { CustomProjectSnapshot } from "@/lib/custom-commerce/types";
import { fallbackImages, pageHeroImageFallbacks } from "@/lib/fallback-data";
import { formatRupiah } from "@/lib/url";

export type CartProductInput = {
  id?: string;
  name: string;
  category?: string;
  priceLabel?: string;
  priceValue?: number;
  href?: string;
  imageUrl?: string;
  imageAlt?: string;
  sku?: string;
  defaultColor?: string;
  defaultColorHex?: string;
  defaultSize?: string;
  defaultQuantity?: number;
  variantId?: string;
  variantSizeId?: string;
  variantName?: string;
  variantSku?: string;
  stockLabel?: string;
  stockAvailable?: number;
  variantSnapshot?: Record<string, unknown>;
  customProject?: CustomProjectSnapshot;
};

type CartItemRole = "primary" | "additional";

export type CartItem = CartProductInput & {
  cartId: string;
  role: CartItemRole;
  quantity: number;
  color: string;
  colorHex?: string;
  size: string;
  variantId?: string;
  variantSizeId?: string;
  variantName?: string;
  variantSku?: string;
  stockLabel?: string;
  stockAvailable?: number;
  variantSnapshot?: Record<string, unknown>;
  notes: string;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  isOpen: boolean;
  isLoaded: boolean;
  addItem: (product: CartProductInput, role?: CartItemRole) => void;
  updateItem: (cartId: string, updates: Partial<CartItem>) => void;
  removeItem: (cartId: string) => void;
  clearCart: () => void;
  addCustomProject: (project: CustomProjectSnapshot) => void;
  openCart: () => void;
  closeCart: () => void;
  preserveJerseyInteractions: boolean;
};

type SearchSuggestion = {
  id: string;
  name: string;
  label: string;
  href: string;
  imageUrl: string;
};

const storageKey = "debroder-cart-v4";
const legacyStorageKeys = ["debroder-cart-v3", "debroder-cart-v2", "debroder-cart-v1"];
const CartContext = createContext<CartContextValue | null>(null);

const defaultColorOptions = [
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

const defaultSizeOptions = ["S", "M", "L", "XL", "2XL", "3XL", "Mix Size"];

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

function clampToStock(quantity: number, stockAvailable?: number) {
  const normalized = normalizeNumber(quantity);
  return typeof stockAvailable === "number" && Number.isFinite(stockAvailable)
    ? Math.min(normalized, Math.max(1, Math.floor(stockAvailable)))
    : normalized;
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

function repriceCartItem(item: CartItem): CartItem {
  const tierPrice = calculateCartTierPrice(item.variantSnapshot, item.quantity);
  if (!tierPrice) return item;

  return {
    ...item,
    priceLabel: tierPrice.quoteRequired
      ? "Minta penawaran"
      : formatRupiah(tierPrice.unitPrice),
    priceValue: tierPrice.quoteRequired ? undefined : tierPrice.unitPrice,
    variantSnapshot: {
      ...item.variantSnapshot,
      selected_quantity: item.quantity,
      applied_tier: tierPrice.activeTier,
      quote_required: tierPrice.quoteRequired,
      unit_price: tierPrice.quoteRequired ? null : tierPrice.unitPrice,
      subtotal: tierPrice.quoteRequired ? null : tierPrice.subtotal
    }
  };
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nameFromRecord(value: unknown) {
  const record = recordValue(value);
  return typeof record?.name === "string" ? record.name : "";
}

function isJerseyConfiguredItem(item: Pick<CartItem, "variantSnapshot">) {
  return item.variantSnapshot?.configurator_type === "jersey";
}

export function isCustomProjectCartItem(item: Pick<CartItem, "customProject">) {
  return Boolean(item.customProject?.id && item.customProject.version === 1);
}

function CustomProjectSummary({ item }: { item: CartItem }) {
  const project = item.customProject;
  if (!project) return null;
  const productGroups = project.items.length;
  const quantity = project.pricing.totalQuantity;
  const designs = project.items.reduce((sum, projectItem) => sum + projectItem.designPackages.length, 0);
  const services = project.items.reduce((sum, projectItem) => sum + projectItem.designPackages.reduce((serviceSum, designPackage) => serviceSum + designPackage.services.length, 0), 0);
  return (
    <div className="mt-5 rounded-[22px] bg-[#f5f5ef] p-4 text-sm leading-6 text-black/70">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/55">Proyek Custom</p>
      <div className="mt-3 grid gap-1 text-xs sm:text-sm">
        <p><span className="font-semibold">Produk:</span> {productGroups} grup · {quantity} pcs</p>
        <p><span className="font-semibold">Paket desain:</span> {designs} · {services} layanan</p>
        <p><span className="font-semibold">Status harga:</span> {project.pricing.status === "final" ? "Final" : project.pricing.status === "estimated" ? "Estimasi" : "Perlu penawaran"}</p>
        <p><span className="font-semibold">Estimasi pengerjaan:</span> {Array.from(new Set(project.items.map((projectItem) => projectItem.leadTime))).join(", ")}</p>
      </div>
      <div className="mt-4 grid gap-3 border-t border-black/10 pt-4">
        {project.items.map((projectItem) => (
          <div key={projectItem.id}>
            <p className="font-semibold">{projectItem.productName} · {projectItem.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0)} pcs</p>
            {projectItem.designPackages.flatMap((designPackage) => designPackage.services.map((service) => (
              <p key={`${designPackage.id}:${service.id}`} className="mt-1 text-xs text-black/60">
                Layanan {service.serviceId}{service.placementId ? ` · Posisi ${service.placementId}` : ""}{service.printSizeId ? ` · Ukuran cetak ${service.printSizeId}` : ""}
              </p>
            )))}
            {projectItem.personalization.sharedValue || projectItem.personalization.entries.length ? <p className="mt-1 text-xs text-black/60">Personalisasi: {projectItem.personalization.sharedValue || `${projectItem.personalization.entries.length} data per item`}</p> : null}
          </div>
        ))}
      </div>
      <Link href={`/custom/${project.categorySlug}?draft=${encodeURIComponent(project.id)}`} className="mt-3 inline-flex font-semibold underline underline-offset-4">Edit konfigurasi</Link>
    </div>
  );
}

function JerseyConfigSummary({ item }: { item: CartItem }) {
  if (!isJerseyConfiguredItem(item)) return null;
  const snapshot = item.variantSnapshot || {};
  const packageName = nameFromRecord(snapshot.package);
  const materialName = nameFromRecord(snapshot.material);
  const collarName = nameFromRecord(snapshot.collar);
  const addons = Array.isArray(snapshot.addons) ? snapshot.addons.map(nameFromRecord).filter(Boolean) : [];
  const requiredServices = Array.isArray(snapshot.required_services) ? snapshot.required_services.map((service) => {
    const record = recordValue(service);
    return typeof record?.service_name === "string" ? record.service_name : nameFromRecord(service);
  }).filter(Boolean) : [];
  return (
    <div className="mt-5 rounded-[22px] bg-[#e9f4ee]/70 p-4 text-sm leading-6 text-[#063d24]">
      <p className="text-xs font-bold uppercase tracking-[0.14em]">Konfigurasi Jersey</p>
      <div className="mt-3 grid gap-1 text-xs text-[#063d24]/78 sm:text-sm">
        {packageName ? <p><span className="font-semibold">Paket:</span> {packageName}</p> : null}
        {materialName ? <p><span className="font-semibold">Bahan:</span> {materialName}</p> : null}
        {collarName ? <p><span className="font-semibold">Kerah:</span> {collarName}</p> : null}
        {addons.length ? <p><span className="font-semibold">Addon:</span> {addons.join(", ")}</p> : null}
        {requiredServices.length ? <p><span className="font-semibold">Layanan wajib:</span> {requiredServices.join(", ")}</p> : null}
      </div>
    </div>
  );
}

function itemProductSubtotal(item: CartItem) {
  return itemUnitPrice(item) * item.quantity;
}

function cartTotals(items: CartItem[]) {
  const productSubtotal = items.reduce((total, item) => total + itemProductSubtotal(item), 0);
  return { productSubtotal, normalTotal: productSubtotal };
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
    const itemWithoutLegacyServices = { ...(item as CartItem & { services?: unknown }) };
    delete itemWithoutLegacyServices.services;
    const quantity = normalizeNumber(Number(item.quantity || 1));
    const role: CartItemRole = !hasPrimary && (item.role === "primary" || index === 0) ? "primary" : "additional";
    if (role === "primary") hasPrimary = true;
    const normalized = {
      ...itemWithoutLegacyServices,
      role,
      quantity,
      color: item.color || "",
      colorHex: item.colorHex || item.defaultColorHex || "",
      size: item.size || "",
      variantId: item.variantId || undefined,
      variantSizeId: item.variantSizeId || undefined,
      variantName: item.variantName || undefined,
      variantSku: item.variantSku || undefined,
      stockLabel: item.stockLabel || undefined,
      stockAvailable:
        typeof item.stockAvailable === "number"
          ? Math.max(0, Math.floor(item.stockAvailable))
          : undefined,
      variantSnapshot: item.variantSnapshot || undefined,
      notes: item.notes || ""
    };
    return isCustomProjectCartItem(normalized) ? normalized : repriceCartItem(normalized);
  });
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
      <div className={`${compact ? "h-28 w-[88px]" : "h-36 w-[116px] sm:h-44 sm:w-[140px]"} relative shrink-0 overflow-hidden bg-[#f2f2ee]`}>
        <SafeImage src={item.imageUrl || fallbackImages.product} fallbackSrc={fallbackImages.product} alt={item.imageAlt || item.name} fill className="object-cover" objectPosition="center center" sizes={compact ? "88px" : "140px"} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {item.role === "primary" ? <span className="mb-2 inline-flex rounded-full bg-[#e9f4ee] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#063d24]">Pesanan Utama</span> : null}
            <h3 className="text-base font-semibold leading-tight sm:text-lg">{item.name}</h3>
            {labelForItem(item) ? <p className="mt-1 text-sm leading-6 text-black/55">{labelForItem(item)}</p> : null}
            {(item.color || item.size || item.variantSku) ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/55">
                {item.color ? <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: item.colorHex || "#d9d9d6" }} />{item.color}</span> : null}
                {item.size ? <span>Ukuran {item.size}</span> : null}
                {item.variantSku ? <span>SKU {item.variantSku}</span> : null}
              </div>
            ) : null}
          </div>
          <button type="button" className="text-xs font-semibold text-red-700 underline-offset-4 hover:underline" onClick={() => cart.removeItem(item.cartId)}>Hapus</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {isCustomProjectCartItem(item) ? <p className="rounded-full bg-[#f5f5ef] px-3 py-2 text-xs font-semibold">{item.customProject?.pricing.totalQuantity ?? 0} pcs terkonfigurasi</p> : <QuantityControl value={item.quantity} ariaLabel={`jumlah ${item.name}`} onChange={(quantity) => cart.updateItem(item.cartId, { quantity })} />}
          <div className="text-right text-sm">
            <p className="text-black/50">{isCustomProjectCartItem(item) ? "Total proyek" : unitPrice > 0 ? `${formatRupiah(unitPrice)} / pcs` : "Harga dikonfirmasi"}</p>
            <p className="mt-1 font-semibold">{safeCurrency(subtotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetails({ item }: { item: CartItem }) {
  const cart = useCart();
  return (
    <div className="mt-6 grid gap-5 border-t border-black/5 pt-5">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Warna</p>
        <p className="mt-1 text-sm text-black/55">{item.color || "Pilih warna"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {defaultColorOptions.map((color) => {
            const selected = item.color === color.name;
            return (
              <button
                key={color.name}
                type="button"
                title={color.name}
                aria-label={`Pilih warna ${color.name}`}
                aria-pressed={selected}
                onClick={() => cart.updateItem(item.cartId, { color: color.name, colorHex: color.hex })}
                className={`grid h-8 w-8 place-items-center rounded-full transition ${selected ? cart.preserveJerseyInteractions ? "ring-2 ring-[#063d24] ring-offset-2 ring-offset-[#F7F7F4]" : "ring-2 ring-black ring-offset-2 ring-offset-[#F7F7F4]" : "ring-1 ring-black/10 hover:ring-black/25"}`}
              >
                <span className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Ukuran</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {defaultSizeOptions.map((size) => {
            const selected = item.size === size;
            return (
              <button
                key={size}
                type="button"
                aria-pressed={selected}
                onClick={() => cart.updateItem(item.cartId, { size })}
                className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition ${selected ? "bg-[#111111] text-white" : "bg-white/70 text-black/70 ring-1 ring-black/10 hover:ring-black/25"}`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </section>

      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/40">
        Catatan produk
        <textarea value={item.notes} onChange={(event) => cart.updateItem(item.cartId, { notes: event.target.value })} placeholder="Contoh: mix ukuran, deadline, atau permintaan warna khusus." rows={3} className={`rounded-[18px] border-0 bg-white/70 p-4 text-sm font-normal normal-case leading-6 tracking-normal text-black outline-none ring-1 ring-black/10 transition ${cart.preserveJerseyInteractions ? "focus:ring-[#063d24]/35" : "focus:ring-black/40"}`} />
      </label>
    </div>
  );
}

function FullCartItem({ item }: { item: CartItem }) {
  const isJersey = isJerseyConfiguredItem(item);
  const isCustomProject = isCustomProjectCartItem(item);
  return (
    <article className="rounded-[28px] bg-white/50 p-4 sm:p-6">
      <CartProductHeader item={item} />
      <CustomProjectSummary item={item} />
      <JerseyConfigSummary item={item} />
      {!isJersey && !isCustomProject && !item.variantSizeId ? <ProductDetails item={item} /> : null}
    </article>
  );
}

function CartSummary({ compact = false }: { compact?: boolean }) {
  const cart = useCart();
  const totals = cartTotals(cart.items);

  return (
    <aside className={`rounded-[28px] bg-white/50 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <h2 className="text-2xl font-semibold tracking-tight">Summary</h2>
      <div className="mt-6 grid gap-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-black/60">Subtotal Produk</span>
          <span className="font-semibold">{safeCurrency(totals.productSubtotal)}</span>
        </div>
        <div className="border-t border-black/10 pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-[#063d24]">{safeCurrency(totals.normalTotal)}</span>
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-[#f5f5ef] p-4 text-xs leading-6 text-black/58">
        Produk Ready Stock mengikuti harga PIM. Konfigurasi layanan hanya dilakukan melalui Custom Builder.
      </div>
      <Link href={cart.items.length ? "/checkout" : "#"} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-center text-sm font-semibold ${cart.items.length ? cart.preserveJerseyInteractions ? "bg-[#063d24] text-white" : "bg-black text-white hover:bg-black/75" : "pointer-events-none bg-black/10 text-black/35"}`}>
        Lanjut ke Checkout
      </Link>
      {!compact ? <p className="mt-4 text-center text-[11px] leading-5 text-black/45">Guest checkout tersedia. Order dibuat di sistem sebelum pembayaran.</p> : null}
    </aside>
  );
}

function EmptyCart({ fullPage = false }: { fullPage?: boolean }) {
  const cart = useCart();
  return (
    <div className={`grid place-items-center rounded-[28px] bg-white/50 p-8 text-center ${fullPage ? "min-h-[420px]" : "min-h-[280px]"}`}>
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f5f5ef]"><CartIcon /></div>
        <p className="mt-5 text-lg font-semibold">Keranjang masih kosong</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/55">Tambahkan produk dulu. Produk pertama akan menjadi Pesanan Utama.</p>
        <Link href="/koleksi" className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white ${cart.preserveJerseyInteractions ? "bg-[#063d24]" : "bg-black hover:bg-black/75"}`}>Lihat Koleksi</Link>
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
            <div className="relative aspect-[4/5] overflow-hidden bg-[#f1f1ec]">
              <SafeImage src={item.imageUrl} fallbackSrc={fallbackImages.product} alt={item.name} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" objectPosition="center center" sizes="320px" />
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
                  <p className="mt-1 text-sm leading-6 text-black/55">Item tambahan tetap tercatat pada order yang sama.</p>
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

  if (!primary) return <EmptyCart />;

  return (
    <div className="grid gap-5">
      <section className="rounded-[24px] bg-white/50 p-4">
        <CartProductHeader item={primary} compact />
        {additionalCount > 0 ? <p className="mt-4 rounded-full bg-[#f5f5ef] px-3 py-2 text-xs text-black/60">+ {additionalCount} item tambahan ikut di keranjang.</p> : null}
      </section>
      <section className="rounded-[24px] bg-white/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-black/60">Subtotal Produk</span>
          <span className="font-semibold">{safeCurrency(totals.productSubtotal)}</span>
        </div>
        <div className="mt-4 border-t border-black/10 pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold text-[#063d24]">{safeCurrency(totals.normalTotal)}</span>
          </div>
        </div>
        <Link href="/keranjang" onClick={cart.closeCart} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold transition hover:border-black">Lihat Keranjang</Link>
        <Link href="/checkout" onClick={cart.closeCart} className={`mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-center text-sm font-semibold text-white ${cart.preserveJerseyInteractions ? "bg-[#063d24]" : "bg-black hover:bg-black/75"}`}>
          Checkout
        </Link>
      </section>
    </div>
  );
}

function CartDrawer() {
  const { isOpen, closeCart } = useCart();

  return (
    <>
      <div className={`fixed inset-0 z-[150] bg-black/35 transition ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`} onMouseDown={(event) => event.target === event.currentTarget && closeCart()} />
      <aside className={`fixed right-0 top-0 z-[160] flex h-dvh w-full max-w-md flex-col bg-[#F7F7F4] shadow-[-18px_0_50px_rgba(0,0,0,0.14)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`} role="dialog" aria-modal="true" aria-label="Keranjang belanja">
        <div className="flex items-center justify-between bg-[#F7F7F4] p-5">
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
  const pathname = usePathname();
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
    isLoaded,
    addItem: (product, requestedRole) => {
      setItems((current) => {
        const duplicateIndex = current.findIndex((item) =>
          product.variantSizeId
            ? item.variantSizeId === product.variantSizeId
            : item.id === product.id &&
              item.defaultColor === product.defaultColor &&
              item.defaultSize === product.defaultSize
        );
        if (duplicateIndex >= 0) {
          return ensureRoles(current.map((item, index) =>
            index === duplicateIndex
              ? {
                  ...item,
                  quantity: clampToStock(
                    item.quantity + normalizeNumber(Number(product.defaultQuantity || 1)),
                    product.stockAvailable ?? item.stockAvailable
                  ),
                  stockAvailable: product.stockAvailable ?? item.stockAvailable,
                  stockLabel: product.stockLabel ?? item.stockLabel,
                  priceLabel: product.priceLabel ?? item.priceLabel,
                  priceValue: product.priceValue ?? item.priceValue,
                  variantSnapshot: product.variantSnapshot ?? item.variantSnapshot
                }
              : item
          ));
        }
        const hasPrimary = current.some((item) => item.role === "primary");
        const role = requestedRole || (hasPrimary ? "additional" : "primary");
        return ensureRoles([
          ...current,
          {
            ...product,
            cartId: createCartId(product),
            role,
            quantity: clampToStock(
              Number(product.defaultQuantity || 1),
              product.stockAvailable
            ),
            color: product.defaultColor || "",
            colorHex: product.defaultColorHex || "",
            size: product.defaultSize || "",
            variantId: product.variantId,
            variantSizeId: product.variantSizeId,
            variantName: product.variantName,
            variantSku: product.variantSku,
            stockLabel: product.stockLabel,
            stockAvailable: product.stockAvailable,
            variantSnapshot: product.variantSnapshot,
            notes: ""
          }
        ]);
      });
      setIsOpen(true);
    },
    updateItem: (cartId, updates) => {
      setItems((current) => ensureRoles(current.map((item) => {
        if (item.cartId !== cartId) return item;
        const nextQuantity = clampToStock(
          Number(updates.quantity ?? item.quantity),
          updates.stockAvailable ?? item.stockAvailable
        );
        return {
          ...item,
          ...updates,
          quantity: nextQuantity,
          notes: typeof updates.notes === "string" ? updates.notes : item.notes
        };
      })));
    },
    removeItem: (cartId) => {
      setItems((current) => ensureRoles(current.filter((item) => item.cartId !== cartId)));
    },
    clearCart: () => setItems([]),
    addCustomProject: (project) => {
      setItems((current) => {
        const cartId = `custom-project:${project.id}`;
        const priceValue = project.pricing.status === "final" ? project.pricing.finalTotal ?? undefined : undefined;
        const priceLabel = project.pricing.status === "final"
          ? formatRupiah(project.pricing.finalTotal)
          : project.pricing.status === "estimated"
            ? "Estimasi"
            : "Minta penawaran";
        const existing = current.find((item) => item.cartId === cartId);
        const next: CartItem = {
          id: project.id,
          name: `Custom Project · ${project.categoryName}`,
          category: "Custom",
          priceLabel,
          priceValue,
          href: `/custom/${project.categorySlug}`,
          imageUrl: existing?.imageUrl,
          imageAlt: project.categoryName,
          cartId,
          role: existing?.role ?? (current.some((item) => item.role === "primary") ? "additional" : "primary"),
          quantity: 1,
          color: "",
          size: "",
          notes: project.note,
          customProject: project
        };
        return ensureRoles(existing ? current.map((item) => item.cartId === cartId ? next : item) : [...current, next]);
      });
      setIsOpen(true);
    },
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    preserveJerseyInteractions: pathname.startsWith("/jersey")
  }), [isLoaded, isOpen, items, pathname]);

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
  const { itemCount, openCart, preserveJerseyInteractions } = useCart();
  return (
    <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f5f5ef]" aria-label={`Buka keranjang, ${itemCount} item`} onClick={openCart}>
      <CartIcon />
      {itemCount > 0 ? <span className={`absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white ${preserveJerseyInteractions ? "bg-[#063d24]" : "bg-black"}`}>{itemCount}</span> : null}
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
