export type BrochureProduct = {
  slug: "nsa-premium" | "cotton-combed-24s";
  name: string;
  description: string;
  detail: string;
  image: string;
  imageAlt: string;
};

// These are editorial placeholders, not PIM sellables or evidence of material specifications.
export const brochureProducts: readonly BrochureProduct[] = [
  {
    slug: "nsa-premium",
    name: "NSA PREMIUM",
    description: "Kain premium dengan tekstur lembut dan nyaman untuk berbagai kebutuhan apparel.",
    detail: "Pilihan bahan untuk kebutuhan apparel Anda. Konsultasikan warna, ketersediaan, dan kebutuhan produksi langsung dengan tim DEBRODER.",
    image: "/products/3600-soft-tee/primary.webp",
    imageAlt: "Visual referensi kaos polos hitam; foto bahan NSA Premium menyusul"
  },
  {
    slug: "cotton-combed-24s",
    name: "COTTON COMBED 24s",
    description: "Cotton combed yang lembut, nyaman, dan cocok untuk kebutuhan kaos berkualitas.",
    detail: "Bahan kaos untuk berbagai kebutuhan brand dan komunitas. Tanyakan opsi warna, ketersediaan, dan proses produksi sebelum memesan.",
    image: "/product-images-source/KAOS POLOS/87-White.webp",
    imageAlt: "Visual referensi kaos polos putih; foto Cotton Combed 24s menyusul"
  }
];

export function getBrochureProduct(slug: string) {
  return brochureProducts.find((product) => product.slug === slug);
}
