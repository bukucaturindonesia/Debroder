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
    description: "Kaos polos, kaos NSA, cotton combed, oversize, anak, dan lengan panjang.",
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
    name: "Polo Shirt",
    slug: "polo-shirt",
    description: "Polo shirt untuk kantor, komunitas, event, dan apparel custom.",
    collectionLimit: 8
  },
  {
    name: "Headwear / Topi",
    slug: "headwear",
    description: "Topi trucker, baseball cap, snapback, bucket hat, dan headwear custom.",
    collectionLimit: 8
  },
  {
    name: "Kemeja",
    slug: "kemeja",
    description: "Kemeja PDH, PDL, kantor, komunitas, dan seragam custom.",
    collectionLimit: 8
  },
  {
    name: "Tas & Aksesori",
    slug: "tas-aksesori",
    description: "Tote bag, goodie bag, patch, emblem, lanyard, dan aksesori promosi.",
    collectionLimit: 8
  }
];

export const pimModels: PimModel[] = [
  { name: "Kaos Cotton Combed", slug: "kaos-cotton-combed", categoryKey: "kaos-polos", linkSlug: "kaos-polos", description: "Kaos cotton combed untuk sablon dan kebutuhan apparel." },
  { name: "Kaos Oversize", slug: "kaos-oversize", categoryKey: "kaos-polos", linkSlug: "kaos-polos", description: "Kaos oversize untuk brand clothing dan koleksi kasual." },
  { name: "Kaos Lengan Panjang", slug: "kaos-lengan-panjang", categoryKey: "kaos-polos", linkSlug: "kaos-polos", description: "Kaos lengan panjang untuk komunitas, event, dan custom apparel." },
  { name: "Kaos Anak", slug: "kaos-anak", categoryKey: "kaos-polos", linkSlug: "kaos-polos", description: "Kaos polos anak untuk custom desain dan kebutuhan keluarga." },

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

  { name: "Polo Lacoste", slug: "polo-lacoste", categoryKey: "polo-shirt", linkSlug: "polo-shirt", description: "Polo lacoste untuk seragam kantor dan komunitas." },
  { name: "Polo CVC", slug: "polo-cvc", categoryKey: "polo-shirt", linkSlug: "polo-shirt", description: "Polo CVC untuk kebutuhan custom apparel." },
  { name: "Polo Dry Fit", slug: "polo-dry-fit", categoryKey: "polo-shirt", linkSlug: "polo-shirt", description: "Polo dry fit untuk olahraga, event, dan komunitas." },

  { name: "Topi Trucker", slug: "topi-trucker", categoryKey: "headwear", linkSlug: "headwear", description: "Topi trucker untuk merchandise dan bordir logo." },
  { name: "Topi Baseball", slug: "topi-baseball", categoryKey: "headwear", linkSlug: "headwear", description: "Topi baseball custom untuk komunitas dan brand." },
  { name: "Snapback", slug: "snapback", categoryKey: "headwear", linkSlug: "headwear", description: "Snapback custom untuk brand, event, dan komunitas." },
  { name: "Bucket Hat", slug: "bucket-hat", categoryKey: "headwear", linkSlug: "headwear", description: "Bucket hat custom untuk merchandise dan event." },

  { name: "Kemeja PDH", slug: "kemeja-pdh", categoryKey: "kemeja", linkSlug: "kemeja", description: "Kemeja PDH untuk seragam kantor, instansi, dan organisasi." },
  { name: "Kemeja PDL", slug: "kemeja-pdl", categoryKey: "kemeja", linkSlug: "kemeja", description: "Kemeja PDL untuk lapangan, komunitas, dan organisasi." },
  { name: "Kemeja Kantor", slug: "kemeja-kantor", categoryKey: "kemeja", linkSlug: "kemeja", description: "Kemeja kantor custom untuk perusahaan dan tim." },

  { name: "Tote Bag", slug: "tote-bag", categoryKey: "tas-aksesori", linkSlug: "tas-aksesori", description: "Tote bag custom untuk event, merchandise, dan brand." },
  { name: "Goodie Bag", slug: "goodie-bag", categoryKey: "tas-aksesori", linkSlug: "tas-aksesori", description: "Goodie bag custom untuk event dan promosi." },
  { name: "Patch / Emblem", slug: "patch-emblem", categoryKey: "tas-aksesori", linkSlug: "tas-aksesori", description: "Patch dan emblem untuk seragam, jaket, dan komunitas." },
  { name: "Lanyard", slug: "lanyard", categoryKey: "tas-aksesori", linkSlug: "tas-aksesori", description: "Lanyard custom untuk event, kantor, dan komunitas." }
];

