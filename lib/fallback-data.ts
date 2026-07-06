import type {
  AboutContent,
  ContactSettings,
  HeroBanner,
  InstagramBanner,
  OrderStep,
  PageHeroContent,
  Product,
  ProductFilter,
  PublicContent,
  Service,
  ServiceCategory,
  Store,
  Testimonial,
  TrustAboutContent
} from "@/lib/types";
import { contactLinks, storeContacts } from "@/lib/contact";
import { LANDING_SECTION_DEFAULTS } from "@/lib/homepage-settings";
import { whatsappLinkWithMessage } from "@/lib/url";

export const fallbackImages = {
  hero: "/images/debroder/hero/hero-1.jpg",
  heroMobile: "/images/debroder/hero/hero-1-mobile.jpg",
  heroSecondary: "/images/debroder/hero/hero-2.jpg",
  heroSecondaryMobile: "/images/debroder/hero/hero-2-mobile.jpg",
  pageHero: "/images/debroder/fallback/fallback-page-hero.jpg",
  pageHeroMobile: "/images/debroder/fallback/fallback-page-hero-mobile.jpg",
  product: "/images/debroder/fallback/fallback-product.jpg",
  banner: "/images/debroder/fallback/fallback-banner.jpg",
  bannerMobile: "/images/debroder/fallback/fallback-banner-mobile.jpg",
  store: "/images/debroder/fallback/fallback-store.jpg",
  benefit: "/images/debroder/fallback/fallback-product.jpg"
} as const;

export const fallbackProductFilters: ProductFilter[] = [
  { filter_type: "collection", name: "Semua Produk", slug: "semua-produk", urutan: 1, status_aktif: true },
  { filter_type: "collection", name: "Best Seller", slug: "best-seller", urutan: 2, status_aktif: true },
  { filter_type: "collection", name: "New Arrival", slug: "new-arrival", urutan: 3, status_aktif: true },
  { filter_type: "color", name: "Putih", slug: "putih", color_hex: "#ffffff", urutan: 1, status_aktif: true },
  { filter_type: "color", name: "Hitam", slug: "hitam", color_hex: "#111111", urutan: 2, status_aktif: true },
  { filter_type: "color", name: "Navy", slug: "navy", color_hex: "#172554", urutan: 3, status_aktif: true },
  { filter_type: "size", name: "S", slug: "s", urutan: 1, status_aktif: true },
  { filter_type: "size", name: "M", slug: "m", urutan: 2, status_aktif: true },
  { filter_type: "size", name: "L", slug: "l", urutan: 3, status_aktif: true },
  { filter_type: "size", name: "XL", slug: "xl", urutan: 4, status_aktif: true },
  { filter_type: "material", name: "Cotton Combed 24s", slug: "cotton-combed-24s", urutan: 1, status_aktif: true },
  { filter_type: "material", name: "Cotton Combed 30s", slug: "cotton-combed-30s", urutan: 2, status_aktif: true },
  { filter_type: "brand", name: "NSA", slug: "nsa", urutan: 1, status_aktif: true }
  ,{ filter_type: "price", name: "Di bawah Rp 50.000", slug: "di-bawah-50000", min_price: 0, max_price: 50000, urutan: 1, status_aktif: true }
  ,{ filter_type: "price", name: "Rp 50.000 ke atas", slug: "mulai-50000", min_price: 50000, max_price: null, urutan: 2, status_aktif: true }
];

export const storeImageFallbacks: Record<string, string> = {
  "STORE PETTARANI": "/images/debroder/stores/store-pettarani.jpg",
  "STORE TELLO": "/images/debroder/stores/store-tello.jpg",
  "STORE LANDAK": "/images/debroder/stores/store-landak.jpg",
  "STORE PAREPARE": "/images/debroder/stores/store-parepare.jpg"
};

export const productImageFallbacks: Record<string, string> = {
  "Kaos Polos New State Apparel":
    "/images/debroder/products/produk-kaos-polos.jpg",
  "Kaos Polos Import": "/images/debroder/products/produk-kaos-polos.jpg",
  "Kaos Polos Cotton Combed":
    "/images/debroder/products/produk-kaos-polos.jpg",
  "Kaos Cotton Combed": "/images/debroder/products/produk-kaos-polos.jpg",
  "Distributor Kaos NSA":
    "/images/debroder/products/produk-kaos-polos.jpg",
  "Sablon DTF Custom": "/images/debroder/products/produk-sablon-dtf.jpg",
  "Custom Jersey": "/images/debroder/products/produk-jersey.jpg",
  "Maklon DTF": "/images/debroder/products/produk-maklon-dtf.jpg",
  "Cetak Sublim": "/images/debroder/products/produk-cetak-sublim.jpg"
};

