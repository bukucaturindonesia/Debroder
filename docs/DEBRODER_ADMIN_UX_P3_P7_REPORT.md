# DEBRODER Admin UX P3–P7 Report

## Status implementasi

Patch P3–P7 telah disiapkan berdasarkan audit struktur admin yang berjalan pada commit `451f6e2c847e93a16aa379220e100b206ef16a99`.

Verifikasi production build belum dapat dijalankan di lingkungan penyusunan patch karena repository lengkap tidak tersedia pada filesystem runtime. Setelah patch masuk repository, jalankan seluruh command verifikasi pada bagian akhir dokumen. Jangan menandai P3–P7 sebagai LOCKED sebelum semua command PASS dan deployment Vercel berstatus Ready.

## Kondisi sebelum perubahan

- `app/admin/layout.tsx` menambahkan `AdminPrimaryNavigation` di atas semua halaman admin.
- `AdminDashboard` masih mempunyai sidebar sendiri.
- Dashboard muncul pada top navigation dan sidebar.
- Menu Order belum menyatu dengan sidebar utama.
- Navigasi mobile menggunakan select panjang.
- Halaman Formal Quotation memiliki pola tampilan sendiri.
- Feedback berhasil setelah membuat draft belum muncul pada halaman tujuan.
- Tabel quotation hanya mengandalkan horizontal scroll di semua ukuran layar.

## P3 — Struktur sidebar

Dibuat satu navigasi admin terpusat dengan kelompok:

### DASHBOARD
- Dashboard

### WEBSITE
- CMS / Landing Page
- Page Hero
- Media Library
- Gambar Website
- Banner Instagram

### KATALOG
- Produk & PIM
- PIM Manager
- PIM V2
- Kategori / Model
- Layanan
- Store / Cabang

### OPERASIONAL
- Order
  - Formal Quotation

### SISTEM
- Pengaturan

Menu yang belum mempunyai route stabil tidak ditampilkan:

- Pesanan baru v1.2
- Pembayaran
- Produksi
- Pengiriman
- Pelanggan
- Laporan

## P4 — Admin Shell

Komponen baru:

- `AdminShell`
- `AdminSidebar`
- `AdminHeader`
- `AdminBreadcrumb`
- `AdminPageHeader`
- konfigurasi `admin-navigation`

Perilaku:

- satu sidebar desktop;
- drawer mobile;
- active navigation berdasarkan pathname;
- breadcrumb;
- logout terpusat;
- route login tidak dibungkus shell;
- adapter CSS menyembunyikan sidebar lama pada `AdminDashboard` tanpa mengubah fungsi CMS/PIM internal;
- halaman quotation memakai padding dari Admin Shell.

## P5 — Feedback dan state

Ditambahkan:

- `AdminAlert`;
- `AdminLoadingState`;
- `AdminEmptyState`;
- `AdminErrorState`;
- flash message lintas redirect menggunakan `sessionStorage`;
- double-submit guard pada form quotation;
- fieldset dinonaktifkan selama penyimpanan;
- pesan error tidak lagi memaparkan error database mentah.

Setelah draft dibuat, halaman detail menerima notifikasi:

`Draft QTN-DEB-YYYY-#### berhasil dibuat.`

## P6 — Tabel, status, dan responsive

- satu mapping status quotation Bahasa Indonesia;
- `AdminStatusBadge` reusable;
- jumlah hasil ditampilkan;
- tombol Refresh memiliki loading/disabled state;
- desktop memakai tabel;
- mobile memakai card list;
- empty state dan loading state terpisah.

## P7 — Role-aware navigation

Role yang dipakai:

- owner
- superadmin
- super_admin
- sales_admin
- admin

Aturan:

- owner, superadmin, super_admin, dan admin melihat seluruh menu stabil;
- sales_admin hanya melihat Formal Quotation;
- sales_admin yang membuka halaman di luar quotation diarahkan ke Formal Quotation;
- shell dan halaman quotation sama-sama memverifikasi session/role;
- Supabase RLS tetap menjadi lapisan keamanan data.

## File dibuat

- `app/admin/admin-shell.css`
- `components/admin/layout/AdminBreadcrumb.tsx`
- `components/admin/layout/AdminHeader.tsx`
- `components/admin/layout/AdminPageHeader.tsx`
- `components/admin/layout/AdminShell.tsx`
- `components/admin/layout/AdminSidebar.tsx`
- `components/admin/layout/admin-flash.ts`
- `components/admin/layout/admin-navigation.ts`
- `components/admin/ui/AdminFeedback.tsx`
- `components/admin/ui/AdminStatusBadge.tsx`
- `docs/DEBRODER_ADMIN_UX_P3_P7_REPORT.md`

## File diubah

- `app/admin/layout.tsx`
- `components/admin/AdminPrimaryNavigation.tsx`
- `components/admin/QuotationListAdmin.tsx`
- `components/admin/QuotationCreateAdmin.tsx`

## Compatibility shim

`components/admin/AdminPrimaryNavigation.tsx` ditimpa menjadi compatibility shim yang mengembalikan `null`. `app/admin/layout.tsx` tidak lagi memakainya, sehingga top navigation P2 tidak dapat muncul kembali. File dapat dihapus pada cleanup berikutnya setelah dipastikan tidak ada import lama.

## Route yang harus diuji

- `/admin/login`
- `/admin/dashboard`
- `/admin/homepage-sections`
- `/admin/page-hero`
- `/admin/media`
- `/admin/site-media`
- `/admin/banner`
- `/admin/products`
- `/admin/pim-manager`
- `/admin/pim-v2`
- `/admin/categories`
- `/admin/services`
- `/admin/store`
- `/admin/website-settings`
- `/admin/orders/quotations`
- `/admin/orders/quotations/new`
- `/admin/orders/quotations/[id]`

## Verifikasi wajib

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Catat hasil aktual:

- Typecheck: PENDING
- Lint: PENDING
- Test: PENDING
- Build: PENDING
- Vercel deployment: PENDING

## Acceptance check setelah deployment

- Tidak ada top navigation Dashboard/Order lama.
- Dashboard tidak tampil dua kali.
- Order berada di sidebar.
- Formal Quotation dapat dibuka tanpa mengetik URL.
- Sidebar desktop dan drawer mobile bekerja.
- Active state dan breadcrumb benar.
- Logout bekerja.
- CMS/PIM lama tetap dapat digunakan.
- Form quotation tidak dapat terkirim dua kali.
- Setelah simpan muncul notifikasi berhasil dan halaman detail terbuka.
- ID quotation salah menampilkan fallback aman dari halaman detail, bukan 404 umum.
- Tidak ada link menu menuju route yang belum tersedia.
