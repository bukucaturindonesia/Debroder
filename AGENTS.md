# DEBRODER PROJECT GOVERNANCE

Dokumen ini adalah instruksi utama untuk seluruh pekerjaan Codex pada
repository DEBRODER.

Instruksi ini wajib dipatuhi sebelum audit, revisi kode, perubahan database,
implementasi fitur, deployment, atau pemberian status progres.

---

## 1. DOKUMEN YANG WAJIB DIBACA

Setelah membaca AGENTS.md, baca dokumen berikut dari root repository:

1. DEBRODER_Landing_Page_Blueprint_v1.0.docx
2. DEBRODER_COMMERCE_BLUEPRINT_FINAL.docx
3. DEBRODER_Blueprint Panel Admin_v1.0-v1.3_FROZEN.txt
4. DEBRODER_MASTER_STATE.md
5. CURRENT_PHASE_HANDOFF.md
6. DEBRODER_V1.2_ISSUE_REGISTER.md

Jangan mulai bekerja sebelum seluruh dokumen yang relevan telah diperiksa.

Jika sebuah dokumen tidak dapat dibaca, tidak ditemukan, rusak, atau namanya
berbeda, laporkan kepada owner. Jangan menebak isi dokumen yang tidak terbaca.

---

## 2. KEWENANGAN SETIAP DOKUMEN

### DEBRODER Landing Page Blueprint

Mengatur khusus pengalaman landing page atau homepage, termasuk:

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
- urutan section;
- CMS dan PIM ownership pada landing page;
- media desktop dan mobile;
- responsive behavior;
- native scrolling;
- quality gate landing page.

Landing Page Blueprint tidak boleh digunakan untuk mengubah aturan transaksi,
produksi, inventory, atau panel admin.

### DEBRODER Commerce Blueprint

Mengatur pengalaman pelanggan setelah keluar dari landing page, termasuk:

- mini landing kategori;
- Koleksi;
- Jersey;
- Kaos Polos;
- Jaket dan Hoodie;
- Headwear;
- Sablon DTF;
- Cetak Sublim;
- katalog;
- filter dan sorting;
- detail produk;
- Ready Stock;
- Custom Order;
- cart;
- checkout;
- quotation;
- pembayaran penuh;
- pembayaran DP;
- akun pelanggan;
- approval mockup;
- tracking;
- complaint;
- repeat order;
- search;
- SEO publik;
- route commerce.

Commerce Blueprint tidak menggantikan Landing Page Blueprint atau aturan
operasional panel admin.

### DEBRODER Blueprint Panel Admin v1.0–v1.3

Mengatur sistem internal dan operasional, termasuk:

- panel admin;
- PIM;
- CMS administration;
- quotation;
- mockup approval;
- order management;
- payment management;
- Job Order;
- Work Item;
- production;
- quality control;
- shipping dan pickup;
- role dan permission;
- audit log;
- repeat order;
- inventory;
- procurement;
- production planning;
- aturan database dan status internal.

### DEBRODER_MASTER_STATE.md

Digunakan untuk mengetahui kondisi besar proyek saat ini.

Dokumen ini mencatat status, tetapi tidak boleh mengubah keputusan desain atau
aturan bisnis yang sudah FROZEN.

### CURRENT_PHASE_HANDOFF.md

Digunakan untuk mengetahui pekerjaan terakhir, file yang berubah, hasil tes,
migration, risiko, dan langkah berikutnya.

Handoff adalah sumber status pekerjaan terbaru, bukan sumber desain baru.

### DEBRODER_V1.2_ISSUE_REGISTER.md

Digunakan untuk mencatat bug, konflik, risiko, blocker, dan pekerjaan yang
belum terverifikasi.

Issue Register tidak boleh digunakan untuk menambahkan scope baru secara
diam-diam.

---

## 3. ATURAN PENYELESAIAN KONFLIK

Ketiga blueprint memiliki wilayah kewenangan berbeda dan tidak boleh dicampur.

Jika ditemukan konflik:

1. Identifikasi wilayah konflik.
2. Tentukan blueprint yang berwenang pada wilayah tersebut.
3. Bandingkan dengan implementasi aktual.
4. Jangan menganggap kode saat ini otomatis benar.
5. Jangan menganggap dokumen status dapat menggantikan blueprint FROZEN.
6. Jangan membuat route, halaman, tabel, status, atau alur baru berdasarkan
   asumsi.
7. Dokumentasikan konflik dengan bukti file, route, tabel, atau fungsi terkait.
8. Laporkan kepada owner sebelum melakukan perubahan yang mengubah keputusan
   FROZEN.

Keputusan FROZEN hanya dapat diubah melalui persetujuan eksplisit owner.

---

## 4. STATUS PROYEK SAAT INI

Status resmi:

