# DEBRODER v1.2 — Phase 9 Production Status

## Scope

Phase 9 mengaktifkan pelaksanaan produksi setelah Job Order dan Work Item lolos tahap persiapan.

- Job Order: `released → in_progress → on_hold → in_progress`.
- Work Item: `ready → in_progress → on_hold → in_progress → awaiting_qc`.
- Pembatalan dan penahanan wajib memiliki alasan.
- Dependensi harus mencapai `awaiting_qc` atau `completed` sebelum pekerjaan berikutnya dimulai.
- Job Order otomatis mulai ketika Work Item pertama dikerjakan.
- Order disinkronkan ke `masuk_produksi`, `proses_produksi`, atau `quality_check`.
- Phase 9 berhenti di `awaiting_qc`; keputusan lulus, rework, bukti QC, dan selesai adalah Phase 10.

## Progress milestone

Progress Job Order dihitung berdasarkan jumlah unit dan milestone status:

- Draft: 0%
- Siap Dikerjakan: 10%
- Sedang Dikerjakan / Ditahan: 50%
- Perbaikan: 60%
- Menunggu QC: 90%
- Selesai: 100%

## Admin routes

- `/admin/production`
- `/admin/job-orders/[id]`
- `/admin/work-items/[id]`

Menu admin:

`OPERASIONAL → Status Produksi`

## Security

- Akses produksi: owner, superadmin, super_admin, admin.
- `job_order.status`, `work_item.status`, dan `production.view` dikontrol melalui permission matrix.
- Direct table writes tetap ditutup oleh fondasi sebelumnya.
- Helper progress dan sinkronisasi status tidak dapat dipanggil langsung oleh authenticated client.
- Phase 8 core functions tidak dapat dipanggil langsung oleh authenticated client; Phase 9 wrapper menjadi pintu resmi.

## Database verification

Applied migrations:

- `20260712131753_v1_2_phase_9_production_status_and_progress.sql`
- `20260712132103_v1_2_phase_9_job_order_status.sql`
- `20260712132131_v1_2_phase_9_work_item_status.sql`

Transactional probe result:

- Job Order: `in_progress`
- Work Item: `awaiting_qc`
- Order: `quality_check`
- Progress: `90.00%`
- Hold history: recorded
- Resume history: recorded
- QC handoff history: recorded
- Persistent test rows: `0`

## Quality gates

- Typecheck: PASS
- Lint: PASS, 0 errors and 24 existing warnings
- Tests: PASS, 44/44
- Build compilation: PASS
- Final full build/deployment: verify on Vercel because sandbox page-data collection did not finish
