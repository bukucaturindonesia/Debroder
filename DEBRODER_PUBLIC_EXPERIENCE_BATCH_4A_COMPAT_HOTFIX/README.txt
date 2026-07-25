DEBRODER PUBLIC EXPERIENCE BATCH 4A — COMPATIBILITY HOTFIX

Perbaikan:
- Mengembalikan kompatibilitas CategoryCommercePage untuk /headwear.
- Field konfigurasi discovery baru tetap dipakai oleh /kaos-polos dan /jaket-hoodie.
- Konfigurasi lama seperti eyebrow tetap diterima.
- Tidak mengubah test atau business logic.

Cara pakai dari root repository:
  .\DEBRODER_PUBLIC_EXPERIENCE_BATCH_4A_COMPAT_HOTFIX\apply-batch4a-compat-hotfix.cmd

Setelah PASS:
  pnpm.cmd build
