import type { Product } from "@/lib/types";

export type RecommendationItem = {
  name: string;
  detail: string;
  href: string;
  category: "Pelengkap" | "Upgrade" | "Paket" | "Lanjutan";
};

export type RecommendationGroup = {
  title: string;
  items: RecommendationItem[];
};

export type ProductRecommendation = {
  key: string;
  title: string;
  description: string;
  ctaLabel: string;
  whatsappNote: string;
  groups: RecommendationGroup[];
};

const defaultRecommendation: ProductRecommendation = {
  key: "general",
  title: "Lengkapi Pesanan Kamu",
  description: "Tambahkan kebutuhan pendukung agar tim DEBRODER bisa memberi arahan produksi yang lebih tepat.",
  ctaLabel: "Lihat rekomendasi",
  whatsappNote: "Saya ingin konsultasi paket lengkap sesuai produk yang saya lihat.",
  groups: [
    {
      title: "Kebutuhan umum",
      items: [
        { name: "Konsultasi bahan", detail: "Pilih bahan yang sesuai untuk kebutuhan produksi.", href: "/koleksi", category: "Pelengkap" },
        { name: "Konsultasi desain", detail: "Cocok kalau desain belum final atau masih perlu arahan.", href: "/cara-order", category: "Pelengkap" },
        { name: "Paket produksi", detail: "Gabungkan produk, desain, dan proses cetak dalam satu alur.", href: "/koleksi", category: "Paket" }
      ]
    }
  ]
};

