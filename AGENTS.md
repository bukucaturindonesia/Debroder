# DEBRODER PROJECT INSTRUCTIONS

## 1. Sumber Kebenaran Resmi

Sebelum melakukan audit, implementasi, migration, revisi, atau rekomendasi,
wajib membaca dokumen berikut:

1. docs/blueprints/DEBRODER_LANDING_PAGE_BLUEPRINT_V1.0_FROZEN.pdf
2. docs/blueprints/DEBRODER_COMMERCE_EXPERIENCE_BLUEPRINT_V1.0_FROZEN.pdf
3. docs/blueprints/DEBRODER_PRODUCT_ORDERING_PRODUCTION_INVENTORY_V1.0-V1.3_FROZEN.pdf
4. docs/DEBRODER_MASTER_STATE.md
5. docs/CURRENT_PHASE_HANDOFF.md

Ketiga blueprint memiliki wilayah kewenangan berbeda dan tidak boleh dicampur.

### Landing Page Blueprint

Mengatur:

- struktur homepage;
- Smart Header;
- Hero;
- Trust Strip;
- Featured;
- Trending;
- Editorial Campaign;
- Fresh Drop;
- Shop by Category;
- Store dan Cara Order;
- Tentang DEBRODER;
- Footer;
- CMS/PIM ownership homepage;
- responsive dan scroll behavior.

### Commerce Experience Blueprint

Mengatur:

- Koleksi;
- mini landing kategori;
- Jersey;
- Kaos Polos;
- Jaket & Hoodie;
- Headwear;
- Sablon DTF;
- Cetak Sublim;
- katalog;
- filter dan sorting;
- detail produk;
- Ready Stock dan Custom;
- cart;
- checkout;
- pembayaran;
- akun pelanggan;
- tracking;
- repeat order;
- help, complaint, search, dan SEO publik.

### Product, Ordering, Production & Inventory Blueprint Suite

Mengatur:

- aturan produk dan PIM;
- bulk/custom ordering;
- quotation;
- mockup approval;
- order dan pembayaran;
- Job Order;
- Work Item;
- produksi;
- QC;
- fulfillment;
- notification;
- role dan audit;
- repeat order;
- inventory;
- procurement;
- production planning.

Jika ditemukan konflik:

1. Jangan menebak.
2. Identifikasi wilayah kewenangan setiap blueprint.
3. Pertahankan keputusan frozen.
4. Laporkan konflik kepada owner sebelum mengubah implementasi.

---

## 2. Status Proyek Saat Ini

- Landing Page Blueprint v1.0: FROZEN.
- Commerce Experience Blueprint v1.0: FROZEN.
- Product–Ordering–Production Blueprint Suite v1.0–v1.3: FROZEN.
- DEBRODER v1.2 Phase 1–14: telah dibangun.
- Phase 12: complete, verified, dan deployed.
- Phase 13: complete.
- Phase 14: complete atau menunggu verifikasi final sesuai handoff terbaru.
- DEBRODER v1.3: BELUM BOLEH DIMULAI.
- Pekerjaan aktif: DEEP AUDIT & STABILIZATION sebelum v1.3.

Jangan menyatakan suatu versi, phase, atau fitur selesai hanya karena file,
migration, atau UI sudah tersedia. Gunakan status pada CURRENT_PHASE_HANDOFF.md
dan hasil verifikasi aktual.

---

## 3. Aturan Database

- Jangan reset database.
- Jangan menghapus tabel atau data.
- Jangan menghapus migration history.
- Jangan menghapus trigger, function, policy, atau RLS yang sudah aktif.
- Jangan menjalankan ulang migration yang sudah berhasil.
- Jangan mengedit migration lama yang sudah diterapkan ke remote.
- Jika perlu koreksi SQL, buat migration koreksi baru yang kecil,
  aman, idempotent, dan dapat diaudit.
- Selalu bandingkan migration local dan remote sebelum menjalankan migration.
- Jangan menjalankan operasi destruktif tanpa persetujuan owner.
- Jangan memakai service-role untuk melewati RLS pada alur publik
  tanpa alasan keamanan yang terdokumentasi.

---

## 4. Aturan Commerce Universal

Semua produk DEBRODER mendukung dua jalur commerce:

1. Ready Stock
2. Custom Order

Ready Stock:

- menggunakan harga dan stok aktual;
- memiliki Tambah ke Keranjang dan Beli Sekarang;
- dapat langsung checkout;
- status Available, Low Stock, Sold Out, Coming Soon, dan Archived
  dikendalikan dari PIM/Admin.

Custom:

- menggunakan kebutuhan terstruktur, layanan, file, dan catatan;
- memakai quotation jika harga belum final;
- mendukung pembayaran penuh atau DP;
- memakai mockup approval jika diwajibkan;
- masuk ke produksi setelah syarat terpenuhi.

Khusus Custom Jersey:

- wajib menggunakan Jersey Configurator;
- tidak menggunakan custom form generik.

