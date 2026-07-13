# DEBRODER v1.2 Phase 1D — Complete Custom Service Lifecycle

## Database

Migration `quotation_service_lifecycle_phase_1d` telah diterapkan ke Supabase aktif.

Penambahan:
- archived_at
- archived_by
- archive_reason
- archive_quotation_item_service()
- restore_quotation_item_service()
- permanently_delete_quotation_item_service()
- refresh_quotation_totals() mengabaikan layanan dan produk yang diarsipkan

## Siklus lengkap

Tambah → Lihat → Edit → Arsipkan → Gudang Arsip → Pulihkan → Hapus Permanen.

## Fitur

- Layanan wajib terkait dengan item produk aktif.
- Pilihan layanan berasal dari custom_services aktif.
- Pricing rule diterapkan berdasarkan quantity.
- quote_required menghasilkan status pending.
- requires_review menghasilkan estimasi.
- fixed_per_item dan fixed_per_order didukung.
- Posisi dan catatan tersedia.
- Catatan wajib divalidasi ketika requires_notes aktif.
- Total quotation diperbarui setelah tambah/edit/arsip/restore/delete.
- Layanan yang diarsipkan tidak dihitung dalam total.

## Role

- Tambah/edit/arsip/restore: staff quotation.
- Hapus permanen: owner, superadmin, super_admin.
- Database function juga memeriksa role.
- Semua perubahan hanya untuk quotation Draft.

## Jalur akses

Detail quotation → Produk & Layanan → Kelola Layanan.

Tidak ada URL manual dan tidak ada tombol floating.

## Verifikasi wajib

1. Tambah layanan ke produk.
2. Uji harga tier otomatis.
3. Uji layanan 100+ menjadi pending jika rule quote_required.
4. Edit quantity, harga, posisi, dan catatan.
5. Arsipkan dan pastikan subtotal layanan berkurang.
6. Buka Gudang Arsip.
7. Pulihkan dan pastikan subtotal kembali.
8. Arsipkan ulang dan hapus permanen dengan Super Admin.
9. Pastikan role non-Super Admin tidak melihat tombol permanent delete.
10. Uji quotation non-Draft terkunci.
11. Uji desktop dan mobile.
12. Jalankan typecheck, lint, test, build.