- Implementasi DEBRODER v1.0 sampai v1.2 sudah tersedia.
- Implementasi sudah pernah dideploy ke Vercel.
- v1.0 sampai v1.2 belum boleh dinyatakan COMPLETE.
- Pengujian menyeluruh dan audit end-to-end belum selesai.
- Tidak boleh menyatakan seluruh fitur sudah lolos pengujian.
- Pekerjaan aktif adalah DEBRODER v1.2 DEEP AUDIT & STABILIZATION.
- DEBRODER v1.3 belum boleh dimulai.
- v1.3 hanya boleh dimulai setelah audit menghasilkan status GO dari owner.

Jangan menyamakan:

- IMPLEMENTED;
- VERIFIED;
- DEPLOYED;
- COMPLETE.

Definisi status:

- IMPLEMENTED: kode atau migration sudah tersedia.
- VERIFIED: fungsi telah diuji dengan bukti dan hasilnya lulus.
- DEPLOYED: perubahan telah tersedia pada environment tujuan.
- COMPLETE: seluruh acceptance criteria, regresi, keamanan, build, database,
  dan alur end-to-end telah diverifikasi serta disetujui owner.

Deployment bukan bukti bahwa sebuah fitur COMPLETE.

---

## 5. ATURAN COMMERCE YANG TIDAK BOLEH DILANGGAR

Semua produk secara konsep mendukung:

1. Ready Stock
2. Custom Order

Admin dapat mengatur produk menjadi:

- ready_stock_only;
- custom_only;
- hybrid.

### Ready Stock

Ready Stock menggunakan:

- harga aktual;
- SKU aktual;
- stok aktual;
- varian aktual;
- ukuran aktual;
- Tambah ke Keranjang;
- Beli Sekarang;
- checkout melalui sistem.

### Custom Order

Custom Order dapat menggunakan:

- kebutuhan terstruktur;
- pilihan produk dasar;
- jumlah;
- ukuran;
- layanan;
- upload file;
- catatan;
- quotation;
- mockup approval;
- pembayaran penuh atau DP;
- produksi.

### Custom Jersey

Custom Jersey wajib menggunakan Jersey Configurator.

Custom Jersey tidak boleh dialihkan ke form Custom generik apabila kebutuhannya
memerlukan konfigurasi jersey.

### WhatsApp

WhatsApp hanya digunakan untuk:

- konsultasi;
- bantuan;
- notifikasi;
- pengiriman link;
- komunikasi pendukung.

WhatsApp tidak boleh menjadi jalur utama pembuatan transaksi.

### Order dan Payment

- Order dibuat sebelum pembayaran.
- Order langsung tercatat sebagai unpaid setelah checkout dikonfirmasi.
- Pembayaran penuh atau DP memperbarui order yang sama.
- Payment retry tidak boleh membuat order baru.
- Klik ganda tidak boleh membuat order atau payment ganda.
- Callback atau webhook berulang harus bersifat idempotent.
- Order gagal bayar tidak boleh hilang.

---

## 6. ROUTE RESMI

Route detail produk universal:

- /produk/[slug]

Jangan membuat route detail produk kedua untuk kategori tertentu.

Route commerce utama:

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

Kartu katalog dari kategori mana pun harus menuju route detail produk resmi.

Jangan membuat halaman baru yang tidak memiliki:

- tujuan jelas;
- sumber data jelas;
- CTA masuk;
- CTA keluar;
- owner CMS atau PIM;
- empty state;
- loading state;
- error state;
- route yang terdokumentasi.

---

## 7. PEMISAHAN CMS, PIM, DAN TRANSAKSI

### CMS mengelola

- headline;
- copy;
- hero;
- poster;
- campaign;
- CTA;
- category navigation;
- portfolio;
- urutan section;
- visibility;
- draft;
- publish;
- schedule;
- archive;
- pemilihan produk unggulan dari PIM.

### PIM mengelola

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
- Ready Stock availability;
- Custom availability;
- status produk.

### Sistem transaksi mengelola

- cart;
- quotation;
- checkout;
- order;
- payment;
- mockup approval;
- Job Order;
- Work Item;
- production;
- quality control;
- fulfillment;
- notification;
- repeat order.

CMS tidak boleh menjadi sumber harga, SKU, varian, atau stok.

Jangan membuat sumber data kedua untuk informasi produk yang sudah dimiliki PIM.

---

## 8. ATURAN DATABASE

- Jangan reset database.
- Jangan menghapus database.
- Jangan menghapus tabel atau data.
- Jangan menghapus migration history.
- Jangan mengubah migration lama yang sudah diterapkan ke remote.
- Jangan menjalankan ulang migration lama yang sudah berhasil.
- Jangan menghapus function, trigger, policy, index, atau RLS tanpa audit.
- Jangan menonaktifkan RLS untuk mempercepat implementasi.
- Jangan menggunakan service role pada client.
- Jangan memasukkan secret atau service-role key ke repository.
- Jangan menjalankan SQL destruktif tanpa persetujuan owner.

Jika diperlukan koreksi database:

1. Audit kondisi local dan remote.
2. Catat migration yang sudah applied dan pending.
3. Buat migration koreksi baru.
4. Buat perubahan kecil dan terisolasi.
5. Gunakan pendekatan aman dan idempotent jika memungkinkan.
6. Uji migration pada environment yang aman.
7. Dokumentasikan rollback atau recovery plan.

