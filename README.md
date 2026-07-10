# DEBRODER Trust & Tentang Singleton V15

Perubahan permanen agar CMS Trust & Tentang hanya memiliki satu data resmi.

## File yang berubah
- `components/admin/AdminDashboard.tsx`
- `lib/public-data.ts`
- `supabase/schema.sql`

## SQL satu kali
Jalankan `supabase/fix-trust-about-singleton.sql` di Supabase SQL Editor setelah deploy.
SQL memilih data aktif yang paling baru, menghapus duplikat lama, lalu membuat unique index yang mencegah data kedua.

## Hasil
- Admin langsung membuka data Trust & Tentang yang sama.
- Tidak ada lagi Tambah Baru atau Hapus untuk section ini.
- Tombol menjadi `Simpan & Terapkan`.
- Public landing memilih row terbaru secara deterministik.
- Database menolak duplikat baru.
