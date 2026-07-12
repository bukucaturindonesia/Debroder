# DEBRODER v1.2 Phase 2 — Quotation Versioning

## Database

Migration `quotation_versioning_phase_2` telah diterapkan ke Supabase aktif.

### Tabel baru

`quotation_versions`

Menyimpan:
- quotation_id
- version_number
- version_status
- snapshot JSONB
- change_note
- created_by
- sent_at
- approved_at
- created_at

### Kolom quotation

- current_version
- latest_version_id
- sent_version_id
- approved_version_id

## Prinsip

Quotation historis tidak ditimpa.
Setiap versi terkirim disimpan sebagai snapshot lengkap:
- data quotation
- jumlah
- harga
- produk
- varian
- ukuran
- layanan
- posisi
- catatan
- user
- timestamp

## Alur

1. Quotation Draft dapat diedit.
2. Saat status berubah ke Terkirim, sistem membuat snapshot versi aktif otomatis.
3. Pelanggan dapat meminta revisi.
4. Admin membuka Versioning Quotation.
5. Admin mengisi catatan dan klik Buat Versi Revisi.
6. Versi sebelumnya menjadi superseded.
7. current_version bertambah.
8. Quotation kembali ke Draft.
9. Admin mengedit versi baru.
10. Saat dikirim lagi, snapshot baru dibuat.
11. Hanya sent_version yang nomor versinya sama dengan current_version yang dapat disetujui.

## Immutable history

Versi historis tidak memiliki:
- Edit
- Arsip
- Restore
- Delete

Ini disengaja karena version history merupakan audit record dan tidak boleh diubah atau dihapus.

## Jalur akses

Detail Quotation → tombol `Versi vN`.

Tidak ada URL manual dan tidak ada tombol floating.

## Verifikasi wajib

1. Buat quotation Draft dengan produk dan layanan.
2. Jalankan status sampai Terkirim.
3. Pastikan Versi 1 muncul.
4. Ubah status menjadi Minta Revisi dengan catatan.
5. Klik Versi v1.
6. Isi catatan dan buat Versi Revisi.
7. Pastikan quotation kembali Draft dan current_version menjadi 2.
8. Edit quantity/harga/layanan.
9. Kirim ulang sampai Terkirim.
10. Pastikan Versi 2 muncul dan Versi 1 tetap utuh.
11. Pastikan hanya Versi 2 yang dapat disetujui.
12. Uji refresh, desktop, mobile, logout/login.
13. Jalankan typecheck, lint, test, build.

## Deferred

- Public customer portal untuk approval tetap Phase 3.
- Conversion ke order tetap Phase 4.