---

## 9. ATURAN DEEP AUDIT

Audit dilakukan sebelum perbaikan besar.

Urutan audit:

1. Landing Page
2. Commerce Publik
3. Cart dan Checkout
4. Order dan Payment
5. Quotation dan Mockup Approval
6. Admin dan Operasional
7. Production dan QC
8. Shipping dan Pickup
9. Role, Permission, dan RLS
10. Repeat Order
11. Database dan Migration
12. Build, TypeScript, Regression, dan Deployment

Pada tahap audit read-only:

- jangan langsung memperbaiki kode;
- jangan melakukan refactor;
- jangan menjalankan migration;
- jangan menambah fitur;
- catat bukti terlebih dahulu.

Klasifikasi temuan:

### BLOCKER

Contoh:

- transaksi tidak dapat selesai;
- order hilang;
- payment ganda;
- data rusak;
- permission bocor;
- RLS dapat dilewati;
- build gagal;
- migration tidak aman.

### MAJOR

Contoh:

- fitur tersedia tetapi hasilnya salah;
- status tidak sinkron;
- total harga salah;
- stok salah;
- route utama rusak;
- mockup approval tidak dapat digunakan.

### MINOR

Contoh:

- masalah spacing;
- label kurang jelas;
- responsive kurang rapi;
- state UI kurang lengkap tetapi transaksi masih berjalan.

### DEFERRED

Contoh:

- fitur baru;
- peningkatan v1.1 Commerce;
- personalisasi;
- loyalty;
- referral;
- advanced recommendation;
- pekerjaan v1.3.

DEFERRED tidak boleh dikerjakan saat stabilisasi v1.2.

---

## 10. LARANGAN UMUM

- Jangan memulai ulang proyek.
- Jangan membangun ulang modul yang sudah benar.
- Jangan melakukan refactor seluruh repository.
- Jangan menambah fitur di luar scope aktif.
- Jangan mengubah keputusan FROZEN.
- Jangan masuk v1.3.
- Jangan menghapus fitur lama tanpa audit regresi.
- Jangan mengganti route resmi tanpa migration dan redirect plan.
- Jangan mengubah landing page saat mengaudit modul transaksi, kecuali
  ditemukan bug nyata yang berhubungan langsung.
- Jangan menggunakan gambar AI untuk produk, kategori, Hero, Trending,
  Featured, atau campaign tanpa permintaan langsung owner.
- Jangan menyimpan file .env, password, token, atau credential di GitHub.
- Jangan menyatakan bug selesai hanya karena kode telah diubah.
- Jangan menyatakan COMPLETE tanpa bukti pengujian.

---

## 11. VERIFIKASI WAJIB

Setelah perubahan yang diizinkan, jalankan pemeriksaan yang tersedia:

- git status;
- git diff;
- database smoke test;
- migration status;
- TypeScript typecheck;
- lint;
- unit test terkait;
- integration test terkait;
- regression test;
- npm run build.

Periksa juga:

- console browser;
- log Vercel;
- broken route;
- broken image;
- responsive desktop;
- responsive mobile;
- loading state;
- empty state;
- success state;
- error state;
- duplicate order;
- duplicate payment;
- RLS;
- role dan permission;
- signed URL;
- upload file;
- callback dan webhook.

Jika sebuah perintah tidak tersedia atau gagal karena environment, laporkan
secara faktual. Jangan mengarang hasil pengujian.

---

## 12. HANDOFF WAJIB

Sebelum berhenti, perbarui dokumen yang relevan:

- DEBRODER_MASTER_STATE.md
- CURRENT_PHASE_HANDOFF.md
- DEBRODER_V1.2_ISSUE_REGISTER.md

CURRENT_PHASE_HANDOFF.md wajib mencatat:

- tanggal pekerjaan;
- scope aktif;
- pekerjaan yang diperiksa;
- pekerjaan yang diubah;
- pekerjaan yang belum selesai;
- file yang berubah;
- route yang berubah;
- migration local;
- migration remote;
- migration applied;
- migration pending;
- hasil typecheck;
- hasil lint;
- hasil test;
- hasil build;
- hasil deployment;
- bug dan risiko tersisa;
- langkah berikutnya;
- status GO atau NO-GO.

Jangan menulis COMPLETE apabila status sebenarnya baru IMPLEMENTED,
PARTIALLY VERIFIED, atau DEPLOYED.

---

## 13. ATURAN LAPORAN AKHIR

Laporan Codex harus singkat, faktual, dan dapat diverifikasi.

Laporan akhir harus menyebutkan:

1. scope yang dikerjakan;
2. file yang berubah;
3. database atau migration yang berubah;
4. pengujian yang benar-benar dijalankan;
5. hasil pengujian;
6. masalah yang belum selesai;
7. risiko;
8. langkah berikutnya;
9. status akhir.

Tidak boleh menyembunyikan error, test gagal, migration pending, atau
pekerjaan yang belum diverifikasi.