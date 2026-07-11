"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem, RevalidationResult } from "@/lib/types";
import {
  clearCart,
  readCart,
  removeCartItem,
  setCartItemQuantity
} from "@/lib/cart/storage";
import {
  getCartEstimatedTotal,
  getCartQuantity,
  getCartServiceSubtotal,
  getCartSubtotal
} from "@/lib/cart/operations";
import { formatRupiah } from "@/lib/money";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function CartPanel() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    function syncCart() {
      setItems(readCart().items);
    }

    syncCart();
    window.addEventListener("debroder-cart-updated", syncCart);
    return () => window.removeEventListener("debroder-cart-updated", syncCart);
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    let isActive = true;

    async function revalidate() {
      const response = await fetch("/api/cart/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_variant_size_id: item.product_variant_size_id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            price_tier_id: item.price_tier?.tier_id ?? null
          }))
        })
      });

      if (!response.ok || !isActive) {
        return;
      }

      const payload = (await response.json()) as { items?: RevalidationResult[] };
      const nextWarnings =
        payload.items
          ?.filter((item) => item.status !== "ok")
          .map((item) => item.message ?? "Data produk berubah.") ?? [];

      setWarnings(nextWarnings);
    }

    void revalidate();
    return () => {
      isActive = false;
    };
  }, [items]);

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);
  const serviceSubtotal = useMemo(() => getCartServiceSubtotal(items), [items]);
  const estimatedTotal = useMemo(() => getCartEstimatedTotal(items), [items]);
  const totalQuantity = useMemo(() => getCartQuantity(items), [items]);

  function updateQuantity(productVariantSizeId: string, quantity: number) {
    const nextWarnings = setCartItemQuantity(productVariantSizeId, quantity);
    setWarnings(nextWarnings);
    setItems(readCart().items);
  }

  function removeItem(productVariantSizeId: string) {
    removeCartItem(productVariantSizeId);
    setItems(readCart().items);
  }

  function emptyCart() {
    clearCart();
    setItems([]);
    setWarnings([]);
  }

  if (items.length === 0) {
    return (
      <div className="notice">
        Keranjang kosong. Pilih produk dari katalog untuk mulai membuat pesanan.
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <section className="cart-list" aria-label="Isi keranjang">
        {warnings.length > 0 ? (
          <div className="notice warning">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {items.map((item) => (
          <article className="cart-line" key={item.product_variant_size_id}>
            {item.thumbnail ? (
              <img src={item.thumbnail} alt={`${item.nama_produk} ${item.warna}`} />
            ) : (
              <div />
            )}
            <div className="cart-meta">
              <strong>{item.nama_produk}</strong>
              <span className="muted">
                {item.warna} / {item.ukuran} - {item.sku}
              </span>
              <span>{formatRupiah(item.unit_price)} / pcs</span>
              {item.services && item.services.length > 0 ? (
                <span className="muted">
                  {item.services
                    .map((service) => service.service_name)
                    .join(", ")}
                </span>
              ) : null}
            </div>
            <div className="control-row">
              <input
                className="quantity-input"
                min={1}
                max={item.stock_snapshot}
                onChange={(event) =>
                  updateQuantity(
                    item.product_variant_size_id,
                    Number(event.target.value)
                  )
                }
                type="number"
                value={item.quantity}
              />
              <button
                className="danger-button"
                onClick={() => removeItem(item.product_variant_size_id)}
                type="button"
              >
                Hapus
              </button>
            </div>
          </article>
        ))}
      </section>

      <aside className="summary-box">
        <h2 className="section-title">Ringkasan</h2>
        <div className="control-row" style={{ justifyContent: "space-between" }}>
          <span>Total item</span>
          <strong>{totalQuantity} pcs</strong>
        </div>
        <div className="control-row" style={{ justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <strong>{formatRupiah(subtotal)}</strong>
        </div>
        <div className="control-row" style={{ justifyContent: "space-between" }}>
          <span>Custom</span>
          <strong>{formatRupiah(serviceSubtotal)}</strong>
        </div>
        <div className="control-row" style={{ justifyContent: "space-between" }}>
          <span>Total estimasi</span>
          <strong>{formatRupiah(estimatedTotal)}</strong>
        </div>
        <a
          className="primary-button"
          href={buildWhatsAppUrl(items)}
          rel="noreferrer"
          target="_blank"
        >
          Kirim WhatsApp
        </a>
        <button className="secondary-button" onClick={emptyCart} type="button">
          Kosongkan
        </button>
      </aside>
    </div>
  );
}
