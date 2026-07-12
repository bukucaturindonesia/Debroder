# DEBRODER v1.2 Phase 4 — Order Conversion

## Database

Migration sudah diterapkan dalam tiga bagian:

- order_conversion_phase_4_schema
- order_conversion_phase_4_functions
- order_conversion_phase_4_rpc

## Syarat konversi

Penawaran hanya dapat dikonversi ketika:

- status penawaran `approved`;
- tidak ada harga pending;
- approved_version_id tersedia dan valid;
- minimal satu mockup aktif berstatus approved;
- penawaran belum pernah dikonversi.

## Hasil konversi

Sistem membuat:

- nomor `ORD-DEB-YYYY-####`;
- data pelanggan;
- alamat;
- total terkunci;
- snapshot quotation;
- snapshot versi quotation;
- snapshot mockup yang disetujui;
- order items;
- order item services;
- order status history;
- hubungan dua arah dengan quotation.

Quotation kemudian berubah menjadi `converted_to_order`.

## Siklus pesanan

Konversi → Lihat → Edit bagian yang diizinkan → Arsipkan → Gudang Arsip → Pulihkan → Hapus Permanen.

Produk, quantity, varian, ukuran, layanan, dan harga tidak dapat diedit melalui pesanan karena sudah menjadi snapshot komersial yang disetujui.

Bagian yang boleh diedit saat status masih Pesanan Baru:

- metode penyerahan;
- alamat pengiriman;
- catatan pelanggan;
- catatan internal.

## Jalur akses

- Detail Penawaran → Konversi Menjadi Pesanan
- Sidebar → Operasional → Order → Pesanan
- Pesanan → Gudang Arsip
- Detail Pesanan → Buka Penawaran

## Role

- Staff order: konversi, lihat, edit terbatas, arsip, restore.
- Owner/Super Admin: hapus permanen.
- Proteksi dilakukan di UI, RLS yang sudah ada, dan fungsi database.

## Verifikasi wajib

1. Gunakan quotation dengan status Disetujui Pelanggan.
2. Pastikan versi quotation approved.
3. Pastikan mockup approved.
4. Klik Konversi Menjadi Pesanan.
5. Pastikan nomor ORD-DEB terbentuk.
6. Pastikan diarahkan ke detail pesanan.
7. Periksa pelanggan, total, produk, quantity, varian, ukuran.
8. Pastikan quotation berubah menjadi Sudah Menjadi Pesanan.
9. Klik Buka Penawaran dari detail pesanan.
10. Edit metode penyerahan, alamat, dan catatan.
11. Arsipkan pesanan.
12. Pastikan hilang dari daftar aktif.
13. Buka Gudang Arsip.
14. Pulihkan.
15. Arsipkan lagi dan hapus permanen dengan Super Admin.
16. Pastikan konversi ulang quotation yang sama ditolak.
17. Uji desktop dan mobile.
18. Jalankan typecheck, lint, test, build.

## Deferred

Phase 5 — Payment Tracking.