export const pageHeroImageFallbacks: Record<string, string> = {
  koleksi: "/images/debroder/page-heroes/hero-1.jpg",
  "kaos-polos": "/images/debroder/page-heroes/hero-kaos-polos.jpg",
  "jaket-hoodie": "/images/debroder/page-heroes/hero-jaket-hoodie.jpg",
  headwear: "/images/debroder/page-heroes/hero-headwear.jpg",
  "sablon-dtf": "/images/debroder/page-heroes/hero-sablon-dtf.jpg",
  "maklon-dtf": "/images/debroder/page-heroes/hero-maklon-dtf.jpg",
  jersey: "/images/debroder/page-heroes/hero-jersey.jpg",
  "cetak-sublim": "/images/debroder/page-heroes/hero-cetak-sublim.jpg",
  store: "/images/debroder/page-heroes/hero-store.jpg",
  "cara-order": "/images/debroder/page-heroes/hero-cara-order.jpg"
};

export const pageHeroMobileImageFallbacks: Record<string, string> = {
  koleksi: "/images/debroder/page-heroes/hero-1-mobile.jpg",
  "kaos-polos": "/images/debroder/page-heroes/hero-kaos-polos-mobile.jpg",
  "jaket-hoodie": "/images/debroder/page-heroes/hero-jaket-hoodie-mobile.jpg",
  headwear: "/images/debroder/page-heroes/hero-headwear-mobile.jpg",
  "sablon-dtf": "/images/debroder/page-heroes/hero-sablon-dtf-mobile.jpg",
  "maklon-dtf": "/images/debroder/page-heroes/hero-maklon-dtf-mobile.jpg",
  jersey: "/images/debroder/page-heroes/hero-jersey-mobile.jpg",
  "cetak-sublim": "/images/debroder/page-heroes/hero-cetak-sublim-mobile.jpg",
  store: "/images/debroder/page-heroes/hero-store-mobile.jpg",
  "cara-order": "/images/debroder/page-heroes/hero-cara-order-mobile.jpg"
};

export function getStoreImage(store: Pick<Store, "nama_store" | "image_url">) {
  return (
    store.image_url ||
    storeImageFallbacks[store.nama_store] ||
    fallbackImages.store
  );
}

export function getProductImage(
  product: Pick<Product, "nama" | "image_url" | "gambar_url">
) {
  return (
    product.image_url ||
    product.gambar_url ||
    productImageFallbacks[product.nama] ||
    fallbackImages.product
  );
}

export function getPageHeroImage(
  pageHero: Pick<PageHeroContent, "page_key" | "image_url"> | null | undefined
) {
  return (
    pageHero?.image_url ||
    (pageHero?.page_key ? pageHeroImageFallbacks[pageHero.page_key] : "") ||
    fallbackImages.pageHero
  );
}

export const fallbackHeroes: HeroBanner[] = [
  {
    badge: "KAOS POLOS NEW STATE APPAREL",
    headline: "KAOS POLOS NEW STATE APPAREL",
    subheadline: "Sablon DTF, Jersey, dan Custom Apparel",
    title: "KAOS POLOS NEW STATE APPAREL",
    subtitle: "Sablon DTF, Jersey, dan Custom Apparel",
    cta_primary_text: "Beli Sekarang",
    cta_primary_link: "/koleksi",
    cta_secondary_text: "",
    cta_secondary_link: "",
    cta_text: "Beli Sekarang",
    cta_link: "/koleksi",
    image_url: fallbackImages.hero,
    mobile_image_url: fallbackImages.heroMobile,
    object_position: "center center",
    mobile_object_position: "center center",
    urutan: 1,
    status_aktif: true
  },
  {
    badge: "SABLON DTF",
    headline: "SABLON DTF",
    subheadline: "Custom Jersey, Maklon DTF, dan Cetak Sublim",
    title: "SABLON DTF",
    subtitle: "Custom Jersey, Maklon DTF, dan Cetak Sublim",
    cta_primary_text: "Konsultasi",
    cta_primary_link: "/sablon-dtf",
    cta_secondary_text: "",
    cta_secondary_link: "",
    cta_text: "Konsultasi",
    cta_link: "/sablon-dtf",
    image_url: fallbackImages.heroSecondary,
    mobile_image_url: fallbackImages.heroSecondaryMobile,
    object_position: "center center",
    mobile_object_position: "center center",
    urutan: 2,
    status_aktif: true
  }
];

