# DEBRODER v1.2 Phase 11 — Shipping / Pickup & Fulfillment

## Scope

Phase 11 mengelola penyerahan barang setelah seluruh Work Item aktif selesai dan Quality Control lulus.

Alur pengiriman:

`Persiapan → Packing → Siap Dikirim → Dikirim → Dalam Perjalanan → Diterima`

Alur pickup:

`Persiapan → Packing → Siap Diambil → Diambil`

Status `Bermasalah` dan `Dibatalkan` wajib memiliki alasan.

## Admin routes

- `/admin/fulfillments`
- `/admin/fulfillments/[id]`

## Lifecycle

- Tambah dari pesanan yang siap diserahkan.
- Lihat daftar dan detail.
- Edit detail sebelum selesai.
- Upload/hapus bukti.
- Arsipkan dan pulihkan.
- Hapus permanen hanya Super Admin untuk arsip berstatus Persiapan/Dibatalkan tanpa bukti.
- Audit penghapusan, riwayat status, dan riwayat revisi tetap tersimpan.

## Database alignment

Remote sudah memiliki migration Phase 11 versi `20260712154540` sampai `20260712155341`. Source migration disinkronkan ke repository tanpa apply ulang. Migration `20260713002645` menutup dead-end cleanup bukti pada arsip Persiapan/Dibatalkan sebelum penghapusan permanen. Migration `20260713003444` menyelaraskan trigger immutable agar penghapusan permanen terkontrol dapat membersihkan riwayat tanpa melemahkan audit normal.

## Out of scope

Phase 12 Notification tidak termasuk dalam paket ini.
