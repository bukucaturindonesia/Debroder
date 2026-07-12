# DEBRODER v1.2 Phase 5A — Payment Tracking Foundation

## Database

Migration aktif:

`payment_tracking_phase_5a`

## Struktur

Tabel utama:

- `order_payments`
- `payment_number_sequences`

Kolom ringkasan pada `orders`:

- `payment_total_verified`
- `payment_balance`
- `payment_percentage`
- `payment_requirement_met`

## Nomor pembayaran

Format:

`PAY-DEB-YYYY-####`

## Status pembayaran

- Draft Pembayaran
- Menunggu Verifikasi
- Pembayaran Terverifikasi
- Pembayaran Ditolak
- Pembayaran Dikembalikan

## Fitur admin

Detail Pesanan → Pembayaran

Tersedia:

- tambah pembayaran;
- edit selama draft/pending;
- unggah bukti privat;
- buka bukti dengan signed URL;
- verifikasi;
- tolak dengan alasan wajib;
- pembayaran bertahap;
- total terverifikasi;
- sisa pembayaran;
- persentase pembayaran;
- penanda Pembayaran Memenuhi Syarat;
- arsip;
- Gudang Arsip;
- pulihkan;
- hapus permanen Super Admin.

## Keamanan

- Bukti tersimpan di bucket privat `payment-proofs`.
- Maksimal 10 MB.
- Format PNG, JPG, WEBP, atau PDF.
- Staff hanya dapat membaca sesuai RLS.
- Direct write ke tabel dibatasi.
- Verifikasi/tolak dilakukan melalui RPC.
- Hapus permanen hanya `superadmin` dan `super_admin`.
- Pembayaran wajib diarsipkan sebelum permanent delete.

## Role

- Owner/Admin/Super Admin: verifikasi dan tolak.
- Sales Admin: catat, edit pending, arsip, pulihkan.
- Super Admin: hapus permanen.

## Verifikasi wajib

1. Buka detail pesanan.
2. Klik Pembayaran.
3. Tambah pembayaran pertama.
4. Unggah bukti.
5. Buka bukti.
6. Edit sebelum diverifikasi.
7. Verifikasi.
8. Pastikan total terverifikasi bertambah.
9. Tambah pembayaran kedua.
10. Tolak dengan alasan.
11. Tambah pembayaran berikutnya hingga lunas.
12. Pastikan status Pembayaran Memenuhi Syarat.
13. Arsipkan pembayaran.
14. Pastikan saldo dihitung ulang.
15. Pulihkan pembayaran.
16. Arsipkan kembali.
17. Hapus permanen sebagai Super Admin.
18. Uji desktop dan mobile.
19. Jalankan typecheck, lint, test, build.

## Deferred ke Phase 5B

- jalur upload publik oleh pelanggan;
- notifikasi pembayaran;
- refund/penyesuaian formal;
- approval threshold untuk mulai produksi.
