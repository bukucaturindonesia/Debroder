"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/components/CartProvider";

export function StorefrontCartBoundary({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
