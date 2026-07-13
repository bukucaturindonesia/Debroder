# DEBRODER Deployment Fix Report

Date: 2026-07-11

## 1. Root cause sebenarnya

Deployment/install tidak reproducible karena `package.json` tidak menetapkan `packageManager`, rentang versi ESLint menghasilkan resolusi paket terbaru, dan `node_modules` lokal berasal dari manifest berbeda. Repository juga memiliki dua konfigurasi Next.js; salah satunya memakai `ignoreDuringBuilds`. Setelah install pulih, typecheck memperlihatkan deklarasi domain v1.1 hilang dari `lib/types.ts` dan satu helper `isRecord` salah scope di route upload.

## 2. File yang diubah

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `next.config.ts`
- `next.config.mjs` (dihapus setelah isinya digabung)
- `vitest.config.ts`
- `.env.example`
- `lib/types.ts`
- `lib/bulk-ordering.ts`
- `lib/product-validation.ts`
- `lib/product-utils.ts`
- `lib/product-parser.ts`
- `lib/supabase/products.ts`
- `lib/cart/operations.ts`
- `data/sample-products.ts`
- `components/product/product-detail-client.tsx`
- `components/admin/pim-v2-client.tsx`
- `app/api/admin/pim-v2/products/route.ts`
- `app/api/customer-uploads/route.ts`
- `docs/blueprint-progress.md`

## 3. Dependency yang diturunkan, dinaikkan, atau dipin

- `@eslint/eslintrc` dipin ke `3.3.1`.
- `eslint` dipin ke `9.39.1`.
- `eslint-config-next` dipin ke `15.5.19`.
- `vitest` ditambahkan kembali dan dipin ke `3.2.4` agar test script yang sudah ada dapat berjalan.
- Lockfile diregenerasi menggunakan pnpm yang sama dengan `packageManager`.

## 4. Versi pnpm final

`pnpm@10.12.4`, ditetapkan melalui `packageManager`.

## 5. Konfigurasi yang dihapus

- `allowBuilds` yang tidak efektif pada pnpm 10 diganti allowlist resmi `onlyBuiltDependencies` untuk `esbuild`, `sharp`, dan `unrs-resolver`.
- `eslint.ignoreDuringBuilds` dihapus.
- Konfigurasi Next.js duplikat dihapus.

`nodeLinker: hoisted` dan `packageImportMethod: copy` dipakai konsisten untuk menghindari kegagalan hardlink/symlink pada workspace OneDrive. Proteksi dependency tidak dinonaktifkan secara global.

## 6. Duplicate file yang diselesaikan

- `next.config.mjs` dan `next.config.ts` digabung menjadi satu `next.config.ts`.
- Hanya terdapat satu App Router, yaitu root `app/`; tidak ada `src/app/` duplikat.

## 7. Environment variable yang dibutuhkan

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `PIM_V2_ADMIN_TOKEN` (server only)
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SECRET_KEY` (server only)

Nama variabel sudah tercantum di `.env.example` tanpa secret. Build dapat selesai tanpa nilai database.

## 8. Hasil clean install

PASS — `pnpm install --frozen-lockfile` dengan pnpm 10.12.4; lockfile dinyatakan up to date dan 407 paket terpasang. Instalasi awal perlu membersihkan `node_modules` yang permission-nya rusak.

## 9. Hasil lint

PASS — 0 error, 19 warning non-blocking dari source lama.

## 10. Hasil typecheck

PASS — `pnpm exec tsc --noEmit`, exit code 0.

## 11. Hasil test

PASS — 3 file, 12 test lulus.

## 12. Hasil build

PASS — Next.js 15.5.19 production build selesai; 58 route/page berhasil digenerasi.

## 13. Hasil Vercel deployment

FAIL/BLOCKED — koneksi Vercel tersedia dan team `OKDEAL` dapat dibaca, tetapi daftar project kosong. Tidak ada project/deployment DEBRODER yang dapat diperiksa atau di-redeploy. Vercel belum boleh dinyatakan PASS.

## 14. Risiko yang masih tersisa

- 19 warning lint lama masih ada, tetapi tidak memblokir lint/build.
- Project Vercel belum terhubung ke team yang dapat diakses dari konektor.
- Folder `.git` pada snapshot workspace kosong, sehingga status/diff dan kesiapan commit tidak dapat diverifikasi lewat Git.

## 15. Exact next action jika ada blocker

1. Import/link repository DEBRODER sebagai project pada team Vercel `OKDEAL`, dengan repository root sebagai Root Directory.
2. Masukkan environment variable pada bagian 7 untuk Preview dan Production sesuai kebutuhan.
3. Deploy menggunakan install command default pnpm (membaca `packageManager: pnpm@10.12.4`) dan build command `pnpm build`.
4. Ambil build log deployment tersebut dan pastikan status akhir `Ready`.

Tidak ada source v1.0/v1.1, data, atau migration yang dihapus. Tidak ada fitur baru atau pekerjaan v1.2 yang ditambahkan.
