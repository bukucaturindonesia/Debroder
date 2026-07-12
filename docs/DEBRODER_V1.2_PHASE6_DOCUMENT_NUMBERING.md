# DEBRODER v1.2 — Phase 6 Document Numbering

## Status

`IMPLEMENTED — LIVE DATABASE VERIFIED — DEPLOYMENT QUALITY GATE PENDING`  
Status bisnis tetap membutuhkan owner verification setelah deployment.

## Audit awal

- Repository dasar: commit `7549a59415b47f32b82c713cf2aba6d33ab3a2fc`.
- Vercel untuk commit Phase 5B berstatus sukses.
- Database production sudah memiliki fondasi parsial Phase 6 dari implementasi sebelumnya.
- Ditemukan tiga sequence lama terpisah untuk quotation, order, dan payment.
- Ditemukan satu quotation existing dengan nomor `QTN-DEB-2026-0003`.
- Central registry awal belum lengkap dan source migration belum tersimpan di repository.

## Implementasi database

Source migration yang disinkronkan:

1. `20260712070227_phase6_document_numbering.sql`
2. `20260712091640_v1_2_phase_6_numbering_history_and_alignment.sql`
3. `20260712091712_v1_2_phase_6_numbering_allocator_and_registry.sql`
4. `20260712091748_v1_2_phase_6_numbering_lifecycle_and_security.sql`
5. `20260712093500_v1_2_phase_6_permanent_delete_audit_and_sequence_cleanup.sql`

Objek utama:

- `document_number_rules`
- `document_number_sequences`
- `document_number_issues`
- `document_number_rule_history`
- `allocate_document_number`
- `issue_document_number`
- `register_existing_document_number`

Nomor yang sudah diterbitkan bersifat immutable. Perubahan format hanya memengaruhi nomor berikutnya.

## Sinkronisasi nomor lama

Sequence quotation, order, dan payment disejajarkan dengan nomor existing agar centralized allocator tidak menghasilkan duplikasi. Trigger registrasi otomatis mencatat nomor baru pada quotation, order, dan payment ke central registry.

## Lifecycle

Aturan penomoran mendukung:

`Tambah → Lihat → Edit → Arsipkan → Gudang Arsip → Pulihkan → Hapus Permanen`

Hapus permanen hanya untuk Super Admin dan hanya pada aturan arsip yang belum pernah menerbitkan nomor. Sequence kosong dibersihkan dan aksi hapus permanen tetap direkam pada history append-only.

## Route dan navigasi

- Route: `/admin/document-numbering`
- Sidebar: `SISTEM → Penomoran Dokumen`
- Tab:
  - Aturan Aktif
  - Gudang Arsip
  - Nomor Terbit
  - Riwayat Perubahan

Tidak diperlukan URL manual.

## Role

- `owner`: lihat
- `admin`: lihat
- `superadmin`: lihat dan kelola lifecycle
- `super_admin`: lihat dan kelola lifecycle
- `sales_admin`: database read policy tersedia, tetapi tidak ditampilkan pada menu Sistem

Database RPC tetap menjadi pengaman utama untuk operasi sensitif.

## RLS dan ACL

- Staff authenticated dapat membaca rules, issues, dan history.
- Sequence tidak dapat dibaca atau dimutasi langsung oleh `anon` atau `authenticated`.
- Direct insert/update/delete pada rule, issue, dan history ditolak.
- Central allocator dan generic issuer tidak dapat dipanggil browser authenticated.
- Number defaults quotation/order/payment tetap kompatibel dengan flow existing.

## Human-readable actors

UI memetakan `updated_by`, `archived_by`, `issued_by`, dan `actor_id` ke email profile. UUID mentah tidak ditampilkan sebagai fallback.

## Responsive states

Tersedia:

- loading
- success
- error
- empty
- read-only role state
- disabled permanent delete untuk rule yang sudah digunakan
- archive confirmation dengan alasan
- permanent-delete typed confirmation
- desktop table dengan horizontal scroll
- mobile card layout

## Verifikasi database live

Transaction-based tests dijalankan dengan rollback sehingga tidak meninggalkan data test:

- lifecycle create, edit, archive, restore, permanent delete: PASS
- issued-number idempotency: PASS
- immutable registry: PASS
- used-rule delete rejection: PASS
- unused sequence cleanup: PASS
- permanent deletion audit history: PASS

## Pengujian

File test:

- `test/document-numbering-phase6.test.ts`

Targeted TypeScript check, syntax parse, helper assertions, SQL contract, dan navigation static check: PASS. Full repository quality gate menunggu working copy/Vercel karena dependency tidak tersedia pada execution environment ini.

Cakupan:

- normalisasi document type
- preview berbasis waktu Makassar
- role Super Admin
- immutable registry
- ACL sequence
- centralized allocator
- trigger registry

## Owner verification checklist

1. Buka `SISTEM → Penomoran Dokumen`.
2. Pastikan 10 aturan default tampil.
3. Pastikan nomor quotation existing tercatat pada tab Nomor Terbit.
4. Login sebagai owner/admin dan pastikan mode hanya-baca.
5. Login sebagai Super Admin dan buat rule test baru.
6. Edit rule test dan pastikan preview berubah.
7. Arsipkan dengan alasan.
8. Buka Gudang Arsip dan pulihkan.
9. Arsipkan kembali dan hapus permanen rule test yang belum digunakan.
10. Pastikan rule yang sudah menerbitkan nomor tidak dapat dihapus permanen.