export const pimServiceMethods: PimServiceMethod[] = [
  { name: "Sablon DTF", slug: "sablon-dtf", categoryKey: "sablon-dtf", description: "Teknik sablon full color untuk kaos, hoodie, polo, dan apparel custom.", productionEstimate: "1-3 hari kerja" },
  { name: "Bordir Komputer", slug: "bordir-komputer", categoryKey: "bordir", description: "Bordir logo dan identitas brand untuk polo, topi, jaket, dan kemeja.", productionEstimate: "2-5 hari kerja" },
  { name: "Sublim Printing", slug: "sublim-printing", categoryKey: "cetak-sublim", description: "Cetak sublim untuk jersey dan apparel berbahan polyester.", productionEstimate: "3-7 hari kerja" },
  { name: "Cutting Polyflex", slug: "cutting-polyflex", categoryKey: "polyflex", description: "Cutting polyflex untuk nama, nomor, dan desain sederhana pada apparel.", productionEstimate: "1-3 hari kerja" },
  { name: "Maklon DTF", slug: "maklon-dtf", categoryKey: "maklon-dtf", description: "Layanan produksi DTF untuk brand, reseller, dan produksi partai.", productionEstimate: "Sesuai jumlah pesanan" },
  { name: "Heat Press", slug: "heat-press", categoryKey: "heat-press", description: "Proses press untuk transfer desain ke berbagai produk apparel.", productionEstimate: "Sesuai antrean produksi" },
  { name: "Screen Printing", slug: "screen-printing", categoryKey: "screen-printing", description: "Sablon manual untuk kebutuhan produksi tertentu dan partai besar.", productionEstimate: "Sesuai jumlah pesanan" }
];

export const pimForbiddenMainCategorySlugs = [
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
  "topi-trucker",
  "topi-baseball",
  "snapback",
  "bucket-hat",
  "bordir",
  "bordir-komputer",
  "sablon-dtf",
  "cetak-sublim",
  "sublim-printing",
  "maklon-dtf",
  "cutting-polyflex",
  "heat-press"
];

export const pimSetupSteps = [
  "Isi Store / Cabang",
  "Upload gambar di Media Library",
  "Terapkan Kategori / Model",
  "Terapkan Layanan / Metode Produksi",
  "Input produk contoh 8-10 item",
  "Cek halaman publik dan WhatsApp order"
];

export const pimSampleProducts = [
  { name: "Kaos Polos NSA Hitam", category: "Kaos Polos", model: "Kaos Cotton Combed", services: "Sablon DTF" },
  { name: "Kaos Polos NSA Putih", category: "Kaos Polos", model: "Kaos Cotton Combed", services: "Sablon DTF" },
  { name: "Jersey Futsal Custom", category: "Jersey", model: "Jersey Futsal", services: "Sublim Printing / Sablon DTF" },
  { name: "Jersey Basket Custom", category: "Jersey", model: "Jersey Basket", services: "Sublim Printing / Sablon DTF" },
  { name: "Hoodie Premium", category: "Jaket & Hoodie", model: "Hoodie", services: "Sablon DTF / Bordir Komputer" },
  { name: "Jaket Bomber", category: "Jaket & Hoodie", model: "Jaket Bomber", services: "Sablon DTF / Bordir Komputer" },
  { name: "Polo Shirt Lacoste", category: "Polo Shirt", model: "Polo Lacoste", services: "Bordir Komputer / Sablon DTF" },
  { name: "Topi Trucker Bordir", category: "Headwear / Topi", model: "Topi Trucker", services: "Bordir Komputer" }
];

export function pimCategoryNames() {
  return pimMainCategories.map((category) => category.name).join(", ");
}
