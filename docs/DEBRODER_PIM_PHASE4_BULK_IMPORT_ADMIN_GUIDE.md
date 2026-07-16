# DEBRODER PIM Phase 4 — Panduan Bulk Import

Status source: IMPLEMENTED. Migration database belum diterapkan dari workspace ini.

## Akses dan mode

- Entry point: `/admin/products/bulk-import`, juga tersedia dari Unified Product Manager.
- Mode Phase 4 adalah **Create Only**. Produk, slug, dan SKU existing tidak ditimpa.
- Semua product root hasil import dibuat sebagai **Draft**.
- Owner/Super Admin dapat dry run dan final import.
- Admin Guest dapat mengunduh template, mengunggah file, dry run, melihat error, dan mengunduh error report, tetapi final import ditolak server.

## Template dan batas

- Format yang diterima: `.xlsx` dan CSV UTF-8.
- Maksimum file: 5 MiB.
- Maksimum data: 2.000 row dan 250 product root per import.
- XLSX wajib memakai sheet `PRODUCT_IMPORT`; jangan mengubah header atau urutannya.
- Gunakan satu row untuk satu kombinasi warna × ukuran.
- `product_key` hanya untuk grouping di file dan harus konsisten untuk seluruh row product root yang sama.
- Gunakan `category_id`/`category_code`, `color_master_id`/`color_code`, dan `size_master_id`/`size_code` dari reference terbaru. Display label bukan key.
- Harga, price adjustment, dan stok harus integer. Formula, macro, merged cell, external reference, dan embedded object dilarang.

## Cara import

1. Unduh template Excel atau CSV beserta reference Color, Size, dan Category terbaru.
2. Isi data aktual tanpa mengubah nama sheet/header canonical.
3. Unggah file lalu pilih **Validasi / Dry Run**. Tahap ini tidak menulis data.
4. Periksa summary, preview, dan seluruh row error. Unduh error report bila perlu.
5. Final import hanya aktif jika tidak ada blocking error dan konfirmasi telah dicentang.
6. Setelah berhasil, buka Product Manager untuk melengkapi gambar/deskripsi dan menjalankan workflow publish existing.

## Keamanan dan pemulihan

- Final import memvalidasi ulang actor, checksum file, normalized payload, master aktif, slug, SKU, nilai harga/stok, dan uniqueness di dalam transaction.
- Satu kegagalan membatalkan seluruh transaction; tidak ada partial product/variant/SKU/stock.
- Retry identik memakai actor, checksum, payload hash, dan mode sebagai identitas idempotent sehingga tidak membuat duplikat.
- Raw spreadsheet tidak disimpan permanen.
- Stok tetap ditulis ke `product_variant_sizes.stock_quantity` beserta proyeksi kompatibilitas `stock`; order, reservation, dan inventory ledger tidak diubah.

## Error umum

- `INCONSISTENT_PRODUCT_ROOT`: nama, slug, kategori, atau base price berbeda dalam satu `product_key`.
- `DUPLICATE_SKU_*` / `DUPLICATE_SLUG_*`: nilai duplikat di file atau database.
- `DUPLICATE_VARIANT_IN_FILE`: kombinasi warna × ukuran berulang.
- `INVALID_MASTER_*` / `MASTER_ID_CODE_MISMATCH` / `INACTIVE_MASTER`: reference tidak canonical atau tidak aktif.
- `FORMULA_NOT_ALLOWED` / `MERGED_CELL_NOT_ALLOWED` / `UNSAFE_WORKBOOK`: workbook harus dibersihkan dan memakai nilai statis.
- `PREVIEW_EXPIRED` / checksum atau payload mismatch: jalankan dry run lagi menggunakan file terbaru.

## Gate owner

Migration `20260716143000_pim_phase_4_bulk_import_atomic.sql` harus direview dan diterapkan manual sebelum pengujian final import. Verifikasi transaction/rollback/idempotency pada database owner, lalu verifikasi UI melalui Vercel Preview. Jangan menguji final import pada data produksi tanpa batch terkontrol.
