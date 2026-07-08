# DEBRODER Image Crop / Focal Point Fix

Perbaikan ini menambahkan kontrol gambar yang lebih jelas di admin untuk custom card homepage.

## Area yang diperbaiki
- Admin > CMS / Landing Page
- Section custom card seperti Featured, Trending, dan Shop by Category

## Yang sekarang bisa dilakukan admin
- Pilih gambar dari Media Library
- Paste URL gambar manual
- Pilih mode gambar:
  - Cover / isi penuh
  - Contain / gambar utuh
- Atur posisi fokus gambar dengan 9 tombol cepat:
  - kiri atas, atas, kanan atas
  - kiri, tengah, kanan
  - kiri bawah, bawah, kanan bawah
- Geser fokus gambar lebih presisi dengan slider horizontal dan vertikal
- Melihat preview crop 4:5 dan 16:9 sebelum card ditambahkan/disimpan

## Catatan
File asli tidak dipotong. Sistem hanya menyimpan `object-fit` dan `object-position`, sehingga gambar aman dan bisa diatur ulang kapan saja.
