# DEBRODER Official Website

Website resmi DEBRODER berbasis Next.js App Router, TypeScript, Tailwind CSS, dan Supabase untuk fitur Super Admin.

## Menjalankan Project

```bash
pnpm install
pnpm dev
```

## 1. Membuat Project Supabase

1. Buka Supabase dan buat project baru.
2. Simpan Project URL dan anon public key dari menu API.
3. Jangan gunakan service role key di frontend.

## 2. Environment Supabase

Salin `.env.example` menjadi `.env.local`, lalu isi:

```bash
NEXT_PUBLIC_SUPABASE_URL=ISI_SUPABASE_PROJECT_URL_DI_SINI
NEXT_PUBLIC_SUPABASE_ANON_KEY=ISI_SUPABASE_ANON_PUBLIC_KEY_DI_SINI
SUPABASE_SERVICE_ROLE_KEY=ISI_HANYA_DI_SERVER
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=ISI_RECAPTCHA_SITE_KEY
RECAPTCHA_SECRET_KEY=ISI_RECAPTCHA_SECRET_KEY
```

Gunakan Project URL Supabase, bukan URL REST endpoint. Contoh benar:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ncpzxhoiiaesedhvhnho.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ISI_SUPABASE_PUBLISHABLE_KEY
```

Website publik tetap berjalan memakai fallback data statis jika Supabase belum dikonfigurasi atau data Supabase kosong.

## 3. Environment di Vercel

Tambahkan environment variables yang sama di Vercel untuk Production, Preview, dan Development. Khusus website online, environment variables wajib ada di Production. Jika hanya diisi untuk Development, deploy Production tetap membaca Supabase sebagai belum aktif.

```bash
NEXT_PUBLIC_SUPABASE_URL=ISI_SUPABASE_PROJECT_URL_DI_SINI
NEXT_PUBLIC_SUPABASE_ANON_KEY=ISI_SUPABASE_ANON_PUBLIC_KEY_DI_SINI
```

## 4. Menjalankan Schema SQL

1. Buat project Supabase.
2. Buka SQL Editor di Supabase.
3. Jalankan isi `supabase/schema.sql`.

Schema ini juga membuat bucket `public-assets`, tabel layanan dan media, serta kebijakan RLS. Jalankan ulang schema terbaru saat memperbarui project lama; seluruh perintah dibuat aman untuk dijalankan kembali.

## 5. Menjalankan Seed Data

Jalankan isi `supabase/seed.sql` di SQL Editor setelah schema selesai dibuat.

## 6. Membuat User Superadmin

1. Buat user melalui Supabase Auth.
2. Buka `supabase/make-superadmin.sql`.
3. Ganti `GANTI_DENGAN_EMAIL_ADMIN` dengan email user admin.
4. Jalankan SQL tersebut di Supabase SQL Editor untuk membuat atau mengubah role user menjadi `superadmin`.

Login admin tersedia di `/admin/login`. Dashboard tersedia di `/admin/dashboard` dan hanya bisa diakses user dengan role `superadmin`.

Menu admin mencakup Hero, Produk, Kategori, Layanan, Store, Page Hero, Tentang, Kontak, dan Media Library. Media Library menerima maksimal 20 file sekaligus, mengoptimalkan foto, membuat thumbnail video, dan membatasi foto 10 MB serta video 100 MB.

## Keamanan reCAPTCHA

Gunakan reCAPTCHA v3 dan daftarkan domain production serta localhost untuk pengujian. Site key boleh berada di frontend; secret key hanya dipakai oleh route server `/api/recaptcha`. Login tetap dapat diuji di development tanpa key, tetapi deployment production harus mengisi kedua key.

## 7. Deploy Ulang ke Vercel

Setelah schema, seed, role superadmin, dan env Vercel siap, pilih redeploy without cache dari dashboard Vercel atau push commit baru ke repository.

## Langkah Aktivasi Supabase

1. Buat project Supabase.
2. Ambil Project URL dari Project Settings -> API.
3. Ambil anon/public/publishable key.
4. Isi `.env.local`.
5. Tambahkan Environment Variables di Vercel untuk Production, Preview, dan Development.
6. Redeploy without cache.
7. Jalankan `supabase/schema.sql`.
8. Jalankan `supabase/seed.sql`.
9. Buat user admin di Supabase Authentication.
10. Jalankan `supabase/make-superadmin.sql`.
11. Login melalui `/admin/login`.

## Build Production

```bash
pnpm build
pnpm start
```

## Deploy ke Vercel

1. Upload repository/project ini ke Git provider.
2. Import project di Vercel.
3. Tambahkan environment variables Supabase di Vercel.
4. Deploy.

Catatan: jangan pernah memasukkan Supabase service role key ke frontend atau environment publik.

## DEBRODER PIM V2 - Stage 1

Stage 1 sudah ditambahkan sebagai pondasi database PIM V2.

Jalankan SQL berikut di Supabase SQL Editor setelah deploy file:

```text
supabase/pim-v2-stage1-master-data.sql
```

Baca catatan lengkap di:

```text
DEBRODER-PIM-V2-STAGE1-NOTES.md
```

## DEBRODER PIM V2 - Stage 2

Stage 2 menambahkan halaman admin baru `/admin/pim-v2` untuk mengelola master data PIM V2:
produk, subkategori, varian warna, ukuran/stok, gambar varian, size guide, layanan produksi, dan master jersey.

Pastikan `supabase/pim-v2-stage1-master-data.sql` sudah dijalankan sebelum memakai halaman ini.


## DEBRODER PIM V2 - Stage 3

Public product detail dan cart sekarang membaca varian PIM V2:

- product variants
- variant sizes
- variant images
- product size guides
- variant price adjustment
- variant snapshot in cart
- WhatsApp message with selected variant, size, SKU, stock info

Catatan lengkap: `DEBRODER-PIM-V2-STAGE3-PUBLIC-VARIANT-CART-NOTES.md`.


## Stage 4 - PIM V2 Jersey Configurator

Tambahan terbaru: public Jersey Configurator untuk halaman `/jersey/[slug]`, live pricing, minimum order, addon, required service, team information, cart snapshot, dan WhatsApp order detail. Lihat `DEBRODER-PIM-V2-STAGE4-JERSEY-CONFIGURATOR-NOTES.md`.
