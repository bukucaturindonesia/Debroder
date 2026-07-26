# CURRENT_PACKAGE_HANDOFF.md

> Ringkasan aktif untuk menghemat konteks Codex.  
> Baca bersama `AGENTS.md`. Jangan membaca ulang seluruh dokumen historis kecuali handoff ini secara eksplisit memintanya.

## 1. Status Saat Ini

- Repository: **DEBRODER**
- Branch kerja: `Batch-1---Fondasi-dan-Performa-Halaman`
- P0 — Implementation Baseline: **PASS**
- P1 — Pure Contract Foundation: **PASS**
- P2 — Compatibility Adapter: **PASS menurut alur owner**
- P3 — Public Shell & Page Read Models: **PASS menurut alur owner**
- P4 — Category & PDP Isolation: **PASS / handoff tersedia**
- P5 — Client Boundary Isolation: **SEDANG DIKERJAKAN**
- Package setelah P5: **P7A — Pricing Parity**
- P6 dilarang dimulai sebelum P7A PASS.

Codex wajib memverifikasi sendiri sebelum mengubah source:

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
```

Jika repository, branch, atau working tree tidak sesuai, **STOP dan laporkan**.

---

## 2. Urutan Resmi Sampai Batch 3

### Batch 1 — Fondasi dan Performa Halaman

1. P1 — Pure Contract Foundation
2. P2 — Compatibility Adapter
3. P3 — Public Shell & Page Read Models
4. P4 — Category & PDP Isolation
5. P5 — Client Boundary Isolation

### Batch 2 — Pricing, Cart, Policy, dan Size Adjustment

1. P7A — Pricing Parity
2. P6 — Cart v5
3. P7B — Policy & Database Alignment
4. P8A — Size Adjustment Policy Preview
5. P8B — Size Adjustment Data Mutation

### Batch 3 — Configured Product dan Jersey

1. P9 — Generic Configured Product
2. P10 — Jersey Configured Product

Setiap package harus selesai, diverifikasi, dilaporkan, lalu **STOP**.  
Jangan memulai package berikutnya tanpa otorisasi owner.

---

## 3. Prinsip Arsitektur Wajib

Gunakan alur:

```text
ROUTE / PAGE
→ PAGE USE CASE
→ DOMAIN SERVICE
→ DATA ACCESS
→ DATABASE / STORAGE
```

Aturan:

- Server Components sebagai default.
- Client Components hanya untuk interaksi yang benar-benar membutuhkan browser.
- Data transaksi harus server-authoritative.
- Jangan kirim raw database rows langsung ke UI.
- Gunakan canonical contracts dan typed view models.
- Jangan membuat global manager baru.
- Jangan hardcode berdasarkan nama produk, slug, warna, ukuran, atau SKU.
- Historical order dan pricing snapshots harus immutable.
- Critical transaction data wajib fail-closed.
- Perbaiki root cause pada source, bukan mengakali test.

---

## 4. Governance Buku

Gunakan nomenklatur:

- `BOOK-P0` — Fundamental pengalaman pelanggan.
- `BOOK-P1` — Brand, konten, retention, dan social proof.
- `BOOK-P2` — Personalisasi setelah tersedia data nyata.
- `BOOK-P3` — Eksperimen setelah sistem matang.

Buku adalah **governance produk dan UX**, bukan izin memperluas scope package.

Pada setiap package:

- terapkan hanya prinsip buku yang berhubungan langsung dengan scope;
- pertahankan mobile-first, accessibility, trust, dan kejelasan pengguna;
- jangan melakukan broad visual redesign;
- jangan mengimplementasikan seluruh BOOK-P0/BOOK-P1 sekaligus;
- pertahankan hasil package sebelumnya.

---

## 5. Metode Root-Cause Wajib

Untuk setiap error atau defect:

1. Baca error paling akhir.
2. Temukan file dan baris penyebab.
3. Buktikan jalur import, aliran data, atau rule yang menyebabkan masalah.
4. Bedakan gejala, penyebab langsung, dan penyebab arsitektural.
5. Perbaiki source pada titik penyebab.
6. Jangan menghapus, melemahkan, atau mengakali test.
7. Tambahkan regression test yang gagal pada kondisi lama dan PASS setelah perbaikan.
8. Jalankan ulang gate yang terdampak.
9. Lakukan satu full gate final.
10. Jangan menyatakan selesai tanpa bukti.

Gunakan status:

- `PROVEN`
- `IMPLEMENTED IN SOURCE`
- `VERIFIED`
- `NOT PROVEN`
- `BLOCKED`

---

## 6. Migration Authority

Codex menjadi pelaksana utama migration Supabase apabila migration benar-benar diperlukan oleh scope package.

Codex boleh:

- memeriksa schema dan migration history;
- membuat dan menjalankan migration;
- menjalankan seed/backfill terkontrol;
- memverifikasi constraint, index, function, trigger, RLS, dan data;
- membuat verification query;
- menyiapkan rollback plan.

Aturan:

```text
Migration terbukti diperlukan dan aman
→ langsung buat, jalankan, dan verifikasi.

Migration tidak diperlukan
→ jangan membuat migration kosong atau speculative.