export const fallbackHero: HeroBanner = fallbackHeroes[0];

export const fallbackAbout: AboutContent = {
  label: "TENTANG KAMI",
  title: "Tentang Kami",
  body: "De Broder adalah perusahaan percetakan yang berdiri sejak tahun 2016. Kami fokus mengerjakan:\n\nSablon Kaos\nCustom Jersey\nMaklon DTF\nCetak Sublim\nDistributor Kaos NSA\nKaos Cotton Combed\n\nKami telah dipercaya oleh berbagai perusahaan, instansi, dan event besar di Indonesia Timur, khususnya di kota Makassar.",
  highlights: [
    "Sablon Kaos",
    "Custom Jersey",
    "Maklon DTF",
    "Cetak Sublim",
    "Distributor Kaos NSA",
    "Kaos Cotton Combed"
  ],
  status_aktif: true
};

export const aboutServiceList = [
  "Sablon Kaos",
  "Custom Jersey",
  "Maklon DTF",
  "Cetak Sublim",
  "Distributor Kaos NSA",
  "Kaos Cotton Combed"
];

export const fallbackCategories: ServiceCategory[] = [
  {
    nama_kategori: "Kaos Polos",
    deskripsi: "Kaos polos premium untuk brand, komunitas, dan kebutuhan harian",
    gambar_url: "/images/debroder/products/produk-kaos-polos.jpg",
    link_slug: "kaos-polos",
    urutan: 1,
    status_aktif: true
  },
  {
    nama_kategori: "Polo Shirt",
    deskripsi: "Polo rapi untuk bisnis, seragam, dan komunitas",
    gambar_url: "/images/debroder/products/produk-kaos-polos.jpg",
    link_slug: "koleksi",
    urutan: 2,
    status_aktif: true
  },
  {
    nama_kategori: "Jacket",
    deskripsi: "Jacket custom untuk tim, organisasi, dan brand",
    gambar_url: "/images/debroder/products/produk-kaos-polos.jpg",
    link_slug: "koleksi",
    urutan: 3,
    status_aktif: true
  },
  {
    nama_kategori: "Hoodie",
    deskripsi: "Hoodie nyaman untuk merchandise dan koleksi brand",
    gambar_url: "/images/debroder/products/produk-kaos-polos.jpg",
    link_slug: "koleksi",
    urutan: 4,
    status_aktif: true
  },
  {
    nama_kategori: "Kaos Cotton Combed",
    deskripsi: "Cotton combed lembut untuk custom dan kebutuhan brand",
    gambar_url: "/images/debroder/products/produk-kaos-polos.jpg",
    link_slug: "kaos-polos",
    urutan: 5,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey",
    deskripsi: "Jersey custom untuk tim, sekolah, komunitas, dan instansi",
    gambar_url: "/images/debroder/products/produk-jersey.jpg",
    link_slug: "jersey",
    urutan: 6,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Futsal",
    deskripsi: "Jersey ringan untuk tim futsal, turnamen, dan komunitas.",
    gambar_url: "/images/debroder/products/produk-jersey.jpg",
    image_alt: "Jersey futsal custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-futsal",
    link_slug: "jersey",
    color_options: ["Warna custom sesuai desain"],
    collar_options: ["O-neck", "V-neck"],
    sleeve_options: ["Pendek", "Panjang"],
    material_options: ["Dryfit", "Milano"],
    size_chart: ["S", "M", "L", "XL", "XXL"],
    faq_items: ["Minimum order? Konsultasikan jumlah pesanan melalui WhatsApp."],
    urutan: 7,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Sepak Bola",
    deskripsi: "Jersey custom lengkap untuk klub, sekolah, dan kompetisi.",
    gambar_url: "/images/debroder/products/produk-jersey.jpg",
    image_alt: "Jersey sepak bola custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-sepak-bola",
    link_slug: "jersey",
    color_options: ["Warna custom sesuai desain"],
    collar_options: ["O-neck", "V-neck", "Polo"],
    sleeve_options: ["Pendek", "Panjang"],
    material_options: ["Dryfit", "Milano"],
    size_chart: ["S", "M", "L", "XL", "XXL"],
    faq_items: ["Bisa pakai nama dan nomor? Bisa, detail dapat dibuat untuk setiap pemain."],
    urutan: 8,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Esports",
    deskripsi: "Jersey esports penuh warna untuk roster, komunitas, dan event.",
    gambar_url: "/images/debroder/products/produk-jersey.jpg",
    image_alt: "Jersey esports custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-esports",
    link_slug: "jersey",
    color_options: ["Warna custom sesuai identitas tim"],
    collar_options: ["O-neck", "V-neck", "Polo"],
    sleeve_options: ["Pendek", "Panjang"],
    material_options: ["Dryfit", "Milano"],
    size_chart: ["S", "M", "L", "XL", "XXL"],
    faq_items: ["Apakah desain dibantu? Tim dapat mengarahkan penyesuaian desain sebelum produksi."],
    urutan: 9,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Sepeda",
    deskripsi: "Jersey sepeda custom dengan pilihan lengan dan detail tim.",
    gambar_url: "/images/debroder/products/produk-jersey.jpg",
    image_alt: "Jersey sepeda custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-sepeda",
    link_slug: "jersey",
    color_options: ["Warna custom sesuai desain"],
    collar_options: ["Kerah rendah", "Kerah tinggi"],
    sleeve_options: ["Pendek", "Panjang"],
    material_options: ["Dryfit", "Microfiber"],
    size_chart: ["S", "M", "L", "XL", "XXL"],
    faq_items: ["Bisa menambah saku belakang? Detail model dapat dikonsultasikan sebelum produksi."],
    urutan: 10,
    status_aktif: true
  },
  ...[
    ["Jersey Badminton", "Jersey fleksibel untuk klub badminton dan turnamen."],
    ["Jersey Basket", "Jersey basket custom untuk tim, sekolah, dan kompetisi."],
    ["Jersey Voli", "Jersey voli custom untuk klub, komunitas, dan event."],
    ["Jersey Running", "Jersey running ringan untuk komunitas dan race event."],
    ["Jersey Fishing", "Jersey fishing custom untuk komunitas dan kegiatan luar ruang."],
    ["Jersey Touring", "Jersey touring custom untuk klub dan perjalanan komunitas."],
    ["Jersey Komunitas", "Jersey identitas untuk komunitas, organisasi, dan gathering."],
    ["Jersey Event", "Jersey custom untuk panitia, peserta, dan merchandise event."]
  ].map(([name, description], index): ServiceCategory => ({
    nama_kategori: name,
    deskripsi: description,
    gambar_url: "/images/debroder/products/produk-jersey.jpg",
    image_alt: `${name} custom DE BRODER`,
    category_key: "jersey",
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    link_slug: "jersey",
    color_options: ["Warna custom sesuai desain"],
    collar_options: ["O-neck", "V-neck", "Polo"],
    sleeve_options: ["Pendek", "Panjang"],
    material_options: ["Dryfit", "Milano"],
    size_chart: ["S", "M", "L", "XL", "XXL"],
    faq_items: ["Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp."],
    urutan: index + 11,
    status_aktif: true
  }))
];

