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

// Owner's 2026-09-28 V1 inquiry catalogue. No SKU, stock or invented pricing.
// Replace reference images here with approved 2000×2500 product photography.
// These editorial entries do not create or alter PIM products or sellables.
export const brochureProducts: readonly BrochureProduct[] = [
  {
    slug: "nsa-premium",
    name: "NSA Premium",
    description: "Mulai kebutuhan apparel Anda dengan NSA Premium.",
    detail: "Ceritakan kebutuhan bahan, ukuran, warna, dan jumlah kepada tim. Spesifikasi, harga, serta ketersediaan dikonfirmasi sebelum pemesanan.",
    image: "/products/3600-soft-tee/primary.webp",
    imageAlt: "Referensi kaos hitam; bukan foto produk NSA Premium",
    imageCaption: "Visual referensi · foto produk menyusul"
  },
  {
    slug: "cotton-combed-24s",
    name: "Cotton Combed 24s",
    description: "Pilihan untuk kebutuhan kaos brand, komunitas, dan kegiatan Anda.",
    detail: "Diskusikan pilihan ukuran, warna, dan jumlah yang Anda perlukan. Detail bahan, harga, serta ketersediaan dikonfirmasi bersama tim sebelum pemesanan.",
    image: "/product-images-source/KAOS POLOS/87-White.webp",
    imageAlt: "Referensi kaos putih; bukan foto produk Cotton Combed 24s",
    imageCaption: "Visual referensi · foto produk menyusul"
  }
];

export function getBrochureProduct(slug: string) {
  return brochureProducts.find((product) => product.slug === slug);
}
