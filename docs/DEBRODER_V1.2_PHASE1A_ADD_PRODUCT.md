# DEBRODER v1.2 — Phase 1A Add Product Item

## Tujuan

Menambahkan produk langsung dari halaman detail Formal Quotation tanpa mengubah database schema.

## Alur

1. Buka detail quotation berstatus Draft.
2. Klik tombol `+ Tambah Produk` di kanan bawah.
3. Pilih produk.
4. Pilih warna/varian.
5. Pilih ukuran.
6. Isi quantity.
7. Periksa preview harga.
8. Klik `Simpan Produk`.
9. Item masuk ke `quotation_items` dan fungsi `refresh_quotation_totals` dijalankan.
10. Halaman dimuat ulang agar daftar item dan ringkasan harga menampilkan data terbaru.

## Pricing

- Mencari tier aktif berdasarkan quantity.
- Jika tier memiliki `quote_required=true` atau harga kosong, item disimpan dengan `pricing_status=pending`.
- Jika harga tersedia, harga tier atau harga dasar ditambah penyesuaian varian dan ukuran.
- Snapshot harga dan identitas produk disimpan ke quotation item.

## Batasan tahap ini

- Hanya menambah item produk.
- Belum mencakup edit/hapus item.
- Belum mencakup layanan custom.
- Hanya quotation berstatus Draft yang dapat ditambah produk.

## File

- `components/admin/QuotationProductItemPanel.tsx`
- `app/admin/orders/quotations/[id]/page.tsx`

## Verifikasi wajib

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## Uji pemilik

- Tambahkan Kaos Cotton Combed 24s minimal 12 pcs.
- Pastikan warna dan ukuran dapat dipilih.
- Pastikan 12–23 pcs menggunakan harga tier Rp42.000 sebelum adjustment.
- Pastikan 100+ tersimpan sebagai harga pending.
- Pastikan item tampil setelah penyimpanan.
- Pastikan ringkasan total berubah.
