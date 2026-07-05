"use client";

import Link from "next/link";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { contactLinks } from "@/lib/contact";
import { whatsappLinkWithMessage } from "@/lib/url";

export type CartProductInput = {
  id?: string;
  name: string;
  category?: string;
  priceLabel?: string;
  href?: string;
};

type CartItem = CartProductInput & {
  cartId: string;
  quantity: number;
  color: string;
  size: string;
  printLocation: string;
  notes: string;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  isOpen: boolean;
  addItem: (product: CartProductInput) => void;
  updateItem: (cartId: string, updates: Partial<CartItem>) => void;
  removeItem: (cartId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const storageKey = "debroder-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function normalizeNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function createCartId(product: CartProductInput) {
  return `${product.id || product.href || product.name}-${Date.now()}`;
}

function buildMessage(items: CartItem[]) {
  const lines = [
    "Halo DEBRODER, saya ingin minta penawaran untuk item berikut:"
  ];

  items.forEach((item, index) => {
    lines.push("");
    lines.push(`${index + 1}. ${item.name}`);
    if (item.category) lines.push(`Kategori: ${item.category}`);
    if (item.priceLabel) lines.push(`Harga katalog: ${item.priceLabel}`);
    lines.push(`Jumlah: ${item.quantity}`);
    if (item.color.trim()) lines.push(`Warna: ${item.color.trim()}`);
    if (item.size.trim()) lines.push(`Ukuran: ${item.size.trim()}`);
    if (item.printLocation.trim()) lines.push(`Area sablon/bordir: ${item.printLocation.trim()}`);
    if (item.notes.trim()) lines.push(`Catatan: ${item.notes.trim()}`);
    if (item.href) lines.push(`Link produk: ${item.href.startsWith("http") ? item.href : `https://debroder.com${item.href}`}`);
  });

  lines.push("");
  lines.push("Mohon info estimasi harga dan waktu produksinya.");
  return lines.join("\n");
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6.5 7.5h13l-1.2 7.1a2 2 0 0 1-2 1.7H9.1a2 2 0 0 1-2-1.7L5.8 5.2H3.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 20.2h.1M16.2 20.2h.1" strokeLinecap="round" />
    </svg>
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
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
    addItem: (product) => {
      setItems((current) => [
        ...current,
        {
          ...product,
          cartId: createCartId(product),
          quantity: 1,
          color: "",
          size: "",
          printLocation: "",
          notes: ""
        }
      ]);
      setIsOpen(true);
    },
    updateItem: (cartId, updates) => {
      setItems((current) => current.map((item) => item.cartId === cartId ? { ...item, ...updates, quantity: normalizeNumber(updates.quantity ?? item.quantity) } : item));
    },
    removeItem: (cartId) => {
      setItems((current) => current.filter((item) => item.cartId !== cartId));
    },
    clearCart: () => setItems([]),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false)
  }), [isOpen, items]);

  const checkoutHref = items.length ? whatsappLinkWithMessage(contactLinks.whatsapp, buildMessage(items)) : "#";

  return (
    <CartContext.Provider value={value}>
      {children}
      <div className={`fixed inset-0 z-[150] bg-black/45 transition ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`} onMouseDown={(event) => event.target === event.currentTarget && setIsOpen(false)} />
      <aside className={`fixed right-0 top-0 z-[160] flex h-dvh w-full max-w-md flex-col bg-white shadow-[-18px_0_50px_rgba(0,0,0,0.18)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`} role="dialog" aria-modal="true" aria-label="Keranjang penawaran">
        <div className="flex items-center justify-between border-b border-black/10 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Keranjang</p>
            <h2 className="mt-1 text-2xl font-semibold">Minta Penawaran</h2>
          </div>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-xl leading-none transition hover:bg-[#f5f5ef]" aria-label="Tutup keranjang" onClick={() => setIsOpen(false)}>
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length ? (
            <div className="grid gap-4">
              {items.map((item) => (
                <article key={item.cartId} className="rounded-lg border border-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold leading-snug">{item.name}</h3>
                      <p className="mt-1 text-xs text-black/50">{[item.category, item.priceLabel].filter(Boolean).join(" - ")}</p>
                    </div>
                    <button type="button" className="text-xs font-semibold text-black/45 underline-offset-4 hover:text-black hover:underline" onClick={() => value.removeItem(item.cartId)}>
                      Hapus
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-black/60">
                      Jumlah
                      <input type="number" min={1} value={item.quantity} onChange={(event) => value.updateItem(item.cartId, { quantity: normalizeNumber(Number(event.target.value)) })} className="min-h-10 rounded-md border border-black/10 px-3 text-sm font-normal text-black outline-none focus:border-black" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-black/60">
                      Warna
                      <input value={item.color} onChange={(event) => value.updateItem(item.cartId, { color: event.target.value })} placeholder="Contoh: Black" className="min-h-10 rounded-md border border-black/10 px-3 text-sm font-normal text-black outline-none focus:border-black" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-black/60">
                      Ukuran
                      <input value={item.size} onChange={(event) => value.updateItem(item.cartId, { size: event.target.value })} placeholder="Contoh: M 12 pcs, L 8 pcs" className="min-h-10 rounded-md border border-black/10 px-3 text-sm font-normal text-black outline-none focus:border-black" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-black/60">
                      Area sablon/bordir
                      <input value={item.printLocation} onChange={(event) => value.updateItem(item.cartId, { printLocation: event.target.value })} placeholder="Depan, belakang, lengan" className="min-h-10 rounded-md border border-black/10 px-3 text-sm font-normal text-black outline-none focus:border-black" />
                    </label>
                    <label className="col-span-2 grid gap-1 text-xs font-semibold text-black/60">
                      Catatan desain
                      <textarea value={item.notes} onChange={(event) => value.updateItem(item.cartId, { notes: event.target.value })} placeholder="Contoh: pakai logo dada kiri, file desain menyusul" rows={3} className="rounded-md border border-black/10 px-3 py-2 text-sm font-normal text-black outline-none focus:border-black" />
                    </label>
                  </div>
                  {item.href ? <Link href={item.href} className="mt-3 inline-block text-xs font-semibold text-[#0f5a36] underline-offset-4 hover:underline" onClick={() => setIsOpen(false)}>Lihat detail produk</Link> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[280px] place-items-center rounded-lg bg-[#f5f5ef] p-8 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white"><CartIcon /></div>
                <p className="mt-4 font-semibold">Keranjang masih kosong</p>
                <p className="mt-2 text-sm leading-6 text-black/55">Tambahkan produk, lalu isi jumlah, warna, ukuran, dan catatan sebelum kirim WhatsApp.</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-black/10 p-5">
          {items.length ? (
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-black/55">{value.itemCount} item di keranjang</span>
              <button type="button" className="font-semibold underline-offset-4 hover:underline" onClick={value.clearCart}>Kosongkan</button>
            </div>
          ) : null}
          <a href={checkoutHref} target={items.length ? "_blank" : undefined} rel={items.length ? "noopener noreferrer" : undefined} className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold ${items.length ? "bg-[#063d24] text-white" : "pointer-events-none bg-black/10 text-black/35"}`}>
            Kirim ke WhatsApp
          </a>
        </div>
      </aside>
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
