# Card Family & Dimensions

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mendefinisikan keluarga card yang berbeda berdasarkan role, bukan satu generic card untuk semua kasus.

## Scope

Category, Editorial, Commerce, Information, Account, Admin, Selection, Transaction; ProductCard dirujuk ke file khusus.

## Canonical Rules

### Master §21 — CARD FAMILY

Canonical:

```text
ProductCard
CategoryCard
EditorialCard
CommerceCard
InformationCard
AccountCard
AdminCard
SelectionCard
TransactionCard
```

Dilarang menggunakan satu generic card untuk seluruh kebutuhan.

### Master §22 — CARD DIMENSIONS

## Default Commerce Card

```text
padding: 20–24px
radius: 16px
```

## Dense Card

```text
padding: 16px
radius: 12px
```

## Large Feature Card

```text
padding: 24–32px
radius: 20px
```

## Product Card

```text
padding: 0
radius: 8–12px
shadow: none
```

### Master §27 — CATEGORY CARD

Recommended desktop:

```text
3 atau 4 cards / row
```

Ratio:

```text
4:5
```

atau:

```text
3:4
```

Dalam satu section, ratio harus sama.

### Master §28 — EDITORIAL CARD

Allowed ratio:

```text
16:9
3:2
4:5
```

Dalam satu section, gunakan satu sistem ratio.

### Master §29 — INFORMATION CARD

Desktop:

```text
min-height: 120–160px
padding: 20–24px
```

Mobile:

```text
padding: 16px
```

## Detailed Specification

### Domain intent

- Default/Dense/Large Feature dimensions mengikuti Master.
- Category/Editorial ratio harus konsisten dalam satu section.
- Information Card menggunakan min-height canonical di desktop.
- Shadow/border/radius mengikuti semantic role.
- ProductCard memiliki contract terpisah.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Anatomy component harus stabil dan align dengan grid/card content edge.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Anatomy component harus stabil dan align dengan grid/card content edge.
- Internal spacing menggunakan canonical token/range.

## Typography Contract

- Gunakan role type yang sesuai control/content; labels tidak oversize.

## Color / Surface Contract

- Brand green untuk primary/active/focus; semantic colors untuk status.
- Decorative color overload dilarang.

## Interaction Contract

- Definisikan hierarchy, target, keyboard/focus, disabled/loading behavior.
- Jangan menambahkan business workflow baru.

## Responsive Contract

- Tentukan apakah component remain/stack/full-width/drawer only jika source mendukung.
- Geometry tidak boleh pecah di mobile.

## State Contract

- Default/Hover/Focus/Aktif/Terpilih/Disabled/Loading/Error/Success dipertimbangkan sesuai relevansi.

## Accessibility Contract

- Controls mencapai minimum hit target, memiliki accessible name, dan keyboard behavior.

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

- Default/Dense/Large Feature dimensions mengikuti Master.
- Category/Editorial ratio harus konsisten dalam satu section.
- Information Card menggunakan min-height canonical di desktop.
- Shadow/border/radius mengikuti semantic role.
- ProductCard memiliki contract terpisah.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Product Card — Canonical Deep Specification](05-product-card.md)
- [Radius, Border & Shadow](../02-tokens/03-radius-border-shadow.md)

## Source Mapping

- Master §21 — CARD FAMILY
- Master §22 — CARD DIMENSIONS
- Master §27 — CATEGORY CARD
- Master §28 — EDITORIAL CARD
- Master §29 — INFORMATION CARD
- Master §51 — BORDER RADIUS SYSTEM
- Master §52 — BORDER SYSTEM
- Master §53 — SHADOW SYSTEM
