# DEBRODER Supabase Migration History Repair

Tambahkan file migration ini ke repository setelah:

1. `20260720010000_order_integrity_handoff_phase0_3.sql`
2. `20260720020000_order_operations_phase4_13.sql`
3. `20260720030000_human_centered_order_experience_p0.sql`

Migration ini sudah diterapkan ke Supabase remote. Fungsinya hanya memastikan grant SELECT untuk role `authenticated` pada tiga tabel tetap tersedia, sementara pembatasan data tetap dilakukan oleh RLS.

Tidak mengubah atau menghapus order, payment, stock, task, maupun audit data.