export const fallbackServices: Service[] = [
  {
    nama: "Sablon DTF",
    slug: "sablon-dtf",
    deskripsi: "Hasil tajam dan fleksibel untuk kaos, brand, serta komunitas.",
    image_url: "/images/debroder/products/produk-sablon-dtf.jpg",
    image_alt: "Sablon DTF custom DE BRODER",
    category_key: "sablon-dtf",
    detail_body: "Sablon DTF penuh warna untuk kaos custom, brand, komunitas, event, dan produksi satuan maupun partai.",
    available_sizes: ["A4", "A3", "Lebar maksimal 58 cm"],
    faq_items: ["Bisa satuan? Bisa, kebutuhan jumlah dapat dikonsultasikan melalui WhatsApp."],
    production_estimate: "Estimasi mengikuti jumlah dan antrean produksi.",
    harga_mulai: 5000,
    urutan: 1,
    status_aktif: true
  },
  {
    nama: "Sablon DTF Ukuran A4",
    slug: "sablon-dtf-a4",
    deskripsi: "Pilihan praktis untuk logo, desain dada, dan artwork berukuran kecil.",
    image_url: "/images/debroder/products/produk-sablon-dtf.jpg",
    image_alt: "Sablon DTF ukuran A4 DE BRODER",
    category_key: "sablon-dtf",
    detail_body: "Cocok untuk desain depan, belakang, logo komunitas, dan kebutuhan custom dengan bidang cetak hingga A4.",
    available_sizes: ["Maksimal A4"],
    faq_items: ["File apa yang disarankan? Gunakan PNG transparan beresolusi tinggi atau file desain siap cetak."],
    production_estimate: "Mulai 1 hari kerja, menyesuaikan jumlah.",
    harga_mulai: 5000,
    urutan: 2,
    status_aktif: true
  },
  {
    nama: "Sablon DTF Ukuran A3",
    slug: "sablon-dtf-a3",
    deskripsi: "Bidang cetak lebih besar untuk desain utama pada apparel.",
    image_url: "/images/debroder/products/produk-sablon-dtf.jpg",
    image_alt: "Sablon DTF ukuran A3 DE BRODER",
    category_key: "sablon-dtf",
    detail_body: "Pilihan untuk artwork besar dengan detail warna tajam pada kaos dan apparel berbahan sesuai rekomendasi produksi.",
    available_sizes: ["Maksimal A3"],
    faq_items: ["Apakah bisa penuh warna? Bisa, hasil mengikuti kualitas dan profil warna file desain."],
    production_estimate: "Mulai 1 hari kerja, menyesuaikan jumlah.",
    harga_mulai: 10000,
    urutan: 3,
    status_aktif: true
  },
  {
    nama: "Sablon DTF Meteran",
    slug: "sablon-dtf-meteran",
    deskripsi: "Efisien untuk banyak desain dan kebutuhan produksi apparel.",
    image_url: "/images/debroder/products/produk-sablon-dtf.jpg",
    image_alt: "Sablon DTF meteran DE BRODER",
    category_key: "sablon-dtf",
    detail_body: "Layanan cetak lembaran meteran untuk brand, reseller, dan produksi dengan banyak artwork dalam satu susunan desain.",
    available_sizes: ["Lebar maksimal 58 cm", "Panjang sesuai kebutuhan"],
    faq_items: ["Apakah file bisa disusun? Susunan artwork dapat dikonsultasikan sebelum cetak."],
    production_estimate: "Estimasi mengikuti panjang cetak dan antrean produksi.",
    harga_mulai: 35000,
    urutan: 4,
    status_aktif: true
  },
  {
    nama: "Custom Jersey",
    slug: "jersey",
    deskripsi: "Jersey custom untuk tim olahraga, sekolah, dan instansi.",
    image_url: "/images/debroder/products/produk-jersey.jpg",
    harga_mulai: 75000,
    urutan: 10,
    status_aktif: true
  },
  {
    nama: "Maklon DTF",
    slug: "maklon-dtf",
    deskripsi: "Partner produksi DTF untuk reseller dan brand apparel.",
    image_url: "/images/debroder/products/produk-maklon-dtf.jpg",
    harga_mulai: 25000,
    urutan: 11,
    status_aktif: true
  },
  {
    nama: "Cetak Sublim",
    slug: "cetak-sublim",
    deskripsi: "Cetak warna menyeluruh untuk jersey dan apparel custom.",
    image_url: "/images/debroder/products/produk-cetak-sublim.jpg",
    harga_mulai: 35000,
    urutan: 12,
    status_aktif: true
  },
  {
    nama: "Kaos NSA",
    slug: "kaos-polos",
    deskripsi: "Kaos New State Apparel siap pakai atau siap custom.",
    image_url: "/images/debroder/products/produk-kaos-polos.jpg",
    harga_mulai: 45000,
    urutan: 13,
    status_aktif: true
  },
  {
    nama: "Cotton Combed",
    slug: "kaos-polos",
    deskripsi: "Kaos cotton combed nyaman untuk brand dan kebutuhan harian.",
    image_url: "/images/debroder/products/produk-kaos-polos.jpg",
    harga_mulai: 45000,
    urutan: 14,
    status_aktif: true
  }
];

