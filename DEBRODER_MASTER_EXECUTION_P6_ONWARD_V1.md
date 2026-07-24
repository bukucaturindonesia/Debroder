# DEBRODER MASTER EXECUTION V1
## P6 ONWARD — DIRECT CONTINUATION MODE

Dokumen ini digunakan bersama:

- `AGENTS.md`
- `CURRENT_PACKAGE_HANDOFF.md`

Dokumen ini berlaku mulai **P6** setelah **P7A — Pricing Parity** dinyatakan PASS.

---

# 1. ARTI PERINTAH OWNER

## Perintah:

```text
lanjut
```

berarti owner mengonfirmasi bahwa package sebelumnya telah memenuhi:

- implementasi selesai;
- full gate owner PASS;
- `pnpm typecheck` PASS;
- `pnpm lint` PASS;
- `pnpm test` PASS;
- `pnpm build` PASS;
- diff hanya berisi scope package;
- commit dan push branch sudah dilakukan;
- Vercel Preview berhasil tanpa error;
- tidak ada blocker aktif.

Setelah menerima `lanjut`, Codex wajib:

1. membaca `AGENTS.md` dan `CURRENT_PACKAGE_HANDOFF.md`;
2. memverifikasi repository, branch, HEAD, dan working tree;
3. menentukan package berikutnya dari urutan resmi;
4. memperbarui `CURRENT_PACKAGE_HANDOFF.md`;
5. langsung mengeksekusi package berikutnya;
6. tetap ketat pada scope package;
7. berhenti setelah implementasi package tersebut selesai.

Codex tidak perlu meminta owner mengulang prompt package.

`lanjut` bukan izin untuk:

- merge ke `main`;
- deploy production;
- menjalankan package di luar urutan;
- membuat P16;
- melakukan perubahan destruktif.

---

# 2. URUTAN RESMI MULAI P6

Urutan tidak boleh diubah:

```text
P6  — Cart v5
P7B — Policy & Database Alignment
P8A — Size Adjustment Policy Preview
P8B — Size Adjustment Data Mutation
P9  — Generic Configured Product
P10 — Jersey Configured Product
P11 — Workspace Optimization
P12 — Admin Orders Ownership
P13 — Customer Order Read Model & Polling
P14 — Error Handling & Observability
P15 — Inventory Authority & Stock Ownership
FINAL INTEGRATION, E2E & GO-LIVE READINESS AUDIT
```

Tidak ada P16.

Setelah P15 selesai dan owner mengatakan `lanjut`, Codex membuka:

```text
FINAL INTEGRATION, E2E & GO-LIVE READINESS AUDIT
```

---

# 3. MODE KERJA WAJIB

Codex harus bekerja dalam **Direct Execution Mode**.

Artinya:

- langsung kerjakan package aktif;
- jangan menjabarkan proses berpikir;
- jangan membuat laporan panjang pada tahap implementasi;
- jangan mengulang governance yang sudah ada;
- jangan audit ulang seluruh repository;
- jangan broad refactor;
- jangan melebar dari scope;
- jangan membuat workaround;
- jangan meninggalkan hardcode bisnis;
- jangan melemahkan atau mengakali test;
- jalankan targeted test yang diperlukan;
- full gate akhir dijalankan owner melalui CMD.

Setelah implementasi selesai, Codex cukup membalas:

```text
IMPLEMENTED IN SOURCE — AWAITING OWNER GATE VERIFICATION
```

Lalu STOP.

Jika benar-benar tidak dapat dilanjutkan dengan aman:

```text
BLOCKED — [satu kalimat alasan dan tindakan owner yang diperlukan]
```

Lalu STOP.

---

# 4. ATURAN HARDCODE

Hardcode hanya boleh untuk:

- schema/version identifier;
- canonical error code;
- invariant sistem;
- limit canonical terpusat;
- test fixture;
- migration historis;
- demo seed yang terisolasi dan diberi label jelas.

Dilarang hardcode untuk:

- nama produk;
- slug;
- SKU;
- warna;
- ukuran;
- kategori;
- harga;
- tier;
- surcharge;
- stok;
- kantor/lokasi;
- minimum order;
- rule operasional yang dapat berubah;
- branch khusus Jersey di generic core.

