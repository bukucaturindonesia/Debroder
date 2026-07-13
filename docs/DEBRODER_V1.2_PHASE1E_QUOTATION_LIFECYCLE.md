# DEBRODER v1.2 Phase 1E — Complete Quotation Lifecycle

## Database

Migration `quotation_lifecycle_phase_1e` telah diterapkan ke Supabase aktif.

Penambahan:
- quotations.archived_at
- quotations.archived_by
- quotations.archive_reason
- archive_quotation()
- restore_quotation()
- permanently_delete_quotation()
- transition_quotation_status() diperkuat agar mengabaikan produk dan layanan yang diarsipkan

## Siklus lengkap

Tambah → Lihat → Edit → Status Workflow → Arsipkan → Gudang Arsip → Pulihkan → Hapus Permanen.

## Edit quotation

Hanya saat Draft:
- data pelanggan
- perusahaan
- WhatsApp dan email
- nomor PO
- masa berlaku
- alamat
- biaya tambahan
- potongan
- catatan pelanggan
- catatan internal

Total dihitung ulang setelah biaya atau potongan berubah.

## Status workflow

- draft → submitted
- submitted → under_review atau draft
- under_review → pricing atau submitted
- pricing → sent atau under_review
- sent → approved, revision_requested, rejected, expired
- converted_to_order tetap deferred sampai Phase 4

Catatan wajib mengikuti validasi database.

## Arsip

Daftar aktif hanya menampilkan quotation yang belum diarsipkan.
Gudang Arsip dapat diakses dari tombol pada halaman Formal Quotation.

- Restore: staff quotation
- Permanent delete: owner, superadmin, super_admin
- Permanent delete hanya dapat dilakukan setelah quotation diarsipkan

## Jalur akses

Formal Quotation → Gudang Arsip
Detail Quotation → Kelola Quotation

## Verifikasi wajib

1. Edit quotation Draft dan simpan.
2. Pastikan biaya/potongan mengubah total.
3. Jalankan status sampai sent menggunakan alur yang valid.
4. Uji validasi pending price sebelum approved.
5. Arsipkan quotation.
6. Pastikan hilang dari daftar aktif.
7. Buka Gudang Arsip.
8. Pulihkan quotation.
9. Arsipkan ulang.
10. Hapus permanen dengan Super Admin.
11. Uji role non-Super Admin tidak melihat permanent delete.
12. Uji desktop, mobile, refresh, logout/login.
13. Jalankan typecheck, lint, test, build.
