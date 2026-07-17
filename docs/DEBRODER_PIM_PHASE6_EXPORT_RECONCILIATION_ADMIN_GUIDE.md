# DEBRODER PIM Phase 6 — Export & Reconciliation

Status source: IMPLEMENTED. Migration database Phase 6 belum diterapkan dari workspace ini.

## Entry point dan batas safety

- Entry point: `/admin/products/export-reconciliation` melalui Unified Product Manager dan navigasi Katalog.
- Product Export dan Reconciliation membaca canonical `products` → `product_variants` → `product_variant_sizes` beserta Category, Color Master, Size Master, dan media reference.
- Business data PIM bersifat read-only. Tidak tersedia auto-fix, publish, archive, delete, update harga, update stok, atau perubahan master dari finding.
- Finding hanya mengarah ke Product Manager atau Bulk Edit & Actions existing.
- Admin Guest dapat melihat halaman, menjalankan scan read-only, dan membuat export/report miliknya sendiri. Secure download hanya menerima actor pemilik file.

## Product Export

- Format: XLSX dan CSV UTF-8.
- Schema: `DEBRODER_PIM_EXPORT_V1`.
- Scope: Selected Products, Current Page Selection, All Matching Current Filters dengan exclusions, Category, Product Status, Updated Date Range, dan Full PIM dalam batas direct processing.
- Direct limit: 250 Product Root, 5.000 sellable variant/SKU, file maksimal 25 MiB.
- Repository tidak memiliki background runner yang andal. Scope di atas limit ditolak dengan `EXPORT_BACKGROUND_UNAVAILABLE`; sistem tidak membuat background job palsu.
- XLSX berisi `EXPORT_INFORMATION`, `DATA_DICTIONARY`, `PRODUCTS`, `VARIANTS`, `CATEGORY_REFERENCE`, `COLOR_MASTER_REFERENCE`, dan `SIZE_MASTER_REFERENCE`.
- CSV memakai satu row per sellable SKU dan membawa metadata export read-only.
- SKU/ID disimpan sebagai text, harga/stok tetap numeric, database null menjadi blank cell, dan numeric zero tetap zero.
- Text yang diawali `=`, `+`, `-`, atau `@` diprefix apostrophe hanya pada representasi file untuk mencegah formula injection.
- Ordering deterministic: product name/ID, color order/code, size order/code, SKU, dan variant ID.
- Snapshot dibentuk oleh satu RPC statement read-only sehingga summary, Product Root, variant/SKU, dan master references berasal dari keadaan data yang sama.

## File private, history, expiry, dan integrity

- File disimpan di bucket private `pim-phase6-files`.
- Tidak ada public URL atau signed URL yang dikirim ke browser.
- Download melewati authenticated server route, memverifikasi ownership, expiry, status, dan SHA-256 sebelum mengirim bytes.
- Retention: 168 jam. Cleanup berjalan secara bounded saat halaman/API Phase 6 digunakan.
- Job `PROCESSING` yang stale lebih dari 15 menit ditandai `FAILED`, sehingga tidak tertinggal selamanya.
- Duplicate request dikendalikan actor-bound idempotency token dan request hash.

## Reconciliation

- Rule set: `DEBRODER_PIM_RECONCILIATION_V1`.
- Central rule registry menyimpan code, version, severity, applicability, recommendation, enabled state, skip reason, dan handler.
- Canonical `validateProductPublishSnapshot` digunakan kembali untuk `PIM_PUBLISHED_PRODUCT_NOT_READY`; tidak dibuat publish validator kedua.
- Status keseluruhan: `PASS`, `WARNING`, `ERROR`, atau `INCOMPLETE`. Scan yang melewati limit atau mempunyai required rule failure tidak dapat menjadi PASS.
- Fingerprint stabil memakai issue code, Product Root, variant, field, dan canonical entity identity; run ID, timestamp, serta message tidak dimasukkan.
- `NEW`, `EXISTING`, dan `RESOLVED` hanya dihitung terhadap run sebelumnya dengan actor, scope hash, rule set, dan completeness yang sebanding.
- Scope berbeda, rule set berbeda, atau run incomplete tidak dapat menghasilkan false `RESOLVED`.
- Report XLSX/CSV dibuat dari finding run tersimpan, bukan dengan scan ulang.
- Findings dipaginasi dan dapat difilter server-side berdasarkan severity, issue code, lifecycle, kategori, product status, Product ID, Variant ID, SKU, dan rule applicability. Run history dapat difilter berdasarkan status.

## Migration dan verifikasi owner

Migration lokal:

`supabase/migrations/20260717193000_pim_phase_6_export_reconciliation.sql`

Migration menambahkan metadata export job, reconciliation run, finding, private bucket, index operasional, RLS service-role-only, dan RPC snapshot read-only. Migration tidak mengubah canonical business table.

Owner harus:

1. Memastikan migration Phase 4 dan Phase 5 telah direview/diterapkan sesuai urutan owner.
2. Backup database dan review migration Phase 6.
3. Apply migration Phase 6 melalui workflow database owner.
4. Verifikasi ACL/RLS/RPC, bucket private, ownership download, expiry/cleanup, idempotency, consistent snapshot, dan read-only behavior pada data terkontrol.
5. Jalankan Preview browser matrix dan regresi Product Manager, Variant Matrix, Bulk Import, Bulk Edit, Admin Guest, Jersey, order, checkout, reservation, serta inventory ledger.

Remote database, GitHub, dan Vercel tetap owner-managed.
