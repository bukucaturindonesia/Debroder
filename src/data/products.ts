export type BrochureProduct = {
  slug: "nsa-premium" | "cotton-combed-24s";
  name: string;
  description: string;
  detail: string;
  image: string;
  imageAlt: string;
  imageCaption: string;
  priceFrom?: number;
};

// Owner's zero-product release contract. Product presentation stays empty
// until a separately approved publication decision is made.
export const brochureProducts: readonly BrochureProduct[] = [];

export function getBrochureProduct(slug: string) {
  return brochureProducts.find((product) => product.slug === slug);
}
