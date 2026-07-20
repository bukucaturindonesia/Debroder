# DEBRODER Human-Centered Order Experience P0 — Apply Notes

## Scope

Paket ini dipasang **setelah** Phase 0–3 dan Phase 4–13. Jangan mengganti repository dengan isi ZIP secara keseluruhan. Salin file sesuai path dan review diff.

## Urutan migration

```text
1. 20260720010000_order_integrity_handoff_phase0_3.sql
2. 20260720020000_order_operations_phase4_13.sql
3. 20260720030000_human_centered_order_experience_p0.sql
```

Migration ketiga bergantung pada tabel pembatalan Phase 4–13 dan tidak boleh dijalankan lebih dahulu.

## Perintah quality gate

```bash
pnpm install --frozen-lockfile
pnpm vitest run test/admin-order-detail-react130.test.ts
pnpm vitest run test/admin-order-pricing-workspace.test.ts
pnpm vitest run test/human-centered-order-experience-p0.test.ts
pnpm typecheck
pnpm lint
pnpm test
rm -rf .next
pnpm build
```

## Preview database gate

Terapkan migration hanya pada Supabase Preview terlebih dahulu. Setelah berhasil:

1. pastikan helper `_ensure_ready_stock_fulfillment_v2` tidak executable oleh `anon`/`authenticated`;
2. pastikan compatibility RPC tetap membutuhkan `shipping.create`;
3. ulangi migration pada disposable Preview untuk membuktikan trigger redeploy-safe;
4. uji Ready Stock shipping lunas;
5. uji pickup transfer lunas;
6. uji pickup bayar di toko dengan reservasi aktif;
7. uji Custom/Jersey Custom tidak menghasilkan Ready Stock fulfillment;
8. uji order dengan pembatalan aktif tidak menghasilkan fulfillment baru;
9. uji retry menghasilkan fulfillment yang sama, bukan duplikat;
10. periksa audit `ready_stock_fulfillment_auto_created`.

## Browser E2E minimum

### Admin

- Task Inbox → `Kerjakan Sekarang` membuka tahap aktif;
- order paid + fulfillment preparing membuka `Persiapan Barang`;
- setelah aksi berhasil, tombol lama hilang dan aksi berikutnya muncul;
- cancelled order tidak menampilkan produksi/packing/pengiriman;
- cancelled + pending payment hanya membuka penyelesaian payment exception;
- layout 360/390/430/768/1024/1280/1440/1600 px tidak memerlukan zoom-out.

### Pelanggan

- halaman konfirmasi langsung menampilkan perjalanan dari `Pesanan Dibuat`;
- tracking/payment memakai urutan yang sama;
- status Admin dan pelanggan berasal dari canonical stage yang sama;
- cancelled order menampilkan tahap berikutnya sebagai `Tidak Dilanjutkan`;
- resi kurir tidak diganti nomor internal DEBRODER.

## GitHub dan Vercel

Commit, push, merge, dan deployment tetap dilakukan owner. Paket ini belum diterapkan ke GitHub, Vercel, maupun Supabase remote.
