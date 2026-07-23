"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { SafeImage } from "@/components/SafeImage";
import { repriceCartItemsByProduct } from "@/lib/cart-group-tier-pricing";
import {
  applyReadyStockRevalidation,
  CART_V5_STORAGE_KEY,
  createConfiguredProductCartItem,
  createCustomProjectCartItem,
  createLegacyUnsupportedCartItem,
  createReadyStockCartItem,
  ensureCartRoles,
  getCartCheckoutDecision,
  LEGACY_CART_STORAGE_KEYS,
  markReadyStockLinesStale,
  restoreCartV5,
  serializeCartV5,
  validateCartLimits,
  type CartCheckoutDecision,
  type CartItem,
  type CartItemRole,
  type CartV5Issue,
  type ReadyStockRevalidationResult
} from "@/lib/cart-v5";
import type { ConfiguredProductSnapshot } from "@/lib/contracts";
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

export type ConfiguredProductCartInput = {
  snapshot: ConfiguredProductSnapshot;
  name: string;
  category?: string;
  priceLabel?: string;
  priceValue?: number;
  href?: string;
  imageUrl?: string;
  imageAlt?: string;
  color?: string;
  colorHex?: string;
  size?: string;
  variantName?: string;
  notes?: string;
};

type CartItemUpdate = {
  quantity?: number;
  color?: string;
  colorHex?: string;
  size?: string;
  notes?: string;
  stockAvailable?: number;
  stockLabel?: string;
};

export type CartRevalidationOutcome = {
  ok: boolean;
  lines: CartItem[];
  issues: CartV5Issue[];
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  isOpen: boolean;
  isLoaded: boolean;
  isRevalidating: boolean;
  issues: CartV5Issue[];
  checkoutDecision: CartCheckoutDecision;
  addItem: (product: CartProductInput, role?: CartItemRole) => void;
  addConfiguredProduct: (input: ConfiguredProductCartInput, role?: CartItemRole) => void;
  updateItem: (lineId: string, updates: CartItemUpdate) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  addCustomProject: (project: CustomProjectSnapshot) => void;
  revalidate: () => Promise<CartRevalidationOutcome>;
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

export function isCustomProjectCartItem(
  item: Pick<CartItem, "lineType">
): item is CartItem & { lineType: "custom_project"; customProject: CustomProjectSnapshot } {
  return item.lineType === "custom_project";
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
  if (item.lineType === "legacy_unsupported") return 0;
  if (item.lineType === "custom_project") {
    return item.customProject?.pricing.finalTotal ?? 0;
  }
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
  return repriceCartItemsByProduct(ensureCartRoles(items));
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
  const displaySku = item.lineType === "ready_stock"
    ? item.sku
    : readRecordString(item.variantSnapshot, "sku");
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
            {(item.color || item.size || displaySku) ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/55">
                {item.color ? <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: item.colorHex || "#d9d9d6" }} />{item.color}</span> : null}
                {item.size ? <span>Ukuran {item.size}</span> : null}
                {displaySku ? <span>SKU {displaySku}</span> : null}
              </div>
            ) : null}
          </div>
          <button type="button" className="text-xs font-semibold text-red-700 underline-offset-4 hover:underline" onClick={() => cart.removeItem(item.lineId)}>Hapus</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {isCustomProjectCartItem(item) ? <p className="rounded-full bg-[#f5f5ef] px-3 py-2 text-xs font-semibold">{item.customProject.pricing.totalQuantity} pcs terkonfigurasi</p> : item.lineType === "legacy_unsupported" ? <p className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Perlu ditinjau</p> : <QuantityControl value={item.quantity} ariaLabel={`jumlah ${item.name}`} onChange={(quantity) => cart.updateItem(item.lineId, { quantity })} />}
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
                onClick={() => cart.updateItem(item.lineId, { color: color.name, colorHex: color.hex })}
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
                onClick={() => cart.updateItem(item.lineId, { size })}
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
        <textarea value={item.notes ?? ""} onChange={(event) => cart.updateItem(item.lineId, { notes: event.target.value })} placeholder="Contoh: mix ukuran, deadline, atau permintaan warna khusus." rows={3} className={`rounded-[18px] border-0 bg-white/70 p-4 text-sm font-normal normal-case leading-6 tracking-normal text-black outline-none ring-1 ring-black/10 transition ${cart.preserveJerseyInteractions ? "focus:ring-[#063d24]/35" : "focus:ring-black/40"}`} />
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
      {item.lineType === "legacy_unsupported" ? (
        <div className="mt-5 rounded-[18px] border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-semibold">Item lama tidak dapat diproses otomatis.</p>
          <p>Data asli tetap tersimpan, tetapi item harus dihapus dan ditambahkan kembali dari sumber canonical sebelum checkout.</p>
        </div>
      ) : null}
      <CustomProjectSummary item={item} />
      <JerseyConfigSummary item={item} />
      {!isJersey && !isCustomProject && item.lineType !== "legacy_unsupported" && item.lineType !== "ready_stock" ? <ProductDetails item={item} /> : null}
    </article>
  );
}

