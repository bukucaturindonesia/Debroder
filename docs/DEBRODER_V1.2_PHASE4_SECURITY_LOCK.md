# DEBRODER v1.2 Phase 4 — Security Lock

## Temuan audit

1. Tombol hapus permanen masih muncul untuk role `owner`.
2. Fungsi database juga masih mengizinkan `owner`.
3. Policy `ALL` pada tabel order membuka direct delete.
4. Edit pesanan dilakukan langsung ke tabel sehingga field sensitif berpotensi diubah melalui request manual.
5. Beberapa role operasional belum memiliki akses baca yang konsisten.

## Perbaikan yang sudah diterapkan ke Supabase

Migration:

- `order_conversion_phase_4_security_lock`
- `order_conversion_phase_4_edit_lock`

Perubahan:

- permanent delete hanya `superadmin` dan `super_admin`;
- tidak ada direct DELETE policy pada orders, order_items, services, atau history;
- staff hanya mendapat akses baca sesuai kebutuhan;
- edit metode penyerahan, alamat, dan catatan dipindahkan ke RPC aman;
- RPC hanya bekerja saat order aktif dan status masih `baru`;
- total, status, snapshot, produk, quantity, varian, layanan, dan harga tidak bisa diubah lewat edit biasa;
- perubahan detail dicatat ke riwayat.

## File UI

- `components/admin/OrderArchiveAdmin.tsx`
- `components/admin/OrderDetailAdmin.tsx`

## Verifikasi

1. Owner tidak melihat tombol Hapus Permanen.
2. Super Admin melihat tombol Hapus Permanen.
3. Pesanan wajib diarsipkan sebelum permanent delete.
4. Staff dapat membuka daftar dan detail pesanan.
5. Staff dapat mengubah metode penyerahan, alamat, dan catatan saat status `baru`.
6. Request manual untuk mengubah total atau status langsung ditolak oleh RLS.
7. Item dan layanan order tidak dapat diubah atau dihapus langsung.
8. Vercel build sukses.
