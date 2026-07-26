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

## 10A. Public Experience P0 — Design Tokens Global

Tanggal: 2026-07-26

Scope aktif: P0 Design Tokens Global saja

Status: **VERIFIED IN SOURCE — P1 NOT STARTED**

Baseline:

- branch `LANDING-PAGE-PUBLIC`;
- HEAD `e37a9c4d3a50fe36e3158ea5dae87600206a5ca8`;
- working tree bersih pada awal P0;
- selama pekerjaan, penghapusan tracked package Batch 4A dan archive Batch 4B
  muncul sebagai perubahan owner/external; perubahan tersebut tidak disentuh
  atau dimasukkan ke scope P0.

Yang diperiksa dan diubah:

- governance wajib, frozen Public Experience System, implementasi public
  existing, dan archive visual reference `D:\nike\nike.rar`;
- kontrak canonical warna, type, spacing, container, gutter, radius, shadow,
  focus, control size, dan motion di `app/globals.css`;
- landing, shared public shell, category commerce, dan Tailwind public aliases
  dihubungkan ke token canonical;
- class scope referensi eksternal diganti dengan class DEBRODER;
- regression test dan laporan audit P0 ditambahkan.

File P0:

- `app/globals.css`;
- `app/page.tsx`;
- `tailwind.config.ts`;
- `test/public-experience-design-tokens.test.ts`;
- `docs/DEBRODER_PUBLIC_EXPERIENCE_P0_TOKEN_AUDIT.md`;
- governance handoff/state/issue/ledger.

Route berubah: tidak ada.

Database/migration local/remote/applied/pending: tidak ada.

Commit/push/merge/deploy: tidak dilakukan.

Verification:

- `pnpm typecheck`: **PASS**;
- `pnpm lint`: **PASS**, 0 error / 32 warning existing;
- `pnpm test`: **PASS**, 87 file / 676 test;
- `pnpm build`: **PASS**;
- `git diff --check`: **PASS**, warning line-ending existing saja;
- browser homepage 1440×900, 1280×800, 768×1024, 390×844, 360×800:
  **PASS** — HTTP 200, tanpa overflow horizontal, error overlay, console/page
  error; focus ring dan computed responsive tokens sesuai kontrak.

Risiko terbuka:

- active homepage snapshot tidak merender elemen `h1`; tidak diperbaiki pada
  P0 karena ownership konten/hierarchy berada pada package homepage;
- perubahan owner/external Batch 4A/4B tetap ada di working tree dan wajib
  dipisahkan saat review/staging.

Status gate:

```text
GO — P0 DESIGN TOKENS GLOBAL SAJA
HOLD — P1 MENUNGGU INSTRUKSI OWNER
```

---

## 10B. Public Experience P1–P12 — Implementation Batch

Tanggal: 2026-07-26

Baseline:

- branch `LANDING-PAGE-PUBLIC`;
- HEAD `fc1b8ff6eb1b92b23452b4032098a652fb0bc1eb`;
- working tree bersih sebelum batch;
- governance FROZEN, termasuk
  `# DEBRODER GO LIVE ABOVE NIKE v1.0.txt`, telah dibaca;
- P0 Design Tokens Global dipertahankan.

Status batch:

```text
IMPLEMENTATION COMPLETE — OWNER VERIFICATION PENDING
```

### P1 — Header, Promo Bar, Navigation, dan Footer

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- Shared header dipertahankan; tidak dibuat header kedua.
- Fresh Drop, wishlist safe entry, account, help, About, search, cart, store,
  tracking, social, dan legal entry tersambung.
- Search dialog memperoleh focus trap dan mengembalikan focus ke trigger.
- Target kontrol header utama dinaikkan ke 48 px.
- Footer memakai legal route khusus dan About full-page route.
- Protected Jersey navigation/output tetap menggunakan branch existing.

File:

- `components/header/SiteHeaderClient.tsx`;
- `components/header/HeaderSearchModal.tsx`;
- `components/PublicFooter.tsx` (reused, tidak diubah);
- `components/CartProvider.tsx`;
- `lib/public-shell/domain.ts`;
- `lib/icons.ts`;
- `app/wishlist/page.tsx`.

Owner checks:

- first load, sticky/scroll state, menu desktop/mobile, Escape, focus return,
  360/390/768/1280/1440 width, Jersey header, footer links, dan semua external
  contact link.

