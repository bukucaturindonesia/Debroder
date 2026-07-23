import type { ProductReadSource } from "@/lib/product-read/source";

export type ProductDetailContactRow = {
  whatsapp_link: string | null;
  whatsapp_utama: string | null;
};

export type ProductDetailPageSource = {
  status: "ready" | "not_found" | "unavailable";
  productSource: ProductReadSource;
  relatedSource: ProductReadSource;
  contact: ProductDetailContactRow | null;
  customDestination: string | null;
};
