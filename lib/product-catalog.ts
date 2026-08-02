import type { Product } from "@/lib/types";

export function catalogColumnsForWidth(
  width: number,
  layout: "default" | "kaos-editorial" = "default"
) {
  if (layout === "kaos-editorial" && width >= 768) return 3;
  if (width < 1024) return 2;
  return layout === "kaos-editorial" ? 3 : 4;
}

export function initialCatalogBatch(columns: number) {
  void columns;
  return 12;
}

export function nextCatalogBatch(current: number, columns: number, total: number) {
  void columns;
  return Math.min(total, current + 12);
}

export function uniqueCatalogProducts(products: Product[]) {
  const unique = new Map<string, Product>();

  products.forEach((product) => {
    const key = product.id || product.slug || product.nama;
    if (!unique.has(key)) unique.set(key, product);
  });

  return Array.from(unique.values());
}