### P2 — Landing Page

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- Urutan FROZEN existing tidak diubah.
- Semantic H1 fallback ditambahkan hanya saat active first hero tidak memiliki
  heading.
- Fresh Drop rail fallback sekarang menuju `/fresh-drop`.
- Homepage footer diselaraskan dengan shared public dark footer.
- Hero, rails, campaign, category, About, CMS/PIM data, dan P0 tokens existing
  dipertahankan.

File:

- `app/page.tsx`.

Owner checks:

- hero desktop/mobile, slide controls, reduced motion, section order, crop,
  rail behavior, satu semantic H1, dan CMS empty/degraded states.

### P3 — Category dan Product Listing

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- Existing `CategoryCommercePage`, `CategoryCommerceCatalog`,
  `ProductCatalog`, dan `PublicProductCard` tetap menjadi reusable authority.
- Tidak dibuat ProductCard, filter, route kategori, atau product data kedua.
- Tidak ada source mutation package-specific karena implementation existing
  sudah memenuhi boundary dan perubahan tambahan akan menjadi broad refactor.

Owner checks:

- seluruh route kategori existing, loading/error/empty state, sorting/filter
  owner decisions, media ratio, product metadata, dan mobile grid.

### P4 — PDP Ready Stock

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- Universal `/produk/[slug]` dan page-owned PDP existing dipertahankan.
- Ready Stock sekarang menampilkan jalur `Beli Sekarang` melalui handler
  existing yang menambahkan line canonical lalu menuju checkout.
- Product, variant, SKU, stock, tier price, size adjustment, cart line, related
  product, serta server validation tidak diubah.
- Tidak dibuat PDP atau pricing resolver kedua.

File:

- `app/produk/[slug]/page.tsx`;
- `components/TieredProductPurchasePanel.tsx`.

Owner checks:

- gallery, variant/size/quantity, stock/store availability, tier transition,
  Add to Cart/Buy Now behavior existing, pickup/shipping, related products,
  dan mobile purchase hierarchy.

### P5 — Cart dan Side Cart

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- Cart v5 provider, storage, migration/quarantine, limits, stale snapshot,
  retry, revalidation, and one-mode fail-closed checkout dipertahankan.
- Label `Summary` dan `Bag` diselaraskan menjadi `Ringkasan` dan
  `Isi Keranjang`.
- Cart header control mengikuti target 48 px.

File:

- `components/CartProvider.tsx`.

Owner checks:

- mini-cart open/close, add/remove/update quantity, stale/retry state, legacy
  unsupported state, totals, mode rejection, persistence, dan checkout CTA.

### P6 — Checkout

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- Canonical checkout existing dipertahankan tanpa perubahan transaction logic:
  structured Indonesian address, fulfillment, server repricing, stock check,
  idempotency recovery, snapshot, and safe errors.
- Tidak dibuat checkout, validation, pricing, payment, atau order system kedua.
- Policy agreement tidak dikarang karena legal content resmi belum tersedia.

Owner checks:

- dependent address fields, pickup/shipping, field errors, recovery/retry,
  duplicate submit, Ready Stock/Custom separation, summary desktop/mobile,
  dan order creation.

### P7 — Confirmation dan Guest Order Tracking

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- Confirmation route kini memakai shared public shell sehingga navigation dan
  footer konsisten.
- Secure token/WhatsApp authorization, customer-safe projection, polling,
  stale retry, token behavior, dan tracking APIs tidak diubah.

File:

- `app/order-confirmation/[token]/page.tsx`.

Owner checks:

- valid/invalid/expired token, matching WhatsApp, copy link, payment/order
  state, fulfillment timeline, offline/hidden polling, dan sensitive-data
  exposure.

### P8 — Custom Order Experience

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- Existing Custom Hub, Custom Project Builder, draft persistence, progress,
  summary, validation, upload metadata, Custom cart/checkout, and specialized
  Jersey route tetap menjadi authority.
- Tidak dibuat schema, configurator, pricing, upload, atau Custom system kedua.
- Tidak ada source mutation package-specific untuk mencegah perubahan pada
  protected Jersey dan transaction behavior.

Owner checks:

- seluruh langkah builder, progress/summary, resume draft, upload, quotation
  state, mobile CTA, Custom-only checkout, confirmation, and tracking.

