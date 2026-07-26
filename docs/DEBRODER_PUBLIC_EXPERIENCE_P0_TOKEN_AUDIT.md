# DEBRODER Public Experience P0 — Design Token Audit

Tanggal: 2026-07-26

Scope: P0 Design Tokens Global saja

Status: VERIFIED untuk boundary P0

## Sumber keputusan

- `DEBRODER_PUBLIC_EXPERIENCE_SYSTEM_v1.0_FINAL_FROZEN.md`
- `DEBRODER_Landing_Page_Blueprint_v1.0.docx`
- `DEBRODER_COMMERCE_BLUEPRINT_FINAL.docx`
- governance repository dan handoff aktif

Arsip referensi visual `D:\nike\nike.rar` diperiksa hanya untuk mengukur pola sistem. Tidak ada aset, font, URL, source, identitas, atau class name referensi yang disalin ke production.

## Hasil pengukuran referensi

- 8 file CSS, 6 HTML, 39 PNG, dan 47 resource capture diperiksa.
- Breakpoint yang dominan: 600, 960, 1440, dan 1920 px.
- Ritme spacing yang dominan: 8, 12, 16, 24, 36, dan 48 px.
- Pola visual: canvas netral, media tanpa radius dekoratif, shadow minimal, CTA pill, focus ring eksplisit, dan native horizontal rail.
- Font proprietary pada referensi ditolak; DEBRODER tetap memakai stack legal Barlow Condensed/Inter dengan fallback sistem.

## Temuan source sebelum P0

- Token global belum menjadi satu kontrak canonical; terdapat 75 deklarasi untuk 39 nama variabel unik.
- Warna FROZEN masih tersebar sebagai nilai literal pada landing dan category commerce.
- Geometry publik memakai beberapa max-width dan gutter yang tidak konsisten.
- Breakpoint lama 640/1024 masih menimpa tipe dan spacing baru 600/768/960.
- Scope landing memakai class name referensi eksternal.

## Implementasi P0

- Menetapkan kontrak canonical untuk warna, tipografi, spacing, max-width, gutter, radius, shadow, focus, control size, dan motion di `app/globals.css`.
- Menjaga alias kompatibilitas agar package lama tidak diputus sebelum package pemiliknya dikerjakan.
- Menghubungkan landing, category commerce, shared public shell, media surface, dan Tailwind public aliases ke token canonical.
- Mengganti scope landing dengan class milik DEBRODER.
- Menambahkan regression test kontrak token dan pemeriksaan kebocoran referensi eksternal.

Tidak ada perubahan pada database, migration, Admin, cart, pricing, inventory, checkout, order, payment, route, atau business behavior.

## Bukti verifikasi

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS, 0 error dan 32 warning existing.
- `pnpm test`: PASS, 87 file dan 676 test.
- `pnpm build`: PASS.
- Lima viewport homepage: 1440×900, 1280×800, 768×1024, 390×844, dan 360×800.
- Seluruh viewport: HTTP 200, meaningful content, `scrollWidth === innerWidth`, tanpa Next error overlay, tanpa console/page error.
- Focus-visible terukur `2px solid rgb(17, 81, 255)` pada navigasi keyboard.
- Computed gutter: 48 px desktop, 24 px tablet, 16 px mobile.
- Computed section spacing: 80 px desktop dan 48 px tablet/mobile.

Catatan: active homepage snapshot tidak menghasilkan elemen `h1`. P0 tidak
mengubah konten/CMS atau hierarchy halaman; temuan ini dicatat sebagai risiko
terbuka untuk package pemilik homepage berikutnya.
