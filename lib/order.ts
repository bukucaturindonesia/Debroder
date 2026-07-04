import type { Product } from "@/lib/types";

export function productOrderHref(product: Product) {
  const reference = product.id || product.slug || product.nama;
  return `/order?product=${encodeURIComponent(reference)}`;
}
