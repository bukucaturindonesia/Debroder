# PLP / Katalog

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mengatur hierarchy PLP, toolbar, filter/sort, product grid, pagination/load more, dan system states.

## Scope

Halaman katalog/category listing/search-result yang menampilkan product grid.

## Canonical Rules

### Master §40 — PLP / KATALOG

Canonical:

```text
Navbar
↓
Breadcrumb
↓
Judul Halaman
↓
Deskripsi opsional
↓
Toolbar
↓
Product Grid
↓
Pagination / Muat Lebih Banyak
↓
Footer
```

Toolbar:

- jumlah produk;
- filter;
- urutkan.

Filter tidak boleh lebih dominan daripada produk.

## Detailed Specification

### Domain intent

- Urutan Navbar→Breadcrumb→Title→Description→Toolbar→Grid→Pagination→Footer dipertahankan.
- Filter tidak boleh lebih dominan daripada produk.
- Product grid memakai canonical ProductCard.
- Loading/empty/error harus memiliki pola yang konsisten.
- Mobile filter/sort tidak boleh menghilangkan context jumlah produk.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Commerce content mengikuti master container/grid dan satu primary task per page.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Commerce content mengikuti master container/grid dan satu primary task per page.
- Transaction/discovery controls tidak boleh kalah oleh dekorasi.

## Typography Contract

- Product, price, title, metadata, CTA disusun sesuai information priority.
- Marketing text tidak boleh menggeser transaksi pada mobile.

## Color / Surface Contract

- Green menandai primary/active/focus secara terkendali.
- Error/stock/unfinished memakai semantic contract.

## Interaction Contract

- CTA hierarchy harus jelas dan feedback dekat dengan action.
- Business logic di luar scope tidak diubah.

## Responsive Contract

- Mobile stack mengikuti commerce priority dan touch target.
- Sticky behavior hanya jika source mengizinkan dan tidak menutup content.

## State Contract

- Loading/empty/error/success harus direncanakan untuk path utama.
- Transaction failure harus memberikan recovery action.

## Accessibility Contract

- Form, selectors, CTAs, product actions, dan navigation keyboard/focus accessible.

## PLP Anatomy

```text
Navbar
Breadcrumb
Page Title
Optional Description
Toolbar
Product Grid
Pagination / Muat Lebih Banyak
Footer
```

Setiap layer memiliki tugas berbeda. Breadcrumb/orientation tidak boleh memiliki visual weight setara Page Title. Toolbar mengontrol discovery dan tidak boleh mengambil fokus dari product grid.

## Toolbar Contract

Toolbar minimal mengakomodasi canonical concepts:

- jumlah produk;
- filter;
- urutkan.

Master tidak menentukan exact toolbar dimensions atau desktop/mobile control arrangement. Gunakan global controls dan mark unresolved transformation as implementation guidance/open decision bila membutuhkan keputusan owner.

### Product count

Product count adalah supporting information. Jangan membuatnya CTA-like.

### Filter

Filter membantu narrowing. Rule canonical: filter tidak boleh lebih dominan daripada produk.

### Urutkan

Urutkan adalah secondary control. UI terminology menggunakan `Urutkan`.

## Product Grid Contract

PLP menggunakan canonical ProductCard. Jangan membuat versi ProductCard khusus PLP dengan ratio, font, atau pricing hierarchy berbeda.

Responsive grid:

```text
≥1280      = 4 kolom
768–1279   = 3 kolom
<768       = 2 kolom
```

## Pagination / Muat Lebih Banyak

Master mengizinkan `Pagination / Muat Lebih Banyak` tetapi tidak memilih salah satu sebagai locked behavior. Jangan memfinalkan pattern data-loading sebagai owner decision pada dokumentasi UI ini.

## PLP States

### Loading

Gunakan ProductCard skeleton yang mengikuti geometry aktual.

### Search/catalog empty

Gunakan Empty State system:

```text
Icon/Illustration opsional
Judul
Deskripsi
Primary Action
Secondary Action opsional
```

### Error

Jelaskan masalah, dampak, dan tindakan recovery.

### Filter menghasilkan nol produk

Treat sebagai empty-result context, bukan system failure, selama request berhasil.

## Mobile PLP Principles

- Product grid tetap dua kolom di bawah 768 sesuai Master.
- Filter/sort transformations harus menjaga product context.
- Jangan membuat filter drawer detail sebagai canonical jika complete responsive matrix belum final.
- Touch targets mengikuti minimum 44×44.

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

- Urutan Navbar→Breadcrumb→Title→Description→Toolbar→Grid→Pagination→Footer dipertahankan.
- Filter tidak boleh lebih dominan daripada produk.
- Product grid memakai canonical ProductCard.
- Loading/empty/error harus memiliki pola yang konsisten.
- Mobile filter/sort tidak boleh menghilangkan context jumlah produk.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Product Card — Canonical Deep Specification](../05-components/05-product-card.md)
- [Master Responsive Contract](../09-responsive/02-responsive-contract.md)
- [Empty States](../10-system-states/02-empty-states.md)

## Source Mapping

- Master §23 — PRODUCT CARD — CANONICAL
- Master §34 — SEARCH
- Master §40 — PLP / KATALOG
- Master §54 — PAGE FOCUS RULE
- Master §58 — RESPONSIVE PRODUCT GRID
- Master §63 — LOADING
- Master §64 — EMPTY STATE
