"use client";

import type { CartItem, CartState } from "@/lib/types";
import {
  CART_STORAGE_KEY,
  CART_VERSION,
  createEmptyCart,
  mergeCartItems,
  updateCartItemQuantity
} from "@/lib/cart/operations";

export function readCart(): CartState {
  if (typeof window === "undefined") {
    return createEmptyCart();
  }

  const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!rawCart) {
    return createEmptyCart();
  }

  try {
    const parsed = JSON.parse(rawCart) as Partial<CartState>;
    if (parsed.version !== CART_VERSION || !Array.isArray(parsed.items)) {
      return createEmptyCart();
    }

    return {
      version: CART_VERSION,
      items: parsed.items,
      updated_at: parsed.updated_at ?? new Date().toISOString()
    };
  } catch {
    return createEmptyCart();
  }
}

export function writeCart(items: CartItem[]): CartState {
  const cart: CartState = {
    version: CART_VERSION,
    items,
    updated_at: new Date().toISOString()
  };

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("debroder-cart-updated"));
  return cart;
}

export function addItemsToCart(items: CartItem[]): string[] {
  const cart = readCart();
  const result = mergeCartItems(cart.items, items);
  writeCart(result.items);
  return result.warnings;
}

export function setCartItemQuantity(
  productVariantSizeId: string,
  quantity: number
): string[] {
  const cart = readCart();
  const result = updateCartItemQuantity(cart.items, productVariantSizeId, quantity);
  writeCart(result.items);
  return result.warnings;
}

export function removeCartItem(productVariantSizeId: string): void {
  const cart = readCart();
  writeCart(
    cart.items.filter(
      (item) => item.product_variant_size_id !== productVariantSizeId
    )
  );
}

export function clearCart(): void {
  writeCart([]);
}