### P9 — Fresh Drop dan Coming Soon

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- `/fresh-drop` memakai produk canonical yang memiliki `fresh_drop` atau
  `label_new`.
- Empty state aman bila tidak ada produk bertanda sah.
- `/fresh-drop/[slug]` hanya redirect ke universal `/produk/[slug]`; tidak
  dibuat PDP kedua.
- Tidak ada tanggal, jam, countdown, stock, story, product, atau asset yang
  dikarang.

File:

- `app/fresh-drop/page.tsx`;
- `app/fresh-drop/[slug]/page.tsx`;
- `app/page.tsx`;
- shared header/footer routing files.

Owner checks:

- flag PIM/CMS yang aktif, sort, card actions, empty state, redirect detail,
  dan behavior ketika release metadata belum tersedia.

### P10 — Tentang DEBRODER

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- `/tentang` menggunakan `trustAbout`, store, image, CTA, dan testimonial dari
  public content source existing.
- Bagian yang tidak memiliki bukti resmi tidak ditampilkan.
- Landing About dan full About memakai source yang sama.

File:

- `app/tentang/page.tsx`;
- `lib/public-shell/domain.ts`.

Owner checks:

- CMS content/image/CTA, store facts, testimonial approval, empty content,
  desktop/mobile editorial hierarchy, dan tidak adanya klaim buatan.

### P11 — Search, Login, dan Account

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- `/search` melakukan product-first search terhadap canonical catalog dan
  menampilkan category matches dari public content source.
- Query tetap terlihat, modal search tetap lazy, Enter menuju results page,
  no-result guidance dan keyboard focus structure tersedia.
- `/login`, `/account`, dan `/wishlist` hanya safe state karena customer Auth,
  account datastore, dan wishlist persistence belum tersedia.
- Admin Auth tidak dipakai ulang sebagai customer Auth dan tidak dibuat
  backend kedua.

File:

- `app/search/page.tsx`;
- `app/login/page.tsx`;
- `app/account/page.tsx`;
- `app/wishlist/page.tsx`;
- `components/header/HeaderSearchModal.tsx`;
- `components/header/SiteHeaderClient.tsx`.

Owner checks:

- search product/category accuracy, query keyboard flow, no-result state,
  mobile layout, safe state copy, and decision whether customer Auth/wishlist
  belongs to a future authorized package.

### P12 — Halaman Legal dan Bantuan

Status: **IMPLEMENTED — OWNER VERIFICATION PENDING**

- `/help` menghubungkan order guide, tracking, store, dan Custom routes.
- Reusable legal layout tersedia untuk `/legal/terms` dan `/legal/privacy`.
- Tidak ada klausul, SLA, refund, shipping, payment, identity, address, date,
  atau legal version yang dikarang.
- Legal route memakai explicit safe state.

File:

- `app/help/page.tsx`;
- `app/legal/terms/page.tsx`;
- `app/legal/privacy/page.tsx`;
- `components/legal/LegalContentPending.tsx`;
- `lib/public-shell/domain.ts`.

Owner checks:

- help route accuracy, legal reading layout, footer links, print/readability,
  and replacement with approved legal copy.

### Systems preserved

- pricing formula and pricing snapshot;
- Cart v5 contract/persistence/revalidation;
- inventory authority and reservations;
- checkout/order/payment/idempotency;
- secure tracking authorization/projection/polling;
- Custom/Jersey configuration and pricing;
- Admin routes and behavior;
- P0 design tokens and DEBRODER assets.

### Hardcodes dan canonical replacements

- Tidak ada product, SKU, price, stock, release date/time, company history,
  testimonial, policy, atau legal clause baru yang di-hardcode.
- Navigation labels dan route contracts adalah presentation-only.
- Fresh Drop, About, Search, store, dan testimonials membaca canonical public
  source existing.
- Wishlist/account/login tetap safe state; tidak ada persistence palsu.

### Content gaps dan risiko

- **OWNER LEGAL CONTENT REQUIRED** untuk terms, privacy, return, shipping,
  payment, effective date, version, dan policy agreement.
- Customer Supabase Auth/account foundation belum tersedia.
- Wishlist persistence belum tersedia.
- Release date/time dan Coming Soon metadata belum terbukti pada canonical
  public source; karena itu tidak ditampilkan.