export const fallbackProducts: Product[] = [
  {
    nama: "Kaos Polos New State Apparel",
    kategori: "Kaos Polos",
    badge: "",
    deskripsi:
      "Kaos polos New State Apparel untuk brand, event, dan kebutuhan harian",
    short_detail:
      "Kaos polos New State Apparel untuk brand, event, dan kebutuhan harian",
    gambar_url: "/images/debroder/products/produk-kaos-polos.jpg",
    image_url: "/images/debroder/products/produk-kaos-polos.jpg",
    image_alt: "Kaos polos New State Apparel DE BRODER",
    collection_tags: ["best-seller"],
    intent_tags: ["kaos-polos", "sablon-dtf", "komunitas", "brand-apparel"],
    color_tags: ["putih", "hitam", "navy"],
    size_tags: ["s", "m", "l", "xl"],
    material_tags: ["cotton-combed-24s"],
    brand: "NSA",
    whatsapp_link: contactLinks.whatsapp,
    link_url: "/kaos-polos",
    price: 45000,
    urutan: 1,
    status_aktif: true
  },
  {
    nama: "Kaos Cotton Combed",
    kategori: "Kaos Polos",
    badge: "",
    deskripsi: "Kaos cotton combed untuk custom dan kebutuhan brand",
    short_detail: "Kaos cotton combed untuk custom dan kebutuhan brand",
    gambar_url: "/images/debroder/products/produk-kaos-polos.jpg",
    image_url: "/images/debroder/products/produk-kaos-polos.jpg",
    image_alt: "Kaos cotton combed DE BRODER",
    collection_tags: ["new-arrival"],
    intent_tags: ["kaos-polos", "sablon-dtf", "brand-apparel"],
    color_tags: ["putih", "hitam", "navy"],
    size_tags: ["s", "m", "l", "xl"],
    material_tags: ["cotton-combed-30s"],
    brand: "DE BRODER",
    whatsapp_link: contactLinks.whatsapp,
    link_url: "/kaos-polos",
    price: 45000,
    urutan: 2,
    status_aktif: true
  },
  {
    nama: "Sablon DTF Custom",
    kategori: "Sablon DTF",
    badge: "",
    deskripsi: "Sablon DTF untuk logo, brand, dan komunitas",
    short_detail: "Sablon DTF untuk logo, brand, dan komunitas",
    gambar_url: "/images/debroder/products/produk-sablon-dtf.jpg",
    image_url: "/images/debroder/products/produk-sablon-dtf.jpg",
    intent_tags: ["sablon-dtf", "kaos-polos", "maklon-dtf"],
    whatsapp_link: contactLinks.whatsapp,
    link_url: "/sablon-dtf",
    price: 5000,
    urutan: 3,
    status_aktif: true
  },
  {
    nama: "Custom Jersey",
    kategori: "Jersey",
    badge: "",
    deskripsi: "Jersey custom untuk tim dan komunitas",
    short_detail: "Jersey custom untuk tim dan komunitas",
    gambar_url: "/images/debroder/products/produk-jersey.jpg",
    image_url: "/images/debroder/products/produk-jersey.jpg",
    intent_tags: ["jersey", "sublim", "tim", "komunitas"],
    whatsapp_link: contactLinks.whatsapp,
    link_url: "/jersey",
    price: 75000,
    urutan: 4,
    status_aktif: true
  },
  {
    nama: "Maklon DTF",
    kategori: "Maklon DTF",
    badge: "",
    deskripsi: "Produksi DTF untuk reseller dan brand apparel",
    short_detail: "Produksi DTF untuk reseller dan brand apparel",
    gambar_url: "/images/debroder/products/produk-maklon-dtf.jpg",
    image_url: "/images/debroder/products/produk-maklon-dtf.jpg",
    intent_tags: ["maklon-dtf", "reseller", "brand-apparel", "partai-besar"],
    whatsapp_link: contactLinks.whatsapp,
    link_url: "/maklon-dtf",
    price: 25000,
    urutan: 5,
    status_aktif: true
  },
  {
    nama: "Cetak Sublim",
    kategori: "Cetak Sublim",
    badge: "",
    deskripsi: "Cetak sublim untuk jersey dan apparel custom",
    short_detail: "Cetak sublim untuk jersey dan apparel custom",
    gambar_url: "/images/debroder/products/produk-cetak-sublim.jpg",
    image_url: "/images/debroder/products/produk-cetak-sublim.jpg",
    intent_tags: ["cetak-sublim", "jersey", "tim", "partai-besar"],
    whatsapp_link: contactLinks.whatsapp,
    link_url: "/cetak-sublim",
    price: 35000,
    urutan: 6,
    status_aktif: true
  },
  {
    nama: "Distributor Kaos NSA",
    kategori: "Kaos Polos",
    badge: "",
    deskripsi: "Pilihan kaos NSA untuk kebutuhan store dan produksi",
    short_detail: "Pilihan kaos NSA untuk kebutuhan store dan produksi",
    gambar_url: "/images/debroder/products/produk-kaos-polos.jpg",
    image_url: "/images/debroder/products/produk-kaos-polos.jpg",
    image_alt: "Distributor kaos NSA DE BRODER",
    collection_tags: ["best-seller"],
    intent_tags: ["kaos-polos", "grosir", "brand-apparel"],
    color_tags: ["putih", "hitam", "navy"],
    size_tags: ["s", "m", "l", "xl"],
    material_tags: ["cotton-combed-24s"],
    brand: "NSA",
    whatsapp_link: contactLinks.whatsapp,
    link_url: "/kaos-polos",
    urutan: 7,
    status_aktif: true
  }
];