function CartSummary({ compact = false }: { compact?: boolean }) {
  const cart = useCart();
  const totals = cartTotals(cart.items);
  const checkoutAllowed = cart.checkoutDecision.allowed;

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
      {!checkoutAllowed ? <p className="mt-4 text-xs leading-5 text-amber-800">{cart.checkoutDecision.message}</p> : null}
      <Link href={checkoutAllowed ? "/checkout" : "#"} aria-disabled={!checkoutAllowed} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-center text-sm font-semibold ${checkoutAllowed ? cart.preserveJerseyInteractions ? "bg-[#063d24] text-white" : "bg-black text-white hover:bg-black/75" : "pointer-events-none bg-black/10 text-black/35"}`}>
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
      <CartValidationNotice />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <h2 className="mb-5 text-2xl font-semibold tracking-tight">Bag</h2>
          <div className="grid gap-5">
            {primaryItems.map((item) => <FullCartItem key={item.lineId} item={item} />)}
            {additionalItems.length ? (
              <section className="grid gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/45">Item Tambahan</p>
                  <p className="mt-1 text-sm leading-6 text-black/55">Item tambahan tetap tercatat pada order yang sama.</p>
                </div>
                {additionalItems.map((item) => <FullCartItem key={item.lineId} item={item} />)}
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
      <CartValidationNotice compact />
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
        <Link href={cart.checkoutDecision.allowed ? "/checkout" : "#"} aria-disabled={!cart.checkoutDecision.allowed} onClick={cart.checkoutDecision.allowed ? cart.closeCart : undefined} className={`mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-center text-sm font-semibold ${cart.checkoutDecision.allowed ? `text-white ${cart.preserveJerseyInteractions ? "bg-[#063d24]" : "bg-black hover:bg-black/75"}` : "pointer-events-none bg-black/10 text-black/35"}`}>
          Checkout
        </Link>
        {!cart.checkoutDecision.allowed ? <p className="mt-3 text-xs leading-5 text-amber-800">{cart.checkoutDecision.message}</p> : null}
      </section>
    </div>
  );
}

function CartValidationNotice({ compact = false }: { compact?: boolean }) {
  const cart = useCart();
  const visibleIssues = cart.issues.slice(0, compact ? 2 : 5);
  if (!cart.isRevalidating && visibleIssues.length === 0) return null;
  return (
    <section className="mb-5 rounded-[20px] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" aria-live="polite">
      <p className="font-semibold">{cart.isRevalidating ? "Memvalidasi harga dan stok terbaru..." : "Keranjang perlu ditinjau"}</p>
      {visibleIssues.map((issue, index) => <p key={`${issue.code}:${issue.lineId ?? index}`} className="mt-1 leading-6">{issue.message}</p>)}
      {!cart.isRevalidating ? (
        <button type="button" className="mt-3 font-semibold underline underline-offset-4" onClick={() => void cart.revalidate()}>
          Coba validasi lagi
        </button>
      ) : null}
    </section>
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

function issuesFromLines(lines: readonly CartItem[]): CartV5Issue[] {
  return dedupeIssues(lines.flatMap((line) => {
    if (line.validation.status === "stale") {
      return [{ ...line.validation.warning, lineId: line.lineId }];
    }
    if (line.validation.status === "invalid") {
      return [{
        code: line.validation.code,
        message: line.validation.message,
        lineId: line.lineId
      }];
    }
    return [];
  }));
}

function dedupeIssues(issues: readonly CartV5Issue[]): CartV5Issue[] {
  const unique = new Map<string, CartV5Issue>();
  issues.forEach((issue) => {
    unique.set(`${issue.code}:${issue.lineId ?? ""}:${issue.message}`, issue);
  });
  return [...unique.values()];
}

function readyStockRevalidationSignature(lines: readonly CartItem[]) {
  const readyStock = lines.filter((line) => line.lineType === "ready_stock");
  if (
    readyStock.length === 0
    || readyStock.every((line) => line.validation.status === "valid")
  ) {
    return "";
  }
  return readyStock
    .map((line) => `${line.lineId}:${line.quantity}`)
    .sort()
    .join("|");
}

function readSnapshotTierId(snapshot?: Readonly<Record<string, unknown>>) {
  const tier = snapshot?.applied_tier;
  return readRecordString(tier, "id");
}

function readRecordString(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : null;
}

function isRevalidationPayload(
  value: unknown
): value is { items: ReadyStockRevalidationResult[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const items = (value as Record<string, unknown>).items;
  return Array.isArray(items) && items.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return typeof record.product_variant_size_id === "string"
      && (
        record.status === "ok"
        || record.status === "unavailable"
        || record.status === "stock_changed"
        || record.status === "price_changed"
        || record.status === "quotation_required"
      )
      && (record.error_code === null || typeof record.error_code === "string")
      && (
        record.latest_unit_price === null
        || (
          typeof record.latest_unit_price === "number"
          && Number.isSafeInteger(record.latest_unit_price)
          && record.latest_unit_price >= 0
        )
      )
      && typeof record.stock_available === "number"
      && Number.isSafeInteger(record.stock_available)
      && record.stock_available >= 0
      && (record.message === null || typeof record.message === "string");
  });
}

function productInputSnapshot(product: CartProductInput): Readonly<Record<string, unknown>> {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    priceLabel: product.priceLabel,
    priceValue: product.priceValue,
    href: product.href,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    sku: product.sku,
    defaultColor: product.defaultColor,
    defaultColorHex: product.defaultColorHex,
    defaultSize: product.defaultSize,
    defaultQuantity: product.defaultQuantity,
    variantId: product.variantId,
    variantSizeId: product.variantSizeId,
    variantName: product.variantName,
    variantSku: product.variantSku,
    stockLabel: product.stockLabel,
    stockAvailable: product.stockAvailable,
    variantSnapshot: product.variantSnapshot,
    customProject: product.customProject
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [operationIssues, setOperationIssues] = useState<CartV5Issue[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const lastAutomaticRevalidation = useRef("");

  const setCartLines = useCallback((lines: CartItem[]) => {
    itemsRef.current = lines;
    setItems(lines);
  }, []);

  const commitMutation = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    const candidate = ensureRoles(updater(itemsRef.current));
    const limit = validateCartLimits(candidate);
    if (!limit.ok) {
      setOperationIssues([limit.issue]);
      return false;
    }
    setOperationIssues([]);
    setCartLines(candidate);
    return true;
  }, [setCartLines]);

  const runRevalidation = useCallback(async (
    sourceLines: CartItem[]
  ): Promise<CartRevalidationOutcome> => {
    const readyStock = sourceLines.filter(
      (line): line is CartItem & { lineType: "ready_stock" } =>
        line.lineType === "ready_stock"
    );
    if (readyStock.length === 0) {
      const issues = issuesFromLines(sourceLines);
      setOperationIssues(issues);
      return { ok: issues.length === 0, lines: sourceLines, issues };
    }

    setIsRevalidating(true);
    try {
      const response = await fetch("/api/cart/revalidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: readyStock.map((line) => ({
            product_variant_size_id: line.variantSizeId,
            product_id: line.productId,
            quantity: line.quantity,
            unit_price: itemUnitPrice(line),
            price_tier_id: readSnapshotTierId(line.variantSnapshot)
          }))
        })
      });
      if (!response.ok) {
        throw new Error(`Cart revalidation failed with status ${response.status}.`);
      }
      const payload: unknown = await response.json();
      if (!isRevalidationPayload(payload)) {
        throw new Error("Cart revalidation returned an invalid payload.");
      }
      const applied = applyReadyStockRevalidation(sourceLines, payload.items);
      const nextLines = ensureCartRoles(applied.lines);
      const issues = dedupeIssues([...applied.issues, ...issuesFromLines(nextLines)]);
      setCartLines(nextLines);
      setOperationIssues(issues);
      return { ok: applied.readyStockValid, lines: nextLines, issues };
    } catch {
      const warning = {
        code: "CART_REVALIDATION_UNAVAILABLE",
        message: "Harga dan stok terbaru belum dapat dipastikan. Snapshot terakhir tetap ditampilkan, tetapi checkout diblokir."
      };
      const nextLines = markReadyStockLinesStale(sourceLines, warning);
      const issues = dedupeIssues([warning, ...issuesFromLines(nextLines)]);
      setCartLines(nextLines);
      setOperationIssues(issues);
      return { ok: false, lines: nextLines, issues };
    } finally {
      setIsRevalidating(false);
    }
  }, [setCartLines]);

  useEffect(() => {
    try {
      const restored = restoreCartV5(
        window.localStorage.getItem(CART_V5_STORAGE_KEY),
        LEGACY_CART_STORAGE_KEYS.map((source) => ({
          version: source.version,
          raw: window.localStorage.getItem(source.key)
        }))
      );
      setCartLines(ensureRoles([...restored.cart.lines]));
      setOperationIssues([...restored.issues]);
    } catch {
      setCartLines([]);
      setOperationIssues([{
        code: "CART_STORAGE_UNAVAILABLE",
        message: "Penyimpanan cart tidak dapat dibaca. Keranjang tetap dapat digunakan selama halaman ini terbuka."
      }]);
    } finally {
      setIsLoaded(true);
    }
  }, [setCartLines]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      window.localStorage.setItem(
        CART_V5_STORAGE_KEY,
        serializeCartV5(items)
      );
    } catch {
      // Cart remains usable in memory if storage is unavailable.
    }
  }, [isLoaded, items]);

  useEffect(() => {
    if (!isLoaded) return;
    const activeCartSurface = isOpen || pathname === "/keranjang" || pathname === "/checkout";
    if (!activeCartSurface) return;
    const signature = readyStockRevalidationSignature(items);
    if (!signature || signature === lastAutomaticRevalidation.current) return;
    lastAutomaticRevalidation.current = signature;
    void runRevalidation(items);
  }, [isLoaded, isOpen, items, pathname, runRevalidation]);

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

  const lineIssues = useMemo(
    () => dedupeIssues([...operationIssues, ...issuesFromLines(items)]),
    [items, operationIssues]
  );
  const checkoutDecision = useMemo(
    () => getCartCheckoutDecision(items),
    [items]
  );

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    isOpen,
    isLoaded,
    isRevalidating,
    issues: lineIssues,
    checkoutDecision,
    addItem: (product, requestedRole) => {
      commitMutation((current) => {
        const duplicateIndex = product.variantSizeId
          ? current.findIndex(
              (item) =>
                item.lineType === "ready_stock"
                && item.variantSizeId === product.variantSizeId
            )
          : -1;
        if (duplicateIndex >= 0) {
          return current.map((item, index) => {
            if (index !== duplicateIndex || item.lineType !== "ready_stock") return item;
            return {
              ...item,
              quantity: clampToStock(
                item.quantity + normalizeNumber(Number(product.defaultQuantity || 1)),
                product.stockAvailable ?? item.stockAvailable
              ),
              stockAvailable: product.stockAvailable ?? item.stockAvailable,
              stockLabel: product.stockLabel ?? item.stockLabel,
              priceLabel: product.priceLabel ?? item.priceLabel,
              priceValue: product.priceValue ?? item.priceValue,
              variantSnapshot: product.variantSnapshot ?? item.variantSnapshot,
              validation: { status: "unvalidated" }
            };
          });
        }

        const role = requestedRole || (
          current.some((item) => item.role === "primary")
            ? "additional"
            : "primary"
        );
        const lineId = createCartId(product);
        const display = {
          title: product.name,
          ...(product.category ? { subtitle: product.category } : {}),
          ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
          ...(product.imageAlt ? { imageAlt: product.imageAlt } : {}),
          ...(product.href ? { href: product.href } : {})
        };
        const quantity = clampToStock(
          Number(product.defaultQuantity || 1),
          product.stockAvailable
        );
        const productId = readRecordString(product.variantSnapshot, "product_id") ?? product.id;
        const sku = product.variantSku ?? product.sku;
        const ui = {
          role,
          name: product.name,
          category: product.category,
          priceLabel: product.priceLabel,
          priceValue: product.priceValue,
          href: product.href,
          imageUrl: product.imageUrl,
          imageAlt: product.imageAlt,
          color: product.defaultColor || "",
          colorHex: product.defaultColorHex,
          size: product.defaultSize || "",
          variantName: product.variantName,
          stockLabel: product.stockLabel,
          stockAvailable: product.stockAvailable,
          variantSnapshot: product.variantSnapshot
        };
        const next = productId && product.variantId && product.variantSizeId && sku
          ? createReadyStockCartItem({
              lineId,
              quantity,
              productId,
              variantId: product.variantId,
              variantSizeId: product.variantSizeId,
              sku,
              display,
              ui
            })
          : createLegacyUnsupportedCartItem({
              lineId,
              quantity,
              legacyStorageVersion: "v5",
              reasonCode: "cart.canonical_identity_missing",
              rawLine: productInputSnapshot(product),
              display,
              ui
            });
        return [...current, next];
      });
      setIsOpen(true);
    },
    addConfiguredProduct: (input, requestedRole) => {
      commitMutation((current) => {
        const existing = current.find(
          (item) =>
            item.lineType === "configured_product"
            && item.configurationId === input.snapshot.draft.id
        );
        const role = existing?.role ?? requestedRole ?? (
          current.some((item) => item.role === "primary")
            ? "additional"
            : "primary"
        );
        const next = createConfiguredProductCartItem({
          lineId: existing?.lineId ?? `configured:${input.snapshot.snapshotId}`,
          quantity: input.snapshot.draft.quantity,
          display: {
            title: input.name,
            ...(input.category ? { subtitle: input.category } : {}),
            ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
            ...(input.imageAlt ? { imageAlt: input.imageAlt } : {}),
            ...(input.href ? { href: input.href } : {})
          },
          configurationSnapshot: input.snapshot,
          notes: input.notes,
          ui: {
            role,
            name: input.name,
            category: input.category,
            priceLabel: input.priceLabel,
            priceValue: input.priceValue,
            href: input.href,
            imageUrl: input.imageUrl,
            imageAlt: input.imageAlt,
            color: input.color ?? "",
            colorHex: input.colorHex,
            size: input.size ?? "",
            variantName: input.variantName
          }
        });
        return existing
          ? current.map((item) => item.lineId === existing.lineId ? next : item)
          : [...current, next];
      });
      setIsOpen(true);
    },
    updateItem: (lineId, updates) => {
      commitMutation((current) => current.map((item) => {
        if (item.lineId !== lineId) return item;
        const quantityChanged = updates.quantity !== undefined
          && updates.quantity !== item.quantity;
        const nextQuantity = clampToStock(
          Number(updates.quantity ?? item.quantity),
          updates.stockAvailable ?? item.stockAvailable
        );
        return {
          ...item,
          ...updates,
          quantity: nextQuantity,
          notes: typeof updates.notes === "string" ? updates.notes : item.notes,
          validation: quantityChanged && item.lineType === "ready_stock"
            ? { status: "unvalidated" }
            : item.validation
        };
      }));
    },
    removeItem: (lineId) => {
      commitMutation((current) => current.filter((item) => item.lineId !== lineId));
    },
    clearCart: () => {
      setOperationIssues([]);
      setCartLines([]);
    },
    addCustomProject: (project) => {
      commitMutation((current) => {
        const lineId = `custom-project:${project.id}`;
        const existing = current.find((item) => item.lineId === lineId);
        const priceValue = project.pricing.status === "final"
          ? project.pricing.finalTotal ?? undefined
          : undefined;
        const priceLabel = project.pricing.status === "final"
          ? formatRupiah(project.pricing.finalTotal)
          : project.pricing.status === "estimated"
            ? "Estimasi"
            : "Minta penawaran";
        const next = createCustomProjectCartItem({
          lineId,
          project,
          display: {
            title: `Custom Project · ${project.categoryName}`,
            subtitle: "Custom",
            imageAlt: project.categoryName,
            href: `/custom/${project.categorySlug}`
          },
          ui: {
            role: existing?.role ?? (
              current.some((item) => item.role === "primary")
                ? "additional"
                : "primary"
            ),
            name: `Custom Project · ${project.categoryName}`,
            category: "Custom",
            priceLabel,
            priceValue,
            href: `/custom/${project.categorySlug}`,
            imageUrl: existing?.imageUrl,
            imageAlt: project.categoryName
          }
        });
        return existing
          ? current.map((item) => item.lineId === lineId ? next : item)
          : [...current, next];
      });
      setIsOpen(true);
    },
    revalidate: () => runRevalidation(itemsRef.current),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    preserveJerseyInteractions: pathname.startsWith("/jersey")
  }), [
    checkoutDecision,
    commitMutation,
    isLoaded,
    isOpen,
    isRevalidating,
    items,
    lineIssues,
    pathname,
    runRevalidation,
    setCartLines
  ]);

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
