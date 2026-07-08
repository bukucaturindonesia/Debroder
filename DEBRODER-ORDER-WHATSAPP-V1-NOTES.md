# DEBRODER Order WhatsApp V1

Tanggal: 2026-07-08

## Tujuan
Memaksimalkan sistem pemesanan tanpa checkout rumit. Order akhir tetap via WhatsApp, keranjang dipakai sebagai keranjang konsultasi yang rapi.

## Yang diterapkan

1. Keranjang belanja baru
   - Produk pertama menjadi **Pesanan Utama**.
   - Produk berikutnya menjadi **Item Tambahan**.
   - Pesanan Utama selalu tampil paling atas.

2. Layanan tambahan
   - Checkbox layanan di setiap item.
   - Harga normal layanan dihitung per pcs.
   - Layanan default:
     - Sablon DTF Depan Kecil — Rp 15.000 / pcs
     - Bordir Komputer Logo Kecil — Rp 20.000 / pcs
     - Sablon DTF Belakang Besar — Rp 25.000 / pcs
     - Bordir Komputer Logo Besar — Rp 30.000 / pcs
     - Sublim Printing — Rp 35.000 / pcs

3. Estimasi biaya
   - Jika hanya produk: tampil **Total** sesuai harga produk.
   - Jika pakai layanan: tampil **Estimasi Normal** = produk + layanan.
   - Ada teks: harga final bisa lebih hemat setelah admin cek desain, jumlah, dan kebutuhan produksi.

4. CTA WhatsApp dinamis
   - Produk saja: **Pesan Produk via WhatsApp**.
   - Produk + layanan: **Pesan dan Dapatkan Harga Terbaik Kami**.

5. Rekomendasi tambahan
   - Muncul di bawah Pesanan Utama.
   - Rekomendasi tidak otomatis masuk keranjang.
   - Pelanggan harus klik Tambah.

6. Halaman keranjang penuh
   - Tambah route: `/keranjang`.
   - `/order` dialihkan ke `/keranjang` agar tidak memakai form order lama.

7. Penyimpanan
   - Keranjang disimpan di browser/localStorage.
   - Tidak perlu login pelanggan.
   - Cabang tujuan tidak dimunculkan di V1.

## File utama yang berubah
- `components/CartProvider.tsx`
- `components/ProductCatalog.tsx`
- `app/produk/[slug]/page.tsx`
- `app/page.tsx`
- `components/ProductRecommendationDrawer.tsx`
- `app/keranjang/page.tsx`
- `app/order/page.tsx`
- `lib/order.ts`
- `app/sitemap.ts`
- `components/SiteHeader.tsx`

## Cara cek setelah deploy
1. Buka halaman produk/koleksi.
2. Klik Tambah ke Keranjang.
3. Pastikan item pertama muncul sebagai Pesanan Utama.
4. Centang layanan Sablon/Bordir.
5. Pastikan Estimasi Normal berubah.
6. Klik WhatsApp dan cek format pesan.
7. Buka `/keranjang` untuk cek tampilan halaman penuh.
