# DEBRODER v1.2 Phase 1B — Delete Quotation Product

## Perbaikan

Menambahkan tombol `Kelola Produk` pada halaman detail quotation. Di dalamnya setiap item mempunyai tombol `Hapus`.

## Pengamanan

- Hanya dapat menghapus saat status quotation masih `draft`.
- Menggunakan dialog konfirmasi internal, bukan browser alert mentah.
- Tombol dikunci selama proses penghapusan untuk mencegah double-click.
- Delete dibatasi oleh `item id` dan `quotation id`.
- Setelah item terhapus, fungsi `refresh_quotation_totals` dijalankan.
- Halaman dimuat ulang agar daftar item dan ringkasan harga konsisten.

## File

- `components/admin/QuotationItemManager.tsx`
- `app/admin/orders/quotations/[id]/page.tsx`

## Tidak berubah

- Tidak ada perubahan database schema.
- Tidak ada perubahan RLS.
- Tidak ada perubahan website publik.
- Fitur tambah produk tetap dipertahankan.

## Verifikasi

1. Buka detail quotation berstatus Draft.
2. Klik `Kelola Produk`.
3. Klik `Hapus` pada produk.
4. Pastikan dialog konfirmasi muncul.
5. Klik `Ya, Hapus Produk`.
6. Pastikan produk hilang.
7. Pastikan jumlah item dan subtotal produk diperbarui.
8. Pastikan quotation non-Draft tidak dapat menghapus item.

Jalankan:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```
