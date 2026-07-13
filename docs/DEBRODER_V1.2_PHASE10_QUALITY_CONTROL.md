# DEBRODER v1.2 — Phase 10 Quality Control

Status: GitHub-ready source package.

## Scope

Phase 10 menyelesaikan Quality Control setelah Phase 9 menyerahkan Work Item ke status `awaiting_qc`.

Alur utama:

1. Work Item `awaiting_qc` muncul di antrean QC.
2. Admin membuat draft pemeriksaan QC.
3. Admin memulai pemeriksaan.
4. Admin mengisi checklist dan bukti QC.
5. Admin finalisasi hasil QC.
6. Jika lulus, Work Item menjadi `completed`.
7. Jika gagal/partial/rework, Work Item menjadi `rework`.
8. Job Order selesai hanya setelah semua Work Item aktif selesai dan punya QC final lulus.

## Route

- `/admin/quality-control`
- `/admin/quality-control/[id]`

## Menu

- `OPERASIONAL → Quality Control`

## Database

Migration yang diterapkan pada remote Supabase:

- `v1_2_phase_10_qc_schema_security`
- `v1_2_phase_10_qc_begin_only_check`
- `v1_2_phase_10_qc_create_record`
- `v1_2_phase_10_qc_update_draft`
- `v1_2_phase_10_qc_archive_restore`
- `v1_2_phase_10_qc_completion_integration`
- `v1_2_phase_10_qc_remove_file`
- `v1_2_phase_10_qc_permanent_delete_alignment`

Migration lama yang sudah ada sebelum alignment:

- `phase10_qc_phase11_fulfillment`

## Catatan keamanan

- Tabel QC hanya `SELECT` untuk authenticated role yang punya permission `qc.view`.
- Mutasi dilakukan lewat RPC security definer.
- Bukti QC berada di bucket private `qc-proofs`.
- Hapus permanen hanya untuk Super Admin dan hanya draft QC yang sudah diarsipkan.
- Riwayat dan audit QC bersifat immutable.

## Batas Phase 10

Phase 10 tidak mengerjakan fulfillment, pickup, delivery, resi, atau serah terima pelanggan. Itu masuk Phase 11.