export const fallbackStores: Store[] = storeContacts.map((store, index) => ({
  nama_store: store.name,
  layanan_utama: store.service,
  alamat: store.address,
  whatsapp: store.whatsapp,
  whatsapp_link: whatsappLinkWithMessage(
    store.whatsappLink,
    `Halo DE BRODER, saya ingin bertanya tentang layanan di Store ${store.name}.`
  ),
  maps_link: store.mapsLink,
  image_url: storeImageFallbacks[store.name],
  urutan: index + 1,
  status_aktif: true
}));

export const fallbackInstagramBanner: InstagramBanner = {
  title: "Instagram DE BRODER",
  image_url: fallbackImages.banner,
  mobile_image_url: fallbackImages.bannerMobile,
  link_url: contactLinks.instagram,
  object_position: "center center",
  mobile_object_position: "center center",
  status_aktif: true
};

export const fallbackPageHeroes: PageHeroContent[] = [
  {
    page_key: "koleksi",
    label: "KOLEKSI",
    title: "Layanan & Produk DE BRODER",
    subtitle:
      "Temukan kebutuhan apparel, sablon, jersey, dan layanan custom dalam satu tempat.",
    image_url: pageHeroImageFallbacks.koleksi,
    mobile_image_url: pageHeroMobileImageFallbacks.koleksi,
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  },
  {
    page_key: "kaos-polos",
    label: "KAOS POLOS",
    title: "Kaos Polos New State Apparel & Cotton Combed",
    subtitle:
      "Pilihan kaos polos untuk brand, komunitas, event, dan kebutuhan harian.",
    image_url: pageHeroImageFallbacks["kaos-polos"],
    mobile_image_url: pageHeroMobileImageFallbacks["kaos-polos"],
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  },
  {
    page_key: "jaket-hoodie",
    label: "JAKET & HOODIE",
    title: "Jaket & Hoodie Custom",
    subtitle:
      "Pilihan jaket dan hoodie untuk brand, komunitas, event, dan kebutuhan harian.",
    image_url: pageHeroImageFallbacks["jaket-hoodie"],
    mobile_image_url: pageHeroMobileImageFallbacks["jaket-hoodie"],
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  },
  {
    page_key: "headwear",
    label: "HEADWEAR",
    title: "Headwear Custom",
    subtitle:
      "Topi dan headwear untuk brand, komunitas, event, dan kebutuhan merchandise.",
    image_url: pageHeroImageFallbacks.headwear,
    mobile_image_url: pageHeroMobileImageFallbacks.headwear,
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  },
  {
    page_key: "sablon-dtf",
    label: "SABLON DTF",
    title: "Sablon DTF untuk Apparel Custom",
    subtitle:
      "Hasil sablon rapi untuk logo, desain brand, komunitas, dan produksi apparel.",
    image_url: pageHeroImageFallbacks["sablon-dtf"],
    mobile_image_url: pageHeroMobileImageFallbacks["sablon-dtf"],
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  },
  {
    page_key: "maklon-dtf",
    label: "MAKLON DTF",
    title: "Maklon DTF untuk Kebutuhan Produksi",
    subtitle:
      "Layanan produksi DTF untuk reseller, brand apparel, dan kebutuhan bisnis.",
    image_url: pageHeroImageFallbacks["maklon-dtf"],
    mobile_image_url: pageHeroMobileImageFallbacks["maklon-dtf"],
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  },
  {
    page_key: "jersey",
    label: "CUSTOM JERSEY",
    title: "Jersey Custom untuk Tim dan Komunitas",
    subtitle:
      "Produksi jersey untuk tim olahraga, sekolah, instansi, dan event.",
    image_url: pageHeroImageFallbacks.jersey,
    mobile_image_url: pageHeroMobileImageFallbacks.jersey,
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  },
  {
    page_key: "cetak-sublim",
    label: "CETAK SUBLIM",
    title: "Cetak Sublim untuk Apparel Custom",
    subtitle:
      "Cetak sublim untuk jersey dan apparel custom dengan hasil rapi.",
    image_url: pageHeroImageFallbacks["cetak-sublim"],
    mobile_image_url: pageHeroMobileImageFallbacks["cetak-sublim"],
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  },
  {
    page_key: "store",
    label: "STORE",
    title: "Temukan Store DE BRODER Terdekat",
    subtitle: "Pettarani, Tello, Landak, dan Parepare.",
    image_url: pageHeroImageFallbacks.store,
    mobile_image_url: pageHeroMobileImageFallbacks.store,
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  },
  {
    page_key: "cara-order",
    label: "CARA ORDER",
    title: "Cara Order di DE BRODER",
    subtitle: "Alur singkat untuk konsultasi dan memesan kebutuhan apparel.",
    image_url: pageHeroImageFallbacks["cara-order"],
    mobile_image_url: pageHeroMobileImageFallbacks["cara-order"],
    object_position: "center center",
    mobile_object_position: "center center",
    status_aktif: true
  }
];

