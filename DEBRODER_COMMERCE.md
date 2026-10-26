# DEBRODER Commerce Audit — Checkout

Tanggal: 22 Oktober 2026 (Asia/Makassar)  
Branch: `codex/unified-category-hero-v1`  
HEAD saat audit: `726c69267a400730e894881d8ae8a44b32921b76`  
Scope: inspeksi read-only pada checkout dan kontrak RPC/order; verifikasi regresi lokal. Tidak ada pesanan nyata atau dummy baru yang dibuat.

## Ringkasan

**Status: NO-GO untuk mengklaim checkout produksi telah pulih.** Source lokal menangani mismatch RPC sebagai kegagalan layanan 503, mempertahankan error domain stok/layanan sebagai 409, dan mengaktifkan order dengan RPC terpisah setelah pembuatan. Empat kelompok tes checkout yang dijalankan lulus (32 tes). Namun bukti terbaru yang tercatat sebelumnya menunjukkan schema produksi belum memiliki signature RPC yang dibutuhkan source untuk checkout pelanggan terverifikasi. Kondisi remote tidak diperiksa ulang selama audit ini, sehingga mismatch tersebut adalah blocker berdasarkan checkpoint historis, bukan reproduksi runtime sesi ini.

## Temuan dan penyebab

### BLOCKER — signature RPC pelanggan terverifikasi berpotensi tidak cocok di produksi

- `app/api/checkout/route.ts` memilih `create_public_checkout_order` untuk Ready Stock biasa, mengirim 13 argumen dasar termasuk `p_shipping_address_snapshot`, lalu menambahkan `p_customer_user_id` untuk pelanggan terverifikasi sehingga payload tersebut berisi 14 argumen.
- Jalur Ready Stock dengan layanan memilih `create_public_instant_checkout_order`; jalur custom dan configurator memakai RPC berbeda. Payload harga, layanan, dan konfigurasi dibuat server-side.
- Migration lokal `supabase/migrations/20261020163915_p0_regular_checkout_recovery_v1.sql` menambahkan overload regular 14-argumen dan instant 14-argumen, sekaligus fungsi validasi customer terdaftar. Checkpoint sebelumnya mencatat migration tersebut sudah diterapkan di staging, tetapi belum di production pada `lzennundwqqtyvvcnzbg`; catatan yang sama menyebut definisi produksi sebelumnya hanya memiliki 12/13 argumen dan tidak memiliki helper customer terdaftar.
- Jika kondisi historis itu masih berlaku, checkout akun terverifikasi akan gagal saat pemanggilan RPC, sebelum order tercipta. Checkout guest dan varian route lain tidak dapat disimpulkan ikut gagal dari bukti ini. Runtime Vercel sebelumnya tidak menyediakan log yang cukup untuk menghubungkan error awal secara pasti.
- Menghapus `p_customer_user_id` dari source bukan perbaikan aman karena akan menghilangkan pengaitan order ke akun. Perbaikannya memerlukan validasi kontrak remote dan koordinasi penerapan forward migration yang telah disiapkan; audit ini tidak mengubah atau menjalankan migration.

### MINOR/TERTUTUP DI SOURCE — error schema pernah berisiko ditampilkan sebagai konfigurasi layanan

- `checkoutDomainError` sekarang memeriksa `isCheckoutDomainException` sebelum memetakan teks domain ke `CHECKOUT_SERVICE_INVALID`. Error PostgREST/schema/constraint yang menyertakan nama parameter `snapshot` dikembalikan sebagai `CHECKOUT_UNAVAILABLE` (503), sementara penolakan SQL domain P0001 untuk stok/layanan tetap menjadi 409.
- Test `test/checkout-database-error-classification.test.ts` menegaskan pemisahan ini. Tidak ada perubahan kode pada sesi ini; status hanya diverifikasi melalui tes yang dijalankan.

## Perubahan file pada audit ini

- `DEBRODER_COMMERCE.md` — dibuat sebagai laporan temuan, bukti, cakupan tes, serta blocker dan langkah koordinasi.
- `CURRENT_PHASE_HANDOFF.md` — checkpoint wajib diperbarui.
- Tidak ada perubahan source, API, UI, kontrak DB, migration, deployment, atau data.

## Pengujian

EXECUTED AND PASSED:

- `pnpm test test/checkout-database-error-classification.test.ts test/checkout-idempotency-http-status.test.ts test/checkout-runtime-recovery.test.ts test/checkout-instant-lock-migration.test.ts`
- 4 file, 32 tes lulus.
- Mencakup pemetaan error schema/domain, status retry idempotent, alur recovery, dan guard statis migration concurrency lokal. Guard statis bukan bukti eksekusi SQL/PostgreSQL.

BLOCKED lalu berhasil dijalankan di luar sandbox: pemanggilan awal `pnpm` ditolak sandbox karena `EPERM` saat realpath `node_modules`; percobaan ulang yang disetujui reviewer lulus.

NOT RUN: browser desktop/mobile, checkout end-to-end terhadap data produk, order/payment, database smoke test, status migration remote, typecheck, lint, full test suite, build, dan Vercel logs. Tidak ada transaksi yang dibuat. Deployment tidak diperiksa atau diubah.

## Kontrak database untuk AI Director dan Agent 03

Audit ini tidak mengubah kontrak database. Kontrak source yang perlu dicocokkan oleh Agent 03 adalah signature regular/instant 14-argumen saat `p_customer_user_id` disertakan, termasuk parameter `p_shipping_address_snapshot`; helper validasi akun terdaftar dan ACL service-role-only dari migration recovery juga harus tersedia. Sebelum deployment atau pemakaian klaim pemulihan, lakukan preflight read-only terhadap project/environment yang tepat, definisi fungsi, ACL, riwayat migration, serta bukti recovery/backup. Jangan menerapkan migration atau membuka checkout production berdasarkan laporan ini saja.

## Pekerjaan yang terhambat dan langkah berikutnya

1. Agent 03 / AI Director memvalidasi signature dan migration history pada environment tujuan, lalu membagikan hasil read-only beserta project identity.
2. Owner menyetujui scope staging terpisah sebelum apply migration atau membuat order uji; lakukan tes request bersamaan dengan fixture baru dan bukti satu order per idempotency key.
3. Evaluasi produksi hanya setelah bukti backup/recovery point, binding project/key-role runtime, coverage trigger, dan cutover client/server telah tersedia serta mendapat persetujuan eksplisit.
4. Setelah environment selesai diperiksa, update status temuan berdasarkan bukti baru; jangan menyebut checkout production pulih sebelum uji runtime yang diizinkan lulus.

Database/migration mutation: NO. Staging mutation: NO. Production mutation: NO. Hasil audit ini tidak menyatakan fitur COMPLETE.
