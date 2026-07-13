# DEBRODER v1.2 Phase 6 — GitHub File Manifest

## Cara pemasangan

Salin seluruh isi ZIP ini ke folder utama repository DEBRODER dan pilih **Replace** saat diminta.

## File yang termasuk

- `app/admin/document-numbering/page.tsx`
- `components/admin/DocumentNumberingAdmin.tsx`
- `components/admin/layout/admin-navigation.ts`
- `lib/document-numbering.ts`
- `supabase/migrations/20260712070227_phase6_document_numbering.sql`
- `supabase/migrations/20260712091640_v1_2_phase_6_numbering_history_and_alignment.sql`
- `supabase/migrations/20260712091712_v1_2_phase_6_numbering_allocator_and_registry.sql`
- `supabase/migrations/20260712091748_v1_2_phase_6_numbering_lifecycle_and_security.sql`
- `supabase/migrations/20260712093500_v1_2_phase_6_permanent_delete_audit_and_sequence_cleanup.sql`
- `test/document-numbering-phase6.test.ts`
- `docs/DEBRODER_V1.2_PHASE6_DOCUMENT_NUMBERING.md`
- `docs/DEBRODER_V1.2_EXECUTION_STATE.md`
- `docs/DEBRODER_V1.2_ISSUE_REGISTER.md`

## Status database

Migration Phase 6 sudah diterapkan dan diverifikasi pada project production sebelum paket ini dibuat.

File SQL di paket ini berfungsi untuk menyinkronkan source migration repository dengan database live. Jangan menempelkan SQL secara manual ke SQL Editor.

## Route admin

`SISTEM → Penomoran Dokumen`

Route:

`/admin/document-numbering`

## Commit message

`feat(v1.2): complete Phase 6 document numbering`

## Pemeriksaan setelah push

- Vercel deployment harus sukses.
- Buka menu Penomoran Dokumen.
- Pastikan 10 aturan default tampil.
- Pastikan tab Gudang Arsip, Nomor Terbit, dan Riwayat Perubahan dapat dibuka.
- Jangan lanjut Phase 7 sebelum deployment Phase 6 dikonfirmasi.
