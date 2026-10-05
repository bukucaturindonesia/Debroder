import { brochureProducts } from "@/src/data/products";

// Public V1 inquiry catalogue is explicitly allowlisted; PIM/transaction pages
// stay gated until their separate release. Never allow arbitrary product slugs.
export const PUBLIC_PRODUCT_DETAILS_ENABLED = false;

export const RELEASE_PUBLIC_PATHS = new Set([
  "/", "/produk", "/layanan", "/tentang", "/kontak",
  ...brochureProducts.map((product) => `/produk/${product.slug}`)
]);
