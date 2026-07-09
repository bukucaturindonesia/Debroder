export type PimMainCategory = {
  name: string;
  slug: string;
  description: string;
  collectionLimit?: number;
};

export type PimModel = {
  name: string;
  slug: string;
  categoryKey: string;
  linkSlug: string;
  description: string;
};

export type PimServiceMethod = {
  name: string;
  slug: string;
  categoryKey: string;
  description: string;
  productionEstimate?: string;
};

export const pimMainCategories: PimMainCategory[] = [
  {
    name: "Kaos Polos",
    slug: "kaos-polos",
    description: "Kaos polos, kaos NSA, cotton combed, polo shirt NSA, kaos anak, dan lengan panjang.",
    collectionLimit: 8
  },
  {
    name: "Jersey",
    slug: "jersey",
    description: "Jersey custom untuk futsal, sepak bola, basket, voli, badminton, esports, dan komunitas.",
    collectionLimit: 8
  },
  {
    name: "Jaket & Hoodie",
    slug: "jaket-hoodie",
    description: "Hoodie, crewneck, jaket bomber, varsity, coach, dan outerwear custom.",
    collectionLimit: 8
  },
  {
    name: "Kemeja",
    slug: "kemeja",
    description: "Kemeja PDH, PDL, kantor, komunitas, dan seragam custom.",
    collectionLimit: 8
  },
  {
    name: "Headwear",
    slug: "headwear",
    description: "Topi trucker, baseball cap, snapback, bucket hat, dan headwear custom.",
    collectionLimit: 8
  }
];

export const pimModels: PimModel[] = [
  { name: "Kaos Cotton Combed", slug: "kaos-cotton-combed", categoryKey: "kaos-polos", linkSlug: "kaos-polos", description: "Kaos cotton combed untuk sablon dan kebutuhan apparel." },
  { name: "Kaos Lengan Panjang", slug: "kaos-lengan-panjang", categoryKey: "kaos-polos", linkSlug: "kaos-polos", description: "Kaos lengan panjang untuk komunitas, event, dan custom apparel." },
  { name: "Kaos Anak", slug: "kaos-anak", categoryKey: "kaos-polos", linkSlug: "kaos-polos", description: "Kaos polos anak untuk custom desain dan kebutuhan keluarga." },
  { name: "Polo Shirt NSA", slug: "polo-shirt-nsa", categoryKey: "kaos-polos", linkSlug: "kaos-polos", description: "Polo Shirt NSA sebagai model di dalam kategori Kaos Polos." },

  { name: "Jersey Futsal", slug: "jersey-futsal", categoryKey: "jersey", linkSlug: "jersey", description: "Jersey futsal custom untuk tim dan komunitas." },
  { name: "Jersey Sepak Bola", slug: "jersey-sepak-bola", categoryKey: "jersey", linkSlug: "jersey", description: "Jersey sepak bola custom dengan nama dan nomor." },
  { name: "Jersey Basket", slug: "jersey-basket", categoryKey: "jersey", linkSlug: "jersey", description: "Jersey basket custom untuk tim, sekolah, dan event." },
  { name: "Jersey Voli", slug: "jersey-voli", categoryKey: "jersey", linkSlug: "jersey", description: "Jersey voli custom untuk tim dan turnamen." },
  { name: "Jersey Badminton", slug: "jersey-badminton", categoryKey: "jersey", linkSlug: "jersey", description: "Jersey badminton untuk klub, komunitas, dan event." },
  { name: "Jersey Esports", slug: "jersey-esports", categoryKey: "jersey", linkSlug: "jersey", description: "Jersey esports custom untuk tim dan komunitas gaming." },

  { name: "Hoodie", slug: "hoodie", categoryKey: "jaket-hoodie", linkSlug: "jaket-hoodie", description: "Hoodie custom untuk komunitas, event, dan brand apparel." },
  { name: "Crewneck", slug: "crewneck", categoryKey: "jaket-hoodie", linkSlug: "jaket-hoodie", description: "Crewneck custom untuk merchandise dan brand apparel." },
  { name: "Jaket Bomber", slug: "jaket-bomber", categoryKey: "jaket-hoodie", linkSlug: "jaket-hoodie", description: "Jaket bomber custom untuk komunitas dan organisasi." },
  { name: "Jaket Varsity", slug: "jaket-varsity", categoryKey: "jaket-hoodie", linkSlug: "jaket-hoodie", description: "Jaket varsity custom untuk sekolah, kampus, dan komunitas." },
  { name: "Jaket Coach", slug: "jaket-coach", categoryKey: "jaket-hoodie", linkSlug: "jaket-hoodie", description: "Jaket coach custom untuk event, brand, dan komunitas." },

  { name: "Kemeja PDH", slug: "kemeja-pdh", categoryKey: "kemeja", linkSlug: "kemeja", description: "Kemeja PDH untuk seragam kantor, instansi, dan organisasi." },
  { name: "Kemeja PDL", slug: "kemeja-pdl", categoryKey: "kemeja", linkSlug: "kemeja", description: "Kemeja PDL untuk lapangan, komunitas, dan organisasi." },
  { name: "Kemeja Kantor", slug: "kemeja-kantor", categoryKey: "kemeja", linkSlug: "kemeja", description: "Kemeja kantor custom untuk perusahaan dan tim." },
  { name: "Kemeja Komunitas", slug: "kemeja-komunitas", categoryKey: "kemeja", linkSlug: "kemeja", description: "Kemeja custom untuk komunitas, organisasi, dan event." },

  { name: "Topi Trucker", slug: "topi-trucker", categoryKey: "headwear", linkSlug: "headwear", description: "Topi trucker untuk merchandise dan bordir logo." },
  { name: "Topi Baseball", slug: "topi-baseball", categoryKey: "headwear", linkSlug: "headwear", description: "Topi baseball custom untuk komunitas dan brand." },
  { name: "Snapback", slug: "snapback", categoryKey: "headwear", linkSlug: "headwear", description: "Snapback custom untuk brand, event, dan komunitas." },
  { name: "Bucket Hat", slug: "bucket-hat", categoryKey: "headwear", linkSlug: "headwear", description: "Bucket hat custom untuk merchandise dan event." }
];

