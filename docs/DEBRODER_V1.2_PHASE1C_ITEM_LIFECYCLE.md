# DEBRODER v1.2 Phase 1C — Complete Quotation Item Lifecycle

## Status database

Migration `quotation_item_lifecycle_phase_1c` sudah diterapkan ke Supabase aktif.

## Siklus lengkap

Tambah → Lihat → Edit → Arsipkan → Gudang Arsip → Pulihkan → Hapus Permanen.

## Akses

- Edit, arsip, restore: owner, superadmin, super_admin, sales_admin, admin.
- Hapus permanen: owner, superadmin, super_admin.
- Semua perubahan item hanya saat quotation berstatus Draft.
- Keamanan permanent delete ditegakkan di fungsi database, bukan hanya tombol UI.

## Pengelolaan

Tombol `Kelola Produk` berada di header section Produk & Layanan.

Tab:
- Aktif
- Gudang Arsip

Gudang Arsip menampilkan waktu arsip, ID pengarsip, alasan, restore, dan hapus permanen sesuai role.

## Perhitungan

Item yang diarsipkan tidak dihitung dalam subtotal dan total quotation.
Edit, arsip, restore, dan delete permanen menjalankan refresh total.

## Verifikasi

1. Edit quantity/harga/catatan.
2. Arsipkan item dan pastikan hilang dari daftar aktif.
3. Buka Gudang Arsip.
4. Pulihkan item.
5. Arsipkan kembali.
6. Uji hapus permanen dengan Super Admin.
7. Uji role non-Super Admin tidak memiliki tombol permanent delete.
8. Uji quotation non-Draft mengunci perubahan.
9. Jalankan typecheck, lint, test, build.