- Header width, responsive visual, runtime routes, and all owner acceptance
  remain **NOT VERIFIED** karena master prompt melarang agent verification.

### Verification

- `pnpm typecheck`: **NOT RUN — prohibited by this execution prompt**;
- `pnpm lint`: **NOT RUN — prohibited by this execution prompt**;
- `pnpm test`: **NOT RUN — prohibited by this execution prompt**;
- `pnpm build`: **NOT RUN — prohibited by this execution prompt**;
- browser/dev server/screenshots: **NOT RUN — prohibited**;
- Vercel/deployment: **NOT RUN — prohibited**;
- Supabase/database/migration: **NOT CHANGED / NOT RUN**;
- commit/push/merge/stage: **NOT PERFORMED**.

Owner verification checklist:

1. Review `git status --short`, `git diff --stat`, dan seluruh `git diff`.
2. Jalankan script yang tersedia di `package.json`: `pnpm typecheck`,
   `pnpm lint`, `pnpm test`, dan `pnpm build`.
3. Verifikasi P1–P12 pada desktop/mobile, keyboard, reduced motion, loading,
   empty, error, safe state, and responsive layouts.
4. Verifikasi Cart/Checkout/Order/Payment/Tracking/Custom regressions dan
   protected Jersey output.
5. Review dan supply approved legal content sebelum legal safe state diganti
   atau policy agreement diwajibkan.

---

## Targeted Revision — Jersey Universal PDP Stabilization (2026-07-26)

Status: **IMPLEMENTED IN SOURCE — OWNER RECHECK PENDING**.

- Root cause: universal PDP menghitung ulang `showBuyNow` dari boolean mentah,
  sedangkan product-detail model belum memiliki satu kontrak purchase
  capability. Akibatnya perubahan public experience dapat menggeser perilaku
  non-Jersey dan test lama hanya mengunci string implementasi.
- Source: `lib/product-detail-page/model.ts`,
  `lib/product-detail-page/domain.ts`, `app/produk/[slug]/page.tsx`,
  `components/TieredProductPurchasePanel.tsx`, dan
  `test/jersey-commerce.test.ts`.
- Kontrak typed/pure sekarang memiliki `showPurchasePanel`, `showAddToCart`,
  `showBuyNow`, dan `showCustomAction`; universal PDP dan purchase panel
  mengonsumsi kontrak tersebut.
- Matrix verified: Jersey Ready Stock, Jersey Custom-only, Jersey unavailable,
  dan non-Jersey Ready Stock.
- Targeted verification: direct workspace Vitest shim,
  `test/jersey-commerce.test.ts` — **PASS, 1 file / 9 tests**. Perintah
  `pnpm.cmd vitest ...` tidak dapat me-resolve executable pada shell Windows
  ini; shim yang sama dijalankan langsung.
- Typecheck, lint, full test, build, browser, Vercel: **NOT RUN — outside
  targeted revision instruction**.
- Database/Supabase/migration: **NOT CHANGED / NOT RUN**.
- Jersey category, shop, configurator, pricing, Cart v5, checkout, Custom,
  Admin, database, dan route canonical tidak diubah.

---

## 11. Cara Memperbarui File Ini

Setelah setiap package PASS:

1. Ubah status package menjadi `PASS`.
2. Ubah `Package setelah ...` ke package resmi berikutnya.
3. Ganti bagian `Scope Aktif` dengan scope package baru.
4. Catat migration yang diterapkan jika ada.
5. Jangan menambah seluruh laporan panjang; simpan hanya keputusan dan bukti paling penting.

---

## Public Experience P13 — Responsive Audit (2026-07-26)

PACKAGE:
Public Experience P13

STATUS:
**VERIFIED WITH FIXES**

VIEWPORTS:

- 1440 × 900
- 1280 × 800
- 768 × 1024
- 390 × 844
- 360 × 800

ROUTES CHECKED:

- 37 public routes returned HTTP 200, including landing, category, universal
  PDP, cart, checkout, tracking, Custom, Jersey, account/search/help/legal;
- focused browser checks covered homepage, cart, checkout, tracking, Custom,
  Jersey, and Ready Stock/Jersey PDP;
- no document-level horizontal overflow or broken visible image was found.

DEFECTS:

- `P13-ERR-001` — PDP color, size, quantity, gallery-dot, and catalog reset
  controls were below the required 48 × 48 px touch target.

