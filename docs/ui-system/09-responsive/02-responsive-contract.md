# Master Responsive Contract

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan cara mendokumentasikan remain/hide/move/drawer/sticky/grid/size/density changes per component/page.

## Scope

Homepage, PLP, PDP, Cart, Checkout, Customer, Admin, Product Grid.

## Canonical Rules

### Master §58 — RESPONSIVE PRODUCT GRID

```text
≥1280      = 4 kolom
768–1279   = 3 kolom
<768       = 2 kolom
```

### Master §79 — MASTER RESPONSIVE CONTRACT

Responsive tidak hanya breakpoint.

Untuk setiap komponen tentukan:

- tetap tampil;
- disembunyikan;
- dipindahkan;
- berubah menjadi drawer;
- berubah menjadi sticky;
- berubah grid;
- berubah ukuran;
- berubah density.

Halaman yang wajib memiliki responsive contract:

- Beranda;
- Katalog;
- Detail Produk;
- Keranjang;
- Pembayaran;
- Akun;
- Admin.

## Detailed Specification

### Domain intent

- Product grid ≥1280=4, 768–1279=3, <768=2.
- Responsive bukan sekadar breakpoint.
- Setiap major page wajib memiliki responsive contract.
- Complete matrix yang belum ada tetap open decision.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Responsive berarti reflow/reprioritization, bukan sekadar shrink.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Responsive berarti reflow/reprioritization, bukan sekadar shrink.
- Grid and container values yang canonical tetap dijaga.

## Typography Contract

- Gunakan explicit mobile type values ketika tersedia.
- Jangan menambah typography breakpoint baru tanpa source.

## Color / Surface Contract

- Semantic color dan brand role tidak berubah berdasarkan viewport.

## Interaction Contract

- Drawer/sticky/full-width transformations hanya difinalkan jika source mendukung.
- Touch targets tidak berkurang di mobile.

## Responsive Contract

- Dokumentasikan remain/hide/move/stack/drawer/sticky/grid/size/density per domain.
- Jika tidak ada source, tandai open decision.

## State Contract

- Loading/error/empty harus tetap dapat digunakan setelah reflow.

## Accessibility Contract

- DOM/keyboard order harus mengikuti reading/action order, khususnya saat visual order berubah.

## Canonical Responsive Question Set

Untuk setiap component/page, review harus menjawab:

```text
Tetap tampil?
Disembunyikan?
Dipindahkan?
Menjadi drawer?
Menjadi sticky?
Berubah grid?
Berubah ukuran?
Berubah density?
```

Pertanyaan ini tidak berarti semua component wajib melakukan setiap transformation. Ia memastikan keputusan responsive eksplisit.

## Required Page Coverage

Master mengharuskan responsive contract untuk:

- Beranda;
- Katalog;
- Detail Produk;
- Keranjang;
- Pembayaran;
- Akun;
- Admin.

## Known Canonical Transformations

### Product Grid

```text
≥1280      = 4 kolom
768–1279   = 3 kolom
<768       = 2 kolom
```

### Customer

Desktop sidebar `220–240px`; mobile sidebar → menu/drawer.

### Cart

Desktop split; mobile single column.

### PDP

Mobile purchase information order dikunci di Mobile Commerce spec.

### Mobile Sticky CTA

Jika digunakan: `64–72px + safe area`.

## Unknown / Not Yet Final

Complete per-component responsive matrix tetap:

```text
⚠ BELUM FINAL — OWNER DECISION REQUIRED
```

Karena itu jangan membuat table lengkap dengan invented hide/show/breakpoint values hanya untuk membuat dokumen terlihat final.

## Edge Cases

- Content lebih panjang dari contoh harus tetap mengikuti hierarchy, wrapping, spacing, dan alignment canonical; jangan menyelesaikannya dengan random dimensions.
- Missing/loading/error/empty content tidak boleh menyebabkan domain kehilangan page focus atau terlihat seperti halaman dari sistem lain.
- Jika existing code tidak mampu memenuhi canonical rule, catat sebagai **IMPLEMENTATION GAP** pada package audit implementasi; jangan melemahkan dokumentasi.
- Jika suatu keputusan memang belum final di Master, gunakan `⚠ BELUM FINAL — OWNER DECISION REQUIRED` dan rujuk [Open Decisions Registry](../00-governance/03-open-decisions.md).

## Do

- Gunakan canonical component, token, typography, grid, responsive pattern, state, dan language contract yang sudah tersedia.
- Pertahankan terminology penting: Premium Apparel Commerce, Editorial Retail, Commerce-first, CANONICAL, OWNER LOCKED, BELUM FINAL.
- Jaga satu primary task/information priority pada setiap page atau component.
- Gunakan cross-reference ketika rule dimiliki domain lain.

## Don't

- Jangan membuat angka, HEX, breakpoint, ratio, radius, duration, hierarchy, atau owner decision baru.
- Jangan menyesuaikan Master agar cocok dengan code lama atau test lama.
- Jangan menggunakan decorative gradient/shadow/radius/animation untuk menggantikan hierarchy.
- Jangan menghapus state/accessibility requirement hanya karena happy-path implementation terlihat benar.
- Jangan membuat copy istilah backend/database muncul di UI publik.

## Acceptance Criteria

- Product grid ≥1280=4, 768–1279=3, <768=2.
- Responsive bukan sekadar breakpoint.
- Setiap major page wajib memiliki responsive contract.
- Complete matrix yang belum ada tetap open decision.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Open Decisions Registry](../00-governance/03-open-decisions.md)
- [Mobile Commerce Priority](03-mobile-commerce.md)

## Source Mapping

- Master §23 — PRODUCT CARD — CANONICAL
- Master §46 — CUSTOMER AREA
- Master §47 — ADMIN SHELL
- Master §57 — RESPONSIVE BREAKPOINTS
- Master §58 — RESPONSIVE PRODUCT GRID
- Master §59 — MOBILE COMMERCE PRIORITY
- Master §60 — MOBILE STICKY CTA
- Master §79 — MASTER RESPONSIVE CONTRACT
