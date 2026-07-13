# DEBRODER v1.2 Phase 12 — Notifications

## Status

**COMPLETE — DATABASE ALIGNED — TRANSACTION VERIFIED — TYPECHECK/LINT/TEST/BUILD PASS**

Phase 12 melanjutkan skema notifikasi yang sudah tersedia di remote database ke service/query, API, UI admin, permission, lifecycle arsip, dan riwayat. Tidak ada migration lama yang dijalankan ulang dan tidak ada SQL Phase 12 yang dibuat ulang.

Phase 13 belum dimulai.

## Scope yang diselesaikan

- Bell notifikasi pada header admin dengan unread badge dan polling ringan.
- Kotak masuk notifikasi aktif dan Gudang Arsip.
- Filter pencarian, channel, status, dan hanya belum dibaca.
- Tandai satu/semua notifikasi sebagai sudah dibaca.
- Arsipkan dan pulihkan notifikasi.
- Hapus permanen hanya Super Admin dari Gudang Arsip dengan deletion audit tetap tersimpan.
- Detail notifikasi, event sumber, payload, related route, dan delivery attempts.
- CRUD template notifikasi berbasis RPC database.
- Arsip, pulihkan, dan hapus permanen template dengan audit.
- Riwayat event, delivery attempts, dan audit penghapusan.
- Permission route dan API untuk Owner, Admin, Sales Admin, dan Super Admin.
- Channel eksternal tetap nonaktif sampai provider dikonfigurasi. In-app adalah channel aktif Phase 12.

## Admin routes

- `/admin/notifications`
- `/admin/notifications/[id]`
- `/admin/notifications/templates`
- `/admin/notifications/history`

## API routes

- `GET/POST /api/admin/notifications`
- `GET/PATCH/DELETE /api/admin/notifications/[id]`
- `GET/POST /api/admin/notification-templates`
- `PATCH/DELETE /api/admin/notification-templates/[id]`
- `GET /api/admin/notification-history`

Semua endpoint memerlukan Bearer token admin. Mutasi lifecycle memakai Supabase client dengan token pengguna sehingga `auth.uid()`, RLS, permission, dan RPC database tetap menjadi sumber otorisasi.

## Permission matrix

| Capability | Sales Admin | Admin / Owner | Super Admin |
| --- | --- | --- | --- |
| Baca kotak masuk sendiri | Ya | Ya | Ya |
| Tandai baca / arsip / pulihkan | Ya | Ya | Ya |
| Baca riwayat event yang diizinkan RLS | Ya | Ya | Ya |
| Kelola template | Tidak | Ya | Ya |
| Baca deletion audit | Tidak | Tidak | Ya |
| Hapus permanen dari arsip | Tidak | Tidak | Ya |

Database tetap menjadi pengaman akhir melalui `notification.manage`, `permanent_delete`, RLS, dan security-definer RPC yang sudah tersedia.

## Database alignment

Remote project `DEBRODER APPAREL` sudah memiliki migration Phase 12 berikut sebelum pekerjaan backend/UI dilanjutkan:

- `20260713022359` — notification audit schema
- `20260713022410` — audit lock
- `20260713022423` — inbox lifecycle
- `20260713022434` — delete audit
- `20260713022446` — template lifecycle
- `20260713022502` — template delete audit
- `20260713022513` — table security
- `20260713022530` — RPC security
- `20260713022543` — RPC search path
- `20260713022555` — duplicate hook cleanup
- `20260713022611` — route alignment A
- `20260713022626` — route alignment B
- `20260713022912` — lifecycle and audit
- `20260713022951` — event alignment
- `20260713023018` — security grants
- `20260713023220` — audit channel alignment
- `20260713023232` — delete audit alignment
- `20260713023435` — archive reason alignment
- `20260713024010` — audit policy alignment

Keputusan: **tidak ada migration pending untuk Phase 12, tidak ada apply ulang, dan tidak ada reset database.**

## Event integration yang sudah aktif di database

- Pesanan dibuat.
- Quotation dikirim/disetujui.
- Mockup siap, revisi, dan disetujui.
- Pembayaran dikirim, diverifikasi, ditolak, dan memenuhi syarat produksi.
- Job Order dibuat.
- Produksi dimulai atau ditahan.
- QC lulus atau gagal.
- Siap dikirim, siap diambil, resi tersedia, dan pesanan selesai.

Idempotency key dan unique constraint mencegah notifikasi duplikat untuk event/channel/penerima yang sama.

## Verification

- Remote migration comparison: PASS; Phase 12 sudah applied, tidak dijalankan ulang.
- Remote database transaction smoke test: PASS dan seluruh data test di-rollback.
  - event idempotency,
  - notification creation,
  - mark read,
  - archive/restore,
  - permanent deletion audit,
  - template create/update/archive/restore/delete,
  - external provider tetap nonaktif.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS, 0 error; 24 warning lama di luar Phase 12.
- `npm test`: PASS, 12 file dan 64 test.
- `npm run build`: PASS untuk compile, type validation, static generation 75 halaman, dan route manifest. Karena sandbox gagal DNS ke Google Fonts, build verification menggunakan mocked Next font responses sementara; source font production tidak diubah.

## Rollback note

Tidak ada rollback database yang diperlukan karena Phase 12 tidak menambah atau menjalankan migration. Rollback source cukup merevert file Phase 12 dan integrasi navigation/header. Jangan menghapus tabel, event, template, atau audit remote yang sudah ada.

## Scope boundary

- Provider email/WhatsApp/SMS/push tidak dikonfigurasi dalam Phase 12.
- Tidak ada perubahan role foundation atau audit lintas modul Phase 13.
- Phase 13 tetap **NOT STARTED**.
