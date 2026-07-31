# DEBRODER — Kaos Polos Editorial Revision

## Cara menerapkan

Ekstrak isi ZIP ini ke root repository DEBRODER dan izinkan file dengan path yang sama untuk diganti.
Paket menjaga struktur folder repository dan hanya membawa file yang berubah untuk scope ini.

## Perubahan owner yang diterapkan

- Hero `/kaos-polos`: tinggi menjadi 60% dari implementasi sebelumnya; tipografi utama menjadi 80%.
- Featured: sumber CMS editorial, bukan produk PIM; dua item; gap 0 px; heading dan teks utama tidak bold.
- Banner editorial desktop: acuan 1600 × 500 px, kiri 400 × 500, kanan 1200 × 500, rasio kolom 1:3, gap 1 px.
- Banner kiri: seluruh media menuju flow Custom Kaos Polos canonical.
- Banner kanan: media tidak clickable; interaksi hanya CTA caption.
- `Berdasarkan Kategori` menjadi `Pilih Kategori` dan mengikuti pola Shop by Category homepage: scroll-snap, tombol geser, dan scrollbar bawah.
- Heading katalog `Kaos Polos` regular.
- Media produk tetap 4:5.
- Desktop tetap tiga kolom produk ketika sidebar filter terbuka; card mengecil dalam lebar tersisa.
- CMS khusus tersedia pada `/admin/commerce/kaos-polos`.

## Konten CMS yang perlu dibuat/publish

Pada `/admin/commerce/kaos-polos`:

1. Dua record `featured_editorial` (rekomendasi media 2000 × 2500 px).
2. Satu record `banner_editorial_left` (rekomendasi 400 × 500 px).
3. Satu record `banner_editorial_right` (rekomendasi 1200 × 500 px, isi caption dan CTA).

Hero tetap dikelola melalui CMS hero existing (`/admin/page-hero`) untuk page key `kaos-polos`.

## Database

Tidak ada migration dan tidak ada perubahan schema database. Implementasi memakai tabel CMS canonical existing `cms_banners` dan `page_heroes`.

## Status verifikasi di sandbox

PASS:
- parse/transpile syntax enam file TypeScript/TSX yang berubah;
- validasi keseimbangan brace CSS;
- static owner-contract assertions;
- scan conflict marker dan trailing whitespace.

BELUM DIJALANKAN DI SANDBOX:
- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd vitest run test/custom-commerce.test.ts`
- `pnpm.cmd test`
- `pnpm.cmd build`
- `git diff --check`

Alasan: ZIP tidak menyertakan `node_modules`, sedangkan package registry tidak dapat dijangkau dari sandbox. Jalankan seluruh quality gate tersebut di repository lokal sebelum commit/push/deploy.

Tidak dilakukan: commit, push, deploy, atau migration.
