# DEBRODER v1.2 — Standar Bahasa Status Penawaran

## Tujuan

Database tetap menggunakan kode status teknis berbahasa Inggris agar stabil:

- draft
- submitted
- under_review
- pricing
- sent
- revision_requested
- approved
- rejected
- expired
- converted_to_order

Kode tersebut tidak boleh ditampilkan langsung kepada admin atau pelanggan.

## Bahasa admin

Admin melihat kalimat yang menjelaskan kondisi operasional secara langsung:

- Draft Penawaran
- Sudah Diajukan
- Sedang Diperiksa
- Harga Sedang Disusun
- Sudah Dikirim ke Pelanggan
- Revisi Diminta Pelanggan
- Disetujui Pelanggan
- Tidak Dilanjutkan Pelanggan
- Masa Berlaku Berakhir
- Sudah Menjadi Pesanan

Setiap status juga memiliki penjelasan tentang kondisi saat ini dan langkah berikutnya.

## Bahasa publik

Tampilan pelanggan menggunakan bahasa yang lebih ringkas dan tidak membuka istilah internal:

- Sedang Disiapkan
- Sedang Diproses
- Sedang Ditinjau
- Harga Sedang Disiapkan
- Penawaran Sudah Dikirim
- Sedang Direvisi
- Penawaran Disetujui
- Penawaran Tidak Dilanjutkan
- Masa Berlaku Berakhir
- Pesanan Sedang Diproses

Gunakan:

```ts
getQuotationStatusLabel(status, "public")
getQuotationStatusDescription(status, "public")
```

untuk seluruh output publik yang dibuat pada fase berikutnya.

## Perbaikan panel admin

- Status mentah `submitted` tidak lagi tampil.
- Status saat ini menggunakan label Indonesia dan penjelasan aktual.
- `Aksi status` diubah menjadi `Langkah berikutnya`.
- Setiap pilihan tindakan mempunyai penjelasan konteks.
- Tombol utama mengikuti tindakan yang dipilih.
- Catatan wajib ditandai jelas.
- Pesan error teknis database diterjemahkan menjadi arahan yang mudah dipahami.
- Riwayat status dan riwayat versi memakai kamus yang sama.

## File

- `lib/quotation-status-copy.ts`
- `components/admin/ui/AdminStatusBadge.tsx`
- `components/admin/QuotationLifecycleManager.tsx`
- `components/admin/QuotationVersionManager.tsx`
- `components/admin/QuotationDetailAdmin.tsx`

## Verifikasi

1. Buka penawaran berstatus submitted.
2. Pastikan tampil `Sudah Diajukan`, bukan `submitted`.
3. Pastikan penjelasan status tampil.
4. Pastikan pilihan berikutnya tampil `Mulai pemeriksaan`.
5. Pastikan tombol tampil `Mulai Pemeriksaan`.
6. Uji seluruh tahapan sampai Disetujui Pelanggan.
7. Pastikan riwayat status tidak menampilkan kode teknis.
8. Pastikan riwayat versi tidak menampilkan kode teknis.
9. Uji desktop dan mobile.
10. Jalankan typecheck, lint, test, build.
