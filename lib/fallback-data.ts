import type {
  AboutContent,
  ContactSettings,
  HeroBanner,
  InstagramBanner,
  JerseyConfiguratorData,
  OrderStep,
  PageHeroContent,
  Product,
  ProductCategory,
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
import { productCategoryPresets } from "@/lib/product-category-config";
import { whatsappLinkWithMessage } from "@/lib/url";

export const fallbackImages = {
  hero: "/brand/debroder/social-preview.png",
  heroMobile: "/brand/debroder/social-preview.png",
  heroSecondary: "/brand/debroder/social-preview.png",
  heroSecondaryMobile: "/brand/debroder/social-preview.png",
  pageHero: "/brand/debroder/social-preview.png",
  pageHeroMobile: "/brand/debroder/social-preview.png",
  product: "/brand/debroder/social-preview.png",
  banner: "/brand/debroder/social-preview.png",
  bannerMobile: "/brand/debroder/social-preview.png",
  store: "/brand/debroder/social-preview.png",
  benefit: "/brand/debroder/social-preview.png"
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

export const fallbackProductCategories: ProductCategory[] = productCategoryPresets.map((preset, index) => ({
  id: undefined,
  name: preset.name,
  slug: preset.slug,
  description: "",
  is_active: true,
  sort_order: (index + 1) * 10,
  show_in_collection: true,
  collection_limit: 8,
  collection_sort: "sort_order",
  collection_section_order: (index + 1) * 10
}));

export const storeImageFallbacks: Record<string, string> = {
  "STORE PETTARANI": "/brand/debroder/social-preview.png",
  "STORE TELLO": "/brand/debroder/social-preview.png",
  "STORE LANDAK": "/brand/debroder/social-preview.png",
  "STORE PAREPARE": "/brand/debroder/social-preview.png"
};

export const productImageFallbacks: Record<string, string> = {
  "Kaos Polos New State Apparel":
    "/brand/debroder/open-graph-logo.png",
  "Kaos Polos Import": "/brand/debroder/open-graph-logo.png",
  "Kaos Polos Cotton Combed":
    "/brand/debroder/open-graph-logo.png",
  "Kaos Cotton Combed": "/brand/debroder/open-graph-logo.png",
  "Distributor Kaos NSA":
    "/brand/debroder/open-graph-logo.png",
  "Sablon DTF Custom": "/brand/debroder/open-graph-logo.png",
  "Custom Jersey": "/brand/debroder/open-graph-logo.png",
  "Maklon DTF": "/brand/debroder/open-graph-logo.png",
  "Cetak Sublim": "/brand/debroder/open-graph-logo.png"
};

export const pageHeroImageFallbacks: Record<string, string> = {
  koleksi: "/brand/debroder/social-preview.png",
  "kaos-polos": "/brand/debroder/social-preview.png",
  "jaket-hoodie": "/brand/debroder/social-preview.png",
  "polo-shirt": "/brand/debroder/social-preview.png",
  headwear: "/brand/debroder/social-preview.png",
  kemeja: "/brand/debroder/social-preview.png",
  "aksesori-lainnya": "/brand/debroder/social-preview.png",
  "sablon-dtf": "/brand/debroder/social-preview.png",
  "maklon-dtf": "/brand/debroder/social-preview.png",
  jersey: "/brand/debroder/social-preview.png",
  "cetak-sublim": "/brand/debroder/social-preview.png",
  store: "/brand/debroder/social-preview.png",
  "cara-order": "/brand/debroder/social-preview.png"
};

export const pageHeroMobileImageFallbacks: Record<string, string> = {
  koleksi: "/brand/debroder/social-preview.png",
  "kaos-polos": "/brand/debroder/social-preview.png",
  "jaket-hoodie": "/brand/debroder/social-preview.png",
  "polo-shirt": "/brand/debroder/social-preview.png",
  headwear: "/brand/debroder/social-preview.png",
  kemeja: "/brand/debroder/social-preview.png",
  "aksesori-lainnya": "/brand/debroder/social-preview.png",
  "sablon-dtf": "/brand/debroder/social-preview.png",
  "maklon-dtf": "/brand/debroder/social-preview.png",
  jersey: "/brand/debroder/social-preview.png",
  "cetak-sublim": "/brand/debroder/social-preview.png",
  store: "/brand/debroder/social-preview.png",
  "cara-order": "/brand/debroder/social-preview.png"
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
    badge: "",
    headline: "",
    subheadline: "",
    title: "",
    subtitle: "",
    cta_primary_text: "",
    cta_primary_link: "/koleksi",
    cta_secondary_text: "",
    cta_secondary_link: "",
    cta_text: "",
    cta_link: "/koleksi",
    image_url: fallbackImages.hero,
    mobile_image_url: fallbackImages.heroMobile,
    object_position: "center center",
    mobile_object_position: "center center",
    urutan: 1,
    status_aktif: true
  },
  {
    badge: "",
    headline: "",
    subheadline: "",
    title: "",
    subtitle: "",
    cta_primary_text: "",
    cta_primary_link: "/sablon-dtf",
    cta_secondary_text: "",
    cta_secondary_link: "",
    cta_text: "",
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
    deskripsi: "Kaos polos, cotton combed, lengan panjang, kaos anak, dan Polo Shirt NSA.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    link_slug: "kaos-polos",
    category_key: "kaos-polos",
    slug: "kaos-polos",
    urutan: 1,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey",
    deskripsi: "Jersey custom untuk futsal, sepak bola, basket, voli, badminton, dan esports.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    link_slug: "jersey",
    category_key: "jersey",
    slug: "jersey",
    urutan: 2,
    status_aktif: true
  },
  {
    nama_kategori: "Jaket & Hoodie",
    deskripsi: "Hoodie, crewneck, bomber, varsity, dan coach custom.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    link_slug: "jaket-hoodie",
    category_key: "jaket-hoodie",
    slug: "jaket-hoodie",
    urutan: 3,
    status_aktif: true
  },
  {
    nama_kategori: "Kemeja",
    deskripsi: "Kemeja PDH, PDL, kantor, komunitas, dan seragam custom.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    link_slug: "kemeja",
    category_key: "kemeja",
    slug: "kemeja",
    urutan: 4,
    status_aktif: true
  },
  {
    nama_kategori: "Headwear",
    deskripsi: "Topi trucker, baseball, snapback, bucket hat, dan headwear custom.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    link_slug: "headwear",
    category_key: "headwear",
    slug: "headwear",
    urutan: 5,
    status_aktif: true
  },
  {
    nama_kategori: "Kaos Cotton Combed",
    deskripsi: "Kaos cotton combed untuk sablon dan kebutuhan apparel.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Kaos cotton combed DE BRODER",
    category_key: "kaos-polos",
    slug: "kaos-cotton-combed",
    link_slug: "kaos-polos",
    urutan: 10,
    status_aktif: true
  },
  {
    nama_kategori: "Kaos Lengan Panjang",
    deskripsi: "Kaos lengan panjang untuk komunitas, event, dan custom apparel.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Kaos lengan panjang DE BRODER",
    category_key: "kaos-polos",
    slug: "kaos-lengan-panjang",
    link_slug: "kaos-polos",
    urutan: 20,
    status_aktif: true
  },
  {
    nama_kategori: "Kaos Anak",
    deskripsi: "Kaos polos anak untuk custom desain dan kebutuhan keluarga.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Kaos anak DE BRODER",
    category_key: "kaos-polos",
    slug: "kaos-anak",
    link_slug: "kaos-polos",
    urutan: 30,
    status_aktif: true
  },
  {
    nama_kategori: "Polo Shirt NSA",
    deskripsi: "Polo Shirt NSA sebagai model di dalam kategori Kaos Polos.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Polo Shirt NSA DE BRODER",
    category_key: "kaos-polos",
    slug: "polo-shirt-nsa",
    link_slug: "kaos-polos",
    urutan: 40,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Futsal",
    deskripsi: "Jersey futsal custom untuk tim dan komunitas.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Jersey futsal custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-futsal",
    link_slug: "jersey",
    urutan: 50,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Sepak Bola",
    deskripsi: "Jersey sepak bola custom dengan nama dan nomor.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Jersey sepak bola custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-sepak-bola",
    link_slug: "jersey",
    urutan: 60,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Basket",
    deskripsi: "Jersey basket custom untuk tim, sekolah, dan event.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Jersey basket custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-basket",
    link_slug: "jersey",
    urutan: 70,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Voli",
    deskripsi: "Jersey voli custom untuk tim dan turnamen.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Jersey voli custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-voli",
    link_slug: "jersey",
    urutan: 80,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Badminton",
    deskripsi: "Jersey badminton untuk klub, komunitas, dan event.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Jersey badminton custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-badminton",
    link_slug: "jersey",
    urutan: 90,
    status_aktif: true
  },
  {
    nama_kategori: "Jersey Esports",
    deskripsi: "Jersey esports custom untuk tim dan komunitas gaming.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Jersey esports custom DE BRODER",
    category_key: "jersey",
    slug: "jersey-esports",
    link_slug: "jersey",
    urutan: 100,
    status_aktif: true
  },
  {
    nama_kategori: "Hoodie",
    deskripsi: "Hoodie custom untuk komunitas, event, dan brand apparel.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Hoodie custom DE BRODER",
    category_key: "jaket-hoodie",
    slug: "hoodie",
    link_slug: "jaket-hoodie",
    urutan: 110,
    status_aktif: true
  },
  {
    nama_kategori: "Crewneck",
    deskripsi: "Crewneck custom untuk merchandise dan brand apparel.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Crewneck custom DE BRODER",
    category_key: "jaket-hoodie",
    slug: "crewneck",
    link_slug: "jaket-hoodie",
    urutan: 120,
    status_aktif: true
  },
  {
    nama_kategori: "Jaket Bomber",
    deskripsi: "Jaket bomber custom untuk komunitas dan organisasi.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Jaket bomber custom DE BRODER",
    category_key: "jaket-hoodie",
    slug: "jaket-bomber",
    link_slug: "jaket-hoodie",
    urutan: 130,
    status_aktif: true
  },
  {
    nama_kategori: "Jaket Varsity",
    deskripsi: "Jaket varsity custom untuk sekolah, kampus, dan komunitas.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Jaket varsity custom DE BRODER",
    category_key: "jaket-hoodie",
    slug: "jaket-varsity",
    link_slug: "jaket-hoodie",
    urutan: 140,
    status_aktif: true
  },
  {
    nama_kategori: "Jaket Coach",
    deskripsi: "Jaket coach custom untuk event, brand, dan komunitas.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Jaket coach custom DE BRODER",
    category_key: "jaket-hoodie",
    slug: "jaket-coach",
    link_slug: "jaket-hoodie",
    urutan: 150,
    status_aktif: true
  },
  {
    nama_kategori: "Kemeja PDH",
    deskripsi: "Kemeja PDH untuk seragam kantor, instansi, dan organisasi.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Kemeja PDH custom DE BRODER",
    category_key: "kemeja",
    slug: "kemeja-pdh",
    link_slug: "kemeja",
    urutan: 160,
    status_aktif: true
  },
  {
    nama_kategori: "Kemeja PDL",
    deskripsi: "Kemeja PDL untuk lapangan, komunitas, dan organisasi.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Kemeja PDL custom DE BRODER",
    category_key: "kemeja",
    slug: "kemeja-pdl",
    link_slug: "kemeja",
    urutan: 170,
    status_aktif: true
  },
  {
    nama_kategori: "Kemeja Kantor",
    deskripsi: "Kemeja kantor custom untuk perusahaan dan tim.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Kemeja kantor custom DE BRODER",
    category_key: "kemeja",
    slug: "kemeja-kantor",
    link_slug: "kemeja",
    urutan: 180,
    status_aktif: true
  },
  {
    nama_kategori: "Kemeja Komunitas",
    deskripsi: "Kemeja custom untuk komunitas, organisasi, dan event.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Kemeja komunitas custom DE BRODER",
    category_key: "kemeja",
    slug: "kemeja-komunitas",
    link_slug: "kemeja",
    urutan: 190,
    status_aktif: true
  },
  {
    nama_kategori: "Topi Trucker",
    deskripsi: "Topi trucker untuk merchandise dan bordir logo.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Topi trucker custom DE BRODER",
    category_key: "headwear",
    slug: "topi-trucker",
    link_slug: "headwear",
    urutan: 200,
    status_aktif: true
  },
  {
    nama_kategori: "Topi Baseball",
    deskripsi: "Topi baseball custom untuk komunitas dan brand.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Topi baseball custom DE BRODER",
    category_key: "headwear",
    slug: "topi-baseball",
    link_slug: "headwear",
    urutan: 210,
    status_aktif: true
  },
  {
    nama_kategori: "Snapback",
    deskripsi: "Snapback custom untuk brand, event, dan komunitas.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Snapback custom DE BRODER",
    category_key: "headwear",
    slug: "snapback",
    link_slug: "headwear",
    urutan: 220,
    status_aktif: true
  },
  {
    nama_kategori: "Bucket Hat",
    deskripsi: "Bucket hat custom untuk merchandise dan event.",
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_alt: "Bucket hat custom DE BRODER",
    category_key: "headwear",
    slug: "bucket-hat",
    link_slug: "headwear",
    urutan: 230,
    status_aktif: true
  }
];

export const fallbackServices: Service[] = [
  {
    nama: "Sablon DTF",
    slug: "sablon-dtf",
    deskripsi: "Hasil tajam dan fleksibel untuk kaos, brand, serta komunitas.",
    image_url: "/brand/debroder/open-graph-logo.png",
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
    image_url: "/brand/debroder/open-graph-logo.png",
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
    image_url: "/brand/debroder/open-graph-logo.png",
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
    image_url: "/brand/debroder/open-graph-logo.png",
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
    image_url: "/brand/debroder/open-graph-logo.png",
    harga_mulai: 75000,
    urutan: 10,
    status_aktif: true
  },
  {
    nama: "Maklon DTF",
    slug: "maklon-dtf",
    deskripsi: "Partner produksi DTF untuk reseller dan brand apparel.",
    image_url: "/brand/debroder/open-graph-logo.png",
    harga_mulai: 25000,
    urutan: 11,
    status_aktif: true
  },
  {
    nama: "Cetak Sublim",
    slug: "cetak-sublim",
    deskripsi: "Cetak warna menyeluruh untuk jersey dan apparel custom.",
    image_url: "/brand/debroder/open-graph-logo.png",
    harga_mulai: 35000,
    urutan: 12,
    status_aktif: true
  },
  {
    nama: "Kaos NSA",
    slug: "kaos-polos",
    deskripsi: "Kaos New State Apparel siap pakai atau siap custom.",
    image_url: "/brand/debroder/open-graph-logo.png",
    harga_mulai: 45000,
    urutan: 13,
    status_aktif: true
  },
  {
    nama: "Cotton Combed",
    slug: "kaos-polos",
    deskripsi: "Kaos cotton combed nyaman untuk brand dan kebutuhan harian.",
    image_url: "/brand/debroder/open-graph-logo.png",
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
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_url: "/brand/debroder/open-graph-logo.png",
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
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_url: "/brand/debroder/open-graph-logo.png",
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
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_url: "/brand/debroder/open-graph-logo.png",
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
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_url: "/brand/debroder/open-graph-logo.png",
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
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_url: "/brand/debroder/open-graph-logo.png",
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
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_url: "/brand/debroder/open-graph-logo.png",
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
    gambar_url: "/brand/debroder/open-graph-logo.png",
    image_url: "/brand/debroder/open-graph-logo.png",
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
    page_key: "kemeja",
    label: "KEMEJA",
    title: "Kemeja Custom",
    subtitle: "Kemeja PDH, PDL, kantor, komunitas, dan seragam custom.",
    image_url: pageHeroImageFallbacks.kemeja,
    mobile_image_url: pageHeroMobileImageFallbacks.kemeja,
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

export const fallbackJerseyConfigurator: JerseyConfiguratorData = {
  packages: [
    { name: "Atasan Fullprint", slug: "atasan-fullprint", base_price: 100000, description: "Atasan jersey fullprint.", is_active: true, sort_order: 10 },
    { name: "Setelan Halfprint", slug: "setelan-halfprint", base_price: 120000, description: "Setelan dengan kombinasi area print.", is_active: true, sort_order: 20 },
    { name: "Setelan Fullprint", slug: "setelan-fullprint", base_price: 130000, description: "Setelan jersey fullprint.", is_active: true, sort_order: 30 }
  ],
  materials: [
    { name: "Milano", slug: "milano", price_adjustment: 0, is_active: true, sort_order: 10 },
    { name: "Brazil", slug: "brazil", price_adjustment: 0, is_active: true, sort_order: 20 },
    { name: "Benzema", slug: "benzema", price_adjustment: 0, is_active: true, sort_order: 30 },
    { name: "Drop Needle", slug: "drop-needle", price_adjustment: 0, is_active: true, sort_order: 40 },
    { name: "Emboss Topo", slug: "emboss-topo", price_adjustment: 15000, is_active: true, sort_order: 50 },
    { name: "Emboss Straw", slug: "emboss-straw", price_adjustment: 15000, is_active: true, sort_order: 60 },
    { name: "Emboss Mixart", slug: "emboss-mixart", price_adjustment: 15000, is_active: true, sort_order: 70 },
    { name: "Emboss Monochrome", slug: "emboss-monochrome", price_adjustment: 15000, is_active: true, sort_order: 80 }
  ],
  collarGroups: [
    { name: "Regular", slug: "regular", sort_order: 10, is_active: true },
    { name: "Classic", slug: "classic", sort_order: 20, is_active: true }
  ],
  collars: [
    { name: "O Neck", slug: "o-neck", group_slug: "regular", group_name: "Regular", price_adjustment: 0, is_active: true, sort_order: 10 },
    { name: "V Neck", slug: "v-neck", group_slug: "regular", group_name: "Regular", price_adjustment: 0, is_active: true, sort_order: 20 },
    { name: "V Silang", slug: "v-silang", group_slug: "regular", group_name: "Regular", price_adjustment: 0, is_active: true, sort_order: 30 },
    { name: "V Silang Tumpul", slug: "v-silang-tumpul", group_slug: "regular", group_name: "Regular", price_adjustment: 0, is_active: true, sort_order: 40 },
    { name: "V Tumpul", slug: "v-tumpul", group_slug: "regular", group_name: "Regular", price_adjustment: 0, is_active: true, sort_order: 50 },
    { name: "V Narrow", slug: "v-narrow", group_slug: "regular", group_name: "Regular", price_adjustment: 0, is_active: true, sort_order: 60 },
    { name: "V Narrow Adidas", slug: "v-narrow-adidas", group_slug: "regular", group_name: "Regular", price_adjustment: 0, is_active: true, sort_order: 70 },
    { name: "V Neck Lapisan", slug: "v-neck-lapisan", group_slug: "regular", group_name: "Regular", price_adjustment: 0, is_active: true, sort_order: 80 },
    { name: "Wangki Klasik", slug: "wangki-klasik", group_slug: "classic", group_name: "Classic", price_adjustment: 0, is_active: true, sort_order: 90 },
    { name: "Wangki Adidas", slug: "wangki-adidas", group_slug: "classic", group_name: "Classic", price_adjustment: 0, is_active: true, sort_order: 100 },
    { name: "Wangki Segitiga", slug: "wangki-segitiga", group_slug: "classic", group_name: "Classic", price_adjustment: 0, is_active: true, sort_order: 110 },
    { name: "Wangki Tumpul Adidas", slug: "wangki-tumpul-adidas", group_slug: "classic", group_name: "Classic", price_adjustment: 0, is_active: true, sort_order: 120 },
    { name: "Wangki Silang Adidas", slug: "wangki-silang-adidas", group_slug: "classic", group_name: "Classic", price_adjustment: 0, is_active: true, sort_order: 130 },
    { name: "Wangki Kancing 1", slug: "wangki-kancing-1", group_slug: "classic", group_name: "Classic", price_adjustment: 0, is_active: true, sort_order: 140 },
    { name: "Wangki Kancing 2", slug: "wangki-kancing-2", group_slug: "classic", group_name: "Classic", price_adjustment: 0, is_active: true, sort_order: 150 },
    { name: "Wangki Klasik O", slug: "wangki-klasik-o", group_slug: "classic", group_name: "Classic", price_adjustment: 0, is_active: true, sort_order: 160 }
  ],
  addons: [
    { name: "Lengan Panjang", slug: "lengan-panjang", price_adjustment: 10000, is_active: true, sort_order: 10 },
    { name: "RIB", slug: "rib", price_adjustment: 5000, is_active: true, sort_order: 20 }
  ],
  requiredServices: [
    { service_name: "Cetak Sublim", service_slug: "cetak-sublim", is_active: true, sort_order: 10 }
  ],
  settings: {
    minimum_order_qty: 6,
    price_formula: "(package_price + material_adjustment + collar_adjustment + addon_total + size_adjustment) * quantity"
  }
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
  productCategories: fallbackProductCategories,
  productFilters: fallbackProductFilters,
  homepageSections: [],
  landingSettings: {
    showPlainCategorySection: true
  },
  landingSections: LANDING_SECTION_DEFAULTS.map((section) => ({ ...section, metadata: {} })),
  campaignBanners: [],
  jerseySections: [],
  stores: fallbackStores,
  orderSteps: fallbackOrderSteps,
  trustAbout: fallbackTrustAbout,
  testimonials: fallbackTestimonials,
  contact: fallbackContact,
  jerseyConfigurator: fallbackJerseyConfigurator
};
