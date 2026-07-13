# DEBRODER v1.2 Phase 3A — Mockup Approval Foundation

## Database

Migration `mockup_approval_foundation_phase_3a` sudah diterapkan ke Supabase aktif.

### Tabel

- mockup_sets
- mockup_parts
- mockup_files
- mockup_approval_history

### Penyimpanan

File disimpan pada bucket privat `customer-designs`.

Jalur:
`mockups/{quotation_id}/{mockup_set_id}/{mockup_part_id}/{timestamp}-{filename}`

File dibuka menggunakan signed URL 10 menit. Tidak ada URL publik permanen.

## Aturan bisnis

- Mockup baru hanya dapat dibuat setelah penawaran berstatus approved.
- Setiap bagian dapat dikaitkan dengan produk quotation.
- Bagian dapat ditandai wajib atau opsional.
- File baru selalu menjadi versi baru dan tidak menimpa file lama.
- Mockup hanya dapat ditandai siap diperiksa ketika seluruh bagian wajib memiliki file terbaru.
- Pengiriman dan keputusan pelanggan belum diaktifkan pada 3A.

## Siklus data

Mockup:
Tambah → Lihat → Edit → Arsipkan → Gudang Arsip → Pulihkan → Hapus Permanen.

Bagian desain:
Tambah → Lihat → Edit → Arsipkan → Gudang Arsip → Pulihkan → Hapus Permanen.

File:
Unggah → Lihat → Riwayat Versi.

File versi bersifat immutable dan tidak mempunyai edit/delete biasa karena merupakan audit desain.

## Akses

Detail Penawaran → Mockup & Persetujuan.

Tidak ada URL manual dan tidak ada tombol floating.

## Role

- Staff quotation: tambah, edit, upload, arsip, restore.
- Owner/Super Admin: hapus permanen.
- Proteksi juga ditegakkan pada fungsi database dan RLS.

## Verifikasi

1. Gunakan quotation berstatus Disetujui Pelanggan.
2. Klik Mockup & Persetujuan.
3. Tambah mockup.
4. Edit mockup.
5. Tambah bagian desain.
6. Edit bagian.
7. Unggah PNG/JPG/WEBP/PDF.
8. Buka file melalui signed URL.
9. Unggah file kedua dan pastikan versi lama tetap ada.
10. Tandai siap diperiksa.
11. Arsipkan bagian dan pulihkan.
12. Arsipkan mockup dan pulihkan.
13. Arsipkan kembali dan uji hapus permanen sebagai Super Admin.
14. Pastikan quotation non-approved tidak dapat membuat mockup baru.
15. Uji desktop dan mobile.
16. Jalankan typecheck, lint, test, build.

## Deferred

Phase 3B:
- link publik aman;
- kirim mockup kepada pelanggan;
- setuju per bagian;
- minta revisi per bagian;
- riwayat keputusan pelanggan;
- semua bagian wajib disetujui.

Phase 4:
- konversi menjadi pesanan.
