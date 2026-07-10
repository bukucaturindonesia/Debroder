# DEBRODER Product Gallery — 4 Foto Konsisten

Sistem ini berlaku untuk seluruh produk standar dan seluruh varian warna.

## Urutan tetap

1. `front` — tampak depan / foto utama
2. `back` — tampak belakang / hover desktop
3. `detail` — bahan, kerah, jahitan, sablon, atau bordir
4. `lifestyle` — tampak samping atau produk saat digunakan

Standar master: rasio **4:5**, ukuran **2000 × 2500 px**, JPG/PNG/WebP, maksimum 10 MB.

## Produk tanpa varian

Data tetap kompatibel dengan struktur produk lama:

- `image_url` / `gambar_url` = foto depan
- `gallery_urls[0]` = belakang
- `gallery_urls[1]` = detail
- `gallery_urls[2]` = lifestyle

Kelola melalui **Admin → Produk / PIM → Galeri Produk**. Empat slot dapat dipilih dari Media Library atau di-upload langsung. Produk aktif wajib lengkap 4/4; produk yang belum lengkap dapat disimpan sebagai nonaktif.

## Produk dengan varian warna

Kelola melalui **Admin → PIM V2 → Varian → Galeri Per Varian Warna**.

Setiap warna mempunyai empat slot sendiri. Ketika pelanggan memilih warna di halaman detail, seluruh galeri otomatis berubah mengikuti warna tersebut. Foto depan varian juga dipakai untuk keranjang.

Jalankan migration berikut sekali setelah tabel PIM V2 tersedia:

```text
supabase/product-gallery-4-photo-system.sql
```

Migration menambahkan `image_role`, mengatur peran empat foto lama secara deterministik, membatasi empat slot terstruktur per varian, dan menjaga satu cover per warna. Migration tidak menghapus file Media Library atau data produk.

## Perilaku publik

- Katalog desktop: depan → belakang saat hover, transisi 300 ms.
- Katalog mobile: hanya foto depan agar ringan.
- Detail desktop: grid dua kolom, maksimal empat foto, panel pembelian sticky.
- Detail mobile: carousel swipe + scroll snap + indikator.
- Klik foto: lightbox.
- Foto kosong tidak menghasilkan broken image.

## Alur upload yang direkomendasikan

1. Upload semua foto ke **Media Library**.
2. Buka produk di Admin/PIM.
3. Isi slot Depan, Belakang, Detail, Lifestyle.
4. Periksa indikator 4/4.
5. Untuk produk berwarna, ulangi empat slot pada setiap varian.
6. Aktifkan produk setelah galeri dan data produk lengkap.
