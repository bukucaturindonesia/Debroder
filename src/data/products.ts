export type BrochureProduct = {
  slug: "nsa-premium" | "cotton-combed-24s";
  name: string;
  description: string;
  detail: string;
  image: string;
  imageAlt: string;
};

// Owner-approved first-launch state: no editorial products are public yet.
// The canonical PIM-backed /produk/[slug] route remains unchanged.
export const brochureProducts: readonly BrochureProduct[] = [];

export function getBrochureProduct(slug: string) {
  return brochureProducts.find((product) => product.slug === slug);
}