const rules: ProductRecommendation[] = [
  {
    key: "kaos-polos",
    title: "Lengkapi Pesanan Kaos",
    description: "Kaos polos biasanya dilanjutkan ke sablon, desain, atau paket produksi komunitas dan brand.",
    ctaLabel: "Lengkapi pesanan kaos",
    whatsappNote: "Saya ingin melengkapi pesanan kaos polos dengan kebutuhan produksi lain.",
    groups: [
      {
        title: "Pelengkap",
        items: [
          { name: "Sablon DTF", detail: "Untuk logo, desain kaos, komunitas, dan brand apparel.", href: "/sablon-dtf", category: "Pelengkap" },
          { name: "Desain kaos", detail: "Bantu rapikan konsep sebelum masuk produksi.", href: "/cara-order", category: "Pelengkap" }
        ]
      },
      {
        title: "Paket",
        items: [
          { name: "Paket komunitas", detail: "Kaos polos + sablon + konsultasi ukuran/jumlah.", href: "/koleksi", category: "Paket" },
          { name: "Produksi brand apparel", detail: "Untuk kebutuhan jualan, drop, atau stok awal brand.", href: "/maklon-dtf", category: "Lanjutan" }
        ]
      }
    ]
  },
  {
    key: "sablon-dtf",
    title: "Pilih Media Sablon",
    description: "Sablon DTF akan lebih jelas kalau media, desain, dan jumlah produksi ikut ditentukan.",
    ctaLabel: "Pilih media sablon",
    whatsappNote: "Saya ingin sablon DTF dan butuh arahan media serta kebutuhan produksinya.",
    groups: [
      {
        title: "Pelengkap",
        items: [
          { name: "Kaos polos", detail: "Media paling umum untuk sablon DTF satuan maupun partai.", href: "/kaos-polos", category: "Pelengkap" },
          { name: "Hoodie / jaket", detail: "Untuk komunitas, merch, dan apparel premium.", href: "/jaket-hoodie", category: "Upgrade" }
        ]
      },
      {
        title: "Lanjutan",
        items: [
          { name: "Transfer DTF meteran", detail: "Untuk kebutuhan produksi berulang atau reseller.", href: "/maklon-dtf", category: "Lanjutan" },
          { name: "Maklon DTF", detail: "Produksi lebih besar untuk brand atau vendor.", href: "/maklon-dtf", category: "Lanjutan" }
        ]
      }
    ]
  },
  {
    key: "jersey",
    title: "Lengkapi Kebutuhan Jersey",
    description: "Jersey biasanya perlu desain, nama, nomor, dan teknik sublim agar pesanan siap untuk tim.",
    ctaLabel: "Lengkapi kebutuhan jersey",
    whatsappNote: "Saya ingin melengkapi kebutuhan jersey untuk tim/komunitas.",
    groups: [
      {
        title: "Pelengkap",
        items: [
          { name: "Cetak sublim", detail: "Teknik utama untuk jersey full print.", href: "/cetak-sublim", category: "Pelengkap" },
          { name: "Desain jersey", detail: "Untuk konsep warna, sponsor, logo, nama, dan nomor.", href: "/cara-order", category: "Pelengkap" },
          { name: "Nama & nomor punggung", detail: "Cocok untuk tim olahraga, sekolah, dan komunitas.", href: "/jersey", category: "Pelengkap" }
        ]
      },
      {
        title: "Paket",
        items: [
          { name: "Paket jersey tim", detail: "Jersey + desain + nama/nomor + arahan ukuran.", href: "/jersey", category: "Paket" }
        ]
      }
    ]
  },
  {
    key: "cetak-sublim",
    title: "Buat Paket Sublim",
    description: "Cetak sublim adalah teknik produksi. Arahkan pesanan ke produk akhir seperti jersey atau apparel tim.",
    ctaLabel: "Buat paket sublim",
    whatsappNote: "Saya ingin cetak sublim dan butuh arahan produk akhirnya.",
    groups: [
      {
        title: "Produk akhir",
        items: [
          { name: "Custom jersey", detail: "Produk paling umum untuk cetak sublim.", href: "/jersey", category: "Pelengkap" },
          { name: "Desain jersey", detail: "Siapkan file desain sebelum produksi.", href: "/cara-order", category: "Pelengkap" }
        ]
      },
      {
        title: "Skala produksi",
        items: [
          { name: "Produksi tim/komunitas", detail: "Untuk kebutuhan sekolah, tim, kantor, atau event.", href: "/jersey", category: "Paket" },
          { name: "Produksi partai besar", detail: "Untuk vendor, brand, atau kebutuhan repeat order.", href: "/maklon-dtf", category: "Lanjutan" }
        ]
      }
    ]
  },
  {
    key: "jaket-hoodie",
    title: "Lengkapi Apparel Komunitas",
    description: "Hoodie dan jaket biasanya cocok dipaketkan dengan logo, bordir/sablon, dan kaos inner.",
    ctaLabel: "Lengkapi apparel komunitas",
    whatsappNote: "Saya ingin melengkapi pesanan hoodie/jaket dengan custom logo atau paket komunitas.",
    groups: [
      {
        title: "Pelengkap",
        items: [
          { name: "Sablon DTF", detail: "Untuk logo, desain punggung, atau artwork besar.", href: "/sablon-dtf", category: "Pelengkap" },
          { name: "Bordir logo", detail: "Untuk look organisasi, kantor, atau komunitas premium.", href: "/cara-order", category: "Upgrade" },
          { name: "Kaos inner", detail: "Paket jaket/hoodie dengan kaos komunitas.", href: "/kaos-polos", category: "Pelengkap" }
        ]
      }
    ]
  },
  {
    key: "maklon-dtf",
    title: "Bangun Paket Brand",
    description: "Maklon biasanya untuk reseller atau brand. Rekomendasi diarahkan ke produksi, media, dan finishing.",
    ctaLabel: "Bangun paket brand",
    whatsappNote: "Saya ingin konsultasi maklon atau produksi brand apparel.",
    groups: [
      {
        title: "Produksi",
        items: [
          { name: "Kaos polos grosir", detail: "Media produksi untuk brand atau reseller.", href: "/kaos-polos", category: "Pelengkap" },
          { name: "Produksi brand apparel", detail: "Paket untuk stok awal, drop, atau repeat order.", href: "/maklon-dtf", category: "Paket" }
        ]
      },
      {
        title: "Finishing",
        items: [
          { name: "Label / packaging", detail: "Arahkan produksi agar terasa lebih siap jual.", href: "/cara-order", category: "Upgrade" },
          { name: "Konsultasi produksi", detail: "Bantu hitung jumlah, estimasi, dan alur produksi.", href: "/cara-order", category: "Lanjutan" }
        ]
      }
    ]
  },
  {
    key: "headwear",
    title: "Lengkapi Merchandise",
    description: "Headwear lebih kuat jika dipaketkan dengan apparel komunitas, event, atau brand.",
    ctaLabel: "Lengkapi merchandise",
    whatsappNote: "Saya ingin melengkapi headwear dengan paket merchandise atau apparel.",
    groups: [
      {
        title: "Merchandise",
        items: [
          { name: "Bordir logo", detail: "Cocok untuk topi komunitas, kantor, dan brand.", href: "/headwear", category: "Pelengkap" },
          { name: "Kaos komunitas", detail: "Padukan topi dengan kaos event atau komunitas.", href: "/kaos-polos", category: "Paket" },
          { name: "Hoodie komunitas", detail: "Untuk paket merchandise yang lebih lengkap.", href: "/jaket-hoodie", category: "Paket" }
        ]
      }
    ]
  }
];

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function productSignals(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory || "",
    product.slug || "",
    product.link_url || "",
    ...(product.intent_tags || []),
    ...(product.collection_tags || []),
    ...(product.material_tags || [])
  ].map(normalize).join(" ");
}

