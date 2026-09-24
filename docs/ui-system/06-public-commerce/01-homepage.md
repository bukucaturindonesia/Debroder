# Homepage

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menjadi contract urutan section homepage dan ritme commerce/editorial/brand tanpa mengubah master order.

## Scope

Navigation sampai Footer untuk landing page DEBRODER.

## Canonical Rules

### Master §39 — HOMEPAGE MASTER ORDER

```text
01 Navigation
02 Hero
03 Primary Category
04 Featured Products
05 Editorial Campaign
06 Best Sellers
07 Custom DEBRODER
08 Secondary Category
09 Material / Brand Story
10 Service / Trust
11 Conversion / Newsletter
12 Footer
```

Ritme:

```text
Commerce
→ Editorial
→ Commerce
→ Brand
→ Commerce
```

## Detailed Specification

### Domain intent

- 12 section canonical tidak boleh direorder.
- Commerce → Editorial → Commerce → Brand → Commerce rhythm harus terasa.
- Homepage memakai Editorial density, bukan Dense.
- Product/CTA tetap lebih penting daripada dekorasi.

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

## Section-by-Section Contract

### 01 Navigation

Navigation memberi orientation dan access ke commerce paths. Ia bukan campaign visual. Announcement bar/navbar mengikuti Navigation System.

### 02 Hero

Hero adalah editorial entry point dengan strong product/brand hierarchy. Gunakan Hero System dimensions dan jangan otomatis membuat 100vh.

### 03 Primary Category

Primary Category membantu discovery sebelum pengguna memasuki product grid lebih dalam. Gunakan category card consistency; jangan membuat taxonomy bisnis baru dari dokumentasi ini.

### 04 Featured Products

Product photography dan ProductCard menjadi fokus. Grid mengikuti canonical responsive ProductCard contract.

### 05 Editorial Campaign

Section ini mengubah rhythm dari commerce menuju editorial. Ia dapat menggunakan visual lebih dominan, tetapi tidak boleh membuat homepage terasa seperti magazine tanpa purchase path.

### 06 Best Sellers

Kembali ke commerce. Product information, price, dan product navigation harus mudah dipindai.

### 07 Custom DEBRODER

Section ini memperkenalkan jalur Custom sebagai bagian resmi proposition DEBRODER. Master tidak menetapkan anatomy detail section; jangan mengarang dimensions atau workflow baru sebagai canonical.

### 08 Secondary Category

Memperluas discovery tanpa menyaingi primary categories dan featured commerce.

### 09 Material / Brand Story

Brand storytelling memberi proof/context setelah pengguna sudah mendapat beberapa commerce touchpoints.

### 10 Service / Trust

Menyampaikan trust/support information. Hindari membuat banyak generic information cards jika whitespace/typography cukup.

### 11 Conversion / Newsletter

Conversion sekunder di ujung page. Tidak boleh menjadi visual primary yang mengalahkan product purchase path.

### 12 Footer

Footer menutup information architecture. Detail link architecture tidak ditentukan Master ini.

## Homepage Rhythm Contract

Canonical rhythm:

```text
Commerce
→ Editorial
→ Commerce
→ Brand
→ Commerce
```

Rhythm berarti density, media emphasis, dan information role berganti secara terkontrol. Bukan berarti setiap section wajib memiliki background color berbeda.

## Homepage Mobile Transformation Principles

- Pertahankan canonical section order.
- Kurangi kompleksitas layout melalui stacking/reflow, bukan menghapus commerce-critical sections secara sewenang-wenang.
- Jangan membuat dense card layout di homepage mobile.
- Section Header desktop dapat berubah ke canonical mobile order `Judul → Deskripsi → Aksi`.
- Product grids tetap mengikuti ProductCard responsive contract.

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

- 12 section canonical tidak boleh direorder.
- Commerce → Editorial → Commerce → Brand → Commerce rhythm harus terasa.
- Homepage memakai Editorial density, bukan Dense.
- Product/CTA tetap lebih penting daripada dekorasi.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Hero & Editorial System](02-hero-editorial.md)
- [Section Spacing & Rhythm](../03-layout/03-section-spacing.md)
- [Product Card — Canonical Deep Specification](../05-components/05-product-card.md)

## Source Mapping

- Master §2 — ARAH VISUAL DEBRODER
- Master §9 — SECTION SPACING
- Master §38 — HERO SYSTEM
- Master §39 — HOMEPAGE MASTER ORDER
- Master §54 — PAGE FOCUS RULE
- Master §73 — SECTION HEADER
