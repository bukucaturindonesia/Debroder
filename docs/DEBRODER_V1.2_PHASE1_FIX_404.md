# DEBRODER v1.2 Phase 1 — Fix Detail Quotation 404

## Masalah

Setelah admin membuat draft quotation, sistem mengarahkan ke:

`/admin/orders/quotations/[id]`

Route detail belum tersedia sehingga admin melihat halaman 404.

## Perbaikan

Patch ini menambahkan:

- route dinamis `/admin/orders/quotations/[id]`;
- halaman detail quotation;
- pemeriksaan sesi dan role admin;
- data pelanggan, alamat, PO, status, total, item, dan riwayat;
- loading state;
- tombol kembali ke daftar;
- tombol refresh;
- fallback aman ketika ID tidak valid atau data tidak ditemukan.

ID yang tidak valid tidak lagi menampilkan 404 mentah. Admin menerima penjelasan dan tombol kembali.

## File

- `components/admin/QuotationDetailAdmin.tsx`
- `app/admin/orders/quotations/[id]/page.tsx`

## Setelah instalasi

Jalankan:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```
