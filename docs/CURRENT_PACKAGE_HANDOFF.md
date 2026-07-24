# CURRENT_PACKAGE_HANDOFF.md

> Ringkasan aktif untuk menghemat konteks Codex.  
> Baca bersama `AGENTS.md`. Jangan membaca ulang seluruh dokumen historis kecuali handoff ini secara eksplisit memintanya.

## 1. Status Saat Ini

- Repository: **DEBRODER**
- Branch kerja: `Batch-1-—-Fondasi-dan-Performa-Halaman`
- P0 — Implementation Baseline: **PASS**
- P1 — Pure Contract Foundation: **PASS**
- P2 — Compatibility Adapter: **PASS menurut alur owner**
- P3 — Public Shell & Page Read Models: **PASS menurut alur owner**
- P4 — Category & PDP Isolation: **PASS / handoff tersedia**
- P5 — Client Boundary Isolation: **PASS**
- P7A — Pricing Parity: **PASS WITH TWO EXPLICIT P7B BLOCKERS**
- P6 — Cart v5: **PASS**
- P7B — Policy & Database Alignment: **PASS menurut owner `lanjut`**
- P8A — Size Adjustment Policy Preview: **PASS**
- P8B — Size Adjustment Data Mutation: **PASS**
- P9 — Generic Configured Product: **PASS menurut owner**
- P10 — Jersey Configured Product: **PASS menurut owner**
- P11 — Workspace Optimization: **PASS menurut owner**
- P12 — Admin Orders Ownership: **PASS menurut owner**
- P13 — Customer Order Read Model & Polling: **PASS menurut owner**
- P14 — Error Handling & Observability: **PASS menurut owner**
- P15 — Inventory Authority & Stock Ownership: **CHECKPOINT SAVED — DATABASE APPLICATION BLOCKED**
- Setelah P15: **Final Integration, E2E & Go-Live Readiness Audit**, hanya setelah migration P15 diterapkan, diverifikasi, seluruh gate PASS, dan owner menyatakan gate P15 PASS.

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

## 10. P15 — Checkpoint Aktif

Owner menyatakan gate P14 clean/PASS. Baseline P15:

- branch `Batch-1-—-Fondasi-dan-Performa-Halaman`;
- HEAD `848793819a062ac35c453d3a4ff3a6ba5311d33e`;
- working tree bersih sebelum P15.

Status:

```text
CHECKPOINT SAVED — DATABASE APPLICATION BLOCKED
```

Yang sudah selesai di source:

- `lib/inventory-authority.ts` menambahkan formula canonical
  `available = on_hand - reserved`, agregasi availability, dan pemeriksaan
  mapping SKU eksplisit untuk Custom.
- `lib/supabase/products.ts` memproyeksikan stock publik dari agregat
  availability seluruh lokasi aktif non-legacy melalui server-only admin data
  access; kegagalan authority menjadi stock `0` (fail-closed).
- Migration
  `supabase/migrations/20260724041102_p15_inventory_authority_stock_ownership_v1.sql`
  sudah dibuat. Migration menambahkan ownership reservasi per lokasi,
  movement snapshots, seed provisional `20` hanya untuk pasangan SKU/lokasi
  aktif yang belum memiliki balance, serta RPC reserve/release/deduct/restore
  yang row-locked, transaksional, idempotent, mencegah overselling/stok
  negatif, dan mengaudit setiap movement. Data stock existing tidak
  ditimpa. Historical shipping tanpa bukti lokasi dipetakan ke
  `LEGACY-SYSTEM`, bukan ditebak.
- Ready Stock diikat ke reservation authority pada order creation. Pickup
  memakai reservation yang sama sehingga handover tidak melakukan double
  deduction. Custom hanya menyentuh inventory bila `variant_size_id` dan SKU
  cocok tepat dengan canonical catalog mapping.
- Verification query read-only tersedia di
  `supabase/sql/06_p15_inventory_authority_verification_read_only.sql`.
- Regression coverage tersedia di `test/p15-inventory-authority.test.ts`.

Evidence database sebelum migration:

- project Supabase `lzennundwqqtyvvcnzbg` sehat;
- 105 SKU aktif/sellable;
- lokasi aktif: `LEGACY-SYSTEM`, `STORE LANDAK`, `STORE TELLO`,
  `STORE PAREPARE`, `STORE PETTARANI`;
- 1 active reservation / 5 unit dan 9 consumed reservation / 41 unit;
- tidak ada balance dengan `reserved > on_hand` atau nilai negatif;
- hanya Pettarani mempunyai active reservation yang lokasinya dapat dibuktikan;
  historical shipping tidak mempunyai bukti lokasi nyata.

Verification lokal:

- `pnpm typecheck`: **PASS**;
- `pnpm lint`: **PASS**, zero error dan 32 baseline warning;
- targeted suite: **PASS**, 7 files / 54 tests;
- `git diff --check`: **PASS** (hanya warning line-ending existing).

Yang belum selesai / NOT PROVEN:

- runtime SQL/dry-run migration pada PostgreSQL belum dapat dieksekusi;
- migration belum diterapkan ke project Supabase;
- verification query, RLS/function ACL check, dan database advisor pasca
  migration belum dijalankan;
- karena itu transaction/idempotency database nyata dan P15 end-to-end belum
  boleh dinyatakan VERIFIED/PASS.

Blocker:

- seluruh remote write/dry-run Supabase setelah source selesai ditolak approval
  reviewer environment karena usage limit, dengan waktu coba ulang
  `2026-07-31 00:34`; tidak ada local PostgreSQL/Docker/parser SQL yang tersedia.
- Ini blocker tool/environment, bukan approval owner. Owner sudah memberi
  authority untuk migration aman dalam scope P15.

File yang berubah:

- `lib/inventory-authority.ts`;
- `lib/supabase/products.ts`;
- `supabase/migrations/20260724041102_p15_inventory_authority_stock_ownership_v1.sql`;
- `supabase/sql/06_p15_inventory_authority_verification_read_only.sql`;
- `test/p15-inventory-authority.test.ts`;
- governance handoff/state/issue files untuk checkpoint ini.

Langkah berikutnya tanpa audit ulang:

1. Jalankan migration di transaction rollback/dry-run terhadap Supabase dan
   perbaiki hanya error SQL P15 yang terbukti.
2. Terapkan migration `20260724041102...` ke project
   `lzennundwqqtyvvcnzbg`.
3. Jalankan `06_p15_inventory_authority_verification_read_only.sql`; seluruh
   violation count wajib `0`. Verifikasi RLS, function ACL, movement snapshot,
   seed missing-pair, dan data historical.
4. Jalankan database security/performance advisors lalu targeted tests,
   typecheck, lint, dan owner full gate.
5. Jangan commit, push, merge, deploy, atau memulai final integration audit
   sebelum gate P15 dinyatakan PASS oleh owner.

---

## 11. Cara Memperbarui File Ini

Setelah setiap package PASS:

1. Ubah status package menjadi `PASS`.
2. Ubah `Package setelah ...` ke package resmi berikutnya.
3. Ganti bagian `Scope Aktif` dengan scope package baru.
4. Catat migration yang diterapkan jika ada.
5. Jangan menambah seluruh laporan panjang; simpan hanya keputusan dan bukti paling penting.
