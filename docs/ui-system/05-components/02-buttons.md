# Button System

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mendefinisikan hierarchy Primary/Secondary/Tertiary/Ghost/Destructive/Icon beserta dimensions dan states.

## Scope

Public commerce, forms, customer, admin, modal, dan sticky CTA actions.

## Canonical Rules

### Master §30 — BUTTON SYSTEM

## Small

```text
height: 36px
padding-x: 14px
font: 13–14px
```

## Standard

```text
height: 44px
padding-x: 18px
font: 14px
```

## Commerce

```text
height: 48px
padding-x: 20–24px
font: 15–16px
```

## Primary PDP CTA

```text
height: 52px
```

Minimum hit area:

```text
44 × 44px
```

### Master §31 — BUTTON HIERARCHY

Gunakan:

```text
Primary
Secondary
Tertiary
Ghost
Destructive
Icon
```

Satu area tidak boleh memiliki tiga tombol yang semuanya terlihat primary.

## Detailed Specification

### Domain intent

- Small/Standard/Commerce/PDP CTA dimensions dipertahankan.
- Minimum hit area 44×44 berlaku.
- Satu area tidak boleh memiliki tiga primary-looking buttons.
- Loading/disabled harus mempertahankan size dan hierarchy.

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

## Canonical Button Size Matrix

| Role | Height | Padding X | Typography |
|---|---:|---:|---|
| Small | `36px` | `14px` | `13–14px` |
| Standard | `44px` | `18px` | `14px` |
| Commerce | `48px` | `20–24px` | `15–16px` |
| PDP Primary CTA | `52px` | mengikuti PDP contract | mengikuti CTA hierarchy |

Minimum hit area:

```text
44 × 44px
```

Small visual button yang tingginya `36px` tetap harus ditempatkan/ditangani agar accessible target tidak melanggar minimum hit-area requirement ketika berupa primary interactive target.

## Hierarchy Contract

### Primary

Untuk action paling penting dalam local context.

### Secondary

Action penting kedua yang tidak boleh bersaing dengan Primary.

### Tertiary / Ghost

Untuk lower-priority action yang tetap discoverable.

### Destructive

Hanya untuk destructive action; jangan gunakan merah sebagai decorative alternative Primary.

### Icon

Mempunyai accessible label dan hit target yang memenuhi contract.

## State Geometry

Hover, Focus, Active, Disabled, Loading, Error relationship tidak boleh mengubah height/padding sehingga layout bergeser.

Master belum menentukan exact state colors; jangan invent final tokens.

## Multi-Button Rule

Canonical:

> Satu area tidak boleh memiliki tiga tombol yang semuanya terlihat primary.

PDP mempunyai hierarchy tambahan yang OWNER LOCKED dan harus dirujuk ke PDP, bukan direinterpretasikan dari generic button system.

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

- Small/Standard/Commerce/PDP CTA dimensions dipertahankan.
- Minimum hit area 44×44 berlaku.
- Satu area tidak boleh memiliki tiga primary-looking buttons.
- Loading/disabled harus mempertahankan size dan hierarchy.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Component Dimensions](../02-tokens/02-dimensions.md)
- [Product Detail Page — OWNER LOCKED](../06-public-commerce/05-pdp.md)
- [Interactive Component State Contract](09-component-state-contract.md)

## Source Mapping

- Master §30 — BUTTON SYSTEM
- Master §31 — BUTTON HIERARCHY
- Master §32 — PDP CTA — FINAL / LOCKED
- Master §68 — ACCESSIBILITY
- Master §76 — MASTER COMPONENT DIMENSION MATRIX