export const fallbackOrderSteps: OrderStep[] = [
  {
    title: "Pilih layanan",
    description: "Tentukan kebutuhan apparel, sablon, jersey, atau custom.",
    urutan: 1,
    status_aktif: true
  },
  {
    title: "Konsultasi kebutuhan",
    description: "Diskusikan bahan, desain, jumlah, ukuran, dan estimasi.",
    urutan: 2,
    status_aktif: true
  },
  {
    title: "Kirim desain/detail",
    description: "Kirim file, logo, referensi, atau detail pesanan.",
    urutan: 3,
    status_aktif: true
  },
  {
    title: "Proses produksi",
    description: "Pesanan diproses sesuai detail yang disepakati.",
    urutan: 4,
    status_aktif: true
  },
  {
    title: "Ambil di store",
    description: "Ambil pesanan di store DE BRODER pilihan Anda.",
    urutan: 5,
    status_aktif: true
  }
];

export const fallbackTrustAbout: TrustAboutContent = {
  trust_items: [
    "Berdiri sejak 2016",
    "Store Makassar & Parepare",
    "Sablon DTF",
    "Custom Jersey",
    "Maklon DTF"
  ],
  about_body: fallbackAbout.body,
  status_aktif: true
};

export const fallbackTestimonials: Testimonial[] = [
  {
    nama: "Komunitas Olahraga Makassar",
    sumber: "Custom jersey",
    isi_testimoni:
      "Pesanan jersey rapi, komunikasinya jelas, dan hasilnya sesuai kebutuhan tim.",
    urutan: 1,
    status_aktif: true
  }
];

