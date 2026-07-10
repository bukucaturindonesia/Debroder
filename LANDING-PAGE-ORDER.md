# Urutan Landing Page DEBRODER

Urutan publik dikunci di DOM agar urutan visual, keyboard, screen reader, dan SEO selalu sama:

1. Hero Slider
2. Keunggulan DEBRODER
3. Featured
4. Shop by Category
5. Trending
6. Fresh Drop
7. Pakaian Polos berdasarkan Kategori
8. Campaign Banner
9. Instagram
10. Store DEBRODER
11. Tentang DEBRODER
12. Footer

## Sinkronisasi database lama

Kode publik sudah menggunakan urutan di atas tanpa bergantung pada nilai lama database. Untuk merapikan nilai `sort_order` yang terlihat di admin, jalankan sekali melalui Supabase SQL Editor:

`supabase/fix-landing-page-order.sql`

SQL tersebut hanya memperbarui angka urutan. Konten, gambar, CTA, status visibility, dan media tidak diubah.
