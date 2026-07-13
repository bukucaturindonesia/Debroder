# DEBRODER v1.2 Phase 13 — Role & Audit

Status: **COMPLETE — TECHNICALLY VERIFIED — READY TO DEPLOY**

## Scope resmi

Phase 13 menyelesaikan role-based access control dan audit lintas alur v1.2 setelah Phase 12 Notification Management. Scope mengikuti blueprint resmi v1.2:

- Super Admin
- Sales / Admin Order
- Designer
- Production Admin
- Operator
- Finance
- Quality Control
- Store Staff
- permission matrix per modul
- RLS sesuai kebutuhan kerja
- audit perubahan quantity, harga, approval/status, pembayaran, file, actor, waktu, serta before/after

Phase 14 Repeat Order tidak dikerjakan. Remote migration history sudah memuat satu migration fondasi bernama `phase14_repeat_order` sebelum pekerjaan ini dimulai; migration tersebut tidak dibaca ulang, tidak dijalankan ulang, tidak diubah, dan tidak diintegrasikan ke aplikasi pada eksekusi Phase 13 ini.

## Kondisi awal yang dipertahankan

Remote database sudah memiliki fondasi Phase 13 lama:

- `permission_definitions`
- `role_permissions`
- `system_audit_log`
- `has_permission(...)`
- `audit_row_change()`
- append-only guard audit
- migration `phase13_permissions_matrix`
- migration `phase13_append_only_audit`

Fondasi tersebut tidak dibuat ulang dan migration lama tidak dijalankan ulang. Phase 12, tabel notifikasi, trigger event, template, inbox, history, dan migration history tidak diubah.

`AGENTS.md`, `docs/DEBRODER_MASTER_STATE.md`, dan `docs/CURRENT_PHASE_HANDOFF.md` tidak tersedia pada source package awal. Dua dokumen state dibuat pada penutupan Phase 13. Tidak ada aturan repository-level dari `AGENTS.md` yang dapat dibaca karena file tersebut memang tidak ada di source proyek.

## Implementasi aplikasi

### Role dan permission

- katalog role resmi dan label bersama
- validasi assignment role di client dan server
- endpoint sesi role/permission
- halaman matriks permission read-only dari database
- perubahan role hanya melalui RPC terautentikasi
- proteksi self-demotion Super Admin
- proteksi agar Super Admin terakhir tidak dapat diturunkan
- matrix permission tetap migration-controlled, bukan edit bebas dari browser

### Audit sistem

- halaman audit lintas modul
- filter entity, action, dan actor role
- pencarian lokal terhadap ID/metadata
- tampilan before/after JSON
- loading, empty, error, retry, dan detail state
- audit bersifat append-only dan tidak menyediakan mutation UI

### Integrasi role operasional

- Designer: quotation read-only dan pengelolaan mockup sesuai permission
- Production Admin: Job Order, Work Item, produksi, QC read, dan fulfillment read
- Operator: hanya Work Item yang ditugaskan; dapat mengubah progres sesuai RPC yang sudah ada
- Finance: order/payment read dan lifecycle pembayaran sesuai permission
- Quality Control: antrean, inspeksi, approval, rework, arsip QC
- Store Staff: fulfillment/pickup lifecycle
- navigasi dan role home disesuaikan dengan scope tiap role
- notifikasi Phase 12 tetap tersedia untuk seluruh role staf resmi

## Database dan migration

Migration lama Phase 13 ditemukan di remote dan tidak diulang.

Migration koreksi kecil dan aman yang dijalankan:

1. `20260713042309 — v1_2_phase_13_role_catalog_and_rls_alignment`
   - memperluas role constraint `profiles`
   - menambah permission definition yang dibutuhkan UI/API
   - mengisi matrix role resmi
   - menambah RPC `update_profile_role`
   - menambah audit trigger untuk role, quantity/price rows, dan file-bearing rows
   - menambah RLS berbasis permission secara additive
   - membatasi operator ke Work Item yang ditugaskan
   - memperluas recipient role untuk engine notifikasi Phase 12 tanpa mengubah lifecycle notifikasi

2. `20260713042359 — v1_2_phase_13_production_history_rls`
   - menambah RLS additive untuk revision, assignment history, dependency, dan deletion audit produksi

Tidak ada reset database, penghapusan tabel/data, replay migration, atau penghapusan RLS/trigger/function.

## Verifikasi database

- role constraint memuat seluruh role resmi v1.2
- specialist role permission seed tersedia
- 42 policy Phase 13 terpasang
- audit trigger role, item quantity/price, file, dan operator guard terpasang
- transactional audit smoke test: **PASS**, kemudian **ROLLBACK**

## Quality gates

- `npm run typecheck`: **PASS**
- `npm run lint`: **PASS — 0 error, 24 warning lama**
- `npm test`: **PASS — 13 file, 73 test**
- Phase 13 contract test: **PASS — 9 test**
- `npm run build`: **PASS — 80 halaman**

Build sandbox menggunakan mock lokal sementara untuk Google Fonts karena DNS Google Fonts tidak tersedia. Standalone typecheck dan lint dijalankan terlebih dahulu dan lulus; pemeriksaan ganda di dalam Next build dilewati hanya pada konfigurasi sementara. `experimental.cpus: 1` digunakan sementara untuk mencegah worker build sandbox berhenti di page collection. `app/layout.tsx` dan `next.config.ts` sudah dikembalikan ke source asli setelah build.

## Verifikasi UI

1. Login sebagai Super Admin.
2. Buka **Sistem → Role & Permission**.
3. Pastikan daftar profil, role selector, dan matriks permission tampil.
4. Ubah role satu akun uji, lalu pastikan success state muncul.
5. Buka **Sistem → Audit Sistem** dan pastikan perubahan role muncul dengan before/after.
6. Login sebagai setiap role uji dan pastikan navigasi hanya menampilkan modul yang relevan.
7. Untuk Operator, pastikan hanya Work Item yang ditugaskan yang terlihat.
8. Pastikan Designer tidak dapat mengubah quotation, tetapi dapat menjalankan aksi mockup yang diizinkan.
9. Pastikan Finance, QC, dan Store Staff hanya dapat mengakses lifecycle sesuai permission.
10. Pastikan Phase 12 Notification tetap dapat dibuka dan template manager tetap terbatas pada role pengelola.

## Boundary

Phase 13 selesai dan siap deploy. **Phase 14 belum dimulai.**
