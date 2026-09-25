# Category System

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menjabarkan penggunaan CategoryCard dan category sections dalam homepage/katalog tanpa membuat taxonomy bisnis baru.

## Scope

Primary Category, Secondary Category, category cards, dan links menuju PLP.

## Canonical Rules

Dokumen ini tidak menjadi primary owner section Master baru. Ia menyatukan konteks dari canonical domain terkait tanpa menciptakan source-of-truth kedua.

- **Master §27 — CATEGORY CARD** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §39 — HOMEPAGE MASTER ORDER** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §40 — PLP / KATALOG** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §58 — RESPONSIVE PRODUCT GRID** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.

## Detailed Specification

### Domain intent

- CategoryCard memakai 3 atau 4 cards/row di desktop sesuai recommendation Master.
- Ratio dalam satu section harus sama: 4:5 atau 3:4.
- Category section mengikuti master container/grid/alignment.
- Kategori membantu discovery dan tidak boleh lebih dominan dari product purchase path.

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

- CategoryCard memakai 3 atau 4 cards/row di desktop sesuai recommendation Master.
- Ratio dalam satu section harus sama: 4:5 atau 3:4.
- Category section mengikuti master container/grid/alignment.
- Kategori membantu discovery dan tidak boleh lebih dominan dari product purchase path.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Card Family & Dimensions](../05-components/04-cards.md)
- [Homepage](01-homepage.md)
- [PLP / Katalog](04-plp-catalog.md)

## Source Mapping

- Master §27 — CATEGORY CARD
- Master §39 — HOMEPAGE MASTER ORDER
- Master §40 — PLP / KATALOG
- Master §58 — RESPONSIVE PRODUCT GRID
