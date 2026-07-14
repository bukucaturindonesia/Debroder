import type { Product } from "@/lib/types";

export function catalogColumnsForWidth(width: number) {
  return width >= 1024 ? 4 : 2;
}

export function initialCatalogBatch(columns: number) {
  return Math.max(2, columns) * 2;
}

export function nextCatalogBatch(current: number, columns: number, total: number) {
  return Math.min(total, current + Math.max(2, columns));
}

export function uniqueCatalogProducts(products: Product[]) {
  const unique = new Map<string, Product>();

  products.forEach((product) => {
    const key = product.id || product.slug || product.nama;
    if (!unique.has(key)) unique.set(key, product);
  });

  return Array.from(unique.values());
}
