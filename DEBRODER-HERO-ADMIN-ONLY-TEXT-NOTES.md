# DEBRODER Hero Admin-Only Text Fix

Perubahan:
- Hero landing dan page hero tidak lagi memakai teks fallback/default dari kode.
- Jika admin tidak mengisi label/title/subtitle/button, hero tampil gambar saja.
- Teks hero hanya tampil kalau berasal dari data admin/CMS.
- Gambar fallback tetap tersedia agar layout tidak rusak.
- SQL opsional tersedia di `supabase/fix-admin-only-hero-text.sql` untuk membersihkan teks lama di Supabase tanpa menghapus gambar.

Cara pakai:
1. Deploy ZIP ini.
2. Buka admin Page Hero/CMS dan isi teks hanya pada hero yang memang ingin diberi teks.
3. Jika teks lama masih muncul, jalankan `supabase/fix-admin-only-hero-text.sql`.