export const fallbackContact: ContactSettings = {
  email: "debroderapparel@gmail.com",
  whatsapp_utama: "0853-5533-3364",
  whatsapp_link: contactLinks.whatsapp,
  whatsapp_apparel: "0853-5533-3364",
  whatsapp_express: "0853-5533-3364",
  facebook: contactLinks.facebook,
  instagram: contactLinks.instagram,
  copyright_text: "\u00a9 2026 DE BRODER. All rights reserved.",
  status_aktif: true
};

export const fallbackContent: PublicContent = {
  hero: fallbackHero,
  heroes: fallbackHeroes,
  about: fallbackAbout,
  instagramBanner: fallbackInstagramBanner,
  pageHeroes: fallbackPageHeroes,
  categories: fallbackCategories,
  services: fallbackServices,
  products: fallbackProducts,
  productFilters: fallbackProductFilters,
  homepageSections: [],
  landingSettings: {
    showPlainCategorySection: true
  },
  landingSections: LANDING_SECTION_DEFAULTS.map((section) => ({ ...section, metadata: {} })),
  campaignBanners: [],
  stores: fallbackStores,
  orderSteps: fallbackOrderSteps,
  trustAbout: fallbackTrustAbout,
  testimonials: fallbackTestimonials,
  contact: fallbackContact
};