WhatsApp hanya untuk:

- konsultasi;
- bantuan;
- notifikasi;
- pengiriman link.

WhatsApp tidak boleh menjadi jalur utama pembuatan order.

---

## 5. Route Resmi

Gunakan satu route detail produk universal:

- /produk/[slug]

Route utama lain:

- /koleksi
- /jersey
- /jersey/shop
- /jersey/configurator
- /kaos-polos
- /kaos-polos/shop
- /jaket-hoodie
- /jaket-hoodie/shop
- /headwear
- /headwear/shop
- /sablon-dtf
- /cetak-sublim
- /cart
- /checkout
- /order-confirmation
- /account/orders
- /account/orders/[id]
- /track-order
- /search
- /help

Jangan membuat route detail produk kedua untuk kategori tertentu.
CTA kategori dan katalog harus menuju /produk/[slug].

---

## 6. CMS, PIM, dan Sistem Transaksi

CMS mengelola:

- hero;
- poster;
- campaign;
- headline;
- CTA;
- navbar kategori;
- portfolio;
- urutan section;
- visibility;
- draft, publish, schedule, archive;
- pemilihan produk unggulan dari PIM.

PIM mengelola:

- nama produk;
- slug;
- kategori;
- foto produk;
- harga;
- varian;
- warna;
- ukuran;
- SKU;
- stok;
- Ready Stock;
- Custom availability;
- status Available, Low Stock, Sold Out, Coming Soon, Archived.

Sistem transaksi mengelola:

- cart;
- quotation;
- checkout;
- order;
- payment;
- mockup approval;
- Job Order;
- Work Item;
- production;
- QC;
- fulfillment;
- repeat order.

CMS tidak boleh menduplikasi harga, stok, atau kebenaran produk dari PIM.

---

## 7. Aturan Audit dan Implementasi

Sebelum mengubah kode:

1. Baca AGENTS.md.
2. Baca blueprint yang relevan.
3. Baca DEBRODER_MASTER_STATE.md.
4. Baca CURRENT_PHASE_HANDOFF.md.
5. Periksa git status dan git diff.
6. Identifikasi scope aktif.
7. Bedakan pekerjaan selesai, setengah selesai, pending, dan belum diverifikasi.

Klasifikasi temuan:

- BLOCKER: transaksi gagal, data rusak, kebocoran akses, order/payment ganda.
- MAJOR: fitur berjalan tetapi hasil, status, atau perhitungannya salah.
- MINOR: masalah UI/UX yang tidak menghentikan transaksi.
- DEFERRED: fitur baru atau perubahan di luar scope aktif.

Saat deep audit:

- audit dahulu;
- dokumentasikan bukti;
- jangan langsung melakukan refactor besar;
- perbaiki BLOCKER dan MAJOR secara bertahap;
- jangan mencampur semua modul dalam satu proses panjang.

---

## 8. Larangan Umum

- Jangan memulai ulang proyek.
- Jangan membangun ulang fitur yang sudah benar.
- Jangan mengubah keputusan frozen tanpa persetujuan owner.
- Jangan masuk v1.3 sebelum hasil audit menyatakan GO.
- Jangan masuk phase atau module berikutnya tanpa perintah.
- Jangan menambahkan fitur di luar scope aktif.
- Jangan melakukan refactor seluruh repository.
- Jangan mengubah landing page saat mengerjakan transaksi,
  kecuali ditemukan bug nyata yang berada dalam scope.
- Jangan menggunakan gambar AI untuk produk, Hero, Featured,
  Trending, kategori, atau campaign kecuali diminta langsung oleh owner.
- Jangan menyimpan credential, secret, atau file .env ke GitHub.

---

## 9. Verifikasi Wajib

Setelah perubahan, jalankan yang tersedia:

- database smoke test;
- typecheck;
- lint;
- test terkait;
- regression test;
- npm run build.

Periksa juga:

- console browser;
- log Vercel;
- RLS dan permission;
- responsive desktop/mobile;
- broken route;
- broken image;
- duplicate order;
- duplicate payment;
- loading, empty, success, dan error state.

Jangan menyatakan pekerjaan selesai jika build atau alur utama belum diuji.

---

## 10. Handoff Wajib

Sebelum berhenti, perbarui:

- docs/DEBRODER_MASTER_STATE.md
- docs/CURRENT_PHASE_HANDOFF.md

CURRENT_PHASE_HANDOFF.md wajib mencatat:

- scope aktif;
- pekerjaan selesai;
- pekerjaan belum selesai;
- file berubah;
- migration local/remote;
- migration applied/pending;
- hasil typecheck, lint, test, dan build;
- bug atau risiko tersisa;
- langkah berikutnya;
- status GO atau NO-GO.

Berikan laporan akhir singkat dan faktual.
Jangan menyatakan COMPLETE jika statusnya baru IMPLEMENTED atau belum diverifikasi.