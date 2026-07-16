# DEBRODER PIM Phase 5 — Panduan Bulk Edit & Actions

Status source: IMPLEMENTED. Migration database Phase 5 belum diterapkan dari workspace ini.

## Akses dan otoritas

- Entry point: `/admin/products/bulk-edit`, juga tersedia dari Unified Product Manager.
- Owner/Super Admin dapat memilih target, menjalankan dry run, meninjau before/after, dan melakukan final commit.
- Admin Guest adalah **PREVIEW ONLY**. Pilihan dan dry run tetap tersedia, tetapi final commit ditolak UI dan server.
- Dry run tidak menulis data. Final commit selalu memvalidasi ulang actor, role, pilihan, action, dependency, preview expiry, dan current state di server.

## Target, pilihan, dan batas

- Product Root: maksimum 250 target per batch.
- Color Variant: maksimum 500 target per batch.
- Sellable SKU: maksimum 1.000 target per batch.
- Selection explicit tetap tersimpan saat berpindah halaman.
- **Pilih seluruh hasil filter** memakai server-side all-matching selection. Item yang dibatalkan dicatat sebagai exclusion.
- Mengubah target atau filter mereset selection dan preview lama agar batch tidak memakai konteks yang stale.
- Preview menampilkan maksimal 100 row before/after, tetapi validasi dan summary mencakup seluruh batch.

## Action yang tersedia

- Product Root: ubah kategori non-Jersey, status Draft/Active/Archived, dan base price.
- Color Variant: Active/Inactive dan price adjustment.
- Sellable SKU: set/increase/decrease `stock_quantity` beserta proyeksi kompatibilitas existing `stock`.
- Harga mendukung set, increase/decrease fixed, dan increase/decrease percent.
- Persentase yang menghasilkan pecahan Rupiah diblokir dengan `PRICE_ROUNDING_RULE_MISSING`; sistem tidak melakukan pembulatan diam-diam.
- Hasil harga atau stok negatif, overflow, published product tanpa active variant, kategori tidak aktif, dan publish dependency yang belum lengkap memblokir seluruh batch.

## Action yang sengaja tidak tersedia

- Bulk SKU, slug, nama, product key, master warna/ukuran, media, dan permanent delete.
- Bulk tag: **NOT APPLICABLE**, karena baseline tidak memiliki canonical tag system.
- Variant archive: **NOT APPLICABLE**, karena lifecycle canonical variant hanya Active/Inactive.
- Category move dari/ke output Jersey diblokir. Gunakan flow Jersey yang sudah FROZEN untuk data Jersey.

## Dry run dan commit

1. Pilih Product Root, Color Variant, atau Sellable SKU.
2. Gunakan pencarian/status/kategori bila perlu, lalu pilih explicit atau seluruh hasil filter.
3. Klik **Lanjutkan Bulk Action**, pilih action dan nilai.
4. Jalankan **Preview Perubahan** dan tinjau summary, row before/after, skipped row, serta blocking error.
5. Jika status `ready`, centang konfirmasi. Guest tetap tidak dapat melakukan commit.
6. Final commit menjalankan ulang preview terhadap data terkini. Jika fingerprint berubah, jalankan preview baru.
7. Seluruh update, batch metadata, dan audit ditulis dalam satu transaction. Satu kegagalan me-rollback seluruh batch.

## Error umum

- `BATCH_LIMIT_EXCEEDED`: persempit filter atau pecah batch.
- `PREVIEW_EXPIRED` / `PREVIEW_HASH_MISMATCH`: data atau preview berubah; jalankan preview lagi.
- `CONCURRENT_MODIFICATION`: target berubah setelah preview; reload dan preview ulang.
- `PUBLISH_VALIDATION_FAILED`: lengkapi root, kategori aktif, active variant, front image, sellable SKU, active size, dan stok.
- `VARIANT_INACTIVE_CONFLICT`: published product wajib tetap memiliki minimal satu variant aktif.
- `CATEGORY_COMPATIBILITY_ERROR`: kategori/output Jersey dilindungi dari generic bulk category move.
- `PRICE_ROUNDING_RULE_MISSING`: pilih persentase/nilai yang menghasilkan Rupiah integer atau gunakan fixed adjustment.
- `INSUFFICIENT_STOCK_FOR_BULK_DECREASE`: salah satu hasil stok akan negatif.

## Gate owner

1. Review dan terapkan migration Phase 4 terlebih dahulu bila belum diterapkan.
2. Review dan terapkan `20260717093000_pim_phase_5_bulk_edit_atomic.sql` secara manual.
3. Verifikasi ACL/RLS: table batch dan RPC tidak boleh diakses PUBLIC/anon/authenticated; hanya `service_role`.
4. Jalankan batch terkontrol untuk dry run, commit, double-submit/idempotency, concurrency rejection, audit, serta forced rollback/no-partial-write.
5. Verifikasi Admin Guest preview-only dan regresi manual Product Manager, Variant Matrix, Jersey, order, checkout, reservation, serta inventory.

Jangan menguji final commit pada data produksi tanpa backup dan batch terkontrol. Remote migration, transaction smoke, GitHub, dan Vercel tetap owner-managed.
