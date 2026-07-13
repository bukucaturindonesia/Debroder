# DEBRODER v1.2 Phase 1 — Formal Quotation Admin UI

## Isi patch

- `components/admin/QuotationListAdmin.tsx`
- `components/admin/QuotationCreateAdmin.tsx`
- `app/admin/orders/quotations/page.tsx`
- `app/admin/orders/quotations/new/page.tsx`

## Route

- `/admin/orders/quotations`
- `/admin/orders/quotations/new`

## Status

Patch ini menyediakan:

- pemeriksaan sesi admin;
- pembatasan role;
- daftar quotation;
- pencarian dan filter status;
- tombol membuat quotation;
- form data pelanggan, perusahaan, alamat, PO, masa berlaku, biaya, diskon, dan catatan;
- insert quotation dengan nomor otomatis dari database.

## Belum termasuk

- halaman detail `/admin/orders/quotations/[id]`;
- penambahan produk, varian, ukuran, dan layanan;
- perubahan status;
- riwayat status;
- final test/build setelah ditempel ke repository.

Setelah file ditempel, jalankan:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```
