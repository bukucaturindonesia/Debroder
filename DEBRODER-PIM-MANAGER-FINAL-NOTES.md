# DEBRODER PIM Manager Final Fix

Versi ini menerapkan logika PIM yang lebih jelas di admin:

## Menu baru

Tambahan menu:

```text
/admin/pim-manager
```

Fungsinya untuk setup struktur PIM dari admin tanpa harus bingung lagi.

## Logika yang dikunci

```text
Produk   = barang yang dijual
Kategori = kelompok besar produk
Model    = turunan kategori
Layanan  = teknik pengerjaan
```

## Kategori utama produk

Kategori utama PIM dikunci ke:

```text
Kaos Polos
Jersey
Jaket & Hoodie
Polo Shirt
Headwear / Topi
Kemeja
Tas & Aksesori
```

Item seperti Hoodie, Jersey Futsal, Topi Trucker, Kaos Cotton Combed, dan Bordir tidak boleh menjadi kategori utama.

## Model / Subkategori

Model dikelola dari:

```text
/admin/categories
```

Contoh:

```text
Kategori utama: Jersey
Model: Jersey Futsal, Jersey Basket, Jersey Voli, Jersey Badminton
```

## Layanan / Metode produksi

Layanan dikelola dari:

```text
/admin/services
```

Contoh:

```text
Sablon DTF
Bordir Komputer
Sublim Printing
Cutting Polyflex
Maklon DTF
Heat Press
Screen Printing
```

Layanan tidak menjadi kategori utama produk.

## PIM / Produk

Produk dikelola dari:

```text
/admin/products
```

Sekarang form produk lebih jelas:

- wajib pilih kategori utama
- wajib pilih model/subkategori
- bisa centang metode produksi tersedia
- gambar tetap dari Media Library

Metode produksi disimpan di `intent_tags`, jadi tidak perlu menambah kolom database baru.

## Halaman publik baru

Tambahan halaman kategori produk:

```text
/polo-shirt
/kemeja
/tas-aksesori
```

## Cara menerapkan

Setelah deploy, buka:

```text
/admin/pim-manager
```

Klik:

```text
Terapkan Struktur PIM
```

Atau jalankan SQL ini di Supabase SQL Editor:

```text
supabase/pim-manager-final-setup.sql
```

## Urutan input yang benar

```text
1. Store / Cabang
2. Media Library
3. PIM Manager > Terapkan Struktur PIM
4. Kategori / Model
5. Layanan
6. PIM / Produk
```

Untuk demo, input 8-10 produk saja dulu.
