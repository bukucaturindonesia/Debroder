# ADMIN UX P2 — Tambahkan Menu Order

## Masalah

Admin harus mengetik URL manual untuk membuka Formal Quotation karena menu Order belum tersedia.

## Perbaikan

Patch ini menambahkan navigasi utama admin yang selalu terlihat pada seluruh halaman admin selain halaman login.

Menu:

- Dashboard
- Order

Menu Order langsung membuka:

`/admin/orders/quotations`

## Perilaku

- sticky di bagian atas;
- aktif state pada menu yang sedang dibuka;
- tersedia di desktop dan mobile;
- tidak muncul di halaman `/admin/login`;
- tidak menghapus atau merusak sidebar lama.

## File

- `components/admin/AdminPrimaryNavigation.tsx`
- `app/admin/layout.tsx`

## Verifikasi

1. Login admin.
2. Buka `/admin/dashboard`.
3. Pastikan menu **Order** terlihat.
4. Klik **Order**.
5. Pastikan masuk ke `/admin/orders/quotations`.
6. Pastikan tombol Order terlihat aktif.
7. Jalankan:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```