function directProductSignals(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory || "",
    product.slug || "",
    product.link_url || ""
  ].map(normalize).join(" ");
}

export function recommendationForProduct(product: Product): ProductRecommendation {
  const directSignals = directProductSignals(product);
  const signals = productSignals(product);

  if (/\b(headwear|topi|cap|hat)\b/.test(directSignals)) return rules.find((rule) => rule.key === "headwear") || defaultRecommendation;
  if (/\b(jaket|hoodie|sweater|crewneck)\b/.test(directSignals)) return rules.find((rule) => rule.key === "jaket-hoodie") || defaultRecommendation;
  if (/\b(maklon|reseller|brand-apparel|partai-besar|grosir)\b/.test(directSignals)) return rules.find((rule) => rule.key === "maklon-dtf") || defaultRecommendation;
  if (/\b(cetak-sublim|sublim|sublimasi)\b/.test(directSignals)) return rules.find((rule) => rule.key === "cetak-sublim") || defaultRecommendation;
  if (/\b(jersey|futsal|bola|basket|esport|tim)\b/.test(directSignals)) return rules.find((rule) => rule.key === "jersey") || defaultRecommendation;
  if (/\b(dtf|sablon|transfer)\b/.test(directSignals)) return rules.find((rule) => rule.key === "sablon-dtf") || defaultRecommendation;
  if (/\b(kaos|polos|cotton|combed|nsa|polo)\b/.test(directSignals)) return rules.find((rule) => rule.key === "kaos-polos") || defaultRecommendation;

  if (/\b(headwear|topi|cap|hat)\b/.test(signals)) return rules.find((rule) => rule.key === "headwear") || defaultRecommendation;
  if (/\b(jaket|hoodie|sweater|crewneck)\b/.test(signals)) return rules.find((rule) => rule.key === "jaket-hoodie") || defaultRecommendation;
  if (/\b(maklon|reseller|brand-apparel|partai-besar|grosir)\b/.test(signals)) return rules.find((rule) => rule.key === "maklon-dtf") || defaultRecommendation;
  if (/\b(cetak-sublim|sublim|sublimasi)\b/.test(signals)) return rules.find((rule) => rule.key === "cetak-sublim") || defaultRecommendation;
  if (/\b(jersey|futsal|bola|basket|esport|tim)\b/.test(signals)) return rules.find((rule) => rule.key === "jersey") || defaultRecommendation;
  if (/\b(dtf|sablon|transfer)\b/.test(signals)) return rules.find((rule) => rule.key === "sablon-dtf") || defaultRecommendation;
  if (/\b(kaos|polos|cotton|combed|nsa|polo)\b/.test(signals)) return rules.find((rule) => rule.key === "kaos-polos") || defaultRecommendation;

  return defaultRecommendation;
}