Data bisnis harus berasal dari:

```text
database
policy/config authority
canonical domain service
environment variable yang sesuai
```

---

# 5. MIGRATION AUTHORITY

Codex menjadi pelaksana utama migration Supabase yang memang dibutuhkan package aktif.

Codex boleh:

- memeriksa schema dan migration history;
- membuat migration;
- menjalankan migration;
- menjalankan seed/backfill terkontrol;
- memverifikasi constraint, index, function, trigger, RLS, dan data;
- menjalankan verification query;
- menyiapkan rollback plan.

Aturan:

```text
Migration diperlukan dan aman
→ langsung buat, jalankan, dan verifikasi.

Migration tidak diperlukan
→ jangan membuat migration kosong atau speculative.

Migration destruktif atau berisiko tinggi
→ STOP untuk approval owner.
```

Wajib STOP sebelum:

- `DROP TABLE`;
- `DROP COLUMN`;
- menghapus data existing;
- menimpa data existing;
- perubahan irreversible;
- constraint yang berisiko menolak data existing;
- pelebaran akses RLS;
- perubahan production data berisiko tinggi;
- migration di luar scope package.

---

# 6. SCOPE RINGKAS SETIAP PACKAGE

## P6 — Cart v5

Tujuan:

- canonical cart v5;
- line type:
  - `ready_stock`;
  - `configured_product`;
  - `custom_project`;
  - `legacy_unsupported`;
- versioned persistence;
- deterministic migration cart lama;
- stale snapshot + warning saat revalidation gagal;
- checkout tetap fail-closed;
- batas:
  - maksimal 50 baris;
  - maksimal 100 unit per baris;
  - maksimal 500 unit total;
- satu checkout mode per command.

Jangan mengubah formula pricing, inventory authority, historical snapshot, atau membuat branch khusus Jersey.

## P7B — Policy & Database Alignment

Tujuan:

- menyelaraskan policy canonical dengan schema/database;
- minimum quantity;
- checkout mode;
- pricing snapshot;
- server validation;
- constraint, function, trigger, dan RLS yang relevan;
- historical snapshot tetap immutable.

Jangan mengubah UI atau inventory authority.

## P8A — Size Adjustment Policy Preview

Tujuan:

- preview tanpa mutasi data;
- policy global:
  - S–XL = Rp0;
  - 2XL = +Rp10.000;
  - 3XL = +Rp20.000;
  - 4XL = +Rp30.000;
- tampilkan before/after;
- identifikasi konflik, duplikat, override, dan SKU terdampak.

P8A tidak boleh melakukan backfill data produk.

## P8B — Size Adjustment Data Mutation

Tujuan:

- menerapkan hanya baris yang telah disetujui dari preview P8A;
- mutation terukur dan dapat diverifikasi;
- pertahankan override valid;
- historical order dan snapshot tetap immutable;
- audit before/after dan row count.

## P9 — Generic Configured Product

Tujuan:

- fondasi configured product generik;
- option, selection, validation, pricing input, dan snapshot;
- server-authoritative;
- fail-closed;
- tidak ada field atau branch khusus Jersey pada core.

## P10 — Jersey Configured Product

Tujuan:

- Jersey menjadi consumer pertama generic configured product;
- status awal `quotation_required`;
- configuration snapshot immutable;
- tidak menambahkan Jersey-specific branch ke generic core.

## P11 — Workspace Optimization

Tujuan:

- mengurangi duplikasi dan dead code yang terbukti aman;
- memperkecil client boundary dan bundle;
- lazy loading dan route-level code splitting bila terbukti bermanfaat;
- tidak mengubah business behavior.

## P12 — Admin Orders Ownership

Tujuan:

- page-owned use case untuk Admin Orders;
- browser tidak menjadi authority transaction-critical;
- typed Admin Order read model;
- order, payment, fulfillment, tracking, dan pricing snapshot konsisten;
- historical snapshot immutable.

## P13 — Customer Order Read Model & Polling

Tujuan:

- typed customer-facing order read model;
- polling efisien;
- tidak membocorkan data sensitif;
- pertahankan guest token/hash dan WhatsApp verification;
- loading, retry, stale warning, authorization, dan not-found.