export const pimServiceMethods: PimServiceMethod[] = [
  { name: "Sablon DTF", slug: "sablon-dtf", categoryKey: "sablon-dtf", description: "Teknik sablon full color untuk kaos, hoodie, kemeja, headwear tertentu, dan apparel custom.", productionEstimate: "1-3 hari kerja" },
  { name: "Bordir Komputer", slug: "bordir-komputer", categoryKey: "bordir", description: "Bordir logo dan identitas brand untuk polo, topi, jaket, dan kemeja.", productionEstimate: "2-5 hari kerja" },
  { name: "Sublim Printing", slug: "cetak-sublim", categoryKey: "cetak-sublim", description: "Cetak sublim untuk jersey dan apparel berbahan polyester.", productionEstimate: "3-7 hari kerja" },
  { name: "Maklon DTF", slug: "maklon-dtf", categoryKey: "maklon-dtf", description: "Layanan produksi DTF untuk brand, reseller, dan produksi partai.", productionEstimate: "Sesuai jumlah pesanan" }
];

export const pimForbiddenMainCategorySlugs = [
  "polo-shirt",
  "polo-shirt-nsa",
  "polo-lacoste",
  "polo-cvc",
  "polo-dry-fit",
  "hoodie",
  "jacket",
  "jaket",
  "crewneck",
  "crewnek",
  "jersey-futsal",
  "jersey-basket",
  "jersey-voli",
  "jersey-badminton",
  "jersey-sepak-bola",
  "jersey-esports",
  "kaos-cotton-combed",
  "kaos-oversize",
  "kaos-lengan-panjang",
  "kaos-anak",
  "topi-trucker",
  "topi-baseball",
  "snapback",
  "bucket-hat",
  "aksesori-lainnya",
  "tas-aksesori",
  "patch-emblem",
  "lanyard",
  "bordir",
  "bordir-komputer",
  "sablon-dtf",
  "cetak-sublim",
  "sublim-printing",
  "maklon-dtf",
  "cutting-polyflex",
  "heat-press",
  "screen-printing"
];

export const pimSetupSteps = [
  "Isi Store / Cabang",
  "Upload gambar di Media Library",
  "Terapkan Kategori / Model",
  "Terapkan Layanan / Metode Produksi",
  "Input produk contoh 5-8 item",
  "Cek halaman publik dan WhatsApp order"
];

export const pimSampleProducts = [
  { name: "Kaos Polos NSA Hitam", category: "Kaos Polos", model: "Kaos Cotton Combed", services: "Sablon DTF" },
  { name: "Kaos Polos NSA Putih", category: "Kaos Polos", model: "Kaos Cotton Combed", services: "Sablon DTF" },
  { name: "Polo Shirt NSA", category: "Kaos Polos", model: "Polo Shirt NSA", services: "Bordir Komputer / Sablon DTF" },
  { name: "Jersey Futsal Custom", category: "Jersey", model: "Jersey Futsal", services: "Sublim Printing / Sablon DTF" },
  { name: "Jersey Basket Custom", category: "Jersey", model: "Jersey Basket", services: "Sublim Printing / Sablon DTF" },
  { name: "Hoodie Premium", category: "Jaket & Hoodie", model: "Hoodie", services: "Sablon DTF / Bordir Komputer" },
  { name: "Kemeja PDH", category: "Kemeja", model: "Kemeja PDH", services: "Bordir Komputer / Sablon DTF" },
  { name: "Topi Trucker Bordir", category: "Headwear", model: "Topi Trucker", services: "Bordir Komputer" }
];

export function pimCategoryNames() {
  return pimMainCategories.map((category) => category.name).join(", ");
}
