# DEBRODER PIM Phase 7 — Audit & Riwayat Aktivitas

Status source: IMPLEMENTED. Migration database Phase 7 belum diterapkan dari workspace ini.

## Entry point

- Halaman: `/admin/products/audit-history`
- Navigasi: `KATALOG` → `Audit & Riwayat Aktivitas`
- Product Manager menyediakan `Lihat Riwayat` pada produk dan `Riwayat Varian` pada color variant.
- Seluruh surface hanya-baca. Tidak ada edit, delete, rollback, fix, publish, stock update, atau mutation shortcut.

## Model canonical

Phase 7 mempertahankan `system_audit_log` sebagai satu-satunya parent audit existing. Migration hanya menambahkan identitas event/operation PIM dan dua child relation:

- `pim_audit_changes`: before/after field-level yang immutable;
- `pim_audit_entities`: relasi satu parent bulk operation ke product/variant/SKU yang terkena.

Tidak ada `pim_audit_events` atau parent audit kedua. Event code dan versi didefinisikan terpusat di `lib/pim-audit.ts`. Event retry dideduplikasi dengan pasangan `event_code + idempotency_key`. Transition operasi adalah event append-only baru; row historis tidak di-update.

## Actor dan identity

- Actor dan role diambil server-side dari session/profile.
- Request ID menerima header aman atau dibuat server.
- Operation ID berupa UUID dan dipakai bersama oleh lifecycle event yang berkaitan.
- Batch ID menunjuk batch/import/edit/export/reconciliation existing.
- Admin Guest dapat membaca dan memfilter, tetapi tidak memperoleh insert/update/delete authority.

## Before/after dan keamanan

- Hanya field allowlist yang berubah disimpan.
- `NULL`, empty string, dan numeric zero mempunyai state berbeda.
- Password, token, cookie, Authorization, service-role key, signed URL, raw spreadsheet, raw export, customer, order, dan payment payload ditolak atau tidak diambil.
- Raw file import, isi export, signed URL, serta seluruh finding reconciliation tidak disalin ke audit.
- Kegagalan audit memakai structured fallback log dan tidak pernah menulis event kegagalan audit secara rekursif.

## Integrasi

- Product Manager dan Unified Workflow mencatat product, variant, sellable SKU, publish, archive, image slot, dan Variant Matrix.
- Mutation browser legacy Color Master/Size Master/PIM V2 dicatat secara atomic oleh trigger ketika actor authenticated tersedia.
- Bulk Import dan Bulk Edit mempertahankan parent atomic existing; Phase 7 canonicalizer memperkaya parent dan child entity relation ditautkan secara idempotent.
- Export dan Reconciliation dicatat atomic melalui lifecycle trigger pada metadata Phase 6. Download dicatat setelah private file lolos ownership dan checksum validation.

## Atomicity

- Bulk Import/Edit dan lifecycle metadata Phase 6 tetap atomic dengan audit parent karena audit berada di transaction database existing/trigger.
- Mutation browser yang ditangkap trigger bersifat atomic.
- Mutation Product Manager server existing melakukan audit append setelah business write. Arsitektur existing belum menyediakan satu RPC untuk seluruh manual multi-table workflow, sehingga bagian ini tidak diklaim atomic. Kegagalan audit tidak memicu auto-fix, rollback palsu, atau audit recursion; event yang hilang harus diverifikasi melalui observability dan database owner.

## Query dan retention

- Default rentang 30 hari; maksimum 366 hari per request.
- Page size default 30 dan maksimum 100.
- Pagination memakai keyset `created_at + audit_id` dengan stable ordering.
- Product/variant history mencari parent langsung dan child entity relation.
- Retention class dicatat, tetapi Phase 7 tidak membuat scheduler atau delete otomatis. Initial policy: audit utama 24 bulan, denial 12 bulan, child volume besar 12 bulan.
- Tidak ada historical backfill.

## Owner database action

1. Pastikan migration PIM Phase 4, Phase 5, dan Phase 6 yang pending sudah direview/applied sesuai urutan.
2. Backup dan review `20260718100000_pim_phase_7_audit_operations_history.sql`.
3. Apply migration melalui workflow Supabase milik owner.
4. Jalankan checklist RLS, append-only, actor, idempotency, null/zero, bulk relation, dan no-secret pada database terkontrol.
5. Verifikasi halaman dan lifecycle PIM di Vercel Preview sebelum membekukan Phase 7.

OWNER DATABASE ACTION REQUIRED. REMOTE DATABASE VERIFICATION REQUIRED. BROWSER VERIFICATION REQUIRED.
