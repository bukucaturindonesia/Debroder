# DEBRODER PIM/CMS Fix Notes

Masalah yang terlihat: kartu di halaman `/jersey` tampil di website publik, tetapi admin/PIM/CMS sulit ditemukan.

Penyebab:
- Kartu seperti Jersey Badminton, Jersey Basket, dan Jersey Voli berasal dari tabel `service_categories`.
- Di admin lama, menu `service_categories` ada di `/admin/categories`, tetapi tidak masuk sidebar utama, sehingga terlihat seperti tidak tersedia di admin.

Perbaikan di kode:
- Menu sidebar admin sekarang menampilkan `Kategori / Model`.
- `Kategori / Model` mengarah ke tabel `service_categories`.
- Dashboard quick edit juga menampilkan akses ke `Kategori / Model`, `Layanan`, dan `Store`.

Kalau data jersey tetap tidak muncul setelah deploy:
1. Buka Supabase.
2. Masuk SQL Editor.
3. Jalankan file: `supabase/sync-jersey-categories-to-admin.sql`.
4. Setelah itu buka `/admin/categories` atau menu `Kategori / Model`.

Catatan:
- Halaman `/jersey` memakai `category_key = 'jersey'`.
- Untuk menambah kartu baru di halaman jersey, isi:
  - Nama kategori
  - Slug detail
  - Link halaman: `jersey`
  - Kunci kategori: `jersey`
  - Gambar kategori
  - Status aktif: true
