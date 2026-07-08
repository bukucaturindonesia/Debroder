# DEBRODER - Catatan Fix Hari Ini

Fokus perbaikan: versi aman untuk ditunjukkan hari ini.

## Yang diperbaiki

1. `product_categories` tidak lagi otomatis dibuat dari `service_categories`.
2. Kategori utama PIM dikunci ke 7 kategori:
   - Kaos Polos
   - Jaket & Hoodie
   - Headwear
   - Sablon DTF
   - Jersey
   - Cetak Sublim
   - Maklon DTF
3. Subkategori lama seperti Hoodie, Jacket, Jersey Futsal, Jersey Basket, Kaos Cotton Combed, Topi, dan DTF A4/A3/meteran tidak lagi aktif sebagai kategori utama.
4. Section `Pakaian Polos berdasarkan Kategori` default disembunyikan agar homepage lebih bersih.
5. Path icon email diperbaiki dari `mail.svg` menjadi `email.svg`.

## Supabase

Kalau database lama sudah terlanjur berisi kategori utama yang salah, jalankan file berikut di SQL Editor Supabase:

```sql
supabase/pim-category-architecture.sql
```

File tersebut tidak menghapus produk. Fokusnya merapikan arsitektur kategori dan memindahkan tipe produk menjadi subkategori.

## Catatan build

Build penuh tidak dijalankan di environment ini karena dependency npm tidak bisa diunduh. Perubahan yang dibuat bersifat kecil dan statis: SQL seed, default setting, dan path icon.
