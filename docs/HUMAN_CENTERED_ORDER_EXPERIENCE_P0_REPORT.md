# DEBRODER Human-Centered Order Experience P0 — Implementation Report

Tanggal source: 20 Juli 2026  
Source dasar: `Debroder(20).zip`  
Status: **SOURCE IMPLEMENTED / STATICALLY VERIFIED / PREVIEW REQUIRED**

## Tujuan

Pekerjaan ini tidak mengubah keputusan bisnis owner dan tidak mengulang Phase 0–13. Fokusnya adalah menyajikan mesin order yang sudah kompleks dalam alur yang dapat dipahami manusia:

- satu fakta tahap untuk pelanggan dan Admin;
- seluruh urutan proses tetap terlihat;
- satu tahap aktif, satu tanggung jawab, dan satu tindakan utama;
- tindakan masa depan atau kedaluwarsa tidak ditampilkan sebagai aksi utama;
- Admin Task Inbox membuka pekerjaan yang benar, bukan sekadar halaman umum;
- pelanggan melihat perjalanan pesanan sejak checkout;
- tata letak Admin tetap dapat dibaca tanpa zoom-out;
- nomor pengiriman internal DEBRODER dibuat otomatis, sedangkan resi tetap berasal dari kurir.

## Implementasi utama

### 1. Perjalanan pelanggan sejak checkout

`lib/order-journey.ts` menjadi penyusun urutan manusiawi untuk Ready Stock dan Custom. `CustomerOrderStatusCard` menampilkan seluruh tahap secara urut dengan keadaan:

- `Selesai`;
- `Saat Ini`;
- `Berikutnya`;
- `Dihentikan`;
- `Tidak Dilanjutkan`.

Order yang dibatalkan tetap menampilkan `Pesanan Dibuat`, lalu `Pesanan Dibatalkan`, dan tahap berikutnya ditandai tidak dilanjutkan. Sistem tidak berpura-pura bahwa produksi atau pengiriman masih akan berjalan.

### 2. Admin Guided Workflow

`AdminGuidedOrderFlow` menjadi cockpit operasional yang terlihat pada detail order. Tampilan menjawab secara berurutan:

1. tahap saat ini;
2. penanggung jawab;
3. pekerjaan yang harus dilakukan;
4. hambatan nyata;
5. satu tindakan utama;
6. tahap berikutnya;
7. seluruh urutan proses.

Workspace lama tetap dipertahankan sebagai module-integrity guard React #130, tetapi tidak lagi dirender paralel dan tidak lagi menciptakan beberapa cockpit yang saling bersaing.

### 3. Terminal-order safety

Order `cancelled`, `expired`, atau `completed` tidak menampilkan aksi produksi, packing, atau pengiriman. Jika order terminal masih memiliki pembayaran pending/rejected, satu-satunya tindakan pengecualian adalah menyelesaikan pemeriksaan pembayaran. Ini memperbaiki kondisi seperti order dibatalkan tetapi masih menawarkan pembuatan pengiriman.

### 4. Fulfillment terpandu

Detail fulfillment menampilkan satu tindakan normal berdasarkan status aktual:

- `preparing` → Persiapan Selesai, Mulai Pengemasan;
- `packing` tanpa final check → Lakukan Pengecekan Akhir;
- `packing` terverifikasi → Siap Dikirim / Siap Diambil;
- `ready_to_ship` tanpa kurir/resi → Isi Kurir & Resi Resmi;
- `ready_to_ship` lengkap → Tandai Diserahkan ke Kurir;
- `shipped` → Dalam Perjalanan;
- `in_transit` → Diterima;
- `ready_for_pickup` → Serah Terima;
- pickup bayar di toko → pembayaran dan serah terima atomik.

Tindakan masalah, pembatalan, dan recovery tetap tersedia tetapi ditempatkan di bagian `Tindakan pengecualian`, bukan disetarakan dengan alur normal.

### 5. Nomor pengiriman otomatis

Migration `20260720030000_human_centered_order_experience_p0.sql` menambahkan helper idempotent yang membuat fulfillment Ready Stock dan nomor internal DEBRODER secara otomatis setelah syarat siap dipenuhi.

Proteksi:

- hanya `public_checkout`;
- hanya Ready Stock, bukan Custom/Jersey Custom;
- tidak untuk order terminal;
- tidak untuk order dengan pembatalan aktif;
- item order wajib tersedia;
- WhatsApp wajib terkonfirmasi;
- shipping dan pickup transfer wajib dibayar;
- pickup bayar di toko wajib memiliki reservasi aktif;
- satu idempotency key per order;
- existing fulfillment aktif digunakan kembali;
- migration backfill hanya memanggil helper yang sama dan tetap idempotent.

Nomor internal diberi label `Nomor Pengiriman DEBRODER`. `Nomor Resi Kurir` tetap merupakan nomor resmi dari kurir, scan, atau API logistik dan tidak diisi dengan nomor internal.

### 6. Task Inbox langsung ke pekerjaan

Tombol utama diganti menjadi `Kerjakan Sekarang` dan membuka:

- `#guided-workflow` untuk detail order;
- `#guided-action` untuk fulfillment.

Pengelolaan status task ditempatkan sebagai kontrol sekunder. Penyelesaian proses bisnis tetap dilakukan di tahap operasional yang benar.

### 7. Reliabilitas tombol dan pembayaran

- Tombol utama memiliki keadaan memproses dan disabled saat request berjalan.
- Error status lama memuat ulang kondisi terbaru dan menjelaskan bahwa tahap mungkin sudah berubah.
- Payment manager mendengarkan perubahan hash sehingga deep-link `#payment` tetap membuka pemeriksaan meskipun navigasi terjadi setelah komponen mount.
- Detail fulfillment memuat `payment_method` dan `payment_status` dari order sehingga aksi pickup bayar di toko tidak dibentuk dari nilai yang hilang.

### 8. Tata letak responsif

- sidebar desktop dipadatkan tanpa mengubah struktur navigasi;
- content container memakai `min-width: 0`, wrapping, dan batas media/form;
- header action tersusun vertikal di mobile dan wrap di desktop;
- tabel pada viewport sampai 1279 px memiliki scroll lokal, bukan memaksa seluruh halaman di-zoom out;
- kartu tahapan, Task Inbox, fulfillment, dan detail order menggunakan grid `minmax(0,1fr)` dan susunan mobile terpisah.

## Batasan dan hal yang tidak diubah

- Tidak menghapus fitur, route, tabel, histori, audit, atau workspace source lama.
- Tidak mengubah aturan verifikasi dana: bukti pelanggan bukan sumber kebenaran dana.
- Tidak membuat resi kurir palsu.
- Tidak menerapkan migration ke Supabase remote.
- Tidak commit, push, merge, atau deploy GitHub/Vercel.
- Tidak menyatakan production-ready sebelum migration Preview, full dependency gates, dan browser E2E lulus.

## Quality gates yang dijalankan

- isolated TypeScript/TSX syntax;
- internal import existence;
- 18 static contract checks;
- canonical resolver execution untuk `processing + paid + fulfillment preparing`;
- cancelled journey execution;
- SQL forward-only/static safety;
- schema production read-only verification untuk kolom, constraints, indexes, dan RPC dependencies;
- `git diff --check` untuk manifest perubahan.

Full TypeScript, ESLint, Vitest melalui dependency repo, Next.js build, PostgreSQL compilation, serta browser E2E masih wajib dijalankan oleh owner pada repository/Preview.