## P14 — Error Handling & Observability

Tujuan:

- canonical error handling;
- structured logging;
- correlation/request ID;
- redaction data sensitif;
- cegah duplicate logging dan silent failure;
- tidak mengubah behavior transaksi.

## P15 — Inventory Authority & Stock Ownership

Keputusan owner untuk demo:

- authority stok = `SKU/varian × kantor/lokasi`;
- stok awal provisional = 20 unit untuk setiap SKU/varian aktif pada setiap lokasi aktif yang sudah ada;
- jangan mengarang lokasi;
- jangan menimpa stok riil tanpa pemeriksaan;
- `available_stock = on_hand - reserved`;
- reservasi, pengurangan, pelepasan, dan pengembalian stok harus server-authoritative dan transaksional;
- stok tidak boleh negatif;
- overselling wajib dicegah;
- reservasi dilepas saat order batal atau kedaluwarsa;
- Ready Stock memakai inventori;
- Custom/quotation tidak mengurangi Ready Stock kecuali dipetakan eksplisit ke SKU;
- seluruh movement memiliki audit trail;
- historical order dan pricing snapshot immutable.

Codex boleh membuat migration, seed provisional, constraint, index, function, trigger, dan RLS yang diperlukan.

## Final Integration, E2E & Go-Live Readiness Audit

Bukan package baru.

Fokus:

- review hasil P1–P15;
- full regression;
- E2E Ready Stock;
- E2E Configured Product dan Jersey;
- checkout dan payment;
- Admin Orders;
- customer tracking;
- database dan RLS;
- concurrent inventory dan overselling;
- mobile/desktop;
- accessibility;
- performance;
- owner UAT;
- keputusan GO/NO-GO.

Codex wajib STOP setelah audit final.

---

# 7. OWNER GATE MELALUI CMD

Setelah Codex membalas:

```text
IMPLEMENTED IN SOURCE — AWAITING OWNER GATE VERIFICATION
```

owner menjalankan satu per satu:

```cmd
git diff --check
git status --short
git diff --stat
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Jika ada migration, owner juga memastikan:

- migration applied;
- migration history benar;
- schema verification PASS;
- data verification PASS;
- RLS verification PASS jika relevan.

Setelah itu:

```text
review diff
→ commit
→ push branch
→ Vercel Preview
→ pastikan Preview Ready dan tidak ada error
```

Jika seluruhnya PASS, owner cukup menulis:

```text
lanjut
```

Codex kemudian langsung memulai package berikutnya.

---

# 8. PERBAIKAN ERROR OWNER GATE

Jika CMD atau Vercel menemukan error, owner cukup mengirim:

```text
Perbaiki error ini dalam scope package aktif:

[tempel error paling akhir]
```

Codex wajib:

- memperbaiki source;
- tidak melebar;
- tidak mengakali test;
- menjalankan targeted test terkait;
- lalu hanya membalas:

```text
FIXED — AWAITING OWNER GATE VERIFICATION
```

Lalu STOP.

Owner menjalankan ulang seluruh gate.

---

# 9. ATURAN GIT DAN DEPLOYMENT

Secara default Codex:

- boleh mengubah source;
- boleh menjalankan targeted tests;
- boleh menjalankan migration aman;
- tidak boleh commit;
- tidak boleh push;
- tidak boleh merge;
- tidak boleh deploy;
- tidak boleh lanjut sendiri tanpa kata `lanjut`.

Owner menangani:

- full gate CMD;
- review diff;
- commit;
- push;
- Vercel Preview;
- smoke test;
- pemberian perintah `lanjut`.

`lanjut` hanya mengizinkan package berikutnya pada branch aktif, bukan merge ke `main`.

---

# 10. PROMPT AWAL P6

Setelah P7A PASS, owner cukup mengirim:

```text
Eksekusi P6 sesuai DEBRODER MASTER EXECUTION V1, AGENTS.md, dan CURRENT_PACKAGE_HANDOFF.md.
```

Setelah itu, untuk package berikutnya owner hanya perlu menulis:

```text
lanjut
```