FIXES:

- controls now expose a minimum 48 × 48 px interactive area without changing
  pricing, stock, cart, checkout, route, or visual identity.

NEXT ACTION:
Completed automatically into P14.

## Public Experience P14 — Accessibility, Performance, Visual Regression

PACKAGE:
Public Experience P14

STATUS:
**VERIFIED WITH FIXES — PERFORMANCE TARGET NOT MET**

ACCESSIBILITY:

- one main landmark and one relevant H1 verified on focused public routes;
- search and cart dialog focus, Escape, restoration, and cart focus trap were
  verified in browser;
- hidden cart is now `aria-hidden` and `inert`;
- global focus-visible and reduced-motion contracts are present;
- representative heading contrast measured 18.88:1; a complete automated
  contrast sweep was not available.

PERFORMANCE:

- local development homepage: LCP approximately 13.35 s, CLS 0;
- INP is **NOT PROVEN** because the recorded session had no qualifying
  interaction;
- homepage public content and public shell read models both perform Supabase
  fan-out;
- no risky caching or broad read-model rewrite was made without a proven
  freshness/invalidation contract.

VISUAL REGRESSION:

- required viewport screenshots and focused route inspection preserved the
  P0–P12 layout, Jersey shell, mobile composition, product media, cart,
  checkout, tracking, Custom, and footer hierarchy;
- no Nike asset or identity was introduced.

DEFECTS:

- `P14-ERR-001` — nested main landmarks on PDP/cart/Custom;
- `P14-ERR-002` — closed cart dialog remained exposed;
- `P14-ERR-003` — cart lacked focus entry/trap/Escape/restoration;
- `P14-ERR-004` — LCP target not met and INP not proven.

FIXES:

- semantic wrappers corrected;
- cart dialog accessibility and keyboard behavior corrected;
- performance risk documented, not hidden by speculative caching.

NEXT ACTION:
Completed automatically into P15.

## Public Experience P15 — Final Integration and GO/NO-GO

PACKAGE:
Public Experience P15

STATUS:
**NO-GO**

FULL GATE:

- typecheck: **PASS**;
- lint: **PASS with 0 errors / 32 existing warnings**;
- tests: **PASS — 88 files / 683 tests**;
- production build: **PASS — 119/119 pages**, executed from an identical
  temporary source copy so build artifacts did not collide with the
  owner-managed active development server;
- `git diff --check`: **PASS**;
- browser/HTTP: existing server remained responsive; critical route matrix
  and focused interaction checks completed.

INTEGRATION:

- `P15-ERR-001` fixed: page-owned PDP previously displayed legacy
  `product_variant_sizes.stock` (80) while Cart v5 revalidated canonical
  location availability as 0. PDP now reads the same `inventory_balances`
  authority and fails closed at `Stok kosong`;
- `P15-ERR-002` fixed: `/custom` production prerender previously threw on a
  transient public-read failure. It now renders the existing empty state;
- Cart v5 retained stale snapshot, warning/retry, and disabled checkout when
  canonical stock was unavailable;
- pricing formula, snapshots, checkout command, order/payment, tracking,
  Custom pricing, and Jersey capability resolver were not changed.

SECURITY:

- client-boundary regression passed;
- no client import of service-role/server-only data access was introduced;
- checkout pricing and stock remain server-authoritative and fail closed;
- no database mutation, migration, seed, or remote write occurred.

OUTSTANDING:

- `P15-ERR-003` HIGH — homepage CMS category link `/kaos-polo` returns HTTP
  404; this batch may not mutate CMS or add an unapproved route;
- `P15-ERR-004` HIGH — active public PIM product `Jersey Custom Pilot` exposes
  content stating it is internal and must not be published before owner
  approval; no slug/content hardcode was added and PIM was not mutated;
- `P14-ERR-004` — local LCP target remains unmet; Preview performance is not
  proven;
- canonical inventory for the two inspected Ready Stock products is 0, so the
  browser verified safe unavailable/fail-closed behavior but did not create a
  real order;
- official legal content, customer Auth, and wishlist persistence remain the
  previously documented owner dependencies.

NEXT ACTION:
Owner corrects CMS/PIM publication data and validates Preview performance,
then reruns P15 release verification. No commit/push/deploy in this batch.