Migration destruktif atau berisiko tinggi
→ STOP dan minta approval owner.
```

Wajib STOP sebelum:

- `DROP TABLE`;
- `DROP COLUMN`;
- menghapus atau menimpa data existing;
- perubahan irreversible;
- constraint berisiko menolak data existing;
- pelebaran akses RLS;
- perubahan production data berisiko tinggi;
- migration di luar scope package.

Larangan `DATABASE MUTATION: NONE` atau `MIGRATION: NONE` pada package tertentu tetap berlaku.

---

## 7. Strategi Hemat Kuota Codex

Untuk setiap package baru:

- gunakan task baru;
- baca hanya `AGENTS.md`, file ini, handoff package terakhir, dan source relevan;
- jangan audit ulang seluruh repository;
- jangan membaca seluruh dokumen historis;
- jangan broad refactor;
- gunakan targeted tests saat implementasi;
- laporan dibuat ringkas;
- full gate boleh dijalankan sekali di akhir;
- owner dapat menjalankan ulang full gate melalui CMD lokal.

Mode rekomendasi:

```text
P7A Pricing Parity    : Tinggi
P6 Cart v5            : Tinggi
P7B Policy Alignment  : Sedang
P8A Size Preview      : Sedang
P8B Data Mutation     : Tinggi
P9 Generic Configured : Sedang, naik ke Tinggi bila kompleks
P10 Jersey Consumer   : Sedang
```

---

## 8. Full Gate Wajib

Sebelum package dinyatakan PASS:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
git diff --check
git status --short
git diff --stat
git diff
```

Jika full gate dijalankan owner melalui CMD, status Codex sebelum bukti masuk hanya:

```text
IMPLEMENTED IN SOURCE — AWAITING OWNER GATE VERIFICATION
```

Package hanya boleh PASS setelah seluruh gate PASS dan diff hanya berisi scope package.

---

## 9. Batas Git dan Deployment

Secara default Codex:

- boleh mengubah source dalam scope;
- boleh menjalankan targeted tests;
- boleh menjalankan migration aman sesuai authority;
- tidak boleh commit;
- tidak boleh push;
- tidak boleh merge;
- tidak boleh deploy;
- tidak boleh memulai package berikutnya.

Owner menangani review akhir, commit, push GitHub, dan Vercel Preview, kecuali owner memberi izin eksplisit lain.

---

## 10. P5 — Scope Aktif

P5 hanya berfokus pada:

- memperkecil Client Components;
- Server Components sebagai default;
- memindahkan data loading dan logic non-interaktif ke server;
- mempersempit provider/global state;
- mencegah secret, service-role, server-only module, dan data access masuk client bundle;
- lazy-load modul berat hanya bila manfaatnya terbukti;
- import-boundary dan regression tests.

P5 wajib mempertahankan:

- hasil P4;
- tampilan;
- route;
- mobile-first;
- accessibility;
- pricing;
- cart;
- checkout;
- business behavior existing.

P5 dilarang:

- broad refactor;
- mengubah formula pricing;
- mengubah cart persistence;
- mengubah checkout;
- mengubah inventory authority;
- memulai P6 atau P7A;
- membuat global manager baru.

Setelah P5 selesai dan seluruh gate PASS:

```text
P5 STATUS: PASS
NEXT AUTHORIZED PACKAGE: belum ada sampai owner memberi izin P7A
```

---

## 11. Cara Memperbarui File Ini

Setelah setiap package PASS:

1. Ubah status package menjadi `PASS`.
2. Ubah `Package setelah ...` ke package resmi berikutnya.
3. Ganti bagian `Scope Aktif` dengan scope package baru.
4. Catat migration yang diterapkan jika ada.
5. Jangan menambah seluruh laporan panjang; simpan hanya keputusan dan bukti paling penting.

---

## PDP Ready Stock — Visual & Scroll Refinement (2026-07-26)

STATUS: **IMPLEMENTED AND LOCALLY VERIFIED — OWNER VISUAL / VERCEL PREVIEW
VERIFICATION PENDING**

- Scope: universal `/produk/[slug]` presentation only. Desktop media now owns
  bounded sticky behavior; the right purchase/details column remains in normal
  document flow. Tablet/mobile remain a single column.
- Gallery: one canonical 4:5 desktop media surface, vertical accessible
  thumbnails, preserved mobile swipe gallery and lightbox.
- Details: one reusable button disclosure with `aria-expanded`,
  `aria-controls`, keyboard operation, visible focus, and no empty/dummy
  description or size-guide content.
- Commerce preserved: product/variant/SKU, pricing/tier formula, inventory,
  Instant Custom, Cart v5, Add to Cart, Buy Now, checkout and order behavior
  were not changed.
- Files: `app/produk/[slug]/page.tsx`, `components/ProductGallery.tsx`,
  `components/TieredProductPurchasePanel.tsx`,
  `components/product/ProductDetailDisclosure.tsx`,
  `test/pdp-ready-stock-visual-scroll.test.ts`.
- Database/migration: none created, applied, or pending; no remote mutation.
- Verification: typecheck PASS; lint PASS (0 errors / 32 pre-existing
  warnings); tests PASS (92 files / 710 tests); build PASS (120/120 pages);
  browser PASS at 1536×1024, 1440×900, 1280×800, 1024×768, 768×1024,
  390×844, and 360×800 with no horizontal overflow.
- Sticky proof: at desktop scroll phase media computed `position: sticky`,
  `top: 96px`; disclosure expansion preserved gallery/color/size/quantity;
  final boundary reported `overlapFooter=false`.
- Baseline: branch `LANDING-PAGE-PUBLIC`, initial HEAD `a606e06`. During final
  verification an external owner process committed and pushed the exact five
  source/test files as `be2ee66` (`detail produk`). Codex did not run commit,
  push, merge, deploy, or PR commands.
- Environment note: the pre-existing local server was available for the
  browser matrix but stopped responding after a root build attempt timed out.
  The successful final build ran from an identical temporary source copy; no
  replacement development server was started.
